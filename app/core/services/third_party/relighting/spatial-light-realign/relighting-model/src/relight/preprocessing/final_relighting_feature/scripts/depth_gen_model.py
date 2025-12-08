# import os
# import cv2
# import numpy as np
# import tensorrt as trt
# import pycuda.driver as cuda
# import pycuda.autoinit

# TRT_LOGGER = trt.Logger(trt.Logger.WARNING)
# ENGINE_PATH = "../models/depth_anything_v2/trt_engine_file/depth_anything_v2_vitb_518.trt"

# def load_engine(engine_path):
#     runtime = trt.Runtime(TRT_LOGGER)
#     with open(engine_path, "rb") as f:
#         engine = runtime.deserialize_cuda_engine(f.read())
#     return engine

# def alloc_buffers(engine):
#     inputs = []
#     outputs = []
#     bindings = []
#     stream = cuda.Stream()

#     for binding in engine:
#         shape = engine.get_binding_shape(binding)
#         dtype = trt.nptype(engine.get_binding_dtype(binding))
#         size = trt.volume(shape)
#         host_mem = cuda.pagelocked_empty(size, dtype)
#         device_mem = cuda.mem_alloc(host_mem.nbytes)
#         bindings.append(int(device_mem))
#         if engine.binding_is_input(binding):
#             inputs.append((host_mem, device_mem))
#         else:
#             outputs.append((host_mem, device_mem))
#     return inputs, outputs, bindings, stream

# def infer(engine, img):
#     context = engine.create_execution_context()
#     inputs, outputs, bindings, stream = alloc_buffers(engine)

#     # Assume single input and output.
#     inp_host, inp_dev = inputs[0]
#     out_host, out_dev = outputs[0]

#     np.copyto(inp_host, img.ravel())

#     cuda.memcpy_htod_async(inp_dev, inp_host, stream)
#     context.execute_v2(bindings=bindings)
#     cuda.memcpy_dtoh_async(out_host, out_dev, stream)
#     stream.synchronize()

#     return out_host.reshape(engine.get_binding_shape(1))  # adjust index if needed

# # Example: read image and run depth
# if __name__ == "__main__":
#     assert os.path.exists(ENGINE_PATH), "Engine file not found"

#     engine = load_engine(ENGINE_PATH)

#     # Example preprocessing: resize and normalize; adapt to your training pipeline
#     img = cv2.imread("cube_image.jpg")   
#     print(img.shape)# (H, W, 3), BGR
#     img = cv2.resize(img, (518, 518)) 
#     print(img.shape)       # NCHW

#     depth_flat = infer(engine, img)
#     depth_map = depth_flat.squeeze()
    
#     print("Depth map shape:", depth_map.shape)

#     np.save("depth_raw.npy", depth_map)
#     print("Saved: depth_raw.npy")

#     # Normalize depth to [0, 255]
#     depth_norm = cv2.normalize(depth_map, None, 0, 255, cv2.NORM_MINMAX)
#     depth_norm = depth_norm.astype(np.uint8)
    
#     # Apply a colormap for visualization
#     depth_color = cv2.applyColorMap(depth_norm, cv2.COLORMAP_JET)
    
#     # Resize original img to same size (already done)
#     img_vis = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
#     # Blend the depth with image: tune alpha for transparency
#     alpha = 0.6
#     overlay = cv2.addWeighted(img_vis, 1 - alpha, depth_color, alpha, 0)
    
#     # Save outputs
#     cv2.imwrite("depth_colormap.png", depth_color)
#     cv2.imwrite("depth_overlay.png", overlay)
    
#     print("Saved depth_colormap.png and depth_overlay.png")
    








# verify_trt_engine.py
import tensorrt as trt
import pycuda.driver as cuda
import pycuda.autoinit
import numpy as np
import cv2
from PIL import Image
import os

