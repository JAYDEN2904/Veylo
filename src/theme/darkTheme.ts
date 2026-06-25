import { Platform } from 'react-native';
import type { AppTheme } from './types';

const fontFamily = Platform.select({
  ios: { bold: 'System', regular: 'System' },
  android: { bold: 'sans-serif-medium', regular: 'sans-serif' },
  default: { bold: 'System', regular: 'System' },
});

/**
 * Dark mode — same shape as light `theme` (see theme/index.ts).
 */
export const darkTheme: AppTheme = {
  colors: {
    primary: '#E8E8E8',
    secondary: '#D4AF37',
    accent: '#818CF8',
    background: '#0F0F0F',
    surface: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    border: '#2A2A2A',
    error: '#FF6B6B',
    success: '#51CF66',
    warning: '#FFD93D',
    info: '#4DABF7',
    card: '#1E1E1E',
    mutedSurface: '#2A2A2A',
    surfaceAlt: '#1A1A1A',
    onPrimary: '#0F0F0F',
    iconMuted: '#9CA3AF',
    iconSubtle: '#6B7280',
    overlayStrong: 'rgba(0, 0, 0, 0.75)',
    overlay: 'rgba(0, 0, 0, 0.8)',
    shadow: 'rgba(0, 0, 0, 0.5)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  typography: {
    header: { fontFamily: fontFamily?.bold, fontWeight: '700' },
    body: { fontFamily: fontFamily?.regular, fontWeight: '400' },
    h1: { fontSize: 32, fontWeight: '700' },
    h2: { fontSize: 24, fontWeight: '700' },
    h3: { fontSize: 20, fontWeight: '600' },
    caption: { fontSize: 14, fontWeight: '400' },
    scale: {
      xs: 11,
      sm: 13,
      md: 15,
      base: 17,
      lg: 20,
      xl: 24,
      xxl: 28,
      xxxl: 34,
      display: 44,
    },
  },
  shadows: {
    level1: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 2,
    },
    level2: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 4,
    },
    level3: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.35,
      shadowRadius: 60,
      elevation: 12,
    },
  },
  fonts: fontFamily,
};
