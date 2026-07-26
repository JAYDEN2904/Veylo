import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Outfit, ClothingItem, WeatherData, OutfitGenerationFailure } from '../types';
import { asyncJsonStorage } from '../lib/zustandStorage';
import { useStyleStore } from './useStyleStore';
import { useWardrobeStore } from './useWardrobeStore';
import { weatherService } from '../services/weatherService';
import {
  generateContextAwareOutfit,
  generateOutfitVariations,
  generateRankedOutfits,
  enrichOutfitWithDimensionScores,
  resolveOccasionKey,
} from '../services/outfitGenerationService';
import {
  predictOutfitFit,
  calculateOutfitDifficulty,
  getOutfitDifficultyLabel,
} from '../services/outfitIntelligenceService';
import * as Location from 'expo-location';
import {
  functionsClient,
  type GeneratedOutfit,
  type GenerateOutfitRequest,
} from '../services/functionsClient';
import { isSupabaseConfigured, getSupabase } from '../services/supabase';
import { useCalendarStore } from './useCalendarStore';
import { updateClothingItem } from '../services/wardrobeRepository';
import { namedColorsToHsl } from '../utils/hslColor';
import { usePendingRatingStore } from './usePendingRatingStore';

interface OutfitState {
  outfits: Outfit[];
  favorites: Outfit[];
  generatedOutfit: Outfit | null;
  outfitVariations: Outfit[];
  isGenerating: boolean;
  generationError: OutfitGenerationFailure | null;
  todayOccasion: string;

  generateOutfit: (options?: Record<string, unknown>) => Promise<void>;
  generateOutfitVariations: (outfitId: string) => void;
  recordOutfitFeedback: (outfitId: string, feedback: 'liked' | 'disliked' | 'worn') => void;
  /**
   * Wear-Today action: record `worn` feedback, increment per-item wear counts,
   * push to calendar history, and (when configured) persist to Supabase
   * outfit_events / clothing_items. Best-effort — remote failures are logged
   * but do not throw.
   */
  recordOutfitWear: (outfit: Outfit) => Promise<void>;
  toggleFavorite: (outfitId: string) => void;
  addOutfit: (outfit: Outfit) => void;
  setGeneratedOutfit: (outfit: Outfit | null) => void;
  clearGeneratedOutfit: () => void;
  clearGenerationError: () => void;
  setTodayOccasion: (occasion: string) => void;
  /** Clears all persisted outfit data — called on login/logout to prevent cross-user bleed. */
  reset: () => void;
}

const EMPTY_OUTFIT_STATE = {
  outfits: [] as Outfit[],
  favorites: [] as Outfit[],
  generatedOutfit: null,
  outfitVariations: [] as Outfit[],
  isGenerating: false,
  generationError: null,
  todayOccasion: 'casual',
};

