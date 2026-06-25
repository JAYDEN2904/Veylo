import { ClothingItem } from '../types';
import { clashPenalty, colorHarmonyBonus, scoreItemForSlot } from './outfitScoring';

const baseItem = (overrides: Partial<ClothingItem>): ClothingItem => ({
  id: 'x',
  imageUrl: 'https://example.com/i.jpg',
  category: 'Tops',
  colors: ['White'],
  tags: [],
  createdAt: new Date().toISOString(),
  status: 'active',
  ...overrides,
});

describe('clashPenalty', () => {
  it('penalizes formal vs athletic mix', () => {
    const formal = baseItem({ tags: ['formal', 'work'] });
    const athletic = baseItem({ id: '2', category: 'Bottoms', tags: ['gym', 'athletic'] });
    expect(clashPenalty(formal, [athletic])).toBeGreaterThan(0);
  });

  it('no penalty for coherent casual', () => {
    const a = baseItem({ tags: ['casual'] });
    const b = baseItem({ id: '2', category: 'Bottoms', tags: ['casual'] });
    expect(clashPenalty(a, [b])).toBe(0);
  });
});

describe('scoreItemForSlot', () => {
  it('boosts items matching occasion keywords', () => {
    const ctx = {
      occasionTagKeywords: ['casual'],
      styleBoostTerms: [] as string[],
    };
    const casual = baseItem({ tags: ['casual', 'weekend'] });
    const formal = baseItem({ id: 'f', tags: ['formal', 'gown'] });
    expect(scoreItemForSlot(casual, ctx, [])).toBeGreaterThan(scoreItemForSlot(formal, ctx, []));
  });

  it('applies style boost terms', () => {
    const ctx = {
      occasionTagKeywords: [] as string[],
      styleBoostTerms: ['minimalist'],
    };
    const minimal = baseItem({ tags: ['minimalist', 'clean'] });
    const plain = baseItem({ id: 'p', tags: ['loud'] });
    expect(scoreItemForSlot(minimal, ctx, [])).toBeGreaterThan(scoreItemForSlot(plain, ctx, []));
  });
});

describe('colorHarmonyBonus', () => {
  it('returns 0 with no picked items', () => {
    const item = baseItem({ colors: ['Black'] });
    expect(colorHarmonyBonus(item, [])).toBe(0);
  });
});
