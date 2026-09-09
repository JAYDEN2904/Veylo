import { generateRankedOutfitsDetailed } from '../outfitGenerationService';
import { recommendOutfits } from './recommendationEngine';
import { scoreCompleteOutfit } from './ranking/outfitRanker';
import { composeOutfits } from './outfitComposer';
import { getCandidateItemsByCategory } from './candidateGenerator';
import { shouldAttemptEdgeFallback } from './generationPolicy';
import {
  applyFeedbackToVector,
  emptyPreferenceVector,
  FEEDBACK_STRENGTHS,
} from './feedback/recommendationFeedback';
import {
  recordGeneratedRecommendations,
  recordRecommendationEvent,
} from './feedback/sessionRecorder';
import { usePreferenceStore } from '../../store/usePreferenceStore';
import { ENGINE_VERSION } from './types';
import {
  item,
  largeWardrobe,
  mildWeather,
  outfitSignature,
  realisticWardrobe,
} from './testFixtures';
import type { ClothingItem } from '../../types';
import type { OutfitScoreBreakdown } from './types';

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

function finiteScores(breakdown: OutfitScoreBreakdown): void {
  const values = Object.values(breakdown);
  for (const value of values) {
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
  }
}

function assertValidOutfit(items: ClothingItem[], wardrobe: ClothingItem[]): void {
  const ids = items.map((entry) => entry.id);
  expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
  expect(new Set(ids).size).toBe(ids.length);
  expect(items.every((entry) => entry != null)).toBe(true);
  const wardrobeIds = new Set(wardrobe.map((entry) => entry.id));
  expect(items.every((entry) => wardrobeIds.has(entry.id))).toBe(true);
  const categories = new Set(items.map((entry) => entry.category));
  const valid =
    categories.has('Dresses') || (categories.has('Tops') && categories.has('Bottoms'));
  expect(valid).toBe(true);
}

describe('generationPolicy', () => {
  it('does not call Edge after local success or typed failure', () => {
    expect(shouldAttemptEdgeFallback('success', true)).toBe(false);
    expect(shouldAttemptEdgeFallback('typed_failure', true)).toBe(false);
    expect(shouldAttemptEdgeFallback('typed_failure', false)).toBe(false);
  });

  it('calls Edge only when local throws and Supabase is configured', () => {
    expect(shouldAttemptEdgeFallback('threw', true)).toBe(true);
    expect(shouldAttemptEdgeFallback('threw', false)).toBe(false);
  });
});

describe('empty / invalid wardrobe', () => {
  it('empty wardrobe fails safely without fabricating items', () => {
    const detailed = generateRankedOutfitsDetailed([], { occasionKey: 'Casual' }, 3);
    expect(detailed.ok).toBe(false);
    if (detailed.ok) return;
    expect(detailed.failure.reason).toBe('empty_wardrobe');
    expect(detailed.source).toBe('local');
  });

  it('archived-only wardrobe is empty_wardrobe', () => {
    const detailed = generateRankedOutfitsDetailed(
      [item({ status: 'archived', category: 'Tops' }), item({ status: 'archived', category: 'Bottoms' })],
      { occasionKey: 'Casual' }
    );
    expect(detailed.ok).toBe(false);
    if (!detailed.ok) expect(detailed.failure.reason).toBe('empty_wardrobe');
  });
});

describe('Case A — minimal wardrobe', () => {
  it('builds a valid outfit from one top, bottom, and shoe', () => {
    const closet = [
      item({ id: 't', category: 'Tops' }),
      item({ id: 'b', category: 'Bottoms' }),
      item({ id: 's', category: 'Shoes' }),
    ];
    const detailed = generateRankedOutfitsDetailed(closet, { occasionKey: 'Casual' }, 3);
    expect(detailed.ok).toBe(true);
    if (!detailed.ok) return;
    assertValidOutfit(detailed.outfits[0].items, closet);
    expect(detailed.outfits[0].items.some((entry) => entry.id === 't')).toBe(true);
    expect(detailed.outfits[0].items.some((entry) => entry.id === 'b')).toBe(true);
  });
});

