/**
 * Google Cloud Storage / Firebase Storage Service
 *
 * Handles image uploads to GCS via Firebase Storage
 */

import storage from '@react-native-firebase/storage';
import { STORAGE_CONFIG } from '../config';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number; // 0-100
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fileName?: string;
}

/**
 * Upload an image to Google Cloud Storage
 *
 * @param uri - Local file URI from image picker or camera
 * @param folder - Folder name in storage (uploads, edited, etc.)
 * @param onProgress - Optional callback for upload progress
 * @returns Promise with upload result containing GCS URL
 */
export const uploadImageToGCS = async (
  uri: string,
  folder: string = STORAGE_CONFIG.FOLDERS.UPLOADS,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileName = `${folder}/${timestamp}_${randomString}.jpg`;

    console.log('Starting upload to GCS:', fileName);
    console.log('Local URI:', uri);

    // Create storage reference
    const reference = storage().ref(fileName);

    // Start upload task
    const uploadTask = reference.putFile(uri);

    // Monitor upload progress
    if (onProgress) {
      uploadTask.on('state_changed', (snapshot) => {
        const progress: UploadProgress = {
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
        };
        onProgress(progress);
      });
    }

    // Wait for upload to complete
    await uploadTask;

    // Get download URL
    const downloadURL = await reference.getDownloadURL();

    console.log('Upload successful! URL:', downloadURL);

    return {
      success: true,
      url: downloadURL,
      fileName: fileName,
    };
  } catch (error: any) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error.message || 'Upload failed',
    };
  }
};

/**
 * Delete an image from GCS
 *
 * @param fileNameOrUrl - File name or full URL to delete
 * @returns Promise<boolean> indicating success
 */
export const deleteImageFromGCS = async (
  fileNameOrUrl: string
): Promise<boolean> => {
  try {
    let fileName = fileNameOrUrl;

    // If it's a URL, extract the file path
    if (fileNameOrUrl.includes('firebasestorage.googleapis.com')) {
      const url = new URL(fileNameOrUrl);
      const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
      if (pathMatch) {
        fileName = decodeURIComponent(pathMatch[1]);
      }
    }

    const reference = storage().ref(fileName);
    await reference.delete();

    console.log('File deleted successfully:', fileName);
    return true;
  } catch (error: any) {
    console.error('Delete error:', error);
    return false;
  }
};

/**
 * Validate image file before upload
 *
 * @param uri - Local file URI
 * @param fileSize - File size in bytes
 * @param mimeType - File MIME type
 * @returns Object with validation result and error message
 */
export const validateImage = (
  uri: string,
  fileSize?: number,
  mimeType?: string
): { valid: boolean; error?: string } => {
  // Check if URI exists
  if (!uri) {
    return { valid: false, error: 'No image selected' };
  }

  // Check file size
  if (fileSize && fileSize > STORAGE_CONFIG.MAX_FILE_SIZE) {
    const maxSizeMB = STORAGE_CONFIG.MAX_FILE_SIZE / (1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  // Check file format
  if (mimeType && !STORAGE_CONFIG.ALLOWED_FORMATS.includes(mimeType)) {
    return {
      valid: false,
      error: 'Invalid file format. Please use JPEG, PNG, or WebP',
    };
  }

  return { valid: true };
};
