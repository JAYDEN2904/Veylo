import { ClothingItem } from '../../../types';
import { namedColorsToHsl } from '../../../utils/hslColor';
import { scorePersonalization, scoreOutfitAffinity } from './personalizationRanker';
import { applyFeedbackToVector, emptyPreferenceVector } from '../feedback/recommendationFeedback';
import type { RecommendationRequest, UserPreferenceVector } from '../types';

const item = (overrides: Partial<ClothingItem>): ClothingItem => {
  const colors = overrides.colors ?? ['White'];
  return {
    id: Math.random().toString(36).slice(2),
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

function buildVector(
  events: Array<{ type: 'like' | 'wear' | 'dislike'; items: ClothingItem[]; occasion?: string }>
): UserPreferenceVector {
  let vector = emptyPreferenceVector();
  for (const event of events) {
    vector = applyFeedbackToVector(vector, {
      eventType: event.type,
      items: event.items,
      occasion: event.occasion,
    });
  }
  return vector;
}

describe('scorePersonalization', () => {
  it('returns style match only when no preference vector is present', () => {
    const items = [
      item({ tags: ['casual'], colors: ['White'] }),
      item({ category: 'Bottoms', tags: ['casual'], colors: ['Blue'] }),
    ];
    const request: RecommendationRequest = { occasion: 'Casual' };
    const score = scorePersonalization(items, request);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('boosts an outfit whose traits match liked items', () => {
    const navy = item({ colors: ['Navy'], tags: ['casual'] });
    const white = item({ category: 'Bottoms', colors: ['White'], tags: ['casual'] });
    const red = item({ colors: ['Red'], tags: ['casual'] });
    const black = item({ category: 'Bottoms', colors: ['Black'], tags: ['casual'] });

    const vector = buildVector([
      { type: 'like', items: [navy, white] },
      { type: 'wear', items: [navy, white] },
      { type: 'wear', items: [navy, white] },
    ]);

    const request: RecommendationRequest = { occasion: 'Casual', preferenceVector: vector };
    const liked = scorePersonalization([navy, white], request);
    const neutral = scorePersonalization([red, black], request);
    expect(liked).toBeGreaterThan(neutral);
  });

  it('penalizes an outfit whose traits were disliked', () => {
    const red = item({ colors: ['Red'], tags: ['casual'] });
    const vector = buildVector([
      { type: 'dislike', items: [red] },
      { type: 'dislike', items: [red] },
    ]);
    const request: RecommendationRequest = { occasion: 'Casual', preferenceVector: vector };
    const disliked = scorePersonalization([red], request);
    const noVec = scorePersonalization([red], { occasion: 'Casual' });
    expect(disliked).toBeLessThan(noVec);
  });

  it('cold-start (empty vector) returns the same score as no vector', () => {
    const items = [item({ tags: ['casual'] })];
    const noVec = scorePersonalization(items, { occasion: 'Casual' });
    const emptyVec = scorePersonalization(items, {
      occasion: 'Casual',
      preferenceVector: emptyPreferenceVector(),
    });
    expect(emptyVec).toBe(noVec);
  });
});

describe('scoreOutfitAffinity', () => {
  it('returns 0 for empty items', () => {
    expect(scoreOutfitAffinity([], emptyPreferenceVector())).toBe(0);
  });

  it('returns positive for items that match liked traits', () => {
    const navy = item({ colors: ['Navy'], tags: ['casual'] });
    const vector = buildVector([{ type: 'wear', items: [navy] }]);
    expect(scoreOutfitAffinity([navy], vector)).toBeGreaterThan(0);
  });
});
