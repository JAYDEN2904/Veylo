import { ClothingItem } from '../../types';
import { namedColorsToHsl } from '../../utils/hslColor';
import { getCandidateItemsByCategory } from './candidateGenerator';
import { composeOutfits, meetsMinimumCoverage, selectCoresStructurally } from './outfitComposer';

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

describe('selectCoresStructurally', () => {
  it('keeps every core when the cartesian already fits the budget', () => {
    const topA = item({ id: 'top-a', category: 'Tops' });
    const topB = item({ id: 'top-b', category: 'Tops' });
    const bottomA = item({ id: 'bottom-a', category: 'Bottoms' });
    const cores = [
      [topA, bottomA],
      [topB, bottomA],
    ];
    expect(selectCoresStructurally(cores, 2)).toHaveLength(2);
    expect(selectCoresStructurally(cores, 2).some((core) => core[0].id === 'top-b')).toBe(true);
  });
});

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

  it('keeps a lower individual-score pair that can still form a valid outfit', () => {
    const highTops = Array.from({ length: 4 }, (_, i) =>
      item({ id: `high-top-${i}`, category: 'Tops', colors: ['White'] })
    );
    const topA = item({ id: 'top-a', category: 'Tops', colors: ['Navy'] });
    const topB = item({ id: 'top-b', category: 'Tops', colors: ['Red'] });
    const highBottoms = Array.from({ length: 4 }, (_, i) =>
      item({ id: `high-bottom-${i}`, category: 'Bottoms', colors: ['Black'] })
    );
    const bottomA = item({ id: 'bottom-a', category: 'Bottoms', colors: ['Blue'] });
    const bottomB = item({ id: 'bottom-b', category: 'Bottoms', colors: ['Green'] });
    const shoes = Array.from({ length: 4 }, (_, i) =>
      item({ id: `shoe-${i}`, category: 'Shoes', colors: ['White'] })
    );

    const scores = new Map<string, number>([
      ['top-a', 95],
      ['top-b', 70],
      ['bottom-a', 94],
      ['bottom-b', 65],
      ...highTops.map((entry, i) => [entry.id, 99 - i] as const),
      ...highBottoms.map((entry, i) => [entry.id, 98 - i] as const),
      ...shoes.map((entry) => [entry.id, 90] as const),
    ]);

    const tops = [...highTops, topA, topB];
    const bottoms = [...highBottoms, bottomA, bottomB];
    const pool = {
      byCategory: {
        Tops: tops,
        Bottoms: bottoms,
        Shoes: shoes,
        Outerwear: [],
        Accessories: [],
        Dresses: [],
      },
      preliminaryScores: scores,
      totalCandidates: tops.length + bottoms.length + shoes.length,
    };

    const outfits = composeOutfits(pool, { occasion: 'Casual' }, { maxComposed: 40 });
    const hasLowerScorePair = outfits.some(
      (outfit) =>
        outfit.some((entry) => entry.id === 'top-b') &&
        outfit.some((entry) => entry.id === 'bottom-a')
    );
    expect(hasLowerScorePair).toBe(true);
  });

  it('emits optional layer variants instead of a single rotated assignment', () => {
    const wardrobe = [
      item({ id: 't1', category: 'Tops' }),
      item({ id: 'b1', category: 'Bottoms' }),
      item({ id: 's1', category: 'Shoes' }),
      item({ id: 'j1', category: 'Outerwear', colors: ['Navy'] }),
      item({ id: 'j2', category: 'Outerwear', colors: ['Black'] }),
    ];
    const pool = getCandidateItemsByCategory(wardrobe, { occasion: 'Casual' });
    const outfits = composeOutfits(pool, { occasion: 'Casual' });
    const hasBareCore = outfits.some(
      (outfit) =>
        outfit.some((entry) => entry.id === 't1') &&
        outfit.some((entry) => entry.id === 'b1') &&
        !outfit.some((entry) => entry.category === 'Outerwear')
    );
    const jacketsUsed = new Set(
      outfits.flatMap((outfit) =>
        outfit.filter((entry) => entry.category === 'Outerwear').map((entry) => entry.id)
      )
    );
    expect(hasBareCore).toBe(true);
    expect(jacketsUsed.size).toBeGreaterThan(1);
  });
});
