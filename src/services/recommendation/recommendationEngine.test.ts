import { ClothingItem } from '../../types';
import { namedColorsToHsl } from '../../utils/hslColor';
import { recommendOutfits } from './recommendationEngine';
import { getCandidateItemsByCategory } from './candidateGenerator';
import { composeOutfits } from './outfitComposer';
import { generateContextAwareOutfit, generateRankedOutfits } from '../outfitGenerationService';
import { ENGINE_VERSION } from './types';

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

describe('recommendOutfits', () => {
  it('returns empty_wardrobe when there are no active items', () => {
    const result = recommendOutfits([item({ status: 'archived' })], { occasion: 'Casual' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.reason).toBe('empty_wardrobe');
  });

  it('returns multiple complete outfit candidates', () => {
    const wardrobe = [
      item({ id: 'white-tee', category: 'Tops', tags: ['casual'], colors: ['White'] }),
      item({ id: 'black-shirt', category: 'Tops', tags: ['casual'], colors: ['Black'] }),
      item({ id: 'red-tee', category: 'Tops', tags: ['casual', 'graphic'], colors: ['Red'] }),
      item({ id: 'black-trousers', category: 'Bottoms', tags: ['casual'], colors: ['Black'] }),
      item({ id: 'blue-jeans', category: 'Bottoms', tags: ['casual', 'denim'], colors: ['Blue'] }),
      item({
        id: 'red-shorts',
        category: 'Bottoms',
        subCategory: 'shorts',
        tags: ['casual'],
        colors: ['Red'],
      }),
      item({ id: 'white-sneakers', category: 'Shoes', tags: ['casual'], colors: ['White'] }),
      item({ id: 'black-loafers', category: 'Shoes', tags: ['casual'], colors: ['Black'] }),
    ];
    const result = recommendOutfits(wardrobe, {
      occasion: 'Casual',
      season: 'Summer',
      timeOfDay: 'afternoon',
      weather: {
        temperature: 24,
        condition: 'Clear',
        description: 'warm',
        humidity: 40,
        windSpeed: 3,
        icon: '01d',
        feelsLike: 24,
        location: 'Test',
      },
      count: 5,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recommendations.length).toBeGreaterThanOrEqual(3);
    expect(result.metadata.engineVersion).toBe(ENGINE_VERSION);
    expect(result.metadata.composedCount).toBeGreaterThan(1);
    const signatures = new Set(
      result.recommendations.map((rec) =>
        rec.items
          .map((entry) => entry.id)
          .sort()
          .join('|')
      )
    );
    expect(signatures.size).toBe(result.recommendations.length);
  });

  it('ranks a coherent casual outfit above a formality clash', () => {
    const clashTop = item({
      id: 'blazer',
      category: 'Tops',
      tags: ['formal', 'blazer', 'work'],
      formalityScore: 4,
      colors: ['Navy'],
    });
    const clashBottom = item({
      id: 'gym-shorts',
      category: 'Bottoms',
      subCategory: 'shorts',
      tags: ['gym', 'athletic', 'workout'],
      formalityScore: 1,
      colors: ['Black'],
    });
    const coherentTop = item({
      id: 'tee',
      category: 'Tops',
      tags: ['casual', 'everyday'],
      formalityScore: 2,
      colors: ['White'],
    });
    const coherentBottom = item({
      id: 'jeans',
      category: 'Bottoms',
      tags: ['casual', 'denim'],
      formalityScore: 2,
      colors: ['Blue'],
    });
    const shoes = item({
      id: 'sneakers',
      category: 'Shoes',
      tags: ['casual'],
      formalityScore: 2,
      colors: ['White'],
    });

    const result = recommendOutfits([clashTop, clashBottom, coherentTop, coherentBottom, shoes], {
      occasion: 'Casual',
      count: 5,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const clash = result.recommendations.find(
      (rec) =>
        rec.items.some((entry) => entry.id === 'blazer') &&
        rec.items.some((entry) => entry.id === 'gym-shorts')
    );
    const coherent = result.recommendations.find(
      (rec) =>
        rec.items.some((entry) => entry.id === 'tee') &&
        rec.items.some((entry) => entry.id === 'jeans')
    );
    expect(coherent).toBeDefined();
    if (clash && coherent) {
      expect(coherent.score.overall).toBeGreaterThan(clash.score.overall);
    }
    expect(result.recommendations[0].items.some((entry) => entry.id === 'gym-shorts')).toBe(false);
  });

  it('does not discard a lower-scoring pair before outfits are ranked', () => {
    const highTops = Array.from({ length: 4 }, (_, i) =>
      item({
        id: `high-top-${i}`,
        category: 'Tops',
        tags: ['casual', 'everyday', 'weekend'],
        colors: ['White'],
        wornCount: 0,
      })
    );
    const topB = item({
      id: 'top-b',
      category: 'Tops',
      tags: ['graphic'],
      colors: ['Red'],
      wornCount: 35,
      lastWorn: new Date().toISOString(),
    });
    const highBottoms = Array.from({ length: 4 }, (_, i) =>
      item({
        id: `high-bottom-${i}`,
        category: 'Bottoms',
        tags: ['casual', 'denim'],
        colors: ['Black'],
        wornCount: 0,
      })
    );
    const bottomA = item({
      id: 'bottom-a',
      category: 'Bottoms',
      tags: ['casual'],
      colors: ['Blue'],
    });
    const shoes = Array.from({ length: 4 }, (_, i) =>
      item({ id: `shoe-${i}`, category: 'Shoes', tags: ['casual'], colors: ['White'] })
    );
    const wardrobe = [...highTops, topB, ...highBottoms, bottomA, ...shoes];
    const request = { occasion: 'Casual' as const };

    const composed = composeOutfits(getCandidateItemsByCategory(wardrobe, request), request, {
      maxComposed: 40,
    });
    expect(
      composed.some(
        (outfit) =>
          outfit.some((entry) => entry.id === 'top-b') &&
          outfit.some((entry) => entry.id === 'bottom-a')
      )
    ).toBe(true);

    const result = recommendOutfits(wardrobe, { ...request, count: 5 }, { maxComposed: 40 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.metadata.composedCount).toBeGreaterThan(1);
  });

  it('survives a sparse wardrobe with lower confidence', () => {
    const result = recommendOutfits(
      [
        item({ id: 't1', category: 'Tops' }),
        item({ id: 'b1', category: 'Bottoms' }),
        item({ id: 's1', category: 'Shoes' }),
      ],
      { occasion: 'Casual', count: 5 }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
    expect(result.recommendations[0].confidence).toBeLessThan(80);
  });

  it('relaxes season/weather filters rather than failing', () => {
    const result = recommendOutfits(
      [
        item({
          id: 't1',
          category: 'Tops',
          tags: ['casual', 'everyday'],
          season: ['spring', 'summer', 'fall'],
        }),
        item({
          id: 'b1',
          category: 'Bottoms',
          subCategory: 'shorts',
          tags: ['casual', 'everyday'],
          season: ['summer'],
        }),
      ],
      {
        occasion: 'Casual',
        season: 'Fall',
        weather: {
          temperature: 12,
          condition: 'Clouds',
          description: 'cool',
          humidity: 70,
          windSpeed: 5,
          icon: '04d',
          feelsLike: 11,
          location: 'Test',
        },
      }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.metadata.filtersRelaxed).toBe(true);
    expect(result.metadata.relaxationLevel).toBeGreaterThan(0);
  });

  it('skips embedding features when no vectors are supplied', () => {
    const result = recommendOutfits(
      [
        item({ id: 't1', category: 'Tops' }),
        item({ id: 'b1', category: 'Bottoms' }),
      ],
      { occasion: 'Casual' }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.metadata.embeddingsAvailable).toBe(false);
    expect(result.metadata.embeddingsUsed).toBe(false);
  });

  it('records embeddingsUsed when item vectors cover composed pairs', () => {
    const wardrobe = [
      item({ id: 't1', category: 'Tops' }),
      item({ id: 'b1', category: 'Bottoms' }),
    ];
    const result = recommendOutfits(wardrobe, {
      occasion: 'Casual',
      itemEmbeddings: {
        t1: [1, 0, 0],
        b1: [1, 0, 0],
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.metadata.embeddingsAvailable).toBe(true);
    expect(result.metadata.embeddingsUsed).toBe(true);
  });
});

describe('compatibility adapter', () => {
  it('generateContextAwareOutfit still returns a single outfit result', () => {
    const r = generateContextAwareOutfit(
      [
        item({ id: 't1', category: 'Tops', tags: ['casual'] }),
        item({ id: 'b1', category: 'Bottoms', tags: ['casual', 'denim'] }),
      ],
      { occasionKey: 'Casual' }
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.outfit.items.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('generateRankedOutfits returns several complete outfits', () => {
    const wardrobe = [
      item({ id: 't1', category: 'Tops' }),
      item({ id: 't2', category: 'Tops', colors: ['Black'] }),
      item({ id: 'b1', category: 'Bottoms' }),
      item({ id: 'b2', category: 'Bottoms', colors: ['Blue'] }),
      item({ id: 's1', category: 'Shoes' }),
    ];
    const results = generateRankedOutfits(wardrobe, { occasionKey: 'Casual' }, 3);
    expect(results.length).toBeGreaterThan(1);
    expect(results.every((entry) => entry.ok)).toBe(true);
  });
});
