import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Appearance } from 'react-native';
import { theme as lightTheme } from '../theme';
import { darkTheme } from '../theme/darkTheme';
import type { AppTheme } from '../theme/types';
import { asyncJsonStorage } from '../lib/zustandStorage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  currentTheme: AppTheme;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
};

const getTheme = (mode: ThemeMode): AppTheme => {
  if (mode === 'system') {
    const systemTheme = getSystemTheme();
    return systemTheme === 'dark' ? darkTheme : lightTheme;
  }
  return mode === 'dark' ? darkTheme : lightTheme;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light',
      currentTheme: lightTheme,

      setMode: (mode: ThemeMode) => {
        const currentTheme = getTheme(mode);
        set({ mode, currentTheme });
      },

      toggleTheme: () => {
        const { mode } = get();
        const resolved: 'light' | 'dark' =
          mode === 'system' ? getSystemTheme() : mode === 'dark' ? 'dark' : 'light';
        const newMode: ThemeMode = resolved === 'dark' ? 'light' : 'dark';
        set({ mode: newMode, currentTheme: getTheme(newMode) });
      },
    }),
    {
      name: 'veylo-theme-v1',
      version: 1,
      storage: asyncJsonStorage,
      partialize: (state) => ({ mode: state.mode }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<ThemeState> | undefined;
        const mode = (saved?.mode ?? current.mode) as ThemeMode;
        return {
          ...current,
          ...saved,
          mode,
          currentTheme: getTheme(mode),
        };
      },
    }
  )
);
