import { ClothingItem } from '../types';
import { namedColorsToHsl } from '../utils/hslColor';
import { generateContextAwareOutfit, resolveOccasionKey } from './outfitGenerationService';

const item = (overrides: Partial<ClothingItem>): ClothingItem => {
  const colors = overrides.colors ?? ['White'];
  return {
    id: Math.random().toString(36).slice(2),
    imageUrl: 'https://example.com/i.jpg',
    category: 'Tops',
    colors,
    colorsHsl: overrides.colorsHsl ?? namedColorsToHsl(colors),
    tags: ['casual', 'minimal'],
    createdAt: new Date().toISOString(),
    status: 'active',
    ...overrides,
  };
};

describe('resolveOccasionKey', () => {
  it('maps flow ids', () => {
    expect(resolveOccasionKey('work')).toBe('Work');
    expect(resolveOccasionKey('date')).toBe('Date Night');
    expect(resolveOccasionKey(undefined)).toBe('Casual');
  });

  it('passes through canonical keys', () => {
    expect(resolveOccasionKey('Formal')).toBe('Formal');
  });
});

describe('generateContextAwareOutfit', () => {
  it('returns empty_wardrobe when no active items', () => {
    const r = generateContextAwareOutfit([], { occasionKey: 'Casual' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failure.reason).toBe('empty_wardrobe');
  });

  it('returns insufficient_categories when wardrobe cannot form a base outfit', () => {
    const items = [item({ category: 'Accessories', tags: ['casual'] })];
    const r = generateContextAwareOutfit(items, { occasionKey: 'Casual' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failure.reason).toBe('insufficient_categories');
  });

  it('builds outfit with top and bottom', () => {
    const items = [
      item({ id: 't1', category: 'Tops', tags: ['casual'] }),
      item({ id: 'b1', category: 'Bottoms', tags: ['casual', 'denim'] }),
    ];
    const r = generateContextAwareOutfit(items, { occasionKey: 'Casual' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.outfit.items.length).toBeGreaterThanOrEqual(2);
      const cats = r.outfit.items.map((i) => i.category);
      expect(cats).toContain('Tops');
      expect(cats).toContain('Bottoms');
    }
  });

  it('normalizes shirt alias to Tops', () => {
    const items = [
      item({ id: 't1', category: 'shirt', tags: ['casual'] }),
      item({ id: 'b1', category: 'jeans', tags: ['casual'] }),
    ];
    const r = generateContextAwareOutfit(items, { occasionKey: 'Casual' });
    expect(r.ok).toBe(true);
  });

  it('forces mustIncludeItemId into the outfit', () => {
    const items = [
      item({ id: 't1', category: 'Tops', tags: ['casual'] }),
      item({ id: 't2', category: 'Tops', tags: ['casual'], colors: ['Blue'] }),
      item({ id: 'b1', category: 'Bottoms', tags: ['casual', 'denim'] }),
      item({
        id: 'j1',
        category: 'Outerwear',
        subCategory: 'Jacket',
        tags: ['casual'],
        colors: ['Denim'],
        wornCount: 0,
      }),
    ];
    const r = generateContextAwareOutfit(items, {
      occasionKey: 'Casual',
      mustIncludeItemId: 'j1',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.outfit.items.some((i) => i.id === 'j1')).toBe(true);
    }
  });
});
