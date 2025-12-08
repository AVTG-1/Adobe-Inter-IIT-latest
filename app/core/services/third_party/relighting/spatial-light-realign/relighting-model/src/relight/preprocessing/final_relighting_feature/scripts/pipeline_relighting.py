import base64
from html import parser
import os
import sys
import argparse
from pathlib import Path
from typing import Optional, List, Tuple

import numpy as np
from PIL import Image
import cv2  # <-- added

# Local imports (existing project modules)
from iclight_core import ICLightModel, LightDirection, load_image, save_images
from final_map_run_script import process_lighting
from normal_gen_model import DSINE_TRT
from depth_gen_model import DepthAnythingTRT


def ensure_dir(path: str) -> str:
	"""Create directory if needed and return its string path."""
	Path(path).mkdir(parents=True, exist_ok=True)
	return str(path)


def save_image_uint8(img: np.ndarray, path: str) -> None:
	"""Save HxWxC or HxW numpy array as PNG."""
	if img.ndim == 2:
		Image.fromarray(img.astype(np.uint8)).save(path)
	else:
		Image.fromarray(img.astype(np.uint8)).save(path)


def try_generate_albedo(image_path: str, output_dir: str, model_version: str = "v2") -> Optional[Tuple[str, str]]:
	"""
	Attempt to generate albedo using intrinsic.pipeline if available.
	Returns (albedo_png_path, albedo_npy_path) or None if unavailable/fails.
	"""
	try:
		from intrinsic.pipeline import load_models, run_pipeline  # type: ignore
	except Exception as e:
		print(f"[albedo] Skipping albedo generation (intrinsic.pipeline not available): {e}")
		return None

	try:
		print("[albedo] Loading models...")
		models = load_models(model_version)

		print(f"[albedo] Loading input image: {image_path}")
		img = Image.open(image_path)
		if img.mode != "RGB":
			img = img.convert("RGB")
		image_np = (np.asarray(img).astype(np.float32) / 255.0)  # HWC in [0,1]

		print("[albedo] Running intrinsic pipeline...")
		results = run_pipeline(models, image_np)
		if "hr_alb" not in results:
			print("[albedo] Key 'hr_alb' not in results; skipping albedo.")
			return None

		alb = results["hr_alb"]
		alb = np.clip(alb, 0.0, 1.0)
		# Convert CHW -> HWC if needed
		if alb.ndim == 3 and alb.shape[0] == 3:
			alb = np.transpose(alb, (1, 2, 0))
		# Convert to uint8 RGB
		alb_u8 = (alb * 255.0).astype(np.uint8)

		albedo_png = os.path.join(output_dir, "albedo.png")
		albedo_npy = os.path.join(output_dir, "albedo.npy")

		print(f"[albedo] Saving: {albedo_png}, {albedo_npy}")
		np.save(albedo_npy, alb)
		save_image_uint8(alb_u8, albedo_png)
		return albedo_png, albedo_npy
	except Exception as e:
		print(f"[albedo] Failed to generate albedo: {e}")
		return None


def generate_normals(image_path: str, engine_path: str, output_dir: str, target_size: int = 384) -> Tuple[str, str]:
	"""
	Generate surface normals via DSINE TensorRT engine.
	Returns (normals_png_path, normals_npy_path).
	"""
	print("[normals] Initializing DSINE TensorRT...")
	model = DSINE_TRT(engine_path, target_size=target_size)
	normals_png = os.path.join(output_dir, "normals.png")
	print(f"[normals] Inferring normals → {normals_png}")
	normals_resized, _ = model.infer(image_path, normals_png)
	normals_npy = normals_png.replace(".png", ".npy")
	return normals_png, normals_npy


