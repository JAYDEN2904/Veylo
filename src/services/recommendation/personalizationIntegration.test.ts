/**
 * Sprint 3.1 — End-to-end personalization integration tests.
 *
 * These test the full pipeline:
 *   feedback → preference vector → recommendation request → scoring → ranking
 *
 * They do NOT test React components or Supabase persistence (those require
 * a full RN runtime / network). They test the deterministic engine path.
 */

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

import { ClothingItem } from '../../types';
import { namedColorsToHsl } from '../../utils/hslColor';
import { recommendOutfits } from './recommendationEngine';
import { scorePersonalization, scoreOutfitAffinity } from './ranking/personalizationRanker';
import {
  applyFeedbackToVector,
  emptyPreferenceVector,
  hasBehavioralSignal,
  FEEDBACK_STRENGTHS,
} from './feedback/recommendationFeedback';
import {
  recordGeneratedRecommendations,
  recordRecommendationEvent,
} from './feedback/sessionRecorder';
import { usePreferenceStore } from '../../store/usePreferenceStore';
import type { UserPreferenceVector, RecommendationRequest, RecommendationEventType } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function buildWardrobe(): ClothingItem[] {
  return [
    // Navy-heavy casual set (should be boosted by navy affinity)
    item({ id: 'navy-tee', colors: ['Navy'], tags: ['casual', 'minimal'], category: 'Tops' }),
    item({ id: 'navy-jeans', colors: ['Navy'], tags: ['casual', 'denim'], category: 'Bottoms' }),
    item({ id: 'white-sneakers', colors: ['White'], tags: ['casual'], category: 'Shoes' }),
    // Red-heavy set
    item({ id: 'red-tee', colors: ['Red'], tags: ['casual', 'bold', 'graphic'], category: 'Tops' }),
    item({ id: 'red-shorts', colors: ['Red'], tags: ['casual'], category: 'Bottoms', subCategory: 'shorts' }),
    item({ id: 'black-sneakers', colors: ['Black'], tags: ['casual'], category: 'Shoes' }),
    // Neutral extra pieces
    item({ id: 'grey-hoodie', colors: ['Grey'], tags: ['casual', 'comfort'], category: 'Outerwear' }),
    item({ id: 'black-jeans', colors: ['Black'], tags: ['casual', 'denim'], category: 'Bottoms' }),
    item({ id: 'white-tee', colors: ['White'], tags: ['casual', 'minimal'], category: 'Tops' }),
    item({ id: 'brown-boots', colors: ['Brown'], tags: ['casual'], category: 'Shoes' }),
  ];
}

function vectorFromFeedback(
  events: Array<{ type: RecommendationEventType; items: ClothingItem[]; occasion?: string }>
): UserPreferenceVector {
  let vec = emptyPreferenceVector();
  for (const ev of events) {
    vec = applyFeedbackToVector(vec, { eventType: ev.type, items: ev.items, occasion: ev.occasion });
  }
  return vec;
}

// ---------------------------------------------------------------------------
// Test A — Preference vector injection
// ---------------------------------------------------------------------------

