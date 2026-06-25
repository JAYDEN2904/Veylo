import { Appearance, Platform } from 'react-native';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { ThemeMode } from '../store/useThemeStore';

function resolveTabSchemeIsDark(mode: ThemeMode): boolean {
  const scheme = mode === 'system' ? Appearance.getColorScheme() : mode;
  return scheme === 'dark';
}

/**
 * Floating pill tab bar — must stay in sync with MainTabs screenOptions.tabBarStyle.
 */
export function getMainTabBarFloatingStyle(
  mode: ThemeMode,
  surfaceColor: string
): NonNullable<BottomTabNavigationOptions['tabBarStyle']> {
  const isDark = resolveTabSchemeIsDark(mode);
  const floatingBarBg = Platform.OS === 'ios' ? 'transparent' : surfaceColor;
  return {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 20,
    right: 20,
    elevation: 0,
    backgroundColor: floatingBarBg,
    borderRadius: 28,
    height: 72,
    shadowColor: isDark ? 'rgba(0,0,0,0.35)' : '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: isDark ? 0.45 : 0.12,
    shadowRadius: 16,
    borderTopWidth: 0,
    paddingBottom: 0,
  };
}

export const MAIN_TAB_BAR_HIDDEN_STYLE: NonNullable<BottomTabNavigationOptions['tabBarStyle']> = {
  display: 'none',
};