def generate_depth(image_path: str, engine_path: str, output_dir: str) -> Tuple[str, str]:
	"""
	Generate depth map via DepthAnything TensorRT engine.
	Returns (depth_png_path, depth_npy_path).
	"""
	print("[depth] Initializing DepthAnything TensorRT...")
	model = DepthAnythingTRT(engine_path)
	depth_png = os.path.join(output_dir, "depth.png")
	print(f"[depth] Inferring depth → {depth_png}")
	depth_resized, _ = model.infer(image_path, depth_png)
	depth_npy = depth_png.replace(".png", ".npy")
	return depth_png, depth_npy


def compute_light_map_from_normals_depth(normals_npy: str, depth_npy: str, output_dir: str, light_pos) -> str:
	"""
	Compute lighting intensity map using existing `process_lighting`.
	Returns path to the generated PNG light map.
	"""
	print("[light-map] Computing lighting intensity from normals/depth...")
	process_lighting(
		normal_path=normals_npy,
		light_pos=light_pos,
		depth_path=depth_npy,
		output_dir=output_dir,
		use_gpu=True
	)
	light_map_png = os.path.join(output_dir, "lighting_intensity.png")
	if not Path(light_map_png).exists():
		raise FileNotFoundError(f"Expected light map not found: {light_map_png}")
	print(f"[light-map] Saved: {light_map_png}")
	return light_map_png


