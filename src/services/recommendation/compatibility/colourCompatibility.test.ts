import { ClothingItem } from '../../../types';
import { namedColorsToHsl } from '../../../utils/hslColor';
import { scoreColourPair, scoreOutfitColourHarmony } from './colourCompatibility';

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

describe('colourCompatibility', () => {
  it('treats neutrals as compatible with an accent', () => {
    const navy = item({ category: 'Bottoms', colors: ['Navy'] });
    const white = item({ category: 'Tops', colors: ['White'] });
    expect(scoreColourPair(navy, white)).toBeGreaterThanOrEqual(80);
  });

  it('treats complementary colours as a valid harmony, not an automatic clash', () => {
    const blue = item({ category: 'Tops', colors: ['Blue'] });
    const orange = item({ category: 'Bottoms', colors: ['Orange'] });
    expect(scoreColourPair(blue, orange)).toBeGreaterThanOrEqual(75);
  });

  it('does not require matching colours to score well', () => {
    const white = item({ category: 'Tops', colors: ['White'] });
    const blue = item({ category: 'Bottoms', colors: ['Blue'] });
    const same = item({ category: 'Tops', colors: ['Blue'] });
    expect(scoreColourPair(white, blue)).toBeGreaterThanOrEqual(scoreColourPair(same, blue) - 15);
  });

  it('returns a neutral score when colour data is missing', () => {
    const bare = item({ colors: [], colorsHsl: [] });
    const other = item({ category: 'Bottoms', colors: ['Blue'] });
    expect(scoreColourPair(bare, other)).toBe(55);
  });

  it('scores the outfit from relevant pairs, not a single garment', () => {
    const outfit = [
      item({ id: 't', category: 'Tops', colors: ['White'] }),
      item({ id: 'b', category: 'Bottoms', colors: ['Navy'] }),
      item({ id: 's', category: 'Shoes', colors: ['Black'] }),
    ];
    expect(scoreOutfitColourHarmony(outfit)).toBeGreaterThanOrEqual(70);
  });
});
