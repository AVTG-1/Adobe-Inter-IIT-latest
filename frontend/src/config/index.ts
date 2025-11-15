/**
 * App Configuration
 *
 * Environment-specific settings for the application
 */

// API Configuration
export const API_CONFIG = {
  // Backend FastAPI server URL
  // In development: http://localhost:8000/api/v1
  // In production: Update with deployed backend URL
  BASE_URL: __DEV__
    ? 'http://localhost:8000/api/v1'
    : 'https://your-production-backend.com/api/v1',

  // Use mock data instead of real API calls (useful for development)
  USE_MOCK_DATA: true,

  // Request timeout in milliseconds
  TIMEOUT: 30000,
};

// App Configuration
export const APP_CONFIG = {
  // Splash screen timing (milliseconds)
  SPLASH_DURATION: 2000,

  // Animation durations
  ANIMATION_DURATION: {
    FAST: 300,
    NORMAL: 600,
    SLOW: 1000,
  },
};

// Feature Flags
export const FEATURES = {
  ENABLE_ANALYTICS: false,
  ENABLE_CRASH_REPORTING: false,
  ENABLE_OFFLINE_MODE: false,
};

// Google Cloud Storage / Firebase Storage Configuration
export const STORAGE_CONFIG = {
  // Your Firebase project configuration
  // Get these values from Firebase Console > Project Settings
  FIREBASE_CONFIG: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT_ID.appspot.com',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId: 'YOUR_APP_ID',
  },

  // Storage bucket name (if different from default)
  BUCKET_NAME: 'YOUR_PROJECT_ID.appspot.com',

  // Folder structure in storage
  FOLDERS: {
    UPLOADS: 'uploads',
    EDITED: 'edited',
    THUMBNAILS: 'thumbnails',
  },

  // Upload settings
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FORMATS: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
};