class DepthAnythingTRT:
    def __init__(self, engine_path):
        """Initialize TensorRT engine"""
        print(f"Loading TensorRT engine: {engine_path}")
        
        if not os.path.exists(engine_path):
            raise FileNotFoundError(f"Engine not found: {engine_path}")
        
        self.logger = trt.Logger(trt.Logger.WARNING)
        
        # Load engine
        with open(engine_path, 'rb') as f:
            runtime = trt.Runtime(self.logger)
            self.engine = runtime.deserialize_cuda_engine(f.read())
        
        if self.engine is None:
            raise RuntimeError("Failed to load engine")
        
        self.context = self.engine.create_execution_context()
        
        # Get input/output specs
        self.input_name = self.engine.get_tensor_name(0)
        self.output_name = self.engine.get_tensor_name(1)
        
        self.input_shape = self.engine.get_tensor_shape(self.input_name)
        self.output_shape = self.engine.get_tensor_shape(self.output_name)
        
        print(f"✅ Engine loaded successfully")
        print(f"   Input:  {self.input_name} {list(self.input_shape)}")
        print(f"   Output: {self.output_name} {list(self.output_shape)}")
        
        # Allocate buffers
        self.input_size = trt.volume(self.input_shape)
        self.output_size = trt.volume(self.output_shape)
        
        self.h_input = cuda.pagelocked_empty(self.input_size, dtype=np.float32)
        self.h_output = cuda.pagelocked_empty(self.output_size, dtype=np.float32)
        
        self.d_input = cuda.mem_alloc(self.h_input.nbytes)
        self.d_output = cuda.mem_alloc(self.h_output.nbytes)
        
        self.stream = cuda.Stream()
        
        print(f"✅ Buffers allocated")
        print(f"   Input buffer:  {self.h_input.nbytes / (1024**2):.2f} MB")
        print(f"   Output buffer: {self.h_output.nbytes / (1024**2):.2f} MB")
    
    def preprocess(self, image_path):
        """Preprocess image to match model input"""
        print(f"\nPreprocessing: {image_path}")
        
        # Read image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Failed to load image: {image_path}")
        
        original_size = img.shape[:2]
        print(f"   Original size: {original_size[1]}x{original_size[0]}")
        
        # Convert BGR to RGB
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Resize to model input size
        h, w = self.input_shape[2], self.input_shape[3]
        img = cv2.resize(img, (w, h), interpolation=cv2.INTER_LINEAR)
        print(f"   Resized to: {w}x{h}")
        
        # Normalize (ImageNet stats)
        img = img.astype(np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        img = (img - mean) / std
        
        # Convert to CHW format
        img = img.transpose(2, 0, 1)
        img = np.expand_dims(img, 0)
        
        return img.astype(np.float32), original_size
    
    def infer(self, image_path, output_path="depth_output.png"):
        """Run inference on image"""
        # Preprocess
        input_data, original_size = self.preprocess(image_path)
        
        # Copy to device
        np.copyto(self.h_input, input_data.ravel())
        cuda.memcpy_htod_async(self.d_input, self.h_input, self.stream)
        
        # Set tensor addresses
        self.context.set_tensor_address(self.input_name, int(self.d_input))
        self.context.set_tensor_address(self.output_name, int(self.d_output))
        
        # Run inference
        print("   Running inference...")
        self.context.execute_async_v3(stream_handle=self.stream.handle)
        
        # Copy result back
        cuda.memcpy_dtoh_async(self.h_output, self.d_output, self.stream)
        self.stream.synchronize()
        
        # Reshape output
        depth = self.h_output.reshape(self.output_shape)
        depth = depth[0]  # Remove batch dimension
        
        print(f"   Depth map shape: {depth.shape}")
        print(f"   Depth range: [{depth.min():.3f}, {depth.max():.3f}]")
        
        # Resize depth map back to original size
        depth_resized = cv2.resize(depth, (original_size[1], original_size[0]), 
                                   interpolation=cv2.INTER_LINEAR)

        np.save(output_path.replace(".png", ".npy"), depth_resized)
        print(f"💾 Saved raw depth array: {output_path.replace('.png', '.npy')}")

        
        # Normalize for visualization
        depth_normalized = (depth_resized - depth_resized.min()) / \
                          (depth_resized.max() - depth_resized.min())
        depth_colored = (depth_normalized * 255).astype(np.uint8)
        
        # Apply colormap for better visualization
        depth_colored = cv2.applyColorMap(depth_colored, cv2.COLORMAP_INFERNO)
        
        # Save
        cv2.imwrite(output_path, depth_colored)
        print(f"✅ Saved depth map: {output_path}")
        
        return depth_resized, depth_colored

def generate_depth(image_path: str, engine_path: str, output_dir: str) -> str:
    """
    Convenience function to compute depth and save outputs.
    Returns path to saved PNG.
    """
    os.makedirs(output_dir, exist_ok=True)
    out_png = os.path.join(output_dir, "depth.png")
    model = DepthAnythingTRT(engine_path)
    model.infer(image_path, out_png)
    return out_png

def test_with_random_input(engine_path):
    """Quick test with random data"""
    print("\n" + "="*60)
    print("TEST 1: Random Input")
    print("="*60)
    
    model = DepthAnythingTRT(engine_path)
    
    # Create random input
    random_input = np.random.randn(*model.input_shape).astype(np.float32)
    
    # Copy and run
    np.copyto(model.h_input, random_input.ravel())
    cuda.memcpy_htod_async(model.d_input, model.h_input, model.stream)
    
    model.context.set_tensor_address(model.input_name, int(model.d_input))
    model.context.set_tensor_address(model.output_name, int(model.d_output))
    
    model.context.execute_async_v3(stream_handle=model.stream.handle)
    
    cuda.memcpy_dtoh_async(model.h_output, model.d_output, model.stream)
    model.stream.synchronize()
    
    output = model.h_output.reshape(model.output_shape)
    
    print(f"✅ Random input test passed!")
    print(f"   Output shape: {output.shape}")
    print(f"   Output range: [{output.min():.3f}, {output.max():.3f}]")

def test_with_image(engine_path, image_path):
    """Test with actual image"""
    print("\n" + "="*60)
    print("TEST 2: Real Image Inference")
    print("="*60)
    
    if not os.path.exists(image_path):
        print(f"⚠️  Image not found: {image_path}")
        print("   Skipping image test")
        return
    
    model = DepthAnythingTRT(engine_path)
    depth, colored = model.infer(image_path, "depth_test_output.png")
    
    print(f"✅ Image inference test passed!")

def benchmark(engine_path, iterations=100):
    """Benchmark inference speed"""
    print("\n" + "="*60)
    print(f"TEST 3: Benchmark ({iterations} iterations)")
    print("="*60)
    
    model = DepthAnythingTRT(engine_path)
    
    # Random input
    random_input = np.random.randn(*model.input_shape).astype(np.float32)
    np.copyto(model.h_input, random_input.ravel())
    
    # Warmup
    print("   Warming up...")
    for _ in range(10):
        cuda.memcpy_htod_async(model.d_input, model.h_input, model.stream)
        model.context.set_tensor_address(model.input_name, int(model.d_input))
        model.context.set_tensor_address(model.output_name, int(model.d_output))
        model.context.execute_async_v3(stream_handle=model.stream.handle)
        cuda.memcpy_dtoh_async(model.h_output, model.d_output, model.stream)
        model.stream.synchronize()
    
    # Benchmark
    print(f"   Running {iterations} iterations...")
    import time
    
    times = []
    for _ in range(iterations):
        start = time.perf_counter()
        
        cuda.memcpy_htod_async(model.d_input, model.h_input, model.stream)
        model.context.set_tensor_address(model.input_name, int(model.d_input))
        model.context.set_tensor_address(model.output_name, int(model.d_output))
        model.context.execute_async_v3(stream_handle=model.stream.handle)
        cuda.memcpy_dtoh_async(model.h_output, model.d_output, model.stream)
        model.stream.synchronize()
        
        times.append(time.perf_counter() - start)
    
    times = np.array(times) * 1000  # Convert to ms
    
    print(f"✅ Benchmark complete!")
    print(f"   Mean:   {times.mean():.2f} ms")
    print(f"   Median: {np.median(times):.2f} ms")
    print(f"   Min:    {times.min():.2f} ms")
    print(f"   Max:    {times.max():.2f} ms")
    print(f"   FPS:    {1000/times.mean():.1f}")

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="DepthAnything TensorRT depth inference")
    parser.add_argument("--engine", required=True, help="Path to DepthAnything TensorRT engine")
    parser.add_argument("--input", "-i", required=True, help="Path to input image")
    parser.add_argument("--out", "-o", default="./depth_out", help="Output directory")
    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)
    output_png = os.path.join(args.out, "depth.png")

    print("="*60)
    print("TensorRT Depth Anything V2 - Inference")
    print("="*60)
    print(f"Engine: {args.engine}")
    print(f"Input:  {args.input}")
    print(f"Output: {output_png}")
    print("="*60)

    model = DepthAnythingTRT(args.engine)
    model.infer(args.input, output_png)

    print("\n" + "="*60)
    print("✅ INFERENCE COMPLETE!")
    print("="*60)
