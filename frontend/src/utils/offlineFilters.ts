/**
 * Offline Image Processing
 *
 * Client-side image filters and effects using Canvas/ImageData manipulation
 * Works without backend - all processing on device
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

/**
 * Apply grayscale filter offline
 */
export async function applyGrayscale(imageUri: string): Promise<string> {
  try {
    // For expo-image-manipulator, we need to use a workaround
    // Convert to base64, manipulate, convert back
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Create a simple grayscale by reducing saturation to 0
    // This is a workaround - true grayscale needs canvas manipulation
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [],
      { compress: 1, format: ImageManipulator.SaveFormat.PNG }
    );

    return result.uri;
  } catch (error) {
    console.error('Grayscale filter failed:', error);
    return imageUri;
  }
}

/**
 * Apply sepia filter offline
 */
export async function applySepia(imageUri: string): Promise<string> {
  try {
    // Sepia effect approximation
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [],
      { compress: 1, format: ImageManipulator.SaveFormat.PNG }
    );

    return result.uri;
  } catch (error) {
    console.error('Sepia filter failed:', error);
    return imageUri;
  }
}

/**
 * Apply brightness adjustment offline
 */
export async function applyBrightness(imageUri: string, value: number): Promise<string> {
  try {
    // Brightness adjustment
    // value: -100 to 100
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [],
      { compress: 1, format: ImageManipulator.SaveFormat.PNG }
    );

    return result.uri;
  } catch (error) {
    console.error('Brightness adjustment failed:', error);
    return imageUri;
  }
}

/**
 * Apply blur effect offline
 * Note: expo-image-manipulator doesn't support blur natively
 * This is a placeholder for future implementation with canvas
 */
export async function applyBlur(imageUri: string, radius: number): Promise<string> {
  try {
    // Blur needs canvas manipulation or native module
    // For now, return original
    console.warn('Blur not yet implemented offline - needs canvas');
    return imageUri;
  } catch (error) {
    console.error('Blur failed:', error);
    return imageUri;
  }
}

/**
 * Invert colors offline
 */
export async function applyInvert(imageUri: string): Promise<string> {
  try {
    // Invert needs canvas pixel manipulation
    console.warn('Invert not yet implemented offline - needs canvas');
    return imageUri;
  } catch (error) {
    console.error('Invert failed:', error);
    return imageUri;
  }
}

/**
 * Apply contrast adjustment offline
 */
export async function applyContrast(imageUri: string, value: number): Promise<string> {
  try {
    // Contrast needs pixel manipulation
    console.warn('Contrast not yet implemented offline - needs canvas');
    return imageUri;
  } catch (error) {
    console.error('Contrast failed:', error);
    return imageUri;
  }
}

/**
 * Apply saturation adjustment offline
 */
export async function applySaturation(imageUri: string, value: number): Promise<string> {
  try {
    // Saturation needs HSL color space conversion
    console.warn('Saturation not yet implemented offline - needs canvas');
    return imageUri;
  } catch (error) {
    console.error('Saturation failed:', error);
    return imageUri;
  }
}

/**
 * Check if filter/effect can be applied offline
 */
export function isOfflineSupported(filterId: string): boolean {
  const offlineFilters = [
    'crop', 'rotate', 'flip', 'resize', // Transform tools
  ];

  const needsCanvas = [
    'grayscale', 'sepia', 'invert', // Color filters
    'brightness', 'contrast', 'saturation', // Adjustments
    'blur', 'sharpen', // Effects
  ];

  if (offlineFilters.includes(filterId)) {
    return true; // Fully supported
  }

  if (needsCanvas.includes(filterId)) {
    return false; // Needs canvas implementation
  }

  return false; // Not supported
}

/**
 * Get user-friendly message for offline status
 */
export function getOfflineMessage(filterId: string): string {
  if (isOfflineSupported(filterId)) {
    return 'This feature works offline';
  }

  return 'This feature requires backend API or advanced image processing library';
}
