import cv2
import numpy as np
import argparse
import os
from pathlib import Path

try:
    from chrislib.data_util import load_image as load_image_np
except Exception:
    load_image_np = None

from intrinsic.pipeline import load_models, run_pipeline


def generate_albedo(input_image: str, out_dir: str, model_version: str = "v2") -> str:
    """
    Generate albedo from input image and save PNG/NPY to out_dir.
    Returns path to saved PNG.
    """
    Path(out_dir).mkdir(parents=True, exist_ok=True)

    # load the models from the given paths
    models = load_models(model_version)

    # load an image (np float array in [0,1]) HWC
    if load_image_np is not None:
        image = load_image_np(input_image)
    else:
        img_bgr = cv2.imread(input_image, cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise ValueError(f"Failed to load image: {input_image}")
        image = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0

    # run the model on the image
    results = run_pipeline(models, image)

    alb = results['hr_alb']
    alb = np.clip(alb, 0, 1)

    if alb.ndim == 3 and alb.shape[0] == 3:  # CHW -> HWC
        alb = np.transpose(alb, (1, 2, 0))

    # save outputs
    albedo_npy = os.path.join(out_dir, "albedo.npy")
    albedo_png = os.path.join(out_dir, "albedo.png")

    np.save(albedo_npy, alb)

    # convert RGB → BGR for cv2
    alb_bgr = alb[..., ::-1]
    cv2.imwrite(albedo_png, (alb_bgr * 255).astype(np.uint8))

    return albedo_png


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Albedo generation using intrinsic.pipeline")
    parser.add_argument("--input", "-i", required=True, help="Path to input image")
    parser.add_argument("--out", "-o", default="./albedo_out", help="Output directory")
    parser.add_argument("--version", default="v2", help="Model version for load_models()")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    output_png = generate_albedo(args.input, args.out, args.version)
    print(f"Saved albedo: {output_png}")