describe('Test A — preference injection into engine', () => {
  it('engine receives and uses the preference vector in personalization scoring', () => {
    const wardrobe = buildWardrobe();
    const vec = vectorFromFeedback([
      { type: 'like', items: [wardrobe[0], wardrobe[1]] },
      { type: 'wear', items: [wardrobe[0], wardrobe[1]] },
      { type: 'wear', items: [wardrobe[0], wardrobe[1]] },
    ]);

    const request: RecommendationRequest = {
      occasion: 'Casual',
      preferenceVector: vec,
      count: 5,
    };
    const result = recommendOutfits(wardrobe, request);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // At least one outfit should have personalization != styleMatch
    const hasPersonalized = result.recommendations.some(
      (rec) => rec.score.personalization !== rec.score.styleMatch
    );
    expect(hasPersonalized).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test B — Positive feedback increases traits
// ---------------------------------------------------------------------------

describe('Test B — positive feedback increases relevant traits', () => {
  it('like increases color and category affinity', () => {
    const navyTop = item({ id: 'navy-tee', colors: ['Navy'], category: 'Tops' });
    const vec = applyFeedbackToVector(emptyPreferenceVector(), {
      eventType: 'like',
      items: [navyTop],
    });
    expect(vec.colors['navy']).toBeGreaterThan(0);
    expect(vec.categories['tops']).toBeGreaterThan(0);
  });

  it('wear is stronger than like', () => {
    const navyTop = item({ colors: ['Navy'] });
    const likeVec = applyFeedbackToVector(emptyPreferenceVector(), {
      eventType: 'like',
      items: [navyTop],
    });
    const wearVec = applyFeedbackToVector(emptyPreferenceVector(), {
      eventType: 'wear',
      items: [navyTop],
    });
    expect(wearVec.colors['navy']).toBeGreaterThan(likeVec.colors['navy']);
  });

  it('save records occasion affinity', () => {
    const vec = applyFeedbackToVector(emptyPreferenceVector(), {
      eventType: 'save',
      items: [item({})],
      occasion: 'Work',
    });
    expect(vec.occasions['work']).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Test C — Negative feedback decreases traits
// ---------------------------------------------------------------------------

describe('Test C — negative feedback decreases relevant traits', () => {
  it('dislike decreases color affinity', () => {
    const red = item({ colors: ['Red'] });
    const vec = applyFeedbackToVector(emptyPreferenceVector(), {
      eventType: 'dislike',
      items: [red],
    });
    expect(vec.colors['red']).toBeLessThan(0);
  });

  it('swap with itemId only affects the swapped item', () => {
    const top = item({ id: 'top-1', colors: ['White'], category: 'Tops' });
    const bottom = item({ id: 'bottom-1', colors: ['Navy'], category: 'Bottoms' });
    const vec = applyFeedbackToVector(emptyPreferenceVector(), {
      eventType: 'swap',
      items: [top, bottom],
      itemId: 'top-1',
    });
    expect(vec.colors['white']).toBeLessThan(0);
    expect(vec.colors['navy']).toBeUndefined();
    expect(vec.categories['bottoms']).toBeUndefined();
  });

  it('remove is a strong negative signal', () => {
    const red = item({ colors: ['Red'] });
    const dislikeVec = applyFeedbackToVector(emptyPreferenceVector(), {
      eventType: 'dislike',
      items: [red],
    });
    const removeVec = applyFeedbackToVector(emptyPreferenceVector(), {
      eventType: 'remove',
      items: [red],
    });
    expect(removeVec.colors['red']).toBeLessThan(dislikeVec.colors['red']);
  });
});

// ---------------------------------------------------------------------------
// Test D — Ranking changes with behavioral data
// ---------------------------------------------------------------------------

describe('Test D — ranking change from feedback', () => {
  it('personalization score increases for outfits matching liked traits', () => {
    const wardrobe = buildWardrobe();
    const navyOutfit = [wardrobe[0], wardrobe[1], wardrobe[2]]; // navy tee + navy jeans + white sneakers
    const redOutfit = [wardrobe[3], wardrobe[4], wardrobe[5]]; // red tee + red shorts + black sneakers

    const coldRequest: RecommendationRequest = { occasion: 'Casual' };
    const coldNavy = scorePersonalization(navyOutfit, coldRequest);

    // After heavy navy preference
    const vec = vectorFromFeedback([
      { type: 'like', items: navyOutfit },
      { type: 'wear', items: navyOutfit },
      { type: 'wear', items: navyOutfit },
      { type: 'save', items: navyOutfit },
    ]);

    const warmRequest: RecommendationRequest = { occasion: 'Casual', preferenceVector: vec };
    const warmNavy = scorePersonalization(navyOutfit, warmRequest);
    const warmRed = scorePersonalization(redOutfit, warmRequest);

    expect(warmNavy).toBeGreaterThan(coldNavy);
    expect(scoreOutfitAffinity(navyOutfit, vec, 'Casual')).toBeGreaterThan(
      scoreOutfitAffinity(redOutfit, vec, 'Casual')
    );
    expect(warmNavy).toBeGreaterThanOrEqual(warmRed);
  });

  it('negative feedback on navy decreases navy outfit personalization', () => {
    const wardrobe = buildWardrobe();
    const navyOutfit = [wardrobe[0], wardrobe[1], wardrobe[2]];

    const coldScore = scorePersonalization(navyOutfit, { occasion: 'Casual' });

    const vec = vectorFromFeedback([
      { type: 'dislike', items: navyOutfit },
      { type: 'dislike', items: navyOutfit },
      { type: 'dislike', items: navyOutfit },
    ]);

    const dislikedScore = scorePersonalization(navyOutfit, {
      occasion: 'Casual',
      preferenceVector: vec,
    });

    expect(dislikedScore).toBeLessThan(coldScore);
  });

  it('full ranking can change when preference vector is provided', () => {
    const wardrobe = buildWardrobe();

    // Cold-start ranking
    const coldResult = recommendOutfits(wardrobe, { occasion: 'Casual', count: 5 });
    expect(coldResult.ok).toBe(true);
    if (!coldResult.ok) return;

    // Build strong affinity for navy
    const navyItems = wardrobe.filter((i) => i.colors.includes('Navy'));
    const vec = vectorFromFeedback([
      { type: 'wear', items: navyItems },
      { type: 'wear', items: navyItems },
      { type: 'wear', items: navyItems },
      { type: 'like', items: navyItems },
      { type: 'save', items: navyItems },
    ]);

    const warmResult = recommendOutfits(wardrobe, {
      occasion: 'Casual',
      preferenceVector: vec,
      count: 5,
    });
    expect(warmResult.ok).toBe(true);
    if (!warmResult.ok) return;

    // The top outfit's personalization score should be higher than cold start average
    const coldAvgPers = coldResult.recommendations.reduce(
      (sum, r) => sum + r.score.personalization, 0
    ) / coldResult.recommendations.length;
    const warmTopPers = warmResult.recommendations[0].score.personalization;
    expect(warmTopPers).toBeGreaterThanOrEqual(coldAvgPers);
  });
});

// ---------------------------------------------------------------------------
// Test E — Cold start
// ---------------------------------------------------------------------------

describe('Test E — cold start', () => {
  it('recommendations work with no preference vector', () => {
    const wardrobe = buildWardrobe();
    const result = recommendOutfits(wardrobe, { occasion: 'Casual', count: 3 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
    expect(result.recommendations[0].score.personalization).toBeGreaterThan(0);
  });

  it('recommendations work with an explicitly empty vector', () => {
    const wardrobe = buildWardrobe();
    const result = recommendOutfits(wardrobe, {
      occasion: 'Casual',
      preferenceVector: emptyPreferenceVector(),
      count: 3,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
  });

  it('empty vector personalization equals no vector personalization', () => {
    const items = [item({ tags: ['casual'] }), item({ category: 'Bottoms', tags: ['casual'] })];
    const noVec = scorePersonalization(items, { occasion: 'Casual' });
    const emptyVec = scorePersonalization(items, {
      occasion: 'Casual',
      preferenceVector: emptyPreferenceVector(),
    });
    expect(emptyVec).toBe(noVec);
  });
});

// ---------------------------------------------------------------------------
// Test F — Persistence (Zustand store round-trip)
// ---------------------------------------------------------------------------

describe('Test F — preference store round-trip', () => {
  beforeEach(() => {
    memoryStore.clear();
    usePreferenceStore.getState().reset();
  });

  it('applyEvent updates the preference vector', () => {
    const store = usePreferenceStore.getState();
    expect(hasBehavioralSignal(store.preferenceVector)).toBe(false);

    store.applyEvent({
      eventType: 'like',
      items: [item({ colors: ['Navy'], category: 'Tops' })],
    });

    const updated = usePreferenceStore.getState().preferenceVector;
    expect(hasBehavioralSignal(updated)).toBe(true);
    expect(updated.colors['navy']).toBeGreaterThan(0);
  });

  it('startSession creates a session with correct engine version', () => {
    const store = usePreferenceStore.getState();
    const session = store.startSession({
      occasion: 'Work',
      engineVersion: '2.2.0',
    });
    expect(session.id).toBeTruthy();
    expect(session.engineVersion).toBe('2.2.0');
    expect(session.occasion).toBe('Work');
    expect(usePreferenceStore.getState().lastSession?.id).toBe(session.id);
  });

  it('events are stored in recentEvents', () => {
    const store = usePreferenceStore.getState();
    store.applyEvent({
      eventType: 'wear',
      items: [item({ colors: ['Black'] })],
      outfitId: 'outfit-1',
    });
    const events = usePreferenceStore.getState().recentEvents;
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('wear');
    expect(events[0].outfitId).toBe('outfit-1');
  });

  it('reset clears vector and events', () => {
    const store = usePreferenceStore.getState();
    store.applyEvent({
      eventType: 'like',
      items: [item({ colors: ['Navy'] })],
    });
    expect(hasBehavioralSignal(usePreferenceStore.getState().preferenceVector)).toBe(true);

    usePreferenceStore.getState().reset();
    expect(hasBehavioralSignal(usePreferenceStore.getState().preferenceVector)).toBe(false);
    expect(usePreferenceStore.getState().recentEvents).toHaveLength(0);
  });

  it('persists the preference vector to local storage after an event', async () => {
    usePreferenceStore.getState().applyEvent({
      eventType: 'like',
      items: [item({ colors: ['Navy'], category: 'Tops' })],
    });
    await new Promise((resolve) => setTimeout(resolve, 80));
    const persisted = [...memoryStore.values()].join(' ');
    expect(persisted.toLowerCase()).toContain('navy');
  });
});

// ---------------------------------------------------------------------------
// Test G — Event coverage via sessionRecorder
// ---------------------------------------------------------------------------

describe('Test G — sessionRecorder event coverage', () => {
  beforeEach(() => {
    memoryStore.clear();
    usePreferenceStore.getState().reset();
  });

  it('recordGeneratedRecommendations creates a session and impression events', () => {
    const outfit1 = {
      id: 'outfit-1',
      items: [item({ colors: ['Navy'] }), item({ category: 'Bottoms', colors: ['Black'] })],
      occasion: 'Casual',
      name: 'Casual',
      createdAt: new Date().toISOString(),
      tags: [],
      isFavorite: false,
    };

    recordGeneratedRecommendations({
      outfits: [outfit1],
      occasion: 'Casual',
      engineVersion: '2.2.0',
    });

    const state = usePreferenceStore.getState();
    expect(state.lastSession).not.toBeNull();
    expect(state.lastSession!.engineVersion).toBe('2.2.0');
    expect(state.recentEvents.length).toBe(1);
    expect(state.recentEvents[0].eventType).toBe('impression');
    expect(state.recentEvents[0].outfitId).toBe('outfit-1');
  });

  it('recordRecommendationEvent updates vector and records event', () => {
    const navyTop = item({ colors: ['Navy'] });

    recordRecommendationEvent({
      eventType: 'like',
      items: [navyTop],
      outfitId: 'outfit-1',
    });

    const state = usePreferenceStore.getState();
    expect(state.recentEvents.length).toBe(1);
    expect(state.recentEvents[0].eventType).toBe('like');
    expect(state.preferenceVector.colors['navy']).toBeCloseTo(FEEDBACK_STRENGTHS.like, 4);
  });

  it('each supported event type is accepted without error', () => {
    const testItem = item({ colors: ['Navy'] });
    const eventTypes: RecommendationEventType[] = [
      'impression', 'view', 'like', 'dislike', 'save',
      'swap', 'remove', 'wear', 'share', 'try_on', 'dismiss',
    ];
    for (const eventType of eventTypes) {
      expect(() => {
        recordRecommendationEvent({
          eventType,
          items: [testItem],
          outfitId: `outfit-${eventType}`,
        });
      }).not.toThrow();
    }
    expect(usePreferenceStore.getState().recentEvents.length).toBe(eventTypes.length);
  });
});

// ---------------------------------------------------------------------------
// Test H — Supabase failure isolation
// ---------------------------------------------------------------------------

describe('Test H — remote persistence failure isolation', () => {
  beforeEach(() => {
    memoryStore.clear();
    usePreferenceStore.getState().reset();
  });

  it('recordRecommendationEvent updates local vector even when Supabase is unavailable', () => {
    // Supabase is not configured in test environment — persistence should silently skip.
    const navyTop = item({ colors: ['Navy'] });

    recordRecommendationEvent({
      eventType: 'wear',
      items: [navyTop],
    });

    const vec = usePreferenceStore.getState().preferenceVector;
    expect(vec.colors['navy']).toBeCloseTo(FEEDBACK_STRENGTHS.wear, 4);
  });

  it('recordGeneratedRecommendations works when Supabase is unavailable', () => {
    const outfit = {
      id: 'outfit-1',
      items: [item({})],
      occasion: 'Casual',
      name: 'Casual',
      createdAt: new Date().toISOString(),
      tags: [],
      isFavorite: false,
    };

    expect(() => {
      recordGeneratedRecommendations({
        outfits: [outfit],
        occasion: 'Casual',
      });
    }).not.toThrow();

    expect(usePreferenceStore.getState().lastSession).not.toBeNull();
  });

  it('recommendations still work after failed persistence (no Supabase)', () => {
    // Fire some events — they update local state even without Supabase
    recordRecommendationEvent({
      eventType: 'like',
      items: [item({ colors: ['Navy'] })],
    });

    const wardrobe = buildWardrobe();
    const vec = usePreferenceStore.getState().preferenceVector;
    const result = recommendOutfits(wardrobe, {
      occasion: 'Casual',
      preferenceVector: vec,
      count: 3,
    });
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// No double-counting regression
// ---------------------------------------------------------------------------

describe('No double-counting', () => {
  beforeEach(() => {
    memoryStore.clear();
    usePreferenceStore.getState().reset();
  });

  it('single like event produces exactly one vector update', () => {
    const navyTop = item({ colors: ['Navy'] });
    const strength = FEEDBACK_STRENGTHS.like;

    recordRecommendationEvent({
      eventType: 'like',
      items: [navyTop],
    });

    const vec = usePreferenceStore.getState().preferenceVector;
    // Should be exactly strength, not 2x strength
    expect(vec.colors['navy']).toBeCloseTo(strength, 4);
  });
});
