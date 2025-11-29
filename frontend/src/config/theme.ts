/**
 * Dark Mode Theme Configuration
 *
 * Centralized color scheme for the entire app
 */

export const COLORS = {
  // Dark Mode Backgrounds
  background: '#000000',
  surface: '#1A1A1A',
  card: '#2A2A2A',
  cardLight: '#3A3A3A',

  // Text Colors
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textTertiary: '#808080',

  // Accent Colors
  primary: '#00D9FF', // Teal/Cyan
  primaryDark: '#00B8D4',
  secondary: '#667eea', // Purple (legacy)

  // Status Colors
  success: '#4CAF50',
  error: '#FF5252',
  warning: '#FFC107',

  // UI Elements
  border: '#404040',
  borderLight: '#2A2A2A',
  overlay: 'rgba(0, 0, 0, 0.8)',

  // Button Colors
  buttonPrimary: '#FFFFFF',
  buttonPrimaryText: '#000000',
  buttonSecondary: '#2A2A2A',
  buttonSecondaryText: '#FFFFFF',

  // Tool Colors
  toolDefault: '#FFFFFF',
  toolActive: '#00D9FF',
  toolBackground: '#2A2A2A',
  toolBackgroundActive: '#1A1A1A',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 36,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
};
