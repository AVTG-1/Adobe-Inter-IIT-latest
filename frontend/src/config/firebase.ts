/**
 * Firebase Configuration and Initialization
 *
 * Initialize Firebase for Google Cloud Storage integration
 */

import { FirebaseApp } from '@react-native-firebase/app';
import { STORAGE_CONFIG } from './index';

// Note: Firebase initialization in React Native Firebase happens automatically
// based on google-services.json (Android) and GoogleService-Info.plist (iOS)

// For development/testing, you can manually initialize if needed:
// import firebase from '@react-native-firebase/app';
//
// if (!firebase.apps.length) {
//   firebase.initializeApp(STORAGE_CONFIG.FIREBASE_CONFIG);
// }

/**
 * Get Firebase app instance
 * React Native Firebase auto-initializes based on native config files
 */
export const getFirebaseApp = (): FirebaseApp | null => {
  try {
    // Firebase is automatically initialized in React Native
    // Just return null here as a placeholder
    // The actual storage() calls will use the default app
    return null;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    return null;
  }
};

/**
 * Check if Firebase is properly configured
 */
export const isFirebaseConfigured = (): boolean => {
  try {
    // In a real app, you would check if native config files exist
    // For now, return true to allow development
    return true;
  } catch (error) {
    console.error('Firebase configuration check failed:', error);
    return false;
  }
};

export default {
  getFirebaseApp,
  isFirebaseConfigured,
};