describe('Case B — no shoes', () => {
  it('returns a top+bottom outfit and does not fabricate shoes', () => {
    const closet = [
      item({ id: 't', category: 'Tops' }),
      item({ id: 'b', category: 'Bottoms' }),
    ];
    const detailed = generateRankedOutfitsDetailed(closet, { occasionKey: 'Casual' }, 3);
    expect(detailed.ok).toBe(true);
    if (!detailed.ok) return;
    assertValidOutfit(detailed.outfits[0].items, closet);
    expect(detailed.outfits[0].items.every((entry) => entry.category !== 'Shoes')).toBe(true);
  });
});

describe('Case C — no compatible top/bottom', () => {
  it('does not invent a structurally invalid outfit', () => {
    const closet = [
      item({ id: 't1', category: 'Tops' }),
      item({ id: 't2', category: 'Tops', colors: ['Black'] }),
      item({ id: 's', category: 'Shoes' }),
    ];
    const detailed = generateRankedOutfitsDetailed(closet, { occasionKey: 'Casual' }, 3);
    expect(detailed.ok).toBe(false);
    if (!detailed.ok) {
      expect(['insufficient_categories', 'filters_too_strict']).toContain(detailed.failure.reason);
    }
  });
});

describe('Case D — dress-only', () => {
  it('can form a dress outfit without a top/bottom pair', () => {
    const closet = [
      item({
        id: 'd',
        category: 'Dresses',
        tags: ['formal', 'elegant'],
        formalityScore: 4,
      }),
      item({ id: 's', category: 'Shoes', tags: ['formal'], formalityScore: 4 }),
    ];
    const detailed = generateRankedOutfitsDetailed(closet, { occasionKey: 'Formal' }, 3);
    expect(detailed.ok).toBe(true);
    if (!detailed.ok) return;
    assertValidOutfit(detailed.outfits[0].items, closet);
    expect(detailed.outfits[0].items.some((entry) => entry.id === 'd')).toBe(true);
  });
});

describe('Case E — outerwear variants', () => {
  it('keeps a bare core and does not duplicate items', () => {
    const closet = [
      item({ id: 't', category: 'Tops' }),
      item({ id: 'b', category: 'Bottoms' }),
      item({ id: 's', category: 'Shoes' }),
      item({ id: 'j1', category: 'Outerwear', colors: ['Navy'] }),
      item({ id: 'j2', category: 'Outerwear', colors: ['Black'] }),
    ];
    const composed = composeOutfits(getCandidateItemsByCategory(closet, { occasion: 'Casual' }), {
      occasion: 'Casual',
    });
    expect(composed.some((outfit) => outfit.every((entry) => entry.category !== 'Outerwear'))).toBe(
      true
    );
    expect(composed.some((outfit) => outfit.some((entry) => entry.category === 'Outerwear'))).toBe(
      true
    );
    composed.forEach((outfit) => assertValidOutfit(outfit, closet));

    const detailed = generateRankedOutfitsDetailed(closet, { occasionKey: 'Casual' }, 5);
    expect(detailed.ok).toBe(true);
    if (!detailed.ok) return;
    detailed.outfits.forEach((outfit) => assertValidOutfit(outfit.items, closet));
    const signatures = detailed.outfits.map((outfit) => outfitSignature(outfit.items));
    expect(new Set(signatures).size).toBe(signatures.length);
  });
});

