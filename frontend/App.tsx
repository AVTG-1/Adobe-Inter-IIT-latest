import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { isFirebaseConfigured } from './src/config/firebase';

// Ignore specific warnings in development
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

export default function App() {
  useEffect(() => {
    // Check Firebase configuration on app start
    const configured = isFirebaseConfigured();
    if (!configured) {
      console.warn(
        'Firebase is not properly configured. Please set up Firebase to enable cloud storage features.'
      );
    } else {
      console.log('Firebase configuration check passed');
    }
  }, []);

  return (
    <>
      <AppNavigator />
      <StatusBar style="auto" />
    </>
  );
}
