import { ClothingItem } from '../../../types';
import { namedColorsToHsl } from '../../../utils/hslColor';
import {
  recordGeneratedRecommendations,
  recordRecommendationEvent,
} from './sessionRecorder';
import { usePreferenceStore } from '../../../store/usePreferenceStore';
import { ENGINE_VERSION } from '../types';

const memoryStore = new Map<string, string>();

jest.mock('../../../lib/safeAsyncStorage', () => ({
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

const item = (overrides: Partial<ClothingItem> = {}): ClothingItem => {
  const colors = overrides.colors ?? ['White'];
  return {
    id: overrides.id ?? 'item-1',
    imageUrl: 'https://example.com/i.jpg',
    category: 'Tops',
    colors,
    colorsHsl: overrides.colorsHsl ?? namedColorsToHsl(colors),
    tags: ['casual'],
    createdAt: new Date().toISOString(),
    status: 'active',
    ...overrides,
  };
};

function outfit(id: string, position = 0) {
  return {
    id,
    name: 'Casual',
    items: [item({ id: `${id}-top` }), item({ id: `${id}-bottom`, category: 'Bottoms' })],
    createdAt: new Date().toISOString(),
    tags: ['casual'],
    isFavorite: false,
    occasion: 'Casual',
    recommendationPosition: position,
    scoreBreakdown: {
      overall: 82,
      compatibility: 80,
      personalization: 70,
      occasionFit: 78,
      weatherFit: 74,
      colourHarmony: 85,
      formality: 72,
      wearDiversity: 60,
      novelty: 60,
      styleMatch: 70,
    },
    fitReasoning: ['Works well for a casual day.'],
    engineVersion: ENGINE_VERSION,
    generationSource: 'local' as const,
  };
}

describe('sessionRecorder event integrity', () => {
  beforeEach(() => {
    memoryStore.clear();
    usePreferenceStore.getState().reset();
  });

  it('does not record impressions for an empty or failed generation', () => {
    recordGeneratedRecommendations({ outfits: [], occasion: 'Casual' });
    expect(usePreferenceStore.getState().recentEvents).toHaveLength(0);
    expect(usePreferenceStore.getState().lastSession).toBeNull();
  });

  it('records one impression per generated outfit with analytics metadata', () => {
    recordGeneratedRecommendations({
      outfits: [outfit('o1', 0), outfit('o2', 1)],
      occasion: 'Casual',
      weather: { temperature: 22, condition: 'Clear', location: 'Secret City' },
      engineVersion: ENGINE_VERSION,
      generationSource: 'local',
      personalizationUsed: false,
      coldStart: true,
      metadata: {
        candidateCount: 12,
        filteredCount: 10,
        composedCount: 8,
        rankedCount: 8,
        finalCount: 2,
        generatedAt: new Date().toISOString(),
        engineVersion: ENGINE_VERSION,
        filtersRelaxed: false,
        relaxationLevel: 0,
        generationLatencyMs: 4,
        averageScore: 80,
        embeddingsAvailable: false,
        embeddingsUsed: false,
        diversityApplied: true,
        diversityCandidatesConsidered: 8,
        diversitySelected: 2,
        diversityRejected: 0,
        personalizationUsed: false,
        coldStart: true,
      },
    });
    const events = usePreferenceStore.getState().recentEvents;
    expect(events).toHaveLength(2);
    expect(events.every((event) => event.eventType === 'impression')).toBe(true);
    expect(events[0].sessionId).toBe(events[1].sessionId);
    expect(events[0].position).toBe(0);
    expect(events[1].position).toBe(1);
    expect(events[0].metadata.engineVersion).toBe(ENGINE_VERSION);
    expect(events[0].metadata.finalScore).toBe(82);
    expect(events[0].metadata.coldStart).toBe(true);
    expect(events[0].metadata.weather).toEqual({ temperature: 22, condition: 'Clear' });
    expect(JSON.stringify(events[0].metadata)).not.toContain('Secret City');
  });

  it('dedupes impressions, views, wears, and saves in the same session', () => {
    const look = outfit('dup');
    recordGeneratedRecommendations({ outfits: [look, look], occasion: 'Casual' });
    expect(
      usePreferenceStore.getState().recentEvents.filter((event) => event.eventType === 'impression')
    ).toHaveLength(1);

    recordRecommendationEvent({ eventType: 'view', items: look.items, outfitId: look.id });
    recordRecommendationEvent({ eventType: 'view', items: look.items, outfitId: look.id });
    recordRecommendationEvent({ eventType: 'wear', items: look.items, outfitId: look.id });
    recordRecommendationEvent({ eventType: 'wear', items: look.items, outfitId: look.id });
    recordRecommendationEvent({ eventType: 'save', items: look.items, outfitId: look.id });
    recordRecommendationEvent({ eventType: 'save', items: look.items, outfitId: look.id });

    const events = usePreferenceStore.getState().recentEvents;
    expect(events.filter((event) => event.eventType === 'view')).toHaveLength(1);
    expect(events.filter((event) => event.eventType === 'wear')).toHaveLength(1);
    expect(events.filter((event) => event.eventType === 'save')).toHaveLength(1);
  });

  it('rejects views without an outfit id and impossible positions', () => {
    recordRecommendationEvent({ eventType: 'view', items: [item()] });
    recordRecommendationEvent({
      eventType: 'like',
      items: [item()],
      outfitId: 'o',
      position: -1,
    });
    expect(usePreferenceStore.getState().recentEvents).toHaveLength(0);
  });

  it('copies score metadata from the impression onto later events', () => {
    const look = outfit('inherit');
    recordGeneratedRecommendations({ outfits: [look], occasion: 'Casual' });
    recordRecommendationEvent({ eventType: 'like', items: look.items, outfitId: look.id });
    const like = usePreferenceStore
      .getState()
      .recentEvents.find((event) => event.eventType === 'like');
    expect(like?.metadata.finalScore).toBe(82);
    expect(like?.metadata.engineVersion).toBe(ENGINE_VERSION);
    expect(like?.position).toBe(0);
  });
});
