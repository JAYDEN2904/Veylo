import { namedColorsToHsl } from '../../utils/hslColor';
import type { ClothingItem } from '../../types';
import { generateRankedOutfitsDetailed } from '../outfitGenerationService';
import {
  applyFeedbackToVector,
  emptyPreferenceVector,
  hasBehavioralSignal,
} from './feedback/recommendationFeedback';
import {
  recordGeneratedRecommendations,
  recordRecommendationEvent,
} from './feedback/sessionRecorder';
import { usePreferenceStore } from '../../store/usePreferenceStore';
import { calculateRecommendationFunnel } from './analytics/recommendationAnalytics';
import { toRecommendationTrace } from './types';
import { ENGINE_VERSION, PREFERENCE_VECTOR_VERSION } from './types';
import { EMBEDDING_MODEL, EMBEDDING_VERSION } from './embeddings/embeddingConfig';
import { recommendOutfits } from './recommendationEngine';

const memoryStore = new Map<string, string>();

jest.mock('../../lib/safeAsyncStorage', () => ({
  getSafeAsyncStorage: () => ({
    getItem: (key: string) => Promise.resolve(memoryStore.get(key) ?? null),
    setItem: (key: string, value: string) => {
      memoryStore.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      memoryStore.delete(key);
      return Promise.resolve();
    },
    getAllKeys: () => Promise.resolve([...memoryStore.keys()]),
    multiRemove: (keys: string[]) => {
      keys.forEach((k) => memoryStore.delete(k));
      return Promise.resolve();
    },
  }),
}));

const item = (overrides: Partial<ClothingItem>): ClothingItem => {
  const colors = overrides.colors ?? ['White'];
  return {
    id: overrides.id ?? `item-${Math.random().toString(36).slice(2, 8)}`,
    imageUrl: 'https://example.com/i.jpg',
    category: 'Tops',
    colors,
    colorsHsl: overrides.colorsHsl ?? namedColorsToHsl(colors),
    tags: overrides.tags ?? ['casual'],
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
    ...overrides,
  };
};

function wardrobe(): ClothingItem[] {
  return [
    item({ id: 'navy-tee', colors: ['Navy'], tags: ['casual', 'minimal'] }),
    item({ id: 'white-tee', colors: ['White'], tags: ['casual', 'minimal'] }),
    item({ id: 'navy-jeans', category: 'Bottoms', colors: ['Navy'], tags: ['casual', 'denim'] }),
    item({ id: 'khaki-chinos', category: 'Bottoms', colors: ['Khaki'], tags: ['casual', 'work'] }),
    item({ id: 'white-sneakers', category: 'Shoes', colors: ['White'], tags: ['casual'] }),
    item({ id: 'brown-loafers', category: 'Shoes', colors: ['Brown'], tags: ['work', 'classic'] }),
    item({ id: 'navy-blazer', category: 'Outerwear', colors: ['Navy'], tags: ['work', 'blazer'] }),
    item({ id: 'grey-hoodie', category: 'Outerwear', colors: ['Grey'], tags: ['casual'] }),
  ];
}

