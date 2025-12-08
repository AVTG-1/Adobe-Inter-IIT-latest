#!/usr/bin/env python3
"""
IC-Light Script (No CLI Version)

All settings are defined as variables instead of command-line arguments.
"""

from pathlib import Path
import sys
import argparse
from iclight_core import ICLightModel, LightDirection, load_image, save_images


# ============================================================
# User-configurable variables (replace these directly)
# ============================================================

INPUT_IMAGE = "scene.jpg"
PROMPT = "lighting based on light map"

# Light map / direction
LIGHT_DIRECTION = "left"    # one of: none, left, right, top, bottom
LIGHT_MAP_PATH = 'light_map_output.jpg'       # or path string

# Output settings
OUTPUT_DIR = "./outputs"
OUTPUT_PREFIX = "relit"

# Model settings
BASE_MODEL = "runwayml/stable-diffusion-v1-5"
IC_MODEL_PATH = "./spatial-light-realign/model_sources/completed/IC-Light/sd1.5_adapters/iclight_sd15_fc.safetensors"
DEVICE = "cuda"

# Image dimensions (multiple of 64)
WIDTH = 512
HEIGHT = 512

# Generation parameters
NUM_SAMPLES = 1
SEED = 12345
STEPS = 100
CFG_SCALE = 2.0

# Advanced settings
LOWRES_DENOISE = 0.9
HIGHRES_SCALE = 1.0
HIGHRES_DENOISE = 0.5
ADDED_PROMPT = "best quality"
NEGATIVE_PROMPT = "lowres, bad anatomy, bad hands, cropped, worst quality"


# ============================================================
# Validation (same logic as before)
# ============================================================

def validate(args):
    if not Path(args.input_image).exists():
        print(f"Error: Input file not found: {args.input_image}")
        sys.exit(1)

    if args.light_map_path and not Path(args.light_map_path).exists():
        print(f"Error: Light map file not found: {args.light_map_path}")
        sys.exit(1)

    if args.width % 64 != 0 or args.height % 64 != 0:
        print("Error: WIDTH and HEIGHT must be multiples of 64")
        sys.exit(1)

    if not (0.0 <= args.lowres_denoise <= 1.0):
        print("Error: LOWRES_DENOISE must be 0.0–1.0")
        sys.exit(1)

    if not (0.0 <= args.highres_denoise <= 1.0):
        print("Error: HIGHRES_DENOISE must be 0.0–1.0")
        sys.exit(1)

    if args.cfg_scale < 1.0:
        print("Error: CFG_SCALE must be >= 1.0")
        sys.exit(1)


# ============================================================
# Main logic
# ============================================================

def run_ic_light(
    input_image: str,
    light_map_path: str,
    output_dir: str,
    output_prefix: str,
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
    light_direction: str = "none",
):
    validate(argparse.Namespace(
        input_image=input_image,
        light_map_path=light_map_path,
        width=width,
        height=height,
        lowres_denoise=lowres_denoise,
        highres_denoise=highres_denoise,
        cfg_scale=cfg_scale,
    ))
    img = load_image(input_image)
    lm = load_image(light_map_path) if light_map_path else None
    model = ICLightModel(base_model=base_model, ic_model_path=ic_model_path, device=device)
    ld_enum = LightDirection[light_direction.upper()]
    results = model.relight(
        foreground_image=img,
        prompt=prompt,
        light_direction=ld_enum,
        light_map=lm,
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
    saved = save_images(results, output_dir, output_prefix)
    return saved


def main(args):
    validate(args)

    print("="*60)
    print("IC-Light Image Relighting (Variables Only Version)")
    print("="*60)
    print(f"Input: {args.input_image}")
    print(f"Prompt: {args.prompt}")
    print(f"Output: {args.output_dir}")
    print("="*60)

    # Load input image
    print("\nLoading input image...")
    input_image = load_image(args.input_image)
    print(f"Image shape: {input_image.shape}")

    # Load custom light map
    light_map = None
    if args.light_map_path:
        print(f"\nLoading custom light map: {args.light_map_path}")
        light_map = load_image(args.light_map_path)

    # Initialize model
    print("\nInitializing IC-Light model...")
    model = ICLightModel(
        base_model=args.base_model,
        ic_model_path=args.ic_model_path,
        device=args.device
    )

    # Parse directional enum
    light_direction_enum = LightDirection[args.light_direction.upper()]

    # Run relighting
    print("\n" + "="*60)
    print("Running relighting...")
    print(f"  Light direction: {args.light_direction}")
    print(f"  Dimensions: {args.width}x{args.height}")
    print(f"  Steps: {args.steps}")
    print(f"  CFG Scale: {args.cfg_scale}")
    print(f"  Seed: {args.seed}")
    print(f"  Samples: {args.num_samples}")
    print("="*60)

    results = model.relight(
        foreground_image=input_image,
        prompt=args.prompt,
        light_direction=light_direction_enum,
        light_map=light_map,
        width=args.width,
        height=args.height,
        num_samples=args.num_samples,
        seed=args.seed,
        steps=args.steps,
        cfg_scale=args.cfg_scale,
        lowres_denoise=args.lowres_denoise,
        highres_scale=args.highres_scale,
        highres_denoise=args.highres_denoise,
        added_prompt=args.added_prompt,
        negative_prompt=args.negative_prompt,
    )

    # Save output
    print("\nSaving results...")
    save_images(results, args.output_dir, args.output_prefix)

    print("\n" + "="*60)
    print(f"✓ Generated {len(results)} image(s) successfully!")
    print("="*60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="IC-Light image relighting")
    parser.add_argument("--input-image", "-i", default=INPUT_IMAGE)
    parser.add_argument("--prompt", default=PROMPT)
    parser.add_argument("--light-direction", default=LIGHT_DIRECTION, choices=["none", "left", "right", "top", "bottom"])
    parser.add_argument("--light-map-path", default=LIGHT_MAP_PATH)
    parser.add_argument("--output-dir", default=OUTPUT_DIR)
    parser.add_argument("--output-prefix", default=OUTPUT_PREFIX)
    parser.add_argument("--base-model", default=BASE_MODEL)
    parser.add_argument("--ic-model-path", default=IC_MODEL_PATH)
    parser.add_argument("--device", default=DEVICE)
    parser.add_argument("--width", type=int, default=WIDTH)
    parser.add_argument("--height", type=int, default=HEIGHT)
    parser.add_argument("--num-samples", type=int, default=NUM_SAMPLES)
    parser.add_argument("--seed", type=int, default=SEED)
    parser.add_argument("--steps", type=int, default=STEPS)
    parser.add_argument("--cfg-scale", type=float, default=CFG_SCALE)
    parser.add_argument("--lowres-denoise", type=float, default=LOWRES_DENOISE)
    parser.add_argument("--highres-scale", type=float, default=HIGHRES_SCALE)
    parser.add_argument("--highres-denoise", type=float, default=HIGHRES_DENOISE)
    parser.add_argument("--added-prompt", default=ADDED_PROMPT)
    parser.add_argument("--negative-prompt", default=NEGATIVE_PROMPT)
    args = parser.parse_args()
    main(args)