export const useOutfitStore = create<OutfitState>()(
  persist(
    (set, get) => ({
      ...EMPTY_OUTFIT_STATE,

      clearGenerationError: () => set({ generationError: null }),

      generateOutfit: async (options?: Record<string, unknown>) => {
        set({ isGenerating: true, generationError: null, generatedOutfit: null });

        const { styleProfile, calculateStyleMatchScore } = useStyleStore.getState();
        const { items } = useWardrobeStore.getState();

        const paletteId = typeof options?.palette === 'string' ? options.palette : undefined;
        const weatherOverride = resolveWizardWeather(options?.weather);
        const weatherFromOptions =
          weatherOverride ??
          (options?.weather &&
          typeof options.weather === 'object' &&
          'temperature' in options.weather
            ? (options.weather as WeatherData)
            : null);

        let weather: WeatherData | null = weatherFromOptions;
        if (!weather) {
          try {
            const { status } = await Location.getForegroundPermissionsAsync();
            if (status === 'granted') {
              const location = await Location.getCurrentPositionAsync({});
              weather = await weatherService.getCurrentWeather(
                location.coords.latitude,
                location.coords.longitude
              );
            }
          } catch {
            /* Weather optional; generation still runs */
          }
        }

        const rawOccasion = typeof options?.occasion === 'string' ? options.occasion : undefined;
        const occasionKey = resolveOccasionKey(rawOccasion);
        const flowStyleIds = Array.isArray(options?.styles)
          ? (options!.styles as string[])
          : undefined;

        const rankedCount = 3;
        const hasWizardPalette = Boolean(paletteId);
        const mustIncludeItemId =
          typeof options?.mustIncludeItemId === 'string' ? options.mustIncludeItemId : undefined;

        // Server-side generation when backend is configured (palette / Style-this force local).
        if (isSupabaseConfigured() && !hasWizardPalette && !mustIncludeItemId) {
          try {
            const req: GenerateOutfitRequest = {
              occasion: rawOccasion,
              style_preferences: flowStyleIds ?? styleProfile?.preferences,
              count: rankedCount,
              persist: false,
              weather: weather
                ? { temperature: weather.temperature, condition: weather.condition }
                : undefined,
            };
            const res = await functionsClient.generateOutfits(req);
            if (!res.outfits || res.outfits.length === 0) {
              set({
                isGenerating: false,
                generatedOutfit: null,
                generationError: {
                  reason: res.reason === 'empty_wardrobe' ? 'empty_wardrobe' : 'filters_too_strict',
                  message:
                    res.reason === 'empty_wardrobe'
                      ? 'Add a few items to your wardrobe first.'
                      : 'No outfit could be generated with current filters.',
                },
                outfitVariations: [],
              });
              return;
            }
            const mappedOutfits = res.outfits.map((g) => {
              const mapped = mapGeneratedOutfit(g, items);
              if (g.fit_reasoning?.length) {
                mapped.fitReasoning = g.fit_reasoning;
              }
              if (styleProfile && !g.fit_reasoning?.length) {
                mapped.styleMatchScore = calculateStyleMatchScore(mapped);
                const fit = predictOutfitFit(mapped, get().outfits);
                mapped.fitScore = fit.fitScore;
                mapped.fitReasoning = fit.reasoning;
              }
              const difficulty = calculateOutfitDifficulty(mapped);
              mapped.difficultyScore = difficulty.difficultyScore;
              mapped.difficultyLabel = getOutfitDifficultyLabel(difficulty.difficultyScore);
              return mapped;
            });
            set({
              generatedOutfit: mappedOutfits[0],
              outfitVariations: mappedOutfits.slice(1),
              isGenerating: false,
              generationError: null,
            });
            return;
          } catch (err) {
            if (__DEV__) console.error('[useOutfitStore] generate-outfit-ideas', err);
          }
        }

        const hour = new Date().getHours();
        const timeOfDay: 'morning' | 'afternoon' | 'evening' =
          hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

        await new Promise((resolve) => setTimeout(resolve, 500));

        const context = {
          occasionKey,
          weather: weather || undefined,
          timeOfDay,
          season: undefined,
          stylePreferences: styleProfile?.preferences,
          flowStyleIds,
          paletteId,
          mustIncludeItemId,
        };

        const rankedResults = generateRankedOutfits(items, context, rankedCount);
        if (rankedResults.length === 0 || !rankedResults[0].ok) {
          const failure =
            rankedResults[0]?.ok === false
              ? rankedResults[0].failure
              : {
                  reason: 'filters_too_strict' as const,
                  message: 'No outfit could be generated with current filters.',
                };
          set({
            isGenerating: false,
            generatedOutfit: null,
            generationError: failure,
            outfitVariations: [],
          });
          return;
        }

        const enriched = rankedResults
          .filter((r): r is Extract<typeof r, { ok: true }> => r.ok)
          .map((r) => enrichOutfitWithDimensionScores(r.outfit, context));

        const primary = enriched[0];
        if (styleProfile) {
          primary.styleMatchScore = calculateStyleMatchScore(primary);
        }

        set({
          generatedOutfit: primary,
          outfitVariations: enriched.slice(1),
          isGenerating: false,
          generationError: null,
        });
      },

      generateOutfitVariations: (outfitId: string) => {
        const { outfits } = get();
        const { items } = useWardrobeStore.getState();
        const outfit = outfits.find((o) => o.id === outfitId) || get().generatedOutfit;

        if (!outfit) return;

        const variations = generateOutfitVariations(outfit, items, 3);
        set({ outfitVariations: variations.map((v) => v.outfit) });
      },

      recordOutfitFeedback: (outfitId: string, feedback: 'liked' | 'disliked' | 'worn') => {
        const { outfits } = get();
        const { recordOutfitFeedback: recordStyleFeedback, learnFromActions } =
          useStyleStore.getState();
        const { items } = useWardrobeStore.getState();

        const updatedOutfits = outfits.map((outfit) => {
          if (outfit.id === outfitId) {
            return { ...outfit, feedback };
          }
          return outfit;
        });

        set({ outfits: updatedOutfits });

        recordStyleFeedback(outfitId, feedback);
        learnFromActions(items, updatedOutfits);
      },

      recordOutfitWear: async (outfit: Outfit) => {
        if (!outfit) return;
        const wornAt = new Date().toISOString();
        const today = wornAt.slice(0, 10);

        get().recordOutfitFeedback(outfit.id, 'worn');

        const { updateItem, items: wardrobeItems } = useWardrobeStore.getState();
        const itemUpdates: Array<{ id: string; lastWorn: string; wornCount: number }> = [];
        for (const garment of outfit.items) {
          const local = wardrobeItems.find((w) => w.id === garment.id);
          const nextCount = (local?.wornCount ?? garment.wornCount ?? 0) + 1;
          itemUpdates.push({ id: garment.id, lastWorn: wornAt, wornCount: nextCount });
          updateItem(garment.id, { lastWorn: wornAt, wornCount: nextCount });
        }

        useCalendarStore.getState().addOutfitToHistory({
          id: `wear-${outfit.id}-${today}`,
          date: wornAt,
          outfitId: outfit.id,
          occasion: outfit.occasion,
        });

        usePendingRatingStore.getState().setPending({
          outfitId: outfit.id,
          outfitName: outfit.name ?? outfit.occasion ?? 'Your outfit',
          wornAt,
        });

        if (!isSupabaseConfigured()) return;

        try {
          await persistOutfitWear(outfit, today, itemUpdates);
        } catch (err) {
          if (__DEV__) console.error('[recordOutfitWear] persist', err);
        }
      },

      toggleFavorite: (outfitId: string) => {
        const { outfits } = get();
        const { recordFavoriteOutfit } = useStyleStore.getState();

        const updatedOutfits = outfits.map((outfit) => {
          if (outfit.id === outfitId) {
            const newFavoriteStatus = !outfit.isFavorite;

            if (newFavoriteStatus) {
              recordFavoriteOutfit(outfitId);
              void persistOutfit(outfit, { favorite: true });
            }

            return {
              ...outfit,
              isFavorite: newFavoriteStatus,
              favorite: newFavoriteStatus,
            };
          }
          return outfit;
        });

        const favorites = updatedOutfits.filter((o) => o.isFavorite);

        set({
          outfits: updatedOutfits,
          favorites,
        });
      },

      addOutfit: (outfit: Outfit) => {
        const { outfits } = get();
        set({
          outfits: [outfit, ...outfits],
        });
        void persistOutfit(outfit, { favorite: Boolean(outfit.isFavorite) });
      },

      setGeneratedOutfit: (outfit: Outfit | null) => {
        set({ generatedOutfit: outfit });
      },

      clearGeneratedOutfit: () => {
        set({ generatedOutfit: null });
      },

      setTodayOccasion: (occasion: string) => {
        set({ todayOccasion: occasion });
      },

      reset: () => {
        set(EMPTY_OUTFIT_STATE);
      },
    }),
    {
      name: 'veylo-outfits-v2',
      version: 2,
      storage: asyncJsonStorage,
      migrate: (persistedState: unknown, fromVersion: number) => {
        const state = (persistedState ?? {}) as Record<string, unknown>;
        if (fromVersion < 2) {
          // Strip any mock outfits (non-UUID ids) carried over from v1.
          const outfits = Array.isArray(state.outfits)
            ? (state.outfits as Outfit[]).filter((o) => UUID_RE.test(o.id))
            : [];
          const favorites = Array.isArray(state.favorites)
            ? (state.favorites as Outfit[]).filter((o) => UUID_RE.test(o.id))
            : [];
          return { ...EMPTY_OUTFIT_STATE, outfits, favorites };
        }
        return state;
      },
      partialize: (state) => ({
        outfits: state.outfits,
        favorites: state.favorites,
        todayOccasion: state.todayOccasion,
      }),
    }
  )
);

