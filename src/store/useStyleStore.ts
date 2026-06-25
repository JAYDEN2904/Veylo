import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StylePreference, StyleProfile, ClothingItem, Outfit } from '../types';
import { asyncJsonStorage } from '../lib/zustandStorage';

interface StyleStore {
  styleProfile: StyleProfile | null;
  userActions: {
    favoriteOutfits: string[];
    favoriteItems: string[];
    wornItems: string[];
    outfitFeedback: Record<string, 'liked' | 'disliked' | 'worn'>;
    /** Purchase / style recommendation cards */
    recommendationThumbs: Record<string, 'up' | 'down'>;
  };

  // Actions
  initializeStyleProfile: (preferences: StylePreference[]) => void;
  updateStylePreferences: (preferences: StylePreference[]) => void;
  recordFavoriteOutfit: (outfitId: string) => void;
  recordFavoriteItem: (itemId: string) => void;
  recordWornItem: (itemId: string) => void;
  recordOutfitFeedback: (outfitId: string, feedback: 'liked' | 'disliked' | 'worn') => void;
  recordRecommendationThumb: (recommendationId: string, thumb: 'up' | 'down') => void;
  learnFromActions: (items: ClothingItem[], outfits: Outfit[]) => void;
  calculateStyleMatchScore: (outfit: Outfit) => number;
}

const calculateInitialStyleScore = (
  preferences: StylePreference[]
): Record<StylePreference, number> => {
  const baseScore = Math.floor(100 / preferences.length);
  const score: Record<StylePreference, number> = {
    minimalist: 0,
    casual: 0,
    formal: 0,
    streetwear: 0,
    bohemian: 0,
    vintage: 0,
  };

  preferences.forEach((pref) => {
    score[pref] = baseScore;
  });

  return score;
};

