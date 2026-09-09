/**
 * Sprint 3.2 — production generation uses the local Sprint 1–3 engine.
 *
 * Store layer still fetches wardrobe / weather; ranking is
 * generateRankedOutfitsDetailed → recommendOutfits → rankComposedOutfits.
 */
import { ClothingItem } from '../../types';
import { namedColorsToHsl } from '../../utils/hslColor';
import {
  generateRankedOutfitsDetailed,
  toRecommendationRequest,
} from '../outfitGenerationService';
import { recommendOutfits } from './recommendationEngine';
import { rankComposedOutfits } from './ranking/outfitRanker';
import { scoreCompleteOutfit } from './ranking/outfitRanker';
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
import { ENGINE_VERSION } from './types';
import type { RecommendationEventType, UserPreferenceVector } from './types';

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
    id: overrides.id ?? Math.random().toString(36).slice(2),
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

function wardrobe(): ClothingItem[] {
  return [
    item({ id: 'navy-tee', colors: ['Navy'], tags: ['casual', 'minimal'], category: 'Tops' }),
    item({
      id: 'navy-jeans',
      colors: ['Navy'],
      tags: ['casual', 'denim'],
      category: 'Bottoms',
    }),
    item({ id: 'white-sneakers', colors: ['White'], tags: ['casual'], category: 'Shoes' }),
    item({
      id: 'red-tee',
      colors: ['Red'],
      tags: ['casual', 'bold', 'graphic'],
      category: 'Tops',
    }),
    item({
      id: 'red-shorts',
      colors: ['Red'],
      tags: ['casual'],
      category: 'Bottoms',
      subCategory: 'shorts',
    }),
    item({ id: 'black-sneakers', colors: ['Black'], tags: ['casual'], category: 'Shoes' }),
    item({ id: 'grey-hoodie', colors: ['Grey'], tags: ['casual'], category: 'Outerwear' }),
    item({
      id: 'black-jeans',
      colors: ['Black'],
      tags: ['casual', 'denim'],
      category: 'Bottoms',
    }),
    item({ id: 'white-tee', colors: ['White'], tags: ['casual', 'minimal'], category: 'Tops' }),
    item({ id: 'brown-boots', colors: ['Brown'], tags: ['casual'], category: 'Shoes' }),
  ];
}

function vectorFrom(
  events: Array<{ type: RecommendationEventType; items: ClothingItem[] }>
): UserPreferenceVector {
  return events.reduce(
    (vector, event) =>
      applyFeedbackToVector(vector, { eventType: event.type, items: event.items }),
    emptyPreferenceVector()
  );
}

describe('Test A — production path injects preference vector', () => {
  it('toRecommendationRequest carries the preference vector into recommendOutfits', () => {
    const items = wardrobe();
    const navy = items.filter((entry) => entry.colors.includes('Navy'));
    const vec = vectorFrom([
      { type: 'wear', items: navy },
      { type: 'wear', items: navy },
      { type: 'like', items: navy },
      { type: 'save', items: navy },
    ]);
    const request = toRecommendationRequest(
      { occasionKey: 'Casual', preferenceVector: vec },
      3
    );
    expect(request.preferenceVector).toBe(vec);
    const result = recommendOutfits(items, request);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recommendations.some((rec) => rec.score.personalization !== rec.score.styleMatch)).toBe(
      true
    );
  });

  it('generateRankedOutfitsDetailed marks personalizationUsed when the vector has signals', () => {
    const items = wardrobe();
    const navy = items.filter((entry) => entry.colors.includes('Navy'));
    const vec = vectorFrom([
      { type: 'wear', items: navy },
      { type: 'like', items: navy },
    ]);
    const detailed = generateRankedOutfitsDetailed(
      items,
      { occasionKey: 'Casual', preferenceVector: vec },
      3
    );
    expect(detailed.ok).toBe(true);
    if (!detailed.ok) return;
    expect(detailed.source).toBe('local');
    expect(detailed.personalizationUsed).toBe(true);
    expect(detailed.coldStart).toBe(false);
    expect(detailed.engineVersion).toBe(ENGINE_VERSION);
    expect(detailed.outfits[0].generationSource).toBe('local');
  });
});

