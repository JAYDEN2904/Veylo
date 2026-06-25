import { StylePreference } from '../types';
import { useStyleStore } from '../store/useStyleStore';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Save style preferences during profile setup.
 * Initializes the local style store (which computes correct per-preference
 * scores) then syncs the computed profile into the auth store user object.
 */
export const saveStylePreferences = async (preferences: StylePreference[], _userId: string) => {
  const { initializeStyleProfile, styleProfile: computedProfile } = useStyleStore.getState();
  initializeStyleProfile(preferences);

  // Read the freshly computed profile (scores are now non-zero)
  const freshProfile = useStyleStore.getState().styleProfile ?? computedProfile;

  const { updateUser } = useAuthStore.getState();
  await updateUser({
    styleProfile: freshProfile ?? {
      preferences,
      learnedPreferences: {
        preferredColors: [],
        preferredCategories: [],
        preferredBrands: [],
        styleScore: Object.fromEntries(
          preferences.map((p) => [p, Math.floor(100 / preferences.length)])
        ) as Record<StylePreference, number>,
      },
      lastUpdated: new Date().toISOString(),
    },
  });
};
