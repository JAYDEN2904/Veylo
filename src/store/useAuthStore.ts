import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, StyleArchetype, StylePreference } from '../types';
import { asyncJsonStorage } from '../lib/zustandStorage';
import { clearSessionToken, setSessionToken } from '../services/sessionTokenStore';
import {
  signInWithEmail,
  signUpWithEmail,
  signOut as supabaseSignOut,
  signInWithGoogle,
  signInWithApple,
} from '../services/authService';
import {
  registerForPushNotifications,
  scheduleDailyOutfitReminder,
} from '../services/notificationService';
import { useOutfitStore } from './useOutfitStore';
import { useWardrobeStore } from './useWardrobeStore';
import { useOnboardingStore } from './useOnboardingStore';
import { useStyleStore } from './useStyleStore';
import { upsertStyleProfile } from '../services/styleProfileService';

const DAILY_REMINDER_TIME = '07:30';

const onAuthenticated = (): void => {
  void registerForPushNotifications();
  void scheduleDailyOutfitReminder(DAILY_REMINDER_TIME);
};

const resetUserStores = (): void => {
  useOutfitStore.getState().reset();
  (useWardrobeStore.getState() as unknown as { reset?: () => void }).reset?.();
};

const ARCHETYPE_TO_PREFERENCES: Record<StyleArchetype, StylePreference[]> = {
  minimal: ['minimalist', 'casual'],
  bold: ['streetwear', 'formal'],
  eclectic: ['bohemian', 'vintage'],
};

function preferencesFromArchetype(archetype: StyleArchetype | undefined): StylePreference[] {
  if (!archetype) return ['casual'];
  return ARCHETYPE_TO_PREFERENCES[archetype] ?? ['casual'];
}

const flushOnboardingAnswers = async (userId: string): Promise<void> => {
  const { answers, reset: resetOnboarding } = useOnboardingStore.getState();
  const hasAnswers = Object.keys(answers).length > 0;
  if (!hasAnswers) return;

  useStyleStore.getState().initializeStyleProfile(preferencesFromArchetype(answers.styleArchetype));

  await upsertStyleProfile(userId, answers);
  resetOnboarding();
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { user, accessToken } = await signInWithEmail(email, password);
          if (accessToken) {
            await setSessionToken(accessToken);
          }
          resetUserStores();
          set({
            isAuthenticated: true,
            isLoading: false,
            user,
          });
          if (user?.id) void flushOnboardingAnswers(user.id);
          if (accessToken) {
            onAuthenticated();
          }
        } catch (err) {
          if (__DEV__) console.error('[useAuthStore] login failed:', err);
          set({ isLoading: false });
        }
      },
      signup: async (email, password, name) => {
        set({ isLoading: true });
        try {
          const { user, accessToken } = await signUpWithEmail(email, password, name);
          if (accessToken) {
            await setSessionToken(accessToken);
          }
          resetUserStores();
          set({
            isAuthenticated: true,
            isLoading: false,
            user,
          });
          if (user?.id) void flushOnboardingAnswers(user.id);
          if (accessToken) {
            onAuthenticated();
          }
        } catch (err) {
          set({ isLoading: false, user: null, isAuthenticated: false });
          throw err;
        }
      },
      loginWithGoogle: async () => {
        set({ isLoading: true });
        try {
          const { user, accessToken } = await signInWithGoogle();
          if (accessToken) {
            await setSessionToken(accessToken);
          }
          resetUserStores();
          set({
            isAuthenticated: true,
            isLoading: false,
            user,
          });
          if (user?.id) void flushOnboardingAnswers(user.id);
          if (accessToken) {
            onAuthenticated();
          }
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },
      loginWithApple: async () => {
        set({ isLoading: true });
        try {
          const { user, accessToken } = await signInWithApple();
          if (accessToken) {
            await setSessionToken(accessToken);
          }
          resetUserStores();
          set({
            isAuthenticated: true,
            isLoading: false,
            user,
          });
          if (user?.id) void flushOnboardingAnswers(user.id);
          if (accessToken) {
            onAuthenticated();
          }
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },
      logout: async () => {
        await supabaseSignOut();
        await clearSessionToken();
        resetUserStores();
        set({ user: null, isAuthenticated: false });
      },
      updateUser: async (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },
    }),
    {
      name: 'veylo-auth-v1',
      version: 2,
      storage: asyncJsonStorage,
      migrate: (persistedState: unknown) => {
        const state = (persistedState ?? {}) as Record<string, unknown>;
        delete state.needsProfileSetup;
        return state;
      },
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