describe('Case F — accessories optional', () => {
  it('does not require accessories to form a valid outfit', () => {
    const closet = [
      item({ id: 't', category: 'Tops' }),
      item({ id: 'b', category: 'Bottoms' }),
      item({ id: 'a1', category: 'Accessories', colors: ['Brown'] }),
      item({ id: 'a2', category: 'Accessories', colors: ['Black'] }),
    ];
    const composed = composeOutfits(getCandidateItemsByCategory(closet, { occasion: 'Casual' }), {
      occasion: 'Casual',
    });
    expect(composed.some((outfit) => outfit.every((entry) => entry.category !== 'Accessories'))).toBe(
      true
    );
    expect(composed.some((outfit) => outfit.some((entry) => entry.category === 'Accessories'))).toBe(
      true
    );

    const detailed = generateRankedOutfitsDetailed(closet, { occasionKey: 'Casual' }, 5);
    expect(detailed.ok).toBe(true);
    if (!detailed.ok) return;
    detailed.outfits.forEach((outfit) => assertValidOutfit(outfit.items, closet));
  });
});

describe('Case G — near-duplicate items stay distinct', () => {
  it('keeps two black tees as separate item IDs', () => {
    const closet = [
      item({ id: 'tee-a', colors: ['Black'], tags: ['casual'] }),
      item({ id: 'tee-b', colors: ['Black'], tags: ['casual'] }),
      item({ id: 'b', category: 'Bottoms', colors: ['Navy'] }),
      item({ id: 's1', category: 'Shoes' }),
      item({ id: 's2', category: 'Shoes', colors: ['Black'] }),
      item({ id: 's3', category: 'Shoes', colors: ['White'] }),
    ];
    const detailed = generateRankedOutfitsDetailed(closet, { occasionKey: 'Casual' }, 5);
    expect(detailed.ok).toBe(true);
    if (!detailed.ok) return;
    const used = new Set(detailed.outfits.flatMap((outfit) => outfit.items.map((entry) => entry.id)));
    expect(used.has('tee-a') || used.has('tee-b')).toBe(true);
    detailed.outfits.forEach((outfit) => assertValidOutfit(outfit.items, closet));
  });
});

