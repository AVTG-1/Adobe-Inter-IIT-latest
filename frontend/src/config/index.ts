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
