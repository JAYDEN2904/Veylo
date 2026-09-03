import { ClothingItem } from '../../types';
import { namedColorsToHsl } from '../../utils/hslColor';
import { getCandidateItemsByCategory } from './candidateGenerator';
import { composeOutfits, meetsMinimumCoverage } from './outfitComposer';

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

function idsOf(outfit: ClothingItem[]): string[] {
  return outfit.map((entry) => entry.id).sort();
}

describe('composeOutfits', () => {
  it('builds standard outfits from top + bottom + shoes', () => {
    const wardrobe = [
      item({ id: 't1', category: 'Tops' }),
      item({ id: 't2', category: 'Tops', colors: ['Blue'] }),
      item({ id: 'b1', category: 'Bottoms' }),
      item({ id: 'b2', category: 'Bottoms', colors: ['Navy'] }),
      item({ id: 's1', category: 'Shoes' }),
    ];
    const pool = getCandidateItemsByCategory(wardrobe, { occasion: 'Casual' });
    const outfits = composeOutfits(pool, { occasion: 'Casual' });
    expect(outfits.length).toBeGreaterThan(1);
    for (const outfit of outfits) {
      expect(meetsMinimumCoverage(outfit)).toBe(true);
      const cats = outfit.map((entry) => entry.category);
      expect(cats).toContain('Tops');
      expect(cats).toContain('Bottoms');
      expect(cats).toContain('Shoes');
    }
  });

  it('builds dress outfits without requiring a separate top and bottom', () => {
    const wardrobe = [
      item({ id: 'd1', category: 'Dresses', tags: ['elegant'] }),
      item({ id: 's1', category: 'Shoes' }),
      item({ id: 'o1', category: 'Outerwear' }),
    ];
    const pool = getCandidateItemsByCategory(wardrobe, { occasion: 'Date Night' });
    const outfits = composeOutfits(pool, { occasion: 'Date Night' });
    expect(outfits.length).toBeGreaterThanOrEqual(1);
    expect(outfits[0].some((entry) => entry.category === 'Dresses')).toBe(true);
    expect(outfits[0].some((entry) => entry.category === 'Shoes')).toBe(true);
  });

  it('keeps must-include anchors in every composed outfit', () => {
    const wardrobe = [
      item({ id: 't1', category: 'Tops' }),
      item({ id: 't2', category: 'Tops', colors: ['Blue'] }),
      item({ id: 'b1', category: 'Bottoms' }),
      item({ id: 's1', category: 'Shoes' }),
      item({ id: 'j1', category: 'Outerwear' }),
    ];
    const pool = getCandidateItemsByCategory(wardrobe, {
      occasion: 'Casual',
      mustIncludeItemIds: ['j1'],
    });
    const outfits = composeOutfits(pool, {
      occasion: 'Casual',
      mustIncludeItemIds: ['j1'],
    });
    expect(outfits.length).toBeGreaterThan(0);
    for (const outfit of outfits) {
      expect(outfit.some((entry) => entry.id === 'j1')).toBe(true);
    }
  });

  it('produces distinct combinations rather than a single greedy outfit', () => {
    const wardrobe = [
      item({ id: 't1', category: 'Tops' }),
      item({ id: 't2', category: 'Tops', colors: ['Black'] }),
      item({ id: 'b1', category: 'Bottoms' }),
      item({ id: 'b2', category: 'Bottoms', colors: ['Blue'] }),
    ];
    const pool = getCandidateItemsByCategory(wardrobe, { occasion: 'Casual' });
    const outfits = composeOutfits(pool, { occasion: 'Casual' });
    const unique = new Set(outfits.map((outfit) => idsOf(outfit).join('|')));
    expect(unique.size).toBeGreaterThan(1);
  });

  it('still returns an outfit when shoes are missing', () => {
    const wardrobe = [
      item({ id: 't1', category: 'Tops' }),
      item({ id: 'b1', category: 'Bottoms' }),
    ];
    const pool = getCandidateItemsByCategory(wardrobe, { occasion: 'Casual' });
    const outfits = composeOutfits(pool, { occasion: 'Casual' });
    expect(outfits).toHaveLength(1);
    expect(meetsMinimumCoverage(outfits[0])).toBe(true);
  });
});