describe('Test B — cold start', () => {
  it('empty vector still returns ranked outfits', () => {
    const detailed = generateRankedOutfitsDetailed(
      wardrobe(),
      { occasionKey: 'Casual', preferenceVector: emptyPreferenceVector() },
      3
    );
    expect(detailed.ok).toBe(true);
    if (!detailed.ok) return;
    expect(detailed.coldStart).toBe(true);
    expect(detailed.personalizationUsed).toBe(false);
    expect(detailed.outfits.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Test C / D — feedback then second generation', () => {
  it('positive navy feedback then local generation uses that vector', () => {
    const items = wardrobe();
    const navySet = [items[0], items[1], items[2]];
    const vec = vectorFrom([
      { type: 'like', items: navySet },
      { type: 'save', items: navySet },
      { type: 'wear', items: navySet },
      { type: 'wear', items: navySet },
    ]);
    expect(vec.colors['navy']).toBeGreaterThan(0);

    const before = scoreCompleteOutfit(navySet, { occasion: 'Casual' });
    const after = scoreCompleteOutfit(navySet, {
      occasion: 'Casual',
      preferenceVector: vec,
    });
    expect(after.personalization).toBeGreaterThan(before.personalization);
  });

  it('dislike navy decreases navy personalization', () => {
    const items = wardrobe();
    const navySet = [items[0], items[1], items[2]];
    const vec = vectorFrom([
      { type: 'dislike', items: navySet },
      { type: 'dislike', items: navySet },
    ]);
    expect(vec.colors['navy']).toBeLessThan(0);
    const cold = scoreCompleteOutfit(navySet, { occasion: 'Casual' });
    const disliked = scoreCompleteOutfit(navySet, {
      occasion: 'Casual',
      preferenceVector: vec,
    });
    expect(disliked.personalization).toBeLessThan(cold.personalization);
  });
});

describe('Test E — rankComposedOutfits orders by outfit-level score', () => {
  it('places the higher overall outfit first', () => {
    const coherent = [
      item({ id: 'tee', tags: ['casual'], formalityScore: 2, colors: ['White'] }),
      item({
        id: 'jeans',
        category: 'Bottoms',
        tags: ['casual'],
        formalityScore: 2,
        colors: ['Blue'],
      }),
    ];
    const clash = [
      item({ id: 'blazer', tags: ['formal', 'blazer'], formalityScore: 4, colors: ['Navy'] }),
      item({
        id: 'gym',
        category: 'Bottoms',
        tags: ['gym', 'athletic'],
        formalityScore: 1,
        colors: ['Black'],
      }),
    ];
    const ranked = rankComposedOutfits([clash, coherent], { occasion: 'Casual' });
    expect(ranked[0].items.some((entry) => entry.id === 'tee')).toBe(true);
    expect(ranked[0].score.overall).toBeGreaterThan(ranked[1].score.overall);
  });
});

describe('Test F / G / H / I — sessions and events', () => {
  beforeEach(() => {
    memoryStore.clear();
    usePreferenceStore.getState().reset();
  });

  it('one generate call creates one session and impression events', () => {
    const detailed = generateRankedOutfitsDetailed(wardrobe(), { occasionKey: 'Casual' }, 3);
    expect(detailed.ok).toBe(true);
    if (!detailed.ok) return;

    recordGeneratedRecommendations({
      outfits: detailed.outfits,
      occasion: 'Casual',
      engineVersion: ENGINE_VERSION,
    });

    const state = usePreferenceStore.getState();
    expect(state.lastSession).not.toBeNull();
    expect(state.lastSession!.engineVersion).toBe(ENGINE_VERSION);
    const impressions = state.recentEvents.filter((event) => event.eventType === 'impression');
    expect(impressions).toHaveLength(detailed.outfits.length);
  });

  it('view is recorded once per outfit per session', () => {
    const outfit = {
      id: 'outfit-view-1',
      items: [item({ colors: ['Navy'] })],
      occasion: 'Casual',
      name: 'Casual',
      createdAt: new Date().toISOString(),
      tags: [],
      isFavorite: false,
    };
    recordGeneratedRecommendations({ outfits: [outfit], occasion: 'Casual' });
    recordRecommendationEvent({
      eventType: 'view',
      items: outfit.items,
      outfitId: outfit.id,
    });
    recordRecommendationEvent({
      eventType: 'view',
      items: outfit.items,
      outfitId: outfit.id,
    });
    const views = usePreferenceStore
      .getState()
      .recentEvents.filter((event) => event.eventType === 'view');
    expect(views).toHaveLength(1);
  });

  it('supported UI events still map to a single applyEvent each', () => {
    const garment = item({ colors: ['Navy'] });
    const types: RecommendationEventType[] = [
      'like',
      'dislike',
      'save',
      'swap',
      'wear',
      'share',
      'try_on',
    ];
    for (const eventType of types) {
      recordRecommendationEvent({ eventType, items: [garment], outfitId: `o-${eventType}` });
    }
    expect(
      usePreferenceStore.getState().recentEvents.filter((event) => event.eventType !== 'impression')
        .length
    ).toBe(types.length);
  });
});

describe('Test J — local engine does not require Edge / network', () => {
  it('generateRankedOutfitsDetailed is synchronous and succeeds without Supabase', () => {
    const detailed = generateRankedOutfitsDetailed(wardrobe(), { occasionKey: 'Casual' }, 3);
    expect(detailed.ok).toBe(true);
    if (!detailed.ok) return;
    expect(detailed.source).toBe('local');
    expect(detailed.metadata.generationLatencyMs).toBeGreaterThanOrEqual(0);
  });
});

describe('End-to-end production loop', () => {
  beforeEach(() => {
    memoryStore.clear();
    usePreferenceStore.getState().reset();
  });

  it('wardrobe + vector → ranked outfits → wear → updated vector → ranking can change', () => {
    const items = wardrobe();
    const first = generateRankedOutfitsDetailed(items, { occasionKey: 'Casual' }, 3);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    recordGeneratedRecommendations({
      outfits: first.outfits,
      occasion: 'Casual',
      engineVersion: ENGINE_VERSION,
    });

    const worn = first.outfits[0];
    recordRecommendationEvent({
      eventType: 'wear',
      items: worn.items,
      outfitId: worn.id,
      occasion: 'Casual',
    });

    const vec = usePreferenceStore.getState().preferenceVector;
    expect(hasBehavioralSignal(vec)).toBe(true);

    const second = generateRankedOutfitsDetailed(
      items,
      { occasionKey: 'Casual', preferenceVector: vec },
      3
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.personalizationUsed).toBe(true);
    expect(second.engineVersion).toBe(ENGINE_VERSION);

    const wornScoreAfter = scoreCompleteOutfit(worn.items, {
      occasion: 'Casual',
      preferenceVector: vec,
    });
    const wornScoreBefore = scoreCompleteOutfit(worn.items, { occasion: 'Casual' });
    expect(wornScoreAfter.personalization).toBeGreaterThanOrEqual(wornScoreBefore.personalization);
  });
});
