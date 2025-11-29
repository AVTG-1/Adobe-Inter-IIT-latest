/**
 * Local Image Processing Utilities
 * All image operations are performed locally using Expo ImageManipulator
 * No cloud uploads or external API calls
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface CropArea {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export interface AdjustmentParams {
  brightness?: number;    // -1.0 to 1.0
  contrast?: number;      // -1.0 to 1.0
  saturation?: number;    // -1.0 to 1.0
}

/**
 * Get image dimensions from URI
 */
export async function getImageDimensions(uri: string): Promise<ImageDimensions> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [],
      { format: ImageManipulator.SaveFormat.JPEG }
    );

    // Get dimensions from file info
    const info = await FileSystem.getInfoAsync(result.uri);
    if (!info.exists) {
      throw new Error('Image file not found');
    }

    // Read image to get dimensions
    const manipResult = await ImageManipulator.manipulateAsync(uri, []);
    return {
      width: manipResult.width,
      height: manipResult.height,
    };
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    throw error;
  }
}

/**
 * Resize image to fit within max dimensions while preserving aspect ratio
 */
export async function resizeImage(
  uri: string,
  maxWidth: number,
  maxHeight: number
): Promise<string> {
  try {
    const dimensions = await getImageDimensions(uri);
    const aspectRatio = dimensions.width / dimensions.height;

    let newWidth = dimensions.width;
    let newHeight = dimensions.height;

    if (newWidth > maxWidth) {
      newWidth = maxWidth;
      newHeight = newWidth / aspectRatio;
    }

    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = newHeight * aspectRatio;
    }

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: newWidth, height: newHeight } }],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );

    return result.uri;
  } catch (error) {
    console.error('Error resizing image:', error);
    throw error;
  }
}

/**
 * Crop image to specified area
 */
export async function cropImage(uri: string, cropArea: CropArea): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          crop: {
            originX: cropArea.originX,
            originY: cropArea.originY,
            width: cropArea.width,
            height: cropArea.height,
          },
        },
      ],
      { compress: 1.0, format: ImageManipulator.SaveFormat.PNG }
    );

    return result.uri;
  } catch (error) {
    console.error('Error cropping image:', error);
    throw error;
  }
}

/**
 * Rotate image by specified degrees (90, 180, 270)
 */
export async function rotateImage(uri: string, degrees: 90 | 180 | 270): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ rotate: degrees }],
      { compress: 1.0, format: ImageManipulator.SaveFormat.PNG }
    );

    return result.uri;
  } catch (error) {
    console.error('Error rotating image:', error);
    throw error;
  }
}

/**
 * Flip image horizontally or vertically
 */
export async function flipImage(
  uri: string,
  direction: 'horizontal' | 'vertical'
): Promise<string> {
  try {
    const flipAction = direction === 'horizontal'
      ? ImageManipulator.FlipType.Horizontal
      : ImageManipulator.FlipType.Vertical;

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ flip: flipAction }],
      { compress: 1.0, format: ImageManipulator.SaveFormat.PNG }
    );

    return result.uri;
  } catch (error) {
    console.error('Error flipping image:', error);
    throw error;
  }
}

/**
 * Apply filter to image
 * Note: Expo ImageManipulator has limited built-in filters.
 * For advanced filters, we'd need to use expo-gl or canvas
 */
export async function applyFilter(
  uri: string,
  filterType: string,
  intensity: number = 1.0
): Promise<string> {
  try {
    // Map filter types to available transformations
    const actions: ImageManipulator.Action[] = [];

    switch (filterType) {
      case 'grayscale':
        // Simulate grayscale by reducing saturation
        actions.push({
          // Note: Expo doesn't have built-in grayscale,
          // This is a placeholder for the actual implementation
        });
        break;

      case 'sepia':
        // Sepia effect (would need custom implementation)
        break;

      case 'brighten':
        // Brightness adjustment (would need custom implementation)
        break;

      case 'darken':
        // Darkness adjustment (would need custom implementation)
        break;

      default:
        // Return original if filter not supported
        return uri;
    }

    // For now, return original URI as Expo ImageManipulator
    // doesn't support color filters directly
    // We'll need to implement these using expo-gl or canvas later
    console.warn(`Filter "${filterType}" not yet implemented`);
    return uri;

  } catch (error) {
    console.error('Error applying filter:', error);
    return uri; // Return original on error
  }
}

/**
 * Apply brightness/contrast/saturation adjustments
 * Note: For full implementation, we'd use expo-gl or canvas
 */
export async function adjustImage(
  uri: string,
  adjustments: AdjustmentParams
): Promise<string> {
  try {
    // Expo ImageManipulator doesn't support color adjustments directly
    // This would require expo-gl or canvas implementation

    console.warn('Color adjustments not yet fully implemented');
    console.log('Adjustments requested:', adjustments);

    // Placeholder: Return original URI
    // TODO: Implement using expo-gl or canvas
    return uri;

  } catch (error) {
    console.error('Error adjusting image:', error);
    return uri;
  }
}

/**
 * Convert image to different format
 */
export async function convertFormat(
  uri: string,
  format: 'jpeg' | 'png' | 'webp',
  quality: number = 1.0
): Promise<string> {
  try {
    const formatMap = {
      jpeg: ImageManipulator.SaveFormat.JPEG,
      png: ImageManipulator.SaveFormat.PNG,
      webp: ImageManipulator.SaveFormat.WEBP,
    };

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [],
      { compress: quality, format: formatMap[format] }
    );

    return result.uri;
  } catch (error) {
    console.error('Error converting format:', error);
    throw error;
  }
}

/**
 * Create a copy of the image (for undo/redo purposes)
 */
export async function duplicateImage(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [],
      { compress: 1.0, format: ImageManipulator.SaveFormat.PNG }
    );

    return result.uri;
  } catch (error) {
    console.error('Error duplicating image:', error);
    throw error;
  }
}

/**
 * Delete temporary image file
 */
export async function deleteImageFile(uri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch (error) {
    console.error('Error deleting image file:', error);
  }
}

/**
 * Calculate aspect ratio
 */
export function calculateAspectRatio(width: number, height: number): number {
  return width / height;
}

/**
 * Get fitted dimensions to fit image in container while preserving aspect ratio
 */
export function getFittedDimensions(
  imageWidth: number,
  imageHeight: number,
  containerWidth: number,
  containerHeight: number
): ImageDimensions {
  const imageAspectRatio = imageWidth / imageHeight;
  const containerAspectRatio = containerWidth / containerHeight;

  let width: number;
  let height: number;

  if (imageAspectRatio > containerAspectRatio) {
    // Image is wider than container
    width = containerWidth;
    height = containerWidth / imageAspectRatio;
  } else {
    // Image is taller than container
    height = containerHeight;
    width = containerHeight * imageAspectRatio;
  }

  return { width, height };
}
