/**
 * Image Fit & Center Utility
 * 
 * Computes transform to fit and center an image within a canvas
 * Uses "contain" behavior - preserves aspect ratio, fits entirely within bounds
 */

export interface FitResult {
  x: number;      // X position (centered)
  y: number;      // Y position (centered)
  scale: number;  // Scale factor to fit
  width: number;  // Final width after scaling
  height: number; // Final height after scaling
}

/**
 * Calculate position and scale to fit image inside canvas (contain behavior)
 * Image will be centered and fully visible, with possible letterboxing
 */
export function fitAndCenter(
  imgW: number,
  imgH: number,
  canvasW: number,
  canvasH: number
): FitResult {
  // Scale to fit inside canvas (contain - use min)
  const scale = Math.min(canvasW / imgW, canvasH / imgH);
  
  // Calculate final dimensions
  const width = imgW * scale;
  const height = imgH * scale;
  
  // Center position
  const x = (canvasW - width) / 2;
  const y = (canvasH - height) / 2;

  return { x, y, scale, width, height };
}

/**
 * Calculate position and scale to cover canvas (cover behavior)
 * Image will fill entire canvas, may be cropped
 */
export function fillAndCenter(
  imgW: number,
  imgH: number,
  canvasW: number,
  canvasH: number
): FitResult {
  // Scale to cover canvas (cover - use max)
  const scale = Math.max(canvasW / imgW, canvasH / imgH);
  
  // Calculate final dimensions
  const width = imgW * scale;
  const height = imgH * scale;
  
  // Center position (will be negative if image is larger than canvas)
  const x = (canvasW - width) / 2;
  const y = (canvasH - height) / 2;

  return { x, y, scale, width, height };
}

/**
 * Get image dimensions from URI (works on both web and React Native)
 */
export function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
      // Web environment
      const img = new window.Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = uri;
    } else {
      // React Native - use RN Image
      const { Image } = require('react-native');
      Image.getSize(
        uri,
        (width: number, height: number) => resolve({ width, height }),
        reject
      );
    }
  });
}