/**
 * Map a wizard weather chip ("sunny" | "cloudy" | "rainy" | "cold") to a
 * synthetic `WeatherData` so the generator's weather filter actually fires.
 * Returns null for anything we don't recognize (callers fall back to device
 * weather).
 */
function resolveWizardWeather(raw: unknown): WeatherData | null {
  if (!raw) return null;
  if (typeof raw === 'object' && raw !== null && 'temperature' in raw) {
    return raw as WeatherData;
  }
  if (typeof raw !== 'string') return null;
  switch (raw.toLowerCase()) {
    case 'sunny':
      return {
        temperature: 75,
        feelsLike: 75,
        condition: 'Clear',
        description: 'sunny',
        humidity: 50,
        windSpeed: 6,
        icon: 'sunny',
        location: 'Wizard override',
      };
    case 'cloudy':
      return {
        temperature: 65,
        feelsLike: 63,
        condition: 'Clouds',
        description: 'cloudy',
        humidity: 60,
        windSpeed: 7,
        icon: 'cloudy',
        location: 'Wizard override',
      };
    case 'rainy':
      return {
        temperature: 55,
        feelsLike: 52,
        condition: 'Rain',
        description: 'rainy',
        humidity: 85,
        windSpeed: 12,
        icon: 'rainy',
        location: 'Wizard override',
      };
    case 'cold':
      return {
        temperature: 35,
        feelsLike: 30,
        condition: 'Snow',
        description: 'cold',
        humidity: 70,
        windSpeed: 10,
        icon: 'snow',
        location: 'Wizard override',
      };
    default:
      return null;
  }
}