export const useStyleStore = create<StyleStore>()(
  persist(
    (set, get) => ({
      styleProfile: null,
      userActions: {
        favoriteOutfits: [],
        favoriteItems: [],
        wornItems: [],
        outfitFeedback: {},
        recommendationThumbs: {},
      },

      initializeStyleProfile: (preferences: StylePreference[]) => {
        const styleProfile: StyleProfile = {
          preferences,
          learnedPreferences: {
            preferredColors: [],
            preferredCategories: [],
            preferredBrands: [],
            styleScore: calculateInitialStyleScore(preferences),
          },
          lastUpdated: new Date().toISOString(),
        };

        set({ styleProfile });
      },

      updateStylePreferences: (preferences: StylePreference[]) => {
        const { styleProfile } = get();
        if (!styleProfile) {
          get().initializeStyleProfile(preferences);
          return;
        }

        set({
          styleProfile: {
            ...styleProfile,
            preferences,
            learnedPreferences: {
              ...styleProfile.learnedPreferences,
              styleScore: calculateInitialStyleScore(preferences),
            },
            lastUpdated: new Date().toISOString(),
          },
        });
      },

      recordFavoriteOutfit: (outfitId: string) => {
        const { userActions } = get();
        const favoriteOutfits = userActions.favoriteOutfits.includes(outfitId)
          ? userActions.favoriteOutfits
          : [...userActions.favoriteOutfits, outfitId];

        set({
          userActions: {
            ...userActions,
            favoriteOutfits,
          },
        });
      },

      recordFavoriteItem: (itemId: string) => {
        const { userActions } = get();
        const favoriteItems = userActions.favoriteItems.includes(itemId)
          ? userActions.favoriteItems
          : [...userActions.favoriteItems, itemId];

        set({
          userActions: {
            ...userActions,
            favoriteItems,
          },
        });
      },

      recordWornItem: (itemId: string) => {
        const { userActions } = get();
        const wornItems = userActions.wornItems.includes(itemId)
          ? userActions.wornItems
          : [...userActions.wornItems, itemId];

        set({
          userActions: {
            ...userActions,
            wornItems,
          },
        });
      },

      recordOutfitFeedback: (outfitId: string, feedback: 'liked' | 'disliked' | 'worn') => {
        const { userActions } = get();
        set({
          userActions: {
            ...userActions,
            outfitFeedback: {
              ...userActions.outfitFeedback,
              [outfitId]: feedback,
            },
          },
        });

        // Trigger learning from actions
        // This would be called after items/outfits are loaded
      },

      recordRecommendationThumb: (recommendationId: string, thumb: 'up' | 'down') => {
        const { userActions } = get();
        set({
          userActions: {
            ...userActions,
            recommendationThumbs: {
              ...userActions.recommendationThumbs,
              [recommendationId]: thumb,
            },
          },
        });
      },

      learnFromActions: (items: ClothingItem[], outfits: Outfit[]) => {
        const { styleProfile, userActions } = get();
        if (!styleProfile) return;

        // Analyze favorite items to learn preferences
        const favoriteItems = items.filter((item) => userActions.favoriteItems.includes(item.id));
        const favoriteOutfits = outfits.filter((outfit) =>
          userActions.favoriteOutfits.includes(outfit.id)
        );

        // Extract colors from favorite items
        const colorFrequency: Record<string, number> = {};
        favoriteItems.forEach((item) => {
          item.colors.forEach((color) => {
            colorFrequency[color.toLowerCase()] = (colorFrequency[color.toLowerCase()] || 0) + 1;
          });
        });

        // Extract categories
        const categoryFrequency: Record<string, number> = {};
        favoriteItems.forEach((item) => {
          categoryFrequency[item.category] = (categoryFrequency[item.category] || 0) + 1;
        });

        // Extract brands
        const brandFrequency: Record<string, number> = {};
        favoriteItems.forEach((item) => {
          if (item.brand) {
            brandFrequency[item.brand] = (brandFrequency[item.brand] || 0) + 1;
          }
        });

        // Analyze tags from favorite outfits to refine style scores
        const tagFrequency: Record<string, number> = {};
        favoriteOutfits.forEach((outfit) => {
          outfit.tags?.forEach((tag) => {
            tagFrequency[tag.toLowerCase()] = (tagFrequency[tag.toLowerCase()] || 0) + 1;
          });
        });

        // Update style scores based on tags (simple heuristic)
        const styleScore = { ...styleProfile.learnedPreferences.styleScore };
        Object.keys(tagFrequency).forEach((tag) => {
          // Map tags to styles (simplified)
          if (tag.includes('casual')) styleScore.casual = Math.min(100, styleScore.casual + 5);
          if (tag.includes('formal') || tag.includes('work'))
            styleScore.formal = Math.min(100, styleScore.formal + 5);
          if (tag.includes('minimal') || tag.includes('simple'))
            styleScore.minimalist = Math.min(100, styleScore.minimalist + 5);
          if (tag.includes('street') || tag.includes('urban'))
            styleScore.streetwear = Math.min(100, styleScore.streetwear + 5);
          if (tag.includes('vintage') || tag.includes('retro'))
            styleScore.vintage = Math.min(100, styleScore.vintage + 5);
          if (tag.includes('boho') || tag.includes('flowy'))
            styleScore.bohemian = Math.min(100, styleScore.bohemian + 5);
        });

        const preferredColors = Object.entries(colorFrequency)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([color]) => color);

        const preferredCategories = Object.entries(categoryFrequency)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([category]) => category);

        const preferredBrands = Object.entries(brandFrequency)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([brand]) => brand);

        set({
          styleProfile: {
            ...styleProfile,
            learnedPreferences: {
              preferredColors,
              preferredCategories,
              preferredBrands,
              styleScore,
            },
            lastUpdated: new Date().toISOString(),
          },
        });
      },

      calculateStyleMatchScore: (outfit: Outfit): number => {
        const { styleProfile } = get();
        if (!styleProfile) return 50; // Default score if no style profile

        let score = 0;
        const { learnedPreferences } = styleProfile;

        // Check if outfit items match preferred colors
        outfit.items.forEach((item) => {
          item.colors.forEach((color) => {
            if (learnedPreferences.preferredColors.includes(color.toLowerCase())) {
              score += 5;
            }
          });

          // Check category match
          if (learnedPreferences.preferredCategories.includes(item.category)) {
            score += 10;
          }

          // Check brand match
          if (item.brand && learnedPreferences.preferredBrands.includes(item.brand)) {
            score += 5;
          }
        });

        // Check if outfit tags match style preferences
        outfit.tags?.forEach((tag) => {
          const tagLower = tag.toLowerCase();
          styleProfile.preferences.forEach((pref) => {
            if (tagLower.includes(pref)) {
              score += 15;
            }
          });
        });

        // Normalize to 0-100
        return Math.min(100, Math.max(0, score));
      },
    }),
    {
      name: 'veylo-style-v1',
      version: 1,
      storage: asyncJsonStorage,
      partialize: (state) => ({
        styleProfile: state.styleProfile,
        userActions: state.userActions,
      }),
    }
  )
);
