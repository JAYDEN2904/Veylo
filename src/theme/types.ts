import type { TextStyle, ViewStyle } from 'react-native';

/**
 * Single theme shape for light and dark. Screens should read colors from `theme.colors`
 * instead of hardcoding hex values.
 */
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  card: string;
  /** Subtle fill for chips, icon wells */
  mutedSurface: string;
  /** Slightly different panel (e.g. avatar well) */
  surfaceAlt: string;
  /** Text/icons on primary-colored buttons */
  onPrimary: string;
  /** Inactive icons, tertiary text */
  iconMuted: string;
  /** Empty-state icons */
  iconSubtle: string;
  /** Dark scrims over imagery */
  overlayStrong: string;
  info?: string;
  overlay?: string;
  shadow?: string;
}

export interface TypographyScale {
  xs: number;
  sm: number;
  md: number;
  base: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
  display: number;
}

export interface AppTheme {
  colors: ThemeColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl?: number;
    full: number;
  };
  typography: {
    header: { fontFamily?: string; fontWeight: '700' };
    body: { fontFamily?: string; fontWeight: '400' };
    scale: TypographyScale;
    h1?: TextStyle;
    h2?: TextStyle;
    h3?: TextStyle;
    caption?: TextStyle;
  };
  shadows: {
    level1: ViewStyle;
    level2: ViewStyle;
    level3: ViewStyle;
  };
  fonts?: {
    bold: string;
    regular: string;
  };
}
