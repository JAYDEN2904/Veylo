import { ClothingItem } from '../../../types';
import { namedColorsToHsl } from '../../../utils/hslColor';
import {
  applyFeedbackToVector,
  emptyPreferenceVector,
  FEEDBACK_STRENGTHS,
  hasBehavioralSignal,
  rebuildPreferenceVector,
} from './recommendationFeedback';
import type { UserPreferenceVector } from '../types';

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

describe('emptyPreferenceVector', () => {
  it('returns a zeroed-out vector', () => {
    const vector = emptyPreferenceVector();
    expect(Object.keys(vector.colors)).toHaveLength(0);
    expect(Object.keys(vector.styles)).toHaveLength(0);
    expect(hasBehavioralSignal(vector)).toBe(false);
  });
});

describe('hasBehavioralSignal', () => {
  it('returns false for null/undefined', () => {
    expect(hasBehavioralSignal(null)).toBe(false);
    expect(hasBehavioralSignal(undefined)).toBe(false);
  });

  it('returns true after a non-zero event', () => {
    const vector = applyFeedbackToVector(emptyPreferenceVector(), {
      eventType: 'like',
      items: [item({ colors: ['Navy'] })],
    });
    expect(hasBehavioralSignal(vector)).toBe(true);
  });
});

describe('applyFeedbackToVector', () => {
  it('impression does not modify affinities', () => {
    const before = emptyPreferenceVector('2020-01-01T00:00:00.000Z');
    const after = applyFeedbackToVector(before, {
      eventType: 'impression',
      items: [item({ colors: ['Navy'], tags: ['casual'] })],
    });
    expect(Object.keys(after.colors)).toHaveLength(0);
    expect(after.updatedAt).not.toBe(before.updatedAt);
  });

  it('like adds positive signal to color and category', () => {
    const vector = applyFeedbackToVector(emptyPreferenceVector(), {
      eventType: 'like',
      items: [item({ colors: ['Navy'], category: 'Tops' })],
    });
    expect(vector.colors['navy']).toBeCloseTo(FEEDBACK_STRENGTHS.like, 4);
    expect(vector.categories['tops']).toBeCloseTo(FEEDBACK_STRENGTHS.like, 4);
  });

  it('dislike subtracts signal', () => {
    const vector = applyFeedbackToVector(emptyPreferenceVector(), {
      eventType: 'dislike',
      items: [item({ colors: ['Red'], category: 'Bottoms' })],
    });
    expect(vector.colors['red']).toBeLessThan(0);
    expect(vector.categories['bottoms']).toBeLessThan(0);
  });

  it('wear is the strongest positive signal', () => {
    const likeVec = applyFeedbackToVector(emptyPreferenceVector(), {
      eventType: 'like',
      items: [item({ colors: ['Navy'] })],
    });
    const wearVec = applyFeedbackToVector(emptyPreferenceVector(), {
      eventType: 'wear',
      items: [item({ colors: ['Navy'] })],
    });
    expect(wearVec.colors['navy']).toBeGreaterThan(likeVec.colors['navy']);
  });

  it('respects itemId filter for swap events', () => {
    const top = item({ id: 'top-1', colors: ['White'], category: 'Tops' });
    const bottom = item({ id: 'bottom-1', colors: ['Black'], category: 'Bottoms' });
    const vector = applyFeedbackToVector(emptyPreferenceVector(), {
      eventType: 'swap',
      items: [top, bottom],
      itemId: 'top-1',
    });
    expect(vector.colors['white']).toBeLessThan(0);
    expect(vector.colors['black']).toBeUndefined();
  });

  it('records occasion when provided', () => {
    const vector = applyFeedbackToVector(emptyPreferenceVector(), {
      eventType: 'like',
      items: [item({})],
      occasion: 'Work',
    });
    expect(vector.occasions['work']).toBeCloseTo(FEEDBACK_STRENGTHS.like, 4);
  });

  it('records brand when present on item', () => {
    const vector = applyFeedbackToVector(emptyPreferenceVector(), {
      eventType: 'save',
      items: [item({ brand: 'Uniqlo' })],
    });
    expect(vector.brands['uniqlo']).toBeCloseTo(FEEDBACK_STRENGTHS.save, 4);
  });
});

describe('rebuildPreferenceVector', () => {
  it('produces the same result as sequential application', () => {
    const items = [item({ colors: ['Navy'], category: 'Tops' })];
    const signals = [
      { eventType: 'like' as const, items },
      { eventType: 'wear' as const, items },
    ];
    const rebuilt = rebuildPreferenceVector(signals);
    let sequential = emptyPreferenceVector();
    for (const signal of signals) {
      sequential = applyFeedbackToVector(sequential, signal);
    }
    expect(rebuilt.colors['navy']).toBeCloseTo(sequential.colors['navy'], 4);
  });
});
