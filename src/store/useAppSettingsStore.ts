import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { asyncJsonStorage } from '../lib/zustandStorage';
import {
  cancelAllNotifications,
  scheduleDailyOutfitReminder,
} from '../services/notificationService';

export interface AppSettingsState {
  outfitSuggestions: boolean;
  weatherAlerts: boolean;
  newFeatures: boolean;
  weeklyDigest: boolean;
  wearingReminders: boolean;
  analyticsEnabled: boolean;
  crashReportsEnabled: boolean;
  autoBackupEnabled: boolean;
  setOutfitSuggestions: (value: boolean) => Promise<void>;
  setWeatherAlerts: (value: boolean) => void;
  setNewFeatures: (value: boolean) => void;
  setWeeklyDigest: (value: boolean) => void;
  setWearingReminders: (value: boolean) => Promise<void>;
  setAnalyticsEnabled: (value: boolean) => void;
  setCrashReportsEnabled: (value: boolean) => void;
  setAutoBackupEnabled: (value: boolean) => void;
  reset: () => void;
}

const DEFAULTS: Pick<
  AppSettingsState,
  | 'outfitSuggestions'
  | 'weatherAlerts'
  | 'newFeatures'
  | 'weeklyDigest'
  | 'wearingReminders'
  | 'analyticsEnabled'
  | 'crashReportsEnabled'
  | 'autoBackupEnabled'
> = {
  outfitSuggestions: true,
  weatherAlerts: true,
  newFeatures: true,
  weeklyDigest: false,
  wearingReminders: true,
  analyticsEnabled: true,
  crashReportsEnabled: true,
  autoBackupEnabled: true,
};

async function syncDailyReminder(enabled: boolean): Promise<void> {
  try {
    if (enabled) {
      await scheduleDailyOutfitReminder('07:30');
      return;
    }
    await cancelAllNotifications();
  } catch (err) {
    if (__DEV__) console.warn('[useAppSettingsStore] reminder sync', err);
  }
}

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      setOutfitSuggestions: async (value) => {
        set({ outfitSuggestions: value });
        await syncDailyReminder(value || get().wearingReminders);
      },
      setWeatherAlerts: (value) => set({ weatherAlerts: value }),
      setNewFeatures: (value) => set({ newFeatures: value }),
      setWeeklyDigest: (value) => set({ weeklyDigest: value }),
      setWearingReminders: async (value) => {
        set({ wearingReminders: value });
        await syncDailyReminder(get().outfitSuggestions || value);
      },
      setAnalyticsEnabled: (value) => set({ analyticsEnabled: value }),
      setCrashReportsEnabled: (value) => set({ crashReportsEnabled: value }),
      setAutoBackupEnabled: (value) => set({ autoBackupEnabled: value }),
      reset: () => set(DEFAULTS),
    }),
    {
      name: 'veylo-app-settings-v1',
      version: 1,
      storage: asyncJsonStorage,
      partialize: (state) => ({
        outfitSuggestions: state.outfitSuggestions,
        weatherAlerts: state.weatherAlerts,
        newFeatures: state.newFeatures,
        weeklyDigest: state.weeklyDigest,
        wearingReminders: state.wearingReminders,
        analyticsEnabled: state.analyticsEnabled,
        crashReportsEnabled: state.crashReportsEnabled,
        autoBackupEnabled: state.autoBackupEnabled,
      }),
    }
  )
);
