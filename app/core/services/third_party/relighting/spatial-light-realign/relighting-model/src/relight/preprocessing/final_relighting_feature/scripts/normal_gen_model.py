import ctypes
import tensorrt as trt
import pycuda.driver as cuda
import pycuda.autoinit
import numpy as np
import cv2
import os
import time

# ---- Load TRT plugin library & register plugins ----
TRT_LOGGER = trt.Logger(trt.Logger.WARNING)

# Adjust path if needed; this is from your listing
ctypes.CDLL(
    "/opt/TensorRT-8.6.1.6/targets/x86_64-linux-gnu/lib/libnvinfer_plugin.so.8.6.1",
    mode=ctypes.RTLD_GLOBAL,
)

# Register all standard plugins (includes InstanceNormalization_TRT)
trt.init_libnvinfer_plugins(TRT_LOGGER, "")
# ----------------------------------------------------

class DSINE_TRT:
    def __init__(self, engine_path, target_size=384):
        """Initialize TensorRT engine for DSINE
        
        Args:
            engine_path: Path to the TensorRT engine file
            target_size: Target size for input images (default: 384)
                        Must be between 256 and 448 based on engine build
        """
        print(f"Loading TensorRT engine: {engine_path}")
        
        if not os.path.exists(engine_path):
            raise FileNotFoundError(f"Engine not found: {engine_path}")
        
        # Validate target size based on engine constraints
        if target_size < 256 or target_size > 448:
            print(f"⚠️  Warning: target_size {target_size} is outside engine bounds [256, 448]")
            print(f"   Clamping to valid range...")
            target_size = max(256, min(448, target_size))
        
        self.logger = TRT_LOGGER
        self.target_size = target_size
        
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
        print(f"   Using target size: {target_size}x{target_size}")
        
        # Set dynamic shapes if needed
        if self.input_shape[2] == -1 or self.input_shape[3] == -1:
            actual_input_shape = (1, 3, target_size, target_size)
            success = self.context.set_input_shape(self.input_name, actual_input_shape)
            if not success:
                raise RuntimeError(f"Failed to set input shape to {actual_input_shape}")
            print(f"   ✅ Set dynamic input shape to: {actual_input_shape}")
        
        # Get actual shapes after setting dynamic dimensions
        self.input_shape = self.context.get_tensor_shape(self.input_name)
        self.output_shape = self.context.get_tensor_shape(self.output_name)
        
        print(f"   Final input shape: {list(self.input_shape)}")
        print(f"   Final output shape: {list(self.output_shape)}")
        
        # Allocate buffers AFTER setting dynamic shapes
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
        """Preprocess image for DSINE input"""
        print(f"\nPreprocessing: {image_path}")
        
        # Read image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Failed to load image: {image_path}")
        
        original_size = img.shape[:2]
        print(f"   Original size: {original_size[1]}x{original_size[0]}")
        
        # Convert BGR to RGB
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Resize to target size
        h, w = self.target_size, self.target_size
        img = cv2.resize(img, (w, h), interpolation=cv2.INTER_LINEAR)
        print(f"   Resized to: {w}x{h}")
        
        # Normalize (ImageNet stats - typical for DSINE)
        img = img.astype(np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        img = (img - mean) / std
        
        # Convert to CHW format
        img = img.transpose(2, 0, 1)
        img = np.expand_dims(img, 0)
        
        return img.astype(np.float32), original_size
    
    def visualize_normals(self, normals):
        """Convert surface normals to RGB visualization"""
        # Normals are typically in range [-1, 1] for (x, y, z)
        # Convert to [0, 255] RGB for visualization
        normals_vis = ((normals + 1.0) / 2.0 * 255).astype(np.uint8)
        normals_vis = cv2.cvtColor(normals_vis, cv2.COLOR_RGB2BGR)
        return normals_vis
    
    def infer(self, image_path, output_path="normals_output.png"):
        """Run inference on image"""
        # Preprocess
        input_data, original_size = self.preprocess(image_path)
        
        # Verify shape matches buffer
        expected_size = input_data.size
        if expected_size != self.h_input.size:
            raise RuntimeError(f"Input data size mismatch: {expected_size} vs {self.h_input.size}")
        
        # Copy to device
        np.copyto(self.h_input, input_data.ravel())
        cuda.memcpy_htod_async(self.d_input, self.h_input, self.stream)
        
        # Set tensor addresses
        self.context.set_tensor_address(self.input_name, int(self.d_input))
        self.context.set_tensor_address(self.output_name, int(self.d_output))
        
        # Run inference
        print("   Running inference...")
        start = time.perf_counter()
        self.context.execute_async_v3(stream_handle=self.stream.handle)
        
        # Copy result back
        cuda.memcpy_dtoh_async(self.h_output, self.d_output, self.stream)
        self.stream.synchronize()
        inference_time = (time.perf_counter() - start) * 1000
        
        # Reshape output - DSINE outputs 3 channels (x, y, z normals)
        normals = self.h_output.reshape(self.output_shape)
        normals = normals[0]  # Remove batch dimension
        normals = normals.transpose(1, 2, 0)  # CHW -> HWC
        
        print(f"   Surface normals shape: {normals.shape}")
        print(f"   Inference time: {inference_time:.2f} ms")
        print(f"   Normal range: [{normals.min():.3f}, {normals.max():.3f}]")
        
        # Resize normals back to original size
        normals_resized = cv2.resize(normals, (original_size[1], original_size[0]), 
                                      interpolation=cv2.INTER_LINEAR)
        
        # Normalize to unit vectors (important for surface normals)
        norms = np.linalg.norm(normals_resized, axis=2, keepdims=True)
        normals_resized = normals_resized / (norms + 1e-8)
        
        # Save raw normals
        np.save(output_path.replace(".png", ".npy"), normals_resized)
        print(f"💾 Saved raw normals array: {output_path.replace('.png', '.npy')}")
        
        # Visualize and save
        normals_colored = self.visualize_normals(normals_resized)
        cv2.imwrite(output_path, normals_colored)
        print(f"✅ Saved surface normals: {output_path}")
        
        return normals_resized, normals_colored

def generate_normals(image_path: str, engine_path: str, output_dir: str, target_size: int = 384) -> str:
    """
    Convenience function to compute normals and save outputs.
    Returns path to saved PNG.
    """
    os.makedirs(output_dir, exist_ok=True)
    out_png = os.path.join(output_dir, "normals.png")
    model = DSINE_TRT(engine_path, target_size=target_size)
    model.infer(image_path, out_png)
    return out_png

def test_with_image(engine_path, image_path, target_size=384):
    """Test with actual image
    
    Args:
        engine_path: Path to TensorRT engine
        image_path: Path to input image
        target_size: Target size for processing (default: 384, must be 256-448)
    """
    print("\n" + "="*60)
    print("DSINE Surface Normal Estimation")
    print("="*60)
    
    if not os.path.exists(image_path):
        print(f"⚠️  Image not found: {image_path}")
        return
    
    model = DSINE_TRT(engine_path, target_size=target_size)
    normals, colored = model.infer(image_path, "normals_output.png")
    
    print(f"✅ Inference complete!")

def benchmark(engine_path, iterations=100, target_size=384):
    """Benchmark inference speed"""
    print("\n" + "="*60)
    print(f"Benchmark ({iterations} iterations)")
    print("="*60)
    
    model = DSINE_TRT(engine_path, target_size=target_size)
    
    # Random input
    random_input = np.random.randn(1, 3, target_size, target_size).astype(np.float32)
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

    parser = argparse.ArgumentParser(description="DSINE TensorRT normals inference")
    parser.add_argument("--engine", required=True, help="Path to DSINE TensorRT engine (.plan)")
    parser.add_argument("--input", "-i", required=True, help="Path to input image")
    parser.add_argument("--out", "-o", default="./normals_out", help="Output directory")
    parser.add_argument("--size", type=int, default=384, help="Target size (256-448)")
    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)
    output_png = os.path.join(args.out, "normals.png")

    print("="*60)
    print("TensorRT DSINE - Surface Normal Estimation")
    print("="*60)
    print(f"Engine: {args.engine}")
    print(f"Input:  {args.input}")
    print(f"Output: {output_png}")
    print("="*60)

    model = DSINE_TRT(args.engine, target_size=args.size)
    model.infer(args.input, output_png)

    print("\n" + "="*60)
    print("✅ INFERENCE COMPLETE!")
    print("="*60)


