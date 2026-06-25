import { normalizeCategory, withNormalizedCategories } from './outfitCategoryNormalize';

describe('normalizeCategory', () => {
  it('keeps canonical categories', () => {
    expect(normalizeCategory('Tops')).toBe('Tops');
    expect(normalizeCategory('Dresses')).toBe('Dresses');
  });

  it('maps common aliases', () => {
    expect(normalizeCategory('jeans')).toBe('Bottoms');
    expect(normalizeCategory('shirt')).toBe('Tops');
    expect(normalizeCategory('sneakers')).toBe('Shoes');
    expect(normalizeCategory('blazer')).toBe('Outerwear');
  });

  it('passes through unknown categories unchanged', () => {
    expect(normalizeCategory('Swimwear')).toBe('Swimwear');
  });
});

describe('withNormalizedCategories', () => {
  it('normalizes category on each item', () => {
    const items = [{ id: '1', category: 'jeans' } as const];
    const out = withNormalizedCategories([...items]);
    expect(out[0].category).toBe('Bottoms');
  });
});
