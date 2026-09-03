import { ClothingItem } from '../../types';
import { namedColorsToHsl } from '../../utils/hslColor';
import { getCandidateItemsByCategory } from './candidateGenerator';
import { DEFAULT_CANDIDATE_LIMITS } from './types';

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

describe('getCandidateItemsByCategory', () => {
  it('respects per-category top-K limits', () => {
    const tops = Array.from({ length: 10 }, (_, i) => item({ id: `t${i}`, category: 'Tops' }));
    const bottoms = [item({ id: 'b1', category: 'Bottoms' })];
    const pool = getCandidateItemsByCategory([...tops, ...bottoms], { occasion: 'Casual' });
    expect(pool.byCategory['Tops'].length).toBe(DEFAULT_CANDIDATE_LIMITS.Tops);
    expect(pool.byCategory['Bottoms'].length).toBe(1);
  });

  it('preserves must-include items even when they are not top-K', () => {
    const tops = Array.from({ length: 8 }, (_, i) =>
      item({
        id: `t${i}`,
        category: 'Tops',
        tags: ['casual', 'everyday', 'weekend'],
        wornCount: 0,
      })
    );
    const anchor = item({
      id: 'anchor-top',
      category: 'Tops',
      tags: ['loud'],
      colors: ['Orange'],
      wornCount: 40,
      lastWorn: new Date().toISOString(),
    });
    const pool = getCandidateItemsByCategory([...tops, anchor], {
      occasion: 'Casual',
      mustIncludeItemIds: ['anchor-top'],
    });
    expect(pool.byCategory['Tops'].some((entry) => entry.id === 'anchor-top')).toBe(true);
  });

  it('does not drop a low-scoring must-include shoe', () => {
    const shoes = [
      item({
        id: 'nice',
        category: 'Shoes',
        tags: ['casual', 'everyday'],
        colors: ['White'],
      }),
      item({
        id: 'anchor-shoe',
        category: 'Shoes',
        tags: ['worn'],
        colors: ['Red'],
        wornCount: 50,
        lastWorn: new Date().toISOString(),
      }),
    ];
    const pool = getCandidateItemsByCategory(shoes, {
      occasion: 'Casual',
      mustIncludeItemIds: ['anchor-shoe'],
    });
    expect(pool.byCategory['Shoes'].some((entry) => entry.id === 'anchor-shoe')).toBe(true);
  });
});
