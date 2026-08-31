import type { AppTheme } from './types';
import { Fonts } from './fonts';

export const theme: AppTheme = {
  colors: {
    primary: '#1A1C1E', // Deep Charcoal
    secondary: '#F3E5AB', // Champagne Gold
    accent: '#4338CA', // Deep Indigo
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    background: '#F8F9FA', // Soft White
    surface: '#FFFFFF',
    text: '#1A1C1E',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    card: '#FFFFFF',
    mutedSurface: '#F3F4F6',
    surfaceAlt: '#F9FAFB',
    onPrimary: '#FFFFFF',
    iconMuted: '#9CA3AF',
    iconSubtle: '#D1D5DB',
    overlayStrong: 'rgba(0, 0, 0, 0.6)',
    info: '#4DABF7',
    overlay: 'rgba(0, 0, 0, 0.5)',
    shadow: 'rgba(0, 0, 0, 0.18)',
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
    header: {
      fontFamily: Fonts.displayBold,
      fontWeight: '700' as const,
    },
    body: {
      fontFamily: Fonts.bodyRegular,
      fontWeight: '400' as const,
    },
    h1: { fontSize: 32, fontWeight: '700', fontFamily: Fonts.displayBold },
    h2: { fontSize: 24, fontWeight: '700', fontFamily: Fonts.displayBold },
    h3: { fontSize: 20, fontWeight: '600', fontFamily: Fonts.bodySemiBold },
    caption: { fontSize: 14, fontWeight: '400', fontFamily: Fonts.bodyRegular },
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
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    level2: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 4,
    },
    level3: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.18,
      shadowRadius: 60,
      elevation: 12,
    },
  },
  fonts: {
    bold: Fonts.displayBold,
    regular: Fonts.bodyRegular,
  },
};

export type { AppTheme, ThemeColors } from './types';
export { Fonts, interForWeight, frauncesForWeight } from './fonts';