function mapGeneratedOutfit(g: GeneratedOutfit, wardrobe: ClothingItem[]): Outfit {
  const byId = new Map(wardrobe.map((i) => [i.id, i] as const));
  const items: ClothingItem[] = g.items.map((srv) => {
    const wardrobeItem = byId.get(srv.id);
    if (wardrobeItem) return wardrobeItem;
    return {
      id: srv.id,
      imageUrl: '',
      category: srv.category,
      colors: srv.colors ?? [],
      colorsHsl: namedColorsToHsl(srv.colors ?? []),
      tags: srv.tags ?? [],
      season: srv.season ?? undefined,
      wornCount: srv.worn_count ?? undefined,
      lastWorn: srv.last_worn ?? undefined,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
  });

  return {
    id: g.id ?? `generated-${Date.now()}`,
    name: g.name,
    occasion: g.occasion,
    items,
    createdAt: new Date().toISOString(),
    tags: [],
    isFavorite: false,
    favorite: false,
    styleMatchScore: g.style_match_score,
    fitScore: g.fit_score,
    fitReasoning: g.fit_reasoning,
    usedRelaxedFilters: g.used_relaxed_filters,
  };
}

async function persistOutfit(outfit: Outfit, opts: { favorite: boolean }): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) return;

    // Filter out pseudo-ids (local/mock items that don't live in clothing_items).
    const uuidItems = outfit.items.filter((it) => isUuid(it.id));
    const looksGenerated = outfit.id.startsWith('generated-');
    const outfitId = looksGenerated ? undefined : isUuid(outfit.id) ? outfit.id : undefined;

    const outfitRow = {
      ...(outfitId ? { id: outfitId } : {}),
      user_id: uid,
      name: outfit.name ?? outfit.occasion ?? 'Outfit',
      occasion: outfit.occasion ?? null,
      tags: outfit.tags ?? [],
      favorite: opts.favorite,
    };
    const { data: outfitRes, error: outfitErr } = await supabase
      .from('outfits')
      .upsert(outfitRow, { onConflict: 'id' })
      .select('id')
      .single();
    if (outfitErr || !outfitRes) {
      if (__DEV__) console.error('[persistOutfit] outfits upsert', outfitErr);
      return;
    }
    const savedId = outfitRes.id as string;

    if (uuidItems.length === 0) return;

    // Replace the outfit_items join rows.
    await supabase.from('outfit_items').delete().eq('outfit_id', savedId);
    const joinRows = uuidItems.map((it) => ({ outfit_id: savedId, item_id: it.id }));
    const { error: joinErr } = await supabase.from('outfit_items').insert(joinRows);
    if (joinErr && __DEV__) console.error('[persistOutfit] outfit_items insert', joinErr);
  } catch (err) {
    if (__DEV__) console.error('[persistOutfit] unexpected', err);
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

async function persistOutfitWear(
  outfit: Outfit,
  isoDate: string,
  itemUpdates: Array<{ id: string; lastWorn: string; wornCount: number }>
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user?.id;
  if (!uid) return;

  // Insert outfit_events row when we have a real outfit_id (UUID).
  const outfitId = isUuid(outfit.id) ? outfit.id : null;
  const { error: eventErr } = await supabase.from('outfit_events').insert({
    user_id: uid,
    date: isoDate,
    outfit_id: outfitId,
    occasion: outfit.occasion ?? null,
  });
  if (eventErr && __DEV__) {
    console.error('[persistOutfitWear] outfit_events insert', eventErr);
  }

  // Per-item wear-count bumps (only for items that live in clothing_items).
  await Promise.all(
    itemUpdates
      .filter((u) => isUuid(u.id))
      .map(async (u) => {
        try {
          await updateClothingItem(u.id, {
            last_worn: u.lastWorn,
            worn_count: u.wornCount,
          });
        } catch (err) {
          if (__DEV__) console.warn('[persistOutfitWear] updateClothingItem', u.id, err);
        }
      })
  );
}
