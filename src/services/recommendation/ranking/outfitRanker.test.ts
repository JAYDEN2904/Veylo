import { ClothingItem, WeatherData } from '../../../types';
import { namedColorsToHsl } from '../../../utils/hslColor';
import { scoreCompleteOutfit, rankComposedOutfits } from './outfitRanker';
import { scoreOutfitWeather } from '../compatibility/weatherCompatibility';
import { scoreOutfitOccasion } from '../compatibility/occasionCompatibility';

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

const cold: WeatherData = {
  temperature: 4,
  condition: 'Clouds',
  description: 'cold',
  humidity: 70,
  windSpeed: 8,
  icon: '04d',
  feelsLike: 1,
  location: 'Test',
};

describe('scoreCompleteOutfit', () => {
  it('ranks a coherent casual set above individually strong but clashing garments', () => {
    const clash = [
      item({
        id: 'blazer',
        tags: ['formal', 'blazer', 'work'],
        formalityScore: 4,
        colors: ['Navy'],
      }),
      item({
        id: 'gym-shorts',
        category: 'Bottoms',
        subCategory: 'shorts',
        tags: ['gym', 'athletic', 'workout'],
        formalityScore: 1,
        colors: ['Black'],
      }),
      item({
        id: 'sneakers',
        category: 'Shoes',
        tags: ['casual'],
        formalityScore: 2,
        colors: ['White'],
      }),
    ];
    const coherent = [
      item({
        id: 'tee',
        tags: ['casual', 'everyday'],
        formalityScore: 2,
        colors: ['White'],
      }),
      item({
        id: 'jeans',
        category: 'Bottoms',
        tags: ['casual', 'denim'],
        formalityScore: 2,
        colors: ['Blue'],
      }),
      item({
        id: 'sneakers-2',
        category: 'Shoes',
        tags: ['casual'],
        formalityScore: 2,
        colors: ['White'],
      }),
    ];

    const clashScore = scoreCompleteOutfit(clash, { occasion: 'Casual' });
    const coherentScore = scoreCompleteOutfit(coherent, { occasion: 'Casual' });
    expect(coherentScore.compatibility).toBeGreaterThan(clashScore.compatibility);
    expect(coherentScore.formality).toBeGreaterThan(clashScore.formality);
    expect(coherentScore.overall).toBeGreaterThan(clashScore.overall);
  });

  it('penalizes a cold-weather outfit that mixes a heavy coat with shorts', () => {
    const incoherent = [
      item({
        id: 'coat',
        category: 'Outerwear',
        tags: ['heavy', 'coat', 'wool'],
        colors: ['Black'],
      }),
      item({
        id: 'tee',
        tags: ['casual'],
        colors: ['White'],
      }),
      item({
        id: 'shorts',
        category: 'Bottoms',
        subCategory: 'shorts',
        tags: ['casual'],
        colors: ['Blue'],
      }),
      item({
        id: 'sandals',
        category: 'Shoes',
        subCategory: 'sandals',
        tags: ['casual'],
        colors: ['Tan'],
      }),
    ];
    const coherent = [
      item({
        id: 'coat-2',
        category: 'Outerwear',
        tags: ['heavy', 'coat', 'wool'],
        colors: ['Black'],
      }),
      item({
        id: 'sweater',
        tags: ['warm', 'sweater'],
        colors: ['Navy'],
      }),
      item({
        id: 'trousers',
        category: 'Bottoms',
        tags: ['casual'],
        colors: ['Black'],
      }),
      item({
        id: 'boots',
        category: 'Shoes',
        subCategory: 'boots',
        tags: ['warm'],
        colors: ['Brown'],
      }),
    ];

    expect(scoreOutfitWeather(incoherent, cold)).toBeLessThan(scoreOutfitWeather(coherent, cold));
    expect(
      scoreCompleteOutfit(incoherent, { occasion: 'Casual', weather: cold }).weatherFit
    ).toBeLessThan(scoreCompleteOutfit(coherent, { occasion: 'Casual', weather: cold }).weatherFit);
  });

  it('does not treat one occasion-matching item as an excellent formal outfit', () => {
    const mixed = [
      item({
        id: 'blazer',
        tags: ['formal', 'blazer'],
        formalityScore: 4,
        colors: ['Navy'],
      }),
      item({
        id: 'shorts',
        category: 'Bottoms',
        subCategory: 'shorts',
        tags: ['gym', 'athletic'],
        formalityScore: 1,
        colors: ['Black'],
      }),
    ];
    const formal = [
      item({
        id: 'shirt',
        tags: ['formal', 'dressy'],
        formalityScore: 4,
        colors: ['White'],
      }),
      item({
        id: 'trousers',
        category: 'Bottoms',
        tags: ['formal', 'tailored'],
        formalityScore: 4,
        colors: ['Black'],
      }),
    ];
    expect(scoreOutfitOccasion(mixed, 'Formal')).toBeLessThan(
      scoreOutfitOccasion(formal, 'Formal')
    );
  });

  it('uses a neutral weather score when weather is missing', () => {
    const breakdown = scoreCompleteOutfit(
      [item({ id: 't', category: 'Tops' }), item({ id: 'b', category: 'Bottoms' })],
      { occasion: 'Casual' }
    );
    expect(breakdown.weatherFit).toBe(70);
  });

  it('honours custom ranking weights', () => {
    const clash = [
      item({ id: 't', tags: ['formal', 'blazer'], formalityScore: 4 }),
      item({
        id: 'b',
        category: 'Bottoms',
        tags: ['gym', 'athletic'],
        formalityScore: 1,
      }),
    ];
    const defaultScore = scoreCompleteOutfit(clash, { occasion: 'Casual' });
    const formalityHeavy = scoreCompleteOutfit(clash, { occasion: 'Casual' }, { formality: 0.6 });
    expect(formalityHeavy.formality).toBe(defaultScore.formality);
    expect(formalityHeavy.overall).not.toBe(defaultScore.overall);
  });
});

describe('rankComposedOutfits', () => {
  it('orders complete outfits by outfit-level overall, not item isolation', () => {
    const clash = [
      item({ id: 'blazer', tags: ['formal', 'blazer'], formalityScore: 4, colors: ['Navy'] }),
      item({
        id: 'gym-shorts',
        category: 'Bottoms',
        tags: ['gym', 'athletic'],
        formalityScore: 1,
        colors: ['Black'],
      }),
    ];
    const coherent = [
      item({ id: 'tee', tags: ['casual'], formalityScore: 2, colors: ['White'] }),
      item({
        id: 'jeans',
        category: 'Bottoms',
        tags: ['casual'],
        formalityScore: 2,
        colors: ['Blue'],
      }),
    ];
    const ranked = rankComposedOutfits([clash, coherent], { occasion: 'Casual' });
    expect(ranked[0].items.some((entry) => entry.id === 'tee')).toBe(true);
    expect(ranked[0].score.overall).toBeGreaterThan(ranked[1].score.overall);
  });
});
