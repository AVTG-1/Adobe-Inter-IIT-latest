/**
 * Canvas-based Image Filters
 * 
 * Implements actual image manipulation using HTML5 Canvas
 * Works on web and can be adapted for native with expo-gl
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

// Type definitions for filter operations
export interface FilterResult {
  uri: string;
  success: boolean;
  error?: string;
}

export interface AdjustmentValues {
  brightness: number;     // -100 to 100
  contrast: number;       // -100 to 100
  saturation: number;     // -100 to 100
  exposure: number;       // -100 to 100
  highlights: number;     // -100 to 100
  shadows: number;        // -100 to 100
  temperature: number;    // -100 to 100
  tint: number;          // -100 to 100
  vibrance: number;      // -100 to 100
  sharpness: number;     // 0 to 100
  clarity: number;       // -100 to 100
  dehaze: number;        // -100 to 100
  grain: number;         // 0 to 100
  vignette: number;      // -100 to 100
  fade: number;          // 0 to 100
  hue: number;           // -180 to 180
}

/**
 * Apply brightness adjustment
 * @param value -100 to 100
 */
function adjustBrightness(imageData: ImageData, value: number): void {
  const data = imageData.data;
  const factor = (value / 100) * 255;
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, data[i] + factor));     // R
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + factor)); // G
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + factor)); // B
  }
}

/**
 * Apply contrast adjustment
 * @param value -100 to 100
 */
function adjustContrast(imageData: ImageData, value: number): void {
  const data = imageData.data;
  const factor = (259 * (value + 255)) / (255 * (259 - value));
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
    data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
    data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
  }
}

/**
 * Apply saturation adjustment
 * @param value -100 to 100
 */
function adjustSaturation(imageData: ImageData, value: number): void {
  const data = imageData.data;
  const factor = 1 + (value / 100);
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.2989 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = Math.min(255, Math.max(0, gray + factor * (data[i] - gray)));
    data[i + 1] = Math.min(255, Math.max(0, gray + factor * (data[i + 1] - gray)));
    data[i + 2] = Math.min(255, Math.max(0, gray + factor * (data[i + 2] - gray)));
  }
}

/**
 * Apply hue rotation
 * @param value -180 to 180 degrees
 */
function adjustHue(imageData: ImageData, value: number): void {
  const data = imageData.data;
  const angle = value * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Matrix rotation in YIQ color space
    data[i] = Math.min(255, Math.max(0,
      r * (0.299 + 0.701 * cos + 0.168 * sin) +
      g * (0.587 - 0.587 * cos + 0.330 * sin) +
      b * (0.114 - 0.114 * cos - 0.497 * sin)
    ));
    data[i + 1] = Math.min(255, Math.max(0,
      r * (0.299 - 0.299 * cos - 0.328 * sin) +
      g * (0.587 + 0.413 * cos + 0.035 * sin) +
      b * (0.114 - 0.114 * cos + 0.292 * sin)
    ));
    data[i + 2] = Math.min(255, Math.max(0,
      r * (0.299 - 0.300 * cos + 1.250 * sin) +
      g * (0.587 - 0.588 * cos - 1.050 * sin) +
      b * (0.114 + 0.886 * cos - 0.203 * sin)
    ));
  }
}

/**
 * Apply temperature adjustment (warm/cool)
 * @param value -100 to 100 (negative = cool, positive = warm)
 */
function adjustTemperature(imageData: ImageData, value: number): void {
  const data = imageData.data;
  const factor = value / 100 * 30;
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, data[i] + factor)); // More red = warmer
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] - factor)); // Less blue = warmer
  }
}

/**
 * Apply grayscale filter
 */
function applyGrayscale(imageData: ImageData): void {
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
}

/**
 * Apply sepia filter
 */