def save_light_position_visual(image_path: str, light_pos, output_path: str) -> None:
	"""
	Save an image with the light's (x, y) position drawn on top of the input image.

	Assumes light_pos = [x, y, z] where x, y are in pixel coordinates
	with origin at top-left (x → right, y → down).
	"""
	print("[light-pos] Creating visualization of light position...")
	img = cv2.imread(image_path)
	if img is None:
		raise ValueError(f"Failed to load image for light visualization: {image_path}")

	h, w = img.shape[:2]

	x, y, _ = light_pos
	x = int(round(x))
	y = int(round(y))

	# Clamp to image bounds
	x = max(0, min(w - 1, x))
	y = max(0, min(h - 1, y))

	# Draw a filled circle at (x, y)
	cv2.circle(img, (x, y), radius=10, color=(0, 0, 255), thickness=-1)

	# Optional: draw crosshair lines
	cv2.line(img, (x, 0), (x, h - 1), (0, 0, 255), 1)
	cv2.line(img, (0, y), (w - 1, y), (0, 0, 255), 1)

	# Optional: label
	label = f"Light ({x}, {y})"
	cv2.putText(img, label, (x + 10, max(0, y - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1, cv2.LINE_AA)

	cv2.imwrite(output_path, img)
	print(f"[light-pos] Saved light position overlay: {output_path}")


def run_ic_light(
    foreground_image_path: str,
    light_map_path: str,
    output_dir: str,
    base_model: str,
    ic_model_path: str,
    device: str,
    width: int,
    height: int,
    prompt: str,
    num_samples: int,
    seed: int,
    steps: int,
    cfg_scale: float,
    lowres_denoise: float,
    highres_scale: float,
    highres_denoise: float,
    added_prompt: str,
    negative_prompt: str,
    ) -> List[str]:

    print("[iclight] Loading images...")
    foreground = load_image(foreground_image_path)
    light_map = load_image(light_map_path)

    print("[iclight] Initializing model...")
    model = ICLightModel(
        base_model=base_model,
        ic_model_path=ic_model_path,
        device=device
    )

    print("[iclight] Running relight...")
    results = model.relight(
        foreground_image=foreground,
        prompt=prompt,
        light_direction=LightDirection.NONE,  # using provided light_map
        light_map=light_map,
        width=width,
        height=height,
        num_samples=num_samples,
        seed=seed,
        steps=steps,
        cfg_scale=cfg_scale,
        lowres_denoise=lowres_denoise,
        highres_scale=highres_scale,
        highres_denoise=highres_denoise,
        added_prompt=added_prompt,
        negative_prompt=negative_prompt,
    )

    print("[iclight] Saving outputs...")
    saved = save_images(results, output_dir, prefix="relit")
    return saved



def parse_args() -> argparse.Namespace:
	parser = argparse.ArgumentParser(
		description="End-to-end relighting pipeline: Albedo → Normals/Depth → Light Map → IC-Light"
	)
	parser.add_argument("--input", "-i", required=True, help="Path to input image")
	parser.add_argument("--out", "-o", default="./outputs_pipeline", help="Output directory")

	# Albedo
	parser.add_argument("--albedo", action="store_true", help="Try to generate albedo (requires intrinsic.pipeline)")
	parser.add_argument("--albedo-version", default="v2", help="intrinsic.pipeline model version (default: v2)")

	# Normals (DSINE)
	parser.add_argument("--dsine-engine", default="../models/dsine_core_fp16.plan", help="Path to DSINE TensorRT engine")
	parser.add_argument("--dsine-size", type=int, default=384, help="DSINE target size (256–448, default 384)")

	# Depth (DepthAnything)
	parser.add_argument(
		"--depth-engine",
		default="../models/depth_anything_v2_vitb_518.trt",
		help="Path to DepthAnything TensorRT engine"
	)

	# IC-Light arguments
	parser.add_argument("--prompt", default="", help="Text prompt for IC-Light")
	parser.add_argument("--width", type=int, default=512, help="IC-Light width (multiple of 64)")
	parser.add_argument("--height", type=int, default=512, help="IC-Light height (multiple of 64)")
	parser.add_argument("--samples", type=int, default=1, help="Number of images to generate")
	parser.add_argument("--seed", type=int, default=12345, help="Random seed")
	parser.add_argument("--steps", type=int, default=25, help="Diffusion steps")
	parser.add_argument("--cfg", type=float, default=2.0, help="CFG scale")
	parser.add_argument("--lowres-denoise", type=float, default=0.9, help="Low-res denoise strength")
	parser.add_argument("--highres-scale", type=float, default=1, help="High-res upscaling factor")
	parser.add_argument("--highres-denoise", type=float, default=0.5, help="High-res denoise strength")
	parser.add_argument("--base-model", default="runwayml/stable-diffusion-v1-5", help="Base SD1.5 model id")

	parser.add_argument(
		"--light-pos",
		nargs=3,
		type=float,
		metavar=("X", "Y", "Z"),
		default=[0.0, 0.0, 0.0],
		help="Light position as three floats [x y z] in the same coordinate system as depth/normal (default: 0 0 0)"
	)

	parser.add_argument(
		"--ic-weights",
		default="./spatial-light-realign/model_sources/completed/IC-Light/sd1.5_adapters/iclight_sd15_fbc.safetensors",
		help="Path to IC-Light .safetensors weights"
	)
	parser.add_argument("--device", default="cuda", help="Device for IC-Light (cuda|cpu)")

	return parser.parse_args()


def validate_dims(width: int, height: int) -> None:
	if width % 64 != 0 or height % 64 != 0:
		raise ValueError("IC-Light width and height must be multiples of 64.")


def main():
	args = parse_args()

	input_image = Path(args.input)
	if not input_image.exists():
		print(f"Input image not found: {input_image}")
		sys.exit(1)

	validate_dims(args.width, args.height)

	# Prepare directories
	out_root = ensure_dir(args.out)
	stage_albedo = ensure_dir(os.path.join(out_root, "albedo"))
	stage_normals = ensure_dir(os.path.join(out_root, "normals"))
	stage_depth = ensure_dir(os.path.join(out_root, "depth"))
	stage_lightmap = ensure_dir(os.path.join(out_root, "lightmap"))
	stage_iclight = ensure_dir(os.path.join(out_root, "iclight"))

	# 1) Albedo (optional)
	foreground_path = str(input_image)
	albedo_paths = None
	if args.albedo:
		albedo_paths = try_generate_albedo(str(input_image), stage_albedo, model_version=args.albedo_version)
		if albedo_paths is not None:
			foreground_path = albedo_paths[0]  # use albedo PNG as foreground if available
			print(f"[pipeline] Using albedo as foreground: {foreground_path}")
		else:
			print("[pipeline] Proceeding with original image as foreground.")

	# 2) Normals
	normals_png, normals_npy = generate_normals(str(input_image), args.dsine_engine, stage_normals, target_size=args.dsine_size)

	# 3) Depth
	depth_png, depth_npy = generate_depth(str(input_image), args.depth_engine, stage_depth)

	# 4) Light map from normals + depth
	light_map_png = compute_light_map_from_normals_depth(normals_npy, depth_npy, stage_lightmap, args.light_pos)

	# 4b) Save overlay showing light (x, y) on the original image
	try:
		light_vis_path = os.path.join(stage_lightmap, "light_position_overlay.png")
		save_light_position_visual(str(input_image), args.light_pos, light_vis_path)
	except Exception as e:
		print(f"[light-pos] Failed to save light position overlay: {e}")

	# 5) IC-Light (final images)
	saved = run_ic_light(
		foreground_image_path=foreground_path,
		light_map_path=light_map_png,
		output_dir=stage_iclight,
		base_model=args.base_model,
		ic_model_path=args.ic_weights,
		device=args.device,
		width=args.width,
		height=args.height,
		prompt=args.prompt,
		num_samples=args.samples,
		seed=args.seed,
		steps=args.steps,
		cfg_scale=args.cfg,
		lowres_denoise=args.lowres_denoise,
		highres_scale=args.highres_scale,
		highres_denoise=args.highres_denoise,
		added_prompt="best quality",
		negative_prompt="lowres, bad anatomy, bad hands, cropped, worst quality",
	)

	print("\n" + "=" * 60)
	print("Pipeline complete!")
	print("=" * 60)
	for p in saved:
		print(f"✓ {p}")

def main_with_args(args: argparse.Namespace):
	input_image = Path(args.input)
	if not input_image.exists():
		print(f"Input image not found: {input_image}")
		sys.exit(1)

	validate_dims(args.width, args.height)

	# Prepare directories
	out_root = ensure_dir(args.out)
	stage_albedo = ensure_dir(os.path.join(out_root, "albedo"))
	stage_normals = ensure_dir(os.path.join(out_root, "normals"))
	stage_depth = ensure_dir(os.path.join(out_root, "depth"))
	stage_lightmap = ensure_dir(os.path.join(out_root, "lightmap"))
	stage_iclight = ensure_dir(os.path.join(out_root, "iclight"))

	# 1) Albedo (optional)
	foreground_path = str(input_image)
	albedo_paths = None
	if args.albedo:
		albedo_paths = try_generate_albedo(str(input_image), stage_albedo, model_version=args.albedo_version)
		if albedo_paths is not None:
			foreground_path = albedo_paths[0]  # use albedo PNG as foreground if available
			print(f"[pipeline] Using albedo as foreground: {foreground_path}")
		else:
			print("[pipeline] Proceeding with original image as foreground.")

	# 2) Normals
	normals_png, normals_npy = generate_normals(str(input_image), args.dsine_engine, stage_normals, target_size=args.dsine_size)

	# 3) Depth
	depth_png, depth_npy = generate_depth(str(input_image), args.depth_engine, stage_depth)

	# 4) Light map from normals + depth
	light_map_png = compute_light_map_from_normals_depth(normals_npy, depth_npy, stage_lightmap, args.light_pos)

	# 4b) Save overlay showing light (x, y) on the original image
	try:
		light_vis_path = os.path.join(stage_lightmap, "light_position_overlay.png")
		save_light_position_visual(str(input_image), args.light_pos, light_vis_path)
	except Exception as e:
		print(f"[light-pos] Failed to save light position overlay: {e}")

	# 5) IC-Light (final images)
	saved = run_ic_light(
		foreground_image_path=foreground_path,
		light_map_path=light_map_png,
		output_dir=stage_iclight,
		base_model=args.base_model,
		ic_model_path=args.ic_weights,
		device=args.device,
		width=args.width,
		height=args.height,
		prompt=args.prompt,
		num_samples=args.samples,
		seed=args.seed,
		steps=args.steps,
		cfg_scale=args.cfg,
		lowres_denoise=args.lowres_denoise,
		highres_scale=args.highres_scale,
		highres_denoise=args.highres_denoise,
		added_prompt="best quality",
		negative_prompt="lowres, bad anatomy, bad hands, cropped, worst quality",
	)

	print("\n" + "=" * 60)
	print("Pipeline complete!")
	print("=" * 60)
	for p in saved:
		print(f"✓ {p}")
	return saved

def build_parser():
	parser = argparse.ArgumentParser(
		description="End-to-end relighting pipeline: Albedo → Normals/Depth → Light Map → IC-Light"
	)
	parser.add_argument("--input", "-i", required=True, help="Path to input image")
	parser.add_argument("--out", "-o", default="./outputs_pipeline", help="Output directory")

	# Albedo
	parser.add_argument("--albedo", action="store_true", help="Try to generate albedo")
	parser.add_argument("--albedo-version", default="v2")

	# Normals (DSINE)
	parser.add_argument("--dsine-engine", default="../models/dsine_core_fp16.plan")
	parser.add_argument("--dsine-size", type=int, default=384)

	# Depth (DepthAnything)
	parser.add_argument("--depth-engine", default="../models/depth_anything_v2_vitb_518.trt")

	# IC-Light
	parser.add_argument("--prompt", default="")
	parser.add_argument("--width", type=int, default=512)
	parser.add_argument("--height", type=int, default=512)
	parser.add_argument("--samples", type=int, default=1)
	parser.add_argument("--seed", type=int, default=12345)
	parser.add_argument("--steps", type=int, default=25)
	parser.add_argument("--cfg", type=float, default=2.0)
	parser.add_argument("--lowres-denoise", type=float, default=0.9)
	parser.add_argument("--highres-scale", type=float, default=1)
	parser.add_argument("--highres-denoise", type=float, default=0.5)
	parser.add_argument("--base-model", default="runwayml/stable-diffusion-v1-5")

	parser.add_argument(
		"--light-pos", nargs=3, type=float,
		default=[0.0, 0.0, 0.0]
	)

	parser.add_argument(
		"--ic-weights",
		default="./spatial-light-realign/model_sources/completed/IC-Light/sd1.5_adapters/iclight_sd15_fbc.safetensors",
	)

	parser.add_argument("--device", default="cuda")

	return parser



def run_pipeline_programmatically(img, light_pos, steps, prompt, output_dir="./outputs_pipeline"):
    # Build fake CLI argument list
	input_path = "./temp_input_image.png"
	img.save(input_path)

	args_list = [
		"--input", input_path,
		"--out", output_dir,

		# Albedo (default disabled)
		# "--albedo"   # (only added if True)
		"--albedo-version", "v2",

		# Normals (DSINE)
		"--dsine-engine", "../models/dsine_core_fp16.plan",
		"--dsine-size", "384",

		# Depth (DepthAnything)
		"--depth-engine", "../models/depth_anything_v2_vitb_518.trt",

		# IC-Light
		"--prompt", prompt,
		"--width", "512",
		"--height", "512",
		"--samples", "1",
		"--seed", "12345",
		"--steps", str(steps),
		"--cfg", "2.0",
		"--lowres-denoise", "0.9",
		"--highres-scale", "1",
		"--highres-denoise", "0.5",
		"--base-model", "runwayml/stable-diffusion-v1-5",

		# Light position (user-specified)
		"--light-pos", str(light_pos[0]), str(light_pos[1]), str(light_pos[2]),

		# IC-Light weights
		"--ic-weights",
		"./spatial-light-realign/model_sources/completed/IC-Light/sd1.5_adapters/iclight_sd15_fbc.safetensors",

		# Device
		"--device", "cuda",
	]

	parser = build_parser()
	args = parser.parse_args(args_list)
	return main_with_args(args)




if __name__ == "__main__":
	main()
