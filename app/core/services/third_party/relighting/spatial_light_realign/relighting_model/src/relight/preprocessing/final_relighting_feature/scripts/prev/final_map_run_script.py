"""
Simple Standalone Script for .npy Files
========================================

This script provides a simple interface to process .npy normal and depth maps.

Usage:
    python run_lighting.py --normal path/to/normal.npy --depth path/to/depth.npy

Features:
- Automatic dimension matching
- Default camera parameters
- Configurable light positions
- Fast GPU processing
"""

import numpy as np
import torch
from lighting_calculator import LightingCalculator
from PIL import Image
import argparse
import os


def match_dimensions(normal_map, depth_map):
    """Match dimensions of normal and depth maps."""
    from scipy.ndimage import zoom
    
    if normal_map.ndim != 3 or normal_map.shape[2] != 3:
        raise ValueError(f"Normal map must be (H, W, 3), got {normal_map.shape}")
    
    if depth_map.ndim == 3:
        depth_map = depth_map.squeeze()
    
    H_n, W_n = normal_map.shape[:2]
    H_d, W_d = depth_map.shape[:2]
    
    if (H_n, W_n) != (H_d, W_d):
        print(f"⚠ Resizing depth {H_d}x{W_d} → {H_n}x{W_n}")
        scale_h, scale_w = H_n / H_d, W_n / W_d
        depth_map = zoom(depth_map, (scale_h, scale_w), order=1)
    
    return normal_map, depth_map


def process_lighting(normal_path, depth_path, output_dir='./outputs', 
                    light_pos=None, use_gpu=True):
    """
    Process lighting from .npy files.
    
    Args:
        normal_path: Path to normal.npy
        depth_path: Path to depth.npy
        output_dir: Output directory
        light_pos: Light position [x, y, z] or None for default
        use_gpu: Use GPU if available
    """
    print("=" * 70)
    print("LIGHTING CALCULATION FROM .NPY FILES")
    print("=" * 70)
    
    # Load files
    print("\n[1] Loading .npy files...")
    normal_map = np.load(normal_path).astype(np.float32)
    if normal_map.shape[0] == 3 and normal_map.ndim == 3:
        normal_map = normal_map.transpose(1, 2, 0)   # (3,H,W) → (H,W,3)

    depth_map = np.load(depth_path).astype(np.float32)
    
    print(f"   Normal: {normal_map.shape} | range [{normal_map.min():.3f}, {normal_map.max():.3f}]")
    print(f"   Depth:  {depth_map.shape} | range [{depth_map.min():.3f}, {depth_map.max():.3f}]")
    
    # Normalize normals if needed
    if normal_map.min() >= 0:
        if normal_map.max() <= 1.0:
            normal_map = normal_map * 2.0 - 1.0
        else:
            normal_map = (normal_map / 127.5) - 1.0
    
    # Ensure normals are unit length
    norm = np.linalg.norm(normal_map, axis=-1, keepdims=True)
    normal_map = normal_map / (norm + 1e-8)
    
    # Match dimensions
    print("\n[2] Matching dimensions...")
    normal_map, depth_map = match_dimensions(normal_map, depth_map)
    print(f"   ✓ Matched: {normal_map.shape[:2]}")
    
    # Setup light
    if light_pos is None:
        # light_pos = [2.0, +3.0, -5.0]  # Default: upper-left
        light_pos=[0.0,0.0,0.0]
    print(f"\n[3] Light position: {light_pos}")
    
    # Initialize calculator
    print("\n[4] Computing lighting...")
    calculator = LightingCalculator(use_gpu=use_gpu)
    
    import time
    start = time.time()
    intensity_map = calculator.compute_lighting_intensity(
        normal_map=normal_map,
        depth_map=depth_map,
        light_position=light_pos
    )
    elapsed = (time.time() - start) * 1000
    
    intensity_np = intensity_map.cpu().numpy()
    
    # Save outputs
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"\n[5] Saving to {output_dir}/")
    np.save(f'{output_dir}/lighting_intensity.npy', intensity_np)
    
    # Save as image
    intensity_norm = (intensity_np - intensity_np.min()) / (intensity_np.max() - intensity_np.min() + 1e-8)
    Image.fromarray((intensity_norm * 255).astype(np.uint8)).save(f'{output_dir}/lighting_intensity.png')
    
    # Save visualization
    import matplotlib.pyplot as plt
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    
    axes[0].imshow(depth_map, cmap='plasma')
    axes[0].set_title('Depth Map')
    axes[0].axis('off')
    
    axes[1].imshow((normal_map + 1) / 2)
    axes[1].set_title('Normal Map')
    axes[1].axis('off')
    
    axes[2].imshow(intensity_np, cmap='gray')
    axes[2].set_title('Lighting Intensity')
    axes[2].axis('off')
    
    plt.tight_layout()
    plt.savefig(f'{output_dir}/visualization.png', dpi=150)
    
    print(f"   ✓ lighting_intensity.npy")
    print(f"   ✓ lighting_intensity.png")
    print(f"   ✓ visualization.png")
    
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Computation time: {elapsed:.2f}ms")
    print(f"Output shape: {intensity_np.shape}")
    print(f"Intensity range: [{intensity_np.min():.4f}, {intensity_np.max():.4f}]")
    print(f"Mean: {intensity_np.mean():.4f} | Std: {intensity_np.std():.4f}")
    print("=" * 70)
    
    return intensity_np


if __name__ == "__main__":
    
    
    process_lighting(
        normal_path='normal_raw.npy',
        depth_path='depth_test_output.npy',
        output_dir='outputs_f7',
        use_gpu=True
    )