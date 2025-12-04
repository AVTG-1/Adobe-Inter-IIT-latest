#!/usr/bin/env python3
"""
IC-Light Script (No CLI Version)

All settings are defined as variables instead of command-line arguments.
"""

from pathlib import Path
import sys
from iclight_core import ICLightModel, LightDirection, load_image, save_images


# ============================================================
# User-configurable variables (replace these directly)
# ============================================================

INPUT_IMAGE = "scene.jpg"
PROMPT = "lighting"

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
STEPS = 25
CFG_SCALE = 2.0

# Advanced settings
LOWRES_DENOISE = 0.9
HIGHRES_SCALE = 1.5
HIGHRES_DENOISE = 0.5
ADDED_PROMPT = "best quality"
NEGATIVE_PROMPT = "lowres, bad anatomy, bad hands, cropped, worst quality"


# ============================================================
# Validation (same logic as before)
# ============================================================

def validate():
    if not Path(INPUT_IMAGE).exists():
        print(f"Error: Input file not found: {INPUT_IMAGE}")
        sys.exit(1)

    if LIGHT_MAP_PATH and not Path(LIGHT_MAP_PATH).exists():
        print(f"Error: Light map file not found: {LIGHT_MAP_PATH}")
        sys.exit(1)

    if WIDTH % 64 != 0 or HEIGHT % 64 != 0:
        print("Error: WIDTH and HEIGHT must be multiples of 64")
        sys.exit(1)

    if not (0.0 <= LOWRES_DENOISE <= 1.0):
        print("Error: LOWRES_DENOISE must be 0.0–1.0")
        sys.exit(1)

    if not (0.0 <= HIGHRES_DENOISE <= 1.0):
        print("Error: HIGHRES_DENOISE must be 0.0–1.0")
        sys.exit(1)

    if CFG_SCALE < 1.0:
        print("Error: CFG_SCALE must be >= 1.0")
        sys.exit(1)


# ============================================================
# Main logic
# ============================================================

def main():
    validate()

    print("="*60)
    print("IC-Light Image Relighting (Variables Only Version)")
    print("="*60)
    print(f"Input: {INPUT_IMAGE}")
    print(f"Prompt: {PROMPT}")
    print(f"Output: {OUTPUT_DIR}")
    print("="*60)

    # Load input image
    print("\nLoading input image...")
    input_image = load_image(INPUT_IMAGE)
    print(f"Image shape: {input_image.shape}")

    # Load custom light map
    light_map = None
    if LIGHT_MAP_PATH:
        print(f"\nLoading custom light map: {LIGHT_MAP_PATH}")
        light_map = load_image(LIGHT_MAP_PATH)

    # Initialize model
    print("\nInitializing IC-Light model...")
    model = ICLightModel(
        base_model=BASE_MODEL,
        ic_model_path=IC_MODEL_PATH,
        device=DEVICE
    )

    # Parse directional enum
    light_direction_enum = LightDirection[LIGHT_DIRECTION.upper()]

    # Run relighting
    print("\n" + "="*60)
    print("Running relighting...")
    print(f"  Light direction: {LIGHT_DIRECTION}")
    print(f"  Dimensions: {WIDTH}x{HEIGHT}")
    print(f"  Steps: {STEPS}")
    print(f"  CFG Scale: {CFG_SCALE}")
    print(f"  Seed: {SEED}")
    print(f"  Samples: {NUM_SAMPLES}")
    print("="*60)

    results = model.relight(
        foreground_image=input_image,
        prompt=PROMPT,
        light_direction=light_direction_enum,
        light_map=light_map,
        width=WIDTH,
        height=HEIGHT,
        num_samples=NUM_SAMPLES,
        seed=SEED,
        steps=STEPS,
        cfg_scale=CFG_SCALE,
        lowres_denoise=LOWRES_DENOISE,
        highres_scale=HIGHRES_SCALE,
        highres_denoise=HIGHRES_DENOISE,
        added_prompt=ADDED_PROMPT,
        negative_prompt=NEGATIVE_PROMPT,
    )

    # Save output
    print("\nSaving results...")
    save_images(results, OUTPUT_DIR, OUTPUT_PREFIX)

    print("\n" + "="*60)
    print(f"✓ Generated {len(results)} image(s) successfully!")
    print("="*60)


if __name__ == "__main__":
    main()