describe('Case H — missing metadata', () => {
  it('does not crash or emit non-finite scores', () => {
    const closet = [
      item({
        id: 't',
        colors: [],
        colorsHsl: [],
        tags: [],
        formalityScore: undefined,
        brand: undefined,
        season: undefined,
        subCategory: undefined,
        lastWorn: 'not-a-date',
      }),
      item({
        id: 'b',
        category: 'Bottoms',
        colors: [],
        colorsHsl: [],
        tags: [],
      }),
    ];
    const detailed = generateRankedOutfitsDetailed(closet, { occasionKey: 'Casual' }, 3);
    expect(detailed.ok).toBe(true);
    if (!detailed.ok) return;
    const result = recommendOutfits(closet, { occasion: 'Casual' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    result.recommendations.forEach((rec) => finiteScores(rec.score));
    finiteScores(scoreCompleteOutfit(closet, { occasion: 'Casual' }));
  });
});

describe('Case I — large wardrobe stays inside composition budget', () => {
  it.each([25, 50, 100])('n=%s composedCount <= 80', (size) => {
    const closet = largeWardrobe(size);
    const detailed = generateRankedOutfitsDetailed(closet, { occasionKey: 'Casual' }, 5);
    expect(detailed.ok).toBe(true);
    if (!detailed.ok) return;
    expect(detailed.metadata.composedCount).toBeLessThanOrEqual(80);
    expect(detailed.metadata.candidateCount).toBeLessThanOrEqual(closet.length);
    expect(detailed.outfits.length).toBeLessThanOrEqual(5);
    detailed.outfits.forEach((outfit) => assertValidOutfit(outfit.items, closet));
  });
});

describe('must-include', () => {
  it('includes a valid must-include item', () => {
    const closet = realisticWardrobe();
    const detailed = generateRankedOutfitsDetailed(
      closet,
      { occasionKey: 'Casual', mustIncludeItemIds: ['rt-navy-tee'] },
      3
    );
    expect(detailed.ok).toBe(true);
    if (!detailed.ok) return;
    expect(detailed.outfits.every((outfit) => outfit.items.some((entry) => entry.id === 'rt-navy-tee'))).toBe(
      true
    );
  });

  it('rejects a must-include id that is not in the wardrobe', () => {
    const detailed = generateRankedOutfitsDetailed(realisticWardrobe(), {
      occasionKey: 'Casual',
      mustIncludeItemIds: ['does-not-exist'],
    });
    expect(detailed.ok).toBe(false);
    if (!detailed.ok) expect(detailed.failure.reason).toBe('filters_too_strict');
  });
});

describe('determinism', () => {
  it('same wardrobe, context, and vector produce the same ranked item sets and scores', () => {
    const closet = realisticWardrobe();
    const vector = applyFeedbackToVector(emptyPreferenceVector(), {
      eventType: 'wear',
      items: closet.filter((entry) => entry.id.startsWith('rt-navy') || entry.id === 'rb-navy-jeans'),
    });
    const context = {
      occasionKey: 'Casual' as const,
      timeOfDay: 'afternoon' as const,
      weather: mildWeather,
      preferenceVector: vector,
    };
    const a = generateRankedOutfitsDetailed(closet, context, 3);
    const b = generateRankedOutfitsDetailed(closet, context, 3);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.outfits.map((outfit) => outfitSignature(outfit.items))).toEqual(
      b.outfits.map((outfit) => outfitSignature(outfit.items))
    );
    const ra = recommendOutfits(closet, {
      occasion: 'Casual',
      timeOfDay: 'afternoon',
      weather: mildWeather,
      preferenceVector: vector,
      count: 3,
    });
    const rb = recommendOutfits(closet, {
      occasion: 'Casual',
      timeOfDay: 'afternoon',
      weather: mildWeather,
      preferenceVector: vector,
      count: 3,
    });
    expect(ra.ok && rb.ok).toBe(true);
    if (!ra.ok || !rb.ok) return;
    expect(ra.recommendations.map((rec) => rec.score.overall)).toEqual(
      rb.recommendations.map((rec) => rec.score.overall)
    );
  });
});

describe('ranking + personalization sanity', () => {
  it('returns outfits in descending overall score', () => {
    const result = recommendOutfits(realisticWardrobe(), { occasion: 'Casual', count: 5 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const scores = result.recommendations.map((rec) => rec.score.overall);
    const sorted = [...scores].sort((left, right) => right - left);
    expect(scores).toEqual(sorted);
    result.recommendations.forEach((rec) => finiteScores(rec.score));
  });

  it('cold start metadata is accurate', () => {
    const detailed = generateRankedOutfitsDetailed(
      realisticWardrobe(),
      { occasionKey: 'Casual', preferenceVector: emptyPreferenceVector() },
      3
    );
    expect(detailed.ok).toBe(true);
    if (!detailed.ok) return;
    expect(detailed.coldStart).toBe(true);
    expect(detailed.personalizationUsed).toBe(false);
    expect(detailed.source).toBe('local');
    expect(detailed.engineVersion).toBe(ENGINE_VERSION);
  });

  it('populated vector sets personalizationUsed', () => {
    const closet = realisticWardrobe();
    const vector = applyFeedbackToVector(emptyPreferenceVector(), {
      eventType: 'like',
      items: [closet[1], closet[10]],
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
  });
});

describe('impression does not train', () => {
  it('impression strength is 0 and leaves affinities empty', () => {
    expect(FEEDBACK_STRENGTHS.impression).toBe(0);
    const vector = applyFeedbackToVector(emptyPreferenceVector(), {
      eventType: 'impression',
      items: [item({ colors: ['Navy'] })],
    });
    expect(Object.keys(vector.colors)).toHaveLength(0);
  });
});

describe('hard occasion bans', () => {
  it('does not mix gym pieces into Formal when a valid formal set exists', () => {
    const closet = [
      item({
        id: 'oxford',
        tags: ['formal', 'work', 'collar'],
        formalityScore: 4,
        colors: ['White'],
      }),
      item({
        id: 'trousers',
        category: 'Bottoms',
        tags: ['formal', 'tailored', 'work'],
        formalityScore: 4,
        colors: ['Black'],
      }),
      item({
        id: 'loafers',
        category: 'Shoes',
        tags: ['formal', 'work'],
        formalityScore: 4,
        colors: ['Brown'],
      }),
      item({
        id: 'gym-tee',
        tags: ['gym', 'athletic', 'workout'],
        formalityScore: 1,
        colors: ['Black'],
      }),
      item({
        id: 'gym-shorts',
        category: 'Bottoms',
        subCategory: 'shorts',
        tags: ['gym', 'athletic'],
        formalityScore: 1,
        colors: ['Black'],
      }),
    ];
    const detailed = generateRankedOutfitsDetailed(closet, { occasionKey: 'Formal' }, 3);
    expect(detailed.ok).toBe(true);
    if (!detailed.ok) return;
    const used = detailed.outfits.flatMap((outfit) => outfit.items.map((entry) => entry.id));
    expect(used).not.toContain('gym-tee');
    expect(used).not.toContain('gym-shorts');
    expect(detailed.usedRelaxedFilters).toBe(false);
  });
});

describe('relaxed filters flag', () => {
  it('reports usedRelaxedFilters from metadata', () => {
    const detailed = generateRankedOutfitsDetailed(realisticWardrobe(), {
      occasionKey: 'Formal',
      weather: {
        temperature: -5,
        condition: 'Snow',
        description: 'freezing',
        humidity: 80,
        windSpeed: 12,
        icon: '13d',
        feelsLike: -8,
        location: 'Test',
      },
    });
    if (!detailed.ok) return;
    expect(typeof detailed.usedRelaxedFilters).toBe('boolean');
    expect(detailed.usedRelaxedFilters).toBe(detailed.metadata.filtersRelaxed);
  });
});

describe('Sprint 3.2.1 acceptance loop', () => {
  beforeEach(() => {
    memoryStore.clear();
    usePreferenceStore.getState().reset();
  });

  it('realistic wardrobe → ranked local outfits → wear once → vector updates → second generate stays valid', () => {
    const closet = realisticWardrobe();
    const first = generateRankedOutfitsDetailed(closet, { occasionKey: 'Work' }, 3);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.source).toBe('local');
    first.outfits.forEach((outfit) => assertValidOutfit(outfit.items, closet));

    const scores = first.outfits.map((outfit) => outfit.fitScore ?? 0);
    expect(scores).toEqual([...scores].sort((left, right) => right - left));

    recordGeneratedRecommendations({
      outfits: first.outfits,
      occasion: 'Work',
      engineVersion: ENGINE_VERSION,
      styleContext: ['classic'],
      weather: mildWeather,
    });
    const session = usePreferenceStore.getState().lastSession;
    expect(session?.engineVersion).toBe(ENGINE_VERSION);
    expect(session?.occasion).toBe('Work');
    expect(usePreferenceStore.getState().recentEvents.filter((event) => event.eventType === 'impression')).toHaveLength(
      first.outfits.length
    );

    const chosen = first.outfits[0];
    recordRecommendationEvent({
      eventType: 'wear',
      items: chosen.items,
      outfitId: chosen.id,
      occasion: 'Work',
    });
    expect(
      usePreferenceStore.getState().recentEvents.filter((event) => event.eventType === 'wear')
    ).toHaveLength(1);

    const vector = usePreferenceStore.getState().preferenceVector;
    const second = generateRankedOutfitsDetailed(
      closet,
      { occasionKey: 'Work', preferenceVector: vector },
      3
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.personalizationUsed).toBe(true);
    second.outfits.forEach((outfit) => assertValidOutfit(outfit.items, closet));

    const after = scoreCompleteOutfit(chosen.items, {
      occasion: 'Work',
      preferenceVector: vector,
    });
    const before = scoreCompleteOutfit(chosen.items, { occasion: 'Work' });
    expect(after.personalization).toBeGreaterThanOrEqual(before.personalization);
    finiteScores(after);
  });
});