describe('recommendation lifecycle data quality', () => {
  beforeEach(() => {
    memoryStore.clear();
    usePreferenceStore.getState().reset();
  });

  it('records engine version, positions, session, scores, and diversity on generate', () => {
    const detailed = generateRankedOutfitsDetailed(wardrobe(), { occasionKey: 'Casual' }, 3);
    expect(detailed.ok).toBe(true);
    if (!detailed.ok) return;

    expect(detailed.engineVersion).toBe(ENGINE_VERSION);
    expect(detailed.outfits.every((outfit) => outfit.engineVersion === ENGINE_VERSION)).toBe(true);
    expect(detailed.outfits.map((outfit) => outfit.recommendationPosition)).toEqual(
      detailed.outfits.map((_, index) => index)
    );
    expect(detailed.outfits[0].scoreBreakdown?.overall).toBe(detailed.outfits[0].fitScore);

    const trace = toRecommendationTrace(detailed.metadata);
    expect(trace.engineVersion).toBe(ENGINE_VERSION);
    expect(trace.candidateCount).toBeGreaterThan(0);
    expect(trace.composedCandidateCount).toBeGreaterThan(0);
    expect(trace.finalRecommendationCount).toBe(detailed.outfits.length);
    expect(trace.coldStart).toBe(true);
    expect(trace.personalizationUsed).toBe(false);

    recordGeneratedRecommendations({
      outfits: detailed.outfits,
      occasion: 'Casual',
      engineVersion: detailed.engineVersion,
      generationSource: detailed.source,
      personalizationUsed: detailed.personalizationUsed,
      coldStart: detailed.coldStart,
      metadata: detailed.metadata,
    });

    const state = usePreferenceStore.getState();
    const impressions = state.recentEvents.filter((event) => event.eventType === 'impression');
    expect(impressions).toHaveLength(detailed.outfits.length);
    expect(new Set(impressions.map((event) => event.sessionId)).size).toBe(1);
    expect(impressions[0].sessionId).toBe(state.lastSession?.id);
    expect(impressions.map((event) => event.position)).toEqual(
      detailed.outfits.map((_, index) => index)
    );
    expect(impressions[0].metadata.engineVersion).toBe(ENGINE_VERSION);
    expect(impressions[0].metadata.finalScore).toBe(detailed.outfits[0].scoreBreakdown?.overall);
    expect(impressions[0].metadata.coldStart).toBe(true);
    expect(impressions[0].metadata.preferenceVectorVersion).toBe(PREFERENCE_VECTOR_VERSION);
    expect(impressions[0].metadata.diversityApplied).toBe(detailed.metadata.diversityApplied);
  });

  it('marks personalized generations distinctly from cold start', () => {
    const closet = wardrobe();
    const vector = applyFeedbackToVector(emptyPreferenceVector(), {
      eventType: 'wear',
      items: [closet[0], closet[2]],
    });
    const detailed = generateRankedOutfitsDetailed(
      closet,
      { occasionKey: 'Casual', preferenceVector: vector },
      3
    );
    expect(detailed.ok).toBe(true);
    if (!detailed.ok) return;
    expect(detailed.personalizationUsed).toBe(true);
    expect(detailed.coldStart).toBe(false);
    expect(detailed.metadata.personalizationUsed).toBe(true);
  });

  it('includes embedding model metadata when embeddings were used', () => {
    const closet = wardrobe();
    const embeddings = Object.fromEntries(closet.map((entry) => [entry.id, [1, 0, 0]]));
    const result = recommendOutfits(closet, {
      occasion: 'Casual',
      itemEmbeddings: embeddings,
      count: 3,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.metadata.embeddingsAvailable).toBe(true);
    expect(result.metadata.embeddingModel).toBe(EMBEDDING_MODEL);
    expect(result.metadata.embeddingVersion).toBe(EMBEDDING_VERSION);
  });

  it('walks generate → impression → view → like → vector update without duplicate views', () => {
    const detailed = generateRankedOutfitsDetailed(wardrobe(), { occasionKey: 'Casual' }, 3);
    expect(detailed.ok).toBe(true);
    if (!detailed.ok) return;

    recordGeneratedRecommendations({
      outfits: detailed.outfits,
      occasion: 'Casual',
      engineVersion: detailed.engineVersion,
      generationSource: 'local',
      personalizationUsed: detailed.personalizationUsed,
      coldStart: detailed.coldStart,
      metadata: detailed.metadata,
    });

    const chosen = detailed.outfits[0];
    recordRecommendationEvent({
      eventType: 'view',
      items: chosen.items,
      outfitId: chosen.id,
    });
    recordRecommendationEvent({
      eventType: 'view',
      items: chosen.items,
      outfitId: chosen.id,
    });
    recordRecommendationEvent({
      eventType: 'like',
      items: chosen.items,
      outfitId: chosen.id,
    });
    recordRecommendationEvent({
      eventType: 'save',
      items: chosen.items,
      outfitId: chosen.id,
    });

    const events = usePreferenceStore.getState().recentEvents;
    expect(events.filter((event) => event.eventType === 'view')).toHaveLength(1);
    expect(hasBehavioralSignal(usePreferenceStore.getState().preferenceVector)).toBe(true);

    const funnel = calculateRecommendationFunnel(events);
    expect(funnel.impressions).toBe(detailed.outfits.length);
    expect(funnel.views).toBe(1);
    expect(funnel.likes).toBe(1);
    expect(funnel.saves).toBe(1);
    expect(funnel.viewRate).toBeCloseTo(1 / detailed.outfits.length);

    const like = events.find((event) => event.eventType === 'like');
    expect(like?.metadata.finalScore).toBe(chosen.scoreBreakdown?.overall);
    expect(like?.sessionId).toBe(events[0].sessionId);
  });

  it('does not record an impression when generation fails', () => {
    const failed = generateRankedOutfitsDetailed([], { occasionKey: 'Casual' }, 3);
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    recordGeneratedRecommendations({
      outfits: [],
      occasion: 'Casual',
      metadata: failed.metadata,
    });
    expect(usePreferenceStore.getState().recentEvents).toHaveLength(0);
  });
});