function applySepia(imageData: ImageData): void {
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    data[i] = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
    data[i + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
    data[i + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
  }
}

/**
 * Apply invert filter
 */
function applyInvert(imageData: ImageData): void {
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
}

/**
 * Apply vignette effect
 * @param value 0 to 100
 */
function applyVignette(imageData: ImageData, value: number, width: number, height: number): void {
  if (value === 0) return;
  
  const data = imageData.data;
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
  const strength = value / 100;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      const factor = 1 - (dist / maxDist) * strength;
      
      data[i] *= factor;
      data[i + 1] *= factor;
      data[i + 2] *= factor;
    }
  }
}

/**
 * Apply blur filter (simple box blur)
 * @param radius blur radius in pixels
 */
function applyBlur(imageData: ImageData, radius: number, width: number, height: number): void {
  if (radius === 0) return;
  
  const data = imageData.data;
  const tempData = new Uint8ClampedArray(data);
  const size = radius * 2 + 1;
  const totalPixels = size * size;
  
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      let r = 0, g = 0, b = 0;
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const i = ((y + dy) * width + (x + dx)) * 4;
          r += tempData[i];
          g += tempData[i + 1];
          b += tempData[i + 2];
        }
      }
      
      const i = (y * width + x) * 4;
      data[i] = r / totalPixels;
      data[i + 1] = g / totalPixels;
      data[i + 2] = b / totalPixels;
    }
  }
}

/**
 * Main function to apply adjustments to an image
 * Works on web using canvas
 */
export async function applyAdjustments(
  imageUri: string,
  adjustments: Partial<AdjustmentValues>
): Promise<FilterResult> {
  // For web platform, use canvas
  if (Platform.OS === 'web') {
    return applyAdjustmentsWeb(imageUri, adjustments);
  }
  
  // For native, use ImageManipulator for basic operations
  // and return success for now
  try {
    // On native, we can only do basic transformations
    // Complex filters would need expo-gl
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [],
      { compress: 1, format: ImageManipulator.SaveFormat.PNG }
    );
    
    return {
      uri: result.uri,
      success: true,
    };
  } catch (error) {
    return {
      uri: imageUri,
      success: false,
      error: String(error),
    };
  }
}

/**
 * Web-specific implementation using canvas
 */
async function applyAdjustmentsWeb(
  imageUri: string,
  adjustments: Partial<AdjustmentValues>
): Promise<FilterResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ uri: imageUri, success: false, error: 'Failed to get canvas context' });
        return;
      }
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Apply adjustments in order
      if (adjustments.brightness !== undefined && adjustments.brightness !== 0) {
        adjustBrightness(imageData, adjustments.brightness);
      }
      if (adjustments.contrast !== undefined && adjustments.contrast !== 0) {
        adjustContrast(imageData, adjustments.contrast);
      }
      if (adjustments.saturation !== undefined && adjustments.saturation !== 0) {
        adjustSaturation(imageData, adjustments.saturation);
      }
      if (adjustments.hue !== undefined && adjustments.hue !== 0) {
        adjustHue(imageData, adjustments.hue);
      }
      if (adjustments.temperature !== undefined && adjustments.temperature !== 0) {
        adjustTemperature(imageData, adjustments.temperature);
      }
      if (adjustments.vignette !== undefined && adjustments.vignette !== 0) {
        applyVignette(imageData, Math.abs(adjustments.vignette), canvas.width, canvas.height);
      }
      
      // Put processed image data back
      ctx.putImageData(imageData, 0, 0);
      
      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png');
      
      resolve({
        uri: dataUrl,
        success: true,
      });
    };
    
    img.onerror = () => {
      resolve({
        uri: imageUri,
        success: false,
        error: 'Failed to load image',
      });
    };
    
    img.src = imageUri;
  });
}

/**
 * Apply a named filter to an image
 */
export async function applyFilter(
  imageUri: string,
  filterId: string
): Promise<FilterResult> {
  if (Platform.OS === 'web') {
    return applyFilterWeb(imageUri, filterId);
  }
  
  // For native, return original for now
  return {
    uri: imageUri,
    success: true,
  };
}

