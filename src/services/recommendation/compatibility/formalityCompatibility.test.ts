import { ClothingItem } from '../../../types';
import { namedColorsToHsl } from '../../../utils/hslColor';
import { scoreFormalityPair, scoreOutfitFormality } from './formalityCompatibility';

const item = (overrides: Partial<ClothingItem>): ClothingItem => {
  const colors = overrides.colors ?? ['White'];
  return {
    id: Math.random().toString(36).slice(2),
    imageUrl: 'https://example.com/i.jpg',
    category: 'Tops',
    colors,
    colorsHsl: overrides.colorsHsl ?? namedColorsToHsl(colors),
    tags: [],
    createdAt: new Date().toISOString(),
    status: 'active',
    ...overrides,
  };
};

describe('formalityCompatibility', () => {
  it('penalizes a blazer paired with gym shorts', () => {
    const blazer = item({
      category: 'Tops',
      tags: ['formal', 'blazer'],
      formalityScore: 4,
    });
    const shorts = item({
      category: 'Bottoms',
      subCategory: 'shorts',
      tags: ['gym', 'athletic'],
      formalityScore: 1,
    });
    const jeans = item({
      category: 'Bottoms',
      tags: ['casual', 'denim'],
      formalityScore: 2,
    });
    expect(scoreFormalityPair(blazer, shorts, 'Casual')).toBeLessThan(
      scoreFormalityPair(blazer, jeans, 'Casual')
    );
  });

  it('lets a single clash pull down the complete outfit', () => {
    const clash = scoreOutfitFormality(
      [
        item({ id: 't', tags: ['formal', 'blazer'], formalityScore: 4 }),
        item({
          id: 'b',
          category: 'Bottoms',
          tags: ['gym', 'athletic'],
          formalityScore: 1,
        }),
        item({ id: 's', category: 'Shoes', tags: ['casual'], formalityScore: 2 }),
      ],
      'Casual'
    );
    const coherent = scoreOutfitFormality(
      [
        item({ id: 't', tags: ['casual'], formalityScore: 2 }),
        item({ id: 'b', category: 'Bottoms', tags: ['casual'], formalityScore: 2 }),
        item({ id: 's', category: 'Shoes', tags: ['casual'], formalityScore: 2 }),
      ],
      'Casual'
    );
    expect(clash).toBeLessThan(coherent);
    expect(clash).toBeLessThan(50);
  });
});