/**
 * Web-specific filter implementation
 */
async function applyFilterWeb(
  imageUri: string,
  filterId: string
): Promise<FilterResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ uri: imageUri, success: false, error: 'Failed to get canvas context' });
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Apply filter based on ID
      switch (filterId) {
        case 'grayscale':
          applyGrayscale(imageData);
          break;
        case 'sepia':
          applySepia(imageData);
          break;
        case 'invert':
          applyInvert(imageData);
          break;
        case 'warm':
          adjustTemperature(imageData, 30);
          break;
        case 'cool':
          adjustTemperature(imageData, -30);
          break;
        case 'vivid':
          adjustSaturation(imageData, 40);
          adjustContrast(imageData, 10);
          break;
        case 'vintage':
          applySepia(imageData);
          adjustContrast(imageData, -10);
          adjustBrightness(imageData, 10);
          break;
        case 'high_contrast':
          adjustContrast(imageData, 50);
          break;
        case 'low_contrast':
          adjustContrast(imageData, -30);
          break;
        case 'brighten':
          adjustBrightness(imageData, 30);
          break;
        case 'darken':
          adjustBrightness(imageData, -30);
          break;
        case 'desaturate':
          adjustSaturation(imageData, -50);
          break;
        case 'vignette':
          applyVignette(imageData, 50, canvas.width, canvas.height);
          break;
        case 'blur':
          applyBlur(imageData, 3, canvas.width, canvas.height);
          break;
        default:
          // Unknown filter, return original
          break;
      }
      
      ctx.putImageData(imageData, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      
      resolve({
        uri: dataUrl,
        success: true,
      });
    };
    
    img.onerror = () => {
      resolve({
        uri: imageUri,
        success: false,
        error: 'Failed to load image',
      });
    };
    
    img.src = imageUri;
  });
}

/**
 * Get histogram data from image
 */
export async function getHistogramData(imageUri: string): Promise<{
  red: number[];
  green: number[];
  blue: number[];
  luminosity: number[];
} | null> {
  if (Platform.OS !== 'web') return null;
  
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      const red = new Array(256).fill(0);
      const green = new Array(256).fill(0);
      const blue = new Array(256).fill(0);
      const luminosity = new Array(256).fill(0);
      
      for (let i = 0; i < data.length; i += 4) {
        red[data[i]]++;
        green[data[i + 1]]++;
        blue[data[i + 2]]++;
        
        const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        luminosity[lum]++;
      }
      
      // Normalize
      const maxR = Math.max(...red);
      const maxG = Math.max(...green);
      const maxB = Math.max(...blue);
      const maxL = Math.max(...luminosity);
      
      resolve({
        red: red.map(v => (v / maxR) * 100),
        green: green.map(v => (v / maxG) * 100),
        blue: blue.map(v => (v / maxB) * 100),
        luminosity: luminosity.map(v => (v / maxL) * 100),
      });
    };
    
    img.onerror = () => resolve(null);
    img.src = imageUri;
  });
}

/**
 * Pick color from image at specific coordinates
 */
export async function pickColorFromImage(
  imageUri: string,
  x: number,
  y: number,
  imageWidth: number,
  imageHeight: number
): Promise<{ hex: string; rgb: { r: number; g: number; b: number } } | null> {
  if (Platform.OS !== 'web') return null;
  
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      
      // Scale coordinates to actual image size
      const scaleX = img.width / imageWidth;
      const scaleY = img.height / imageHeight;
      const actualX = Math.floor(x * scaleX);
      const actualY = Math.floor(y * scaleY);
      
      const pixel = ctx.getImageData(actualX, actualY, 1, 1).data;
      
      const r = pixel[0];
      const g = pixel[1];
      const b = pixel[2];
      
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
      
      resolve({
        hex,
        rgb: { r, g, b },
      });
    };
    
    img.onerror = () => resolve(null);
    img.src = imageUri;
  });
}

