import type { ClothingItem, WeatherData } from '../../../types';
import { item, largeWardrobe, realisticWardrobe } from '../testFixtures';
import {
  applyFeedbackToVector,
  emptyPreferenceVector,
} from '../feedback/recommendationFeedback';
import type { RecommendationEventType, UserPreferenceVector } from '../types';
import type { GoldenScenario } from './evaluationTypes';

/**
 * Deterministic regression/evaluation fixture for the local recommendation
 * engine. It is not a substitute for real-user behavioral data.
 *
 * `preferredColours` / `preferredStyles` are evaluation expectations only.
 * They do not change ranking, MMR, or hard constraints.
 */

function weather(temperature: number, condition: string, description: string): WeatherData {
  return {
    temperature,
    condition,
    description,
    humidity: 55,
    windSpeed: 4,
    icon: '01d',
    feelsLike: temperature - 1,
    location: 'Test',
  };
}

const HOT = weather(32, 'Clear', 'hot');
const WARM = weather(22, 'Clear', 'warm');
const COOL = weather(12, 'Clouds', 'cool');
const COLD = weather(3, 'Snow', 'cold');
const RAINY = weather(14, 'Rain', 'rainy');

function cloneWardrobe(items: ClothingItem[], prefix: string): ClothingItem[] {
  return items.map((entry) => ({ ...entry, id: `${prefix}-${entry.id}` }));
}

function withoutCategory(items: ClothingItem[], category: string): ClothingItem[] {
  return items.filter((entry) => entry.category !== category);
}

function onlyColours(items: ClothingItem[], allowed: string[]): ClothingItem[] {
  const allow = new Set(allowed.map((color) => color.toLowerCase()));
  return items.filter((entry) =>
    entry.colors.every((color) => allow.has(color.toLowerCase()))
  );
}

function smallCasualWardrobe(): ClothingItem[] {
  return [
    item({ id: 'sm-tee', colors: ['White'], tags: ['casual', 'minimal'], formalityScore: 2 }),
    item({
      id: 'sm-shirt',
      colors: ['Blue'],
      tags: ['casual', 'work', 'collar'],
      formalityScore: 3,
    }),
    item({
      id: 'sm-jeans',
      category: 'Bottoms',
      colors: ['Navy'],
      tags: ['casual', 'denim'],
      formalityScore: 2,
    }),
    item({
      id: 'sm-chinos',
      category: 'Bottoms',
      colors: ['Khaki'],
      tags: ['casual', 'work', 'chino'],
      formalityScore: 3,
    }),
    item({
      id: 'sm-sneakers',
      category: 'Shoes',
      colors: ['White'],
      tags: ['casual'],
      formalityScore: 2,
    }),
  ];
}

function smallWorkWardrobe(): ClothingItem[] {
  return [
    item({
      id: 'sw-oxford',
      colors: ['White'],
      tags: ['formal', 'work', 'collar'],
      formalityScore: 4,
    }),
    item({
      id: 'sw-knit',
      colors: ['Navy'],
      tags: ['work', 'classic'],
      formalityScore: 3,
    }),
    item({
      id: 'sw-trousers',
      category: 'Bottoms',
      colors: ['Black'],
      tags: ['formal', 'tailored', 'work'],
      formalityScore: 4,
    }),
    item({
      id: 'sw-chinos',
      category: 'Bottoms',
      colors: ['Navy'],
      tags: ['work', 'chino'],
      formalityScore: 3,
    }),
    item({
      id: 'sw-loafers',
      category: 'Shoes',
      colors: ['Brown'],
      tags: ['formal', 'work', 'loafer'],
      formalityScore: 4,
    }),
    item({
      id: 'sw-blazer',
      category: 'Outerwear',
      colors: ['Navy'],
      tags: ['formal', 'work', 'blazer'],
      formalityScore: 4,
    }),
  ];
}

function dressHeavyWardrobe(): ClothingItem[] {
  return [
    item({
      id: 'dh-black-dress',
      category: 'Dresses',
      colors: ['Black'],
      tags: ['formal', 'elegant', 'evening'],
      formalityScore: 4,
    }),
    item({
      id: 'dh-navy-dress',
      category: 'Dresses',
      colors: ['Navy'],
      tags: ['formal', 'work', 'elegant'],
      formalityScore: 3,
    }),
    item({
      id: 'dh-floral',
      category: 'Dresses',
      colors: ['Pink'],
      tags: ['casual', 'summer', 'party'],
      formalityScore: 2,
      season: ['summer'],
    }),
    item({
      id: 'dh-wrap',
      category: 'Dresses',
      colors: ['Beige'],
      tags: ['casual', 'minimal'],
      formalityScore: 2,
    }),
    item({
      id: 'dh-heels',
      category: 'Shoes',
      subCategory: 'heels',
      colors: ['Black'],
      tags: ['formal', 'evening'],
      formalityScore: 4,
    }),
    item({
      id: 'dh-sandals',
      category: 'Shoes',
      subCategory: 'sandals',
      colors: ['Tan'],
      tags: ['casual', 'summer'],
      formalityScore: 2,
    }),
    item({ id: 'dh-tee', colors: ['White'], tags: ['casual'], formalityScore: 2 }),
    item({
      id: 'dh-jeans',
      category: 'Bottoms',
      colors: ['Blue'],
      tags: ['casual', 'denim'],
      formalityScore: 2,
    }),
  ];
}

function similarItemsWardrobe(): ClothingItem[] {
  const tees = [1, 2, 3, 4, 5, 6].map((index) =>
    item({
      id: `sim-tee-${index}`,
      colors: ['White'],
      tags: ['casual', 'minimal'],
      formalityScore: 2,
    })
  );
  return [
    ...tees,
    item({
      id: 'sim-jeans-1',
      category: 'Bottoms',
      colors: ['Navy'],
      tags: ['casual', 'denim'],
      formalityScore: 2,
    }),
    item({
      id: 'sim-jeans-2',
      category: 'Bottoms',
      colors: ['Navy'],
      tags: ['casual', 'denim'],
      formalityScore: 2,
    }),
    item({
      id: 'sim-chinos',
      category: 'Bottoms',
      colors: ['Khaki'],
      tags: ['casual', 'work'],
      formalityScore: 3,
    }),
    item({
      id: 'sim-sneakers-1',
      category: 'Shoes',
      colors: ['White'],
      tags: ['casual'],
      formalityScore: 2,
    }),
    item({
      id: 'sim-sneakers-2',
      category: 'Shoes',
      colors: ['White'],
      tags: ['casual'],
      formalityScore: 2,
    }),
    item({
      id: 'sim-loafers',
      category: 'Shoes',
      colors: ['Brown'],
      tags: ['classic', 'work'],
      formalityScore: 3,
    }),
  ];
}

function exerciseWardrobe(): ClothingItem[] {
  return [
    item({
      id: 'ex-tee',
      colors: ['Black'],
      tags: ['athletic', 'gym', 'workout'],
      formalityScore: 1,
    }),
    item({
      id: 'ex-tank',
      colors: ['Grey'],
      tags: ['athletic', 'sport'],
      formalityScore: 1,
    }),
    item({
      id: 'ex-shorts',
      category: 'Bottoms',
      subCategory: 'shorts',
      colors: ['Black'],
      tags: ['athletic', 'gym', 'workout'],
      formalityScore: 1,
    }),
    item({
      id: 'ex-joggers',
      category: 'Bottoms',
      colors: ['Grey'],
      tags: ['athletic', 'gym'],
      formalityScore: 1,
    }),
    item({
      id: 'ex-sneakers',
      category: 'Shoes',
      subCategory: 'sneakers',
      colors: ['White'],
      tags: ['athletic', 'running'],
      formalityScore: 1,
    }),
    item({
      id: 'ex-hoodie',
      category: 'Outerwear',
      colors: ['Navy'],
      tags: ['athletic', 'comfort'],
      formalityScore: 1,
    }),
  ];
}

function streetwearWardrobe(): ClothingItem[] {
  return [
    item({
      id: 'st-graphic',
      colors: ['Red'],
      tags: ['casual', 'bold', 'graphic', 'streetwear'],
      formalityScore: 1,
    }),
    item({
      id: 'st-hoodie',
      category: 'Outerwear',
      colors: ['Black'],
      tags: ['casual', 'street', 'urban'],
      formalityScore: 1,
    }),
    item({
      id: 'st-overshirt',
      colors: ['Olive'],
      tags: ['casual', 'streetwear'],
      formalityScore: 2,
    }),
    item({
      id: 'st-cargos',
      category: 'Bottoms',
      colors: ['Khaki'],
      tags: ['casual', 'street', 'urban'],
      formalityScore: 2,
    }),
    item({
      id: 'st-jeans',
      category: 'Bottoms',
      colors: ['Black'],
      tags: ['casual', 'denim', 'streetwear'],
      formalityScore: 2,
    }),
    item({
      id: 'st-sneakers',
      category: 'Shoes',
      colors: ['White'],
      tags: ['casual', 'streetwear'],
      formalityScore: 2,
    }),
    item({
      id: 'st-boots',
      category: 'Shoes',
      subCategory: 'boots',
      colors: ['Black'],
      tags: ['casual', 'urban'],
      formalityScore: 2,
    }),
  ];
}

function travelWardrobe(): ClothingItem[] {
  return [
    ...smallCasualWardrobe().map((entry) => ({ ...entry, id: `tr-${entry.id}` })),
    item({
      id: 'tr-dress',
      category: 'Dresses',
      colors: ['Navy'],
      tags: ['casual', 'travel'],
      formalityScore: 2,
    }),
    item({
      id: 'tr-jacket',
      category: 'Outerwear',
      colors: ['Beige'],
      tags: ['casual', 'travel'],
      formalityScore: 2,
    }),
    item({
      id: 'tr-boots',
      category: 'Shoes',
      subCategory: 'boots',
      colors: ['Brown'],
      tags: ['casual', 'travel'],
      formalityScore: 2,
    }),
  ];
}

function churchWardrobe(): ClothingItem[] {
  return [
    ...smallWorkWardrobe().map((entry) => ({ ...entry, id: `ch-${entry.id}` })),
    item({
      id: 'ch-dress',
      category: 'Dresses',
      colors: ['Navy'],
      tags: ['formal', 'elegant', 'event'],
      formalityScore: 4,
    }),
    item({
      id: 'ch-flats',
      category: 'Shoes',
      colors: ['Black'],
      tags: ['formal', 'classic'],
      formalityScore: 3,
    }),
  ];
}

function mediumWardrobe(): ClothingItem[] {
  return realisticWardrobe();
}

function largeMixedWardrobe(): ClothingItem[] {
  return [...realisticWardrobe(), ...cloneWardrobe(largeWardrobe(36), 'lg')];
}

function limitedColourWardrobe(): ClothingItem[] {
  const closet = onlyColours(realisticWardrobe(), ['White', 'Black', 'Navy', 'Grey']);
  return closet.length >= 8 ? closet : mediumWardrobe();
}

function vectorFrom(
  events: Array<{ type: RecommendationEventType; items: ClothingItem[] }>
): UserPreferenceVector {
  return events.reduce(
    (vector, event) =>
      applyFeedbackToVector(vector, { eventType: event.type, items: event.items }),
    emptyPreferenceVector('2026-01-01T00:00:00.000Z')
  );
}

function navyItems(wardrobe: ClothingItem[]): ClothingItem[] {
  return wardrobe.filter((entry) => entry.colors.some((color) => color.toLowerCase() === 'navy'));
}

function redItems(wardrobe: ClothingItem[]): ClothingItem[] {
  return wardrobe.filter((entry) => entry.colors.some((color) => color.toLowerCase() === 'red'));
}

function athleticItems(wardrobe: ClothingItem[]): ClothingItem[] {
  return wardrobe.filter((entry) =>
    entry.tags.some((tag) => ['gym', 'athletic', 'workout'].includes(tag))
  );
}

function formalItems(wardrobe: ClothingItem[]): ClothingItem[] {
  return wardrobe.filter((entry) => entry.tags.includes('formal') || (entry.formalityScore ?? 0) >= 4);
}

function s(
  id: string,
  description: string,
  wardrobe: ClothingItem[],
  request: GoldenScenario['request'],
  expectations: GoldenScenario['expectations']
): GoldenScenario {
  return { id, description, wardrobe, request, expectations };
}

const medium = mediumWardrobe();
const large = largeMixedWardrobe();
const smallCasual = smallCasualWardrobe();
const smallWork = smallWorkWardrobe();
const dressHeavy = dressHeavyWardrobe();
const similar = similarItemsWardrobe();
const exercise = exerciseWardrobe();
const street = streetwearWardrobe();
const travel = travelWardrobe();
const church = churchWardrobe();
const limitedColour = limitedColourWardrobe();
const noShoes = withoutCategory(medium, 'Shoes');
const noOuterwear = withoutCategory(medium, 'Outerwear');

const navyPositive = vectorFrom([
  { type: 'like', items: navyItems(medium) },
  { type: 'save', items: navyItems(medium) },
  { type: 'wear', items: navyItems(medium) },
]);
const redNegative = vectorFrom([
  { type: 'dislike', items: redItems(medium) },
  { type: 'dislike', items: redItems(medium) },
]);
const mixedVector = vectorFrom([
  { type: 'wear', items: navyItems(medium) },
  { type: 'like', items: navyItems(medium) },
  { type: 'dislike', items: redItems(medium) },
]);
const formalPositive = vectorFrom([
  { type: 'wear', items: formalItems(medium) },
  { type: 'save', items: formalItems(medium) },
]);
const athleticNegative = vectorFrom([
  { type: 'dislike', items: athleticItems(medium) },
  { type: 'remove', items: athleticItems(medium) },
]);

export const GOLDEN_SCENARIOS: GoldenScenario[] = [
  s('occ-casual', 'Casual everyday from a medium closet', medium, { occasion: 'Casual', count: 3 }, {
    preferredOccasions: ['casual'],
    shouldRespectOccasion: true,
    shouldUsePersonalization: false,
  }),
  s('occ-formal', 'Formal occasion from a medium closet', medium, { occasion: 'Formal', count: 3 }, {
    preferredOccasions: ['formal'],
    shouldRespectOccasion: true,
    forbiddenCategories: [],
  }),
  s('occ-date', 'Date night from a medium closet', medium, { occasion: 'Date Night', count: 3 }, {
    preferredOccasions: ['date'],
    shouldRespectOccasion: true,
  }),
  s('occ-party', 'Party from a medium closet', medium, { occasion: 'Party', count: 3 }, {
    preferredOccasions: ['party'],
    shouldRespectOccasion: true,
  }),
  s('occ-work', 'Work from a medium closet', medium, { occasion: 'Work', count: 3 }, {
    preferredOccasions: ['work'],
    shouldRespectOccasion: true,
  }),
  s('occ-exercise', 'Exercise from an athletic closet', exercise, { occasion: 'Exercise', count: 3 }, {
    preferredOccasions: ['exercise'],
    preferredStyles: ['athletic'],
    shouldRespectOccasion: true,
    forbiddenColours: [],
  }),
  s('occ-church', 'Church/event uses the Formal profile', church, { occasion: 'Formal', count: 3 }, {
    preferredOccasions: ['formal', 'event'],
    shouldRespectOccasion: true,
  }),
  s('occ-travel', 'Travel day from a layered casual closet', travel, { occasion: 'Casual', count: 3 }, {
    requiredCategories: ['Shoes'],
    shouldRespectOccasion: true,
  }),
  s('occ-everyday', 'Everyday casual with no extra style chips', medium, { occasion: 'Casual', count: 3 }, {
    shouldRespectOccasion: true,
    shouldUsePersonalization: false,
  }),
  s('wx-hot', 'Hot weather casual', medium, { occasion: 'Casual', weather: HOT, count: 3 }, {
    shouldRespectWeather: true,
    shouldRespectOccasion: true,
  }),
  s('wx-warm', 'Warm weather casual', medium, { occasion: 'Casual', weather: WARM, count: 3 }, {
    shouldRespectWeather: true,
    shouldRespectOccasion: true,
  }),
  s('wx-cool', 'Cool weather casual', medium, { occasion: 'Casual', weather: COOL, count: 3 }, {
    shouldRespectWeather: true,
    shouldRespectOccasion: true,
  }),
  s('wx-cold', 'Cold weather casual', medium, { occasion: 'Casual', weather: COLD, count: 3 }, {
    shouldRespectWeather: true,
    shouldRespectOccasion: true,
  }),
  s('wx-rainy', 'Rainy weather casual', medium, { occasion: 'Casual', weather: RAINY, count: 3 }, {
    shouldRespectWeather: true,
    shouldRespectOccasion: true,
  }),
  s('wx-hot-exercise', 'Hot weather exercise', exercise, { occasion: 'Exercise', weather: HOT, count: 3 }, {
    shouldRespectWeather: true,
    shouldRespectOccasion: true,
  }),
  s('wx-cold-work', 'Cold weather work', medium, { occasion: 'Work', weather: COLD, count: 3 }, {
    shouldRespectWeather: true,
    shouldRespectOccasion: true,
  }),
  s('wx-rainy-work', 'Rainy workday', medium, { occasion: 'Work', weather: RAINY, count: 3 }, {
    shouldRespectWeather: true,
    shouldRespectOccasion: true,
  }),
  s('wx-cold-formal', 'Cold formal event', medium, { occasion: 'Formal', weather: COLD, count: 3 }, {
    shouldRespectWeather: true,
    shouldRespectOccasion: true,
  }),
  s('wx-hot-date', 'Hot date night', medium, { occasion: 'Date Night', weather: HOT, count: 3 }, {
    shouldRespectWeather: true,
    shouldRespectOccasion: true,
  }),
  s('wd-small-casual', 'Small casual wardrobe', smallCasual, { occasion: 'Casual', count: 3 }, {
    shouldRespectOccasion: true,
  }),
  s('wd-medium-work', 'Medium wardrobe for work', medium, { occasion: 'Work', count: 3 }, {
    shouldRespectOccasion: true,
  }),
  s('wd-large-casual', 'Large wardrobe casual', large, { occasion: 'Casual', count: 5 }, {
    shouldRespectOccasion: true,
    maxResults: 5,
  }),
  s('wd-missing-shoes', 'Closet with no shoes still forms a look', noShoes, { occasion: 'Casual', count: 3 }, {
    forbiddenCategories: ['Shoes'],
    shouldRespectOccasion: true,
  }),
  s('wd-missing-outerwear-cold', 'Cold day without outerwear', noOuterwear, {
    occasion: 'Casual',
    weather: COLD,
    count: 3,
  }, {
    forbiddenCategories: ['Outerwear'],
    shouldRespectWeather: true,
  }),
  s('wd-dress-heavy-date', 'Dress-heavy closet for date night', dressHeavy, { occasion: 'Date Night', count: 3 }, {
    shouldRespectOccasion: true,
  }),
  s('wd-limited-colour', 'Limited colour closet', limitedColour, { occasion: 'Casual', count: 3 }, {
    preferredColours: ['White', 'Black', 'Navy', 'Grey'],
    shouldRespectOccasion: true,
  }),
  s('wd-similar-items', 'Many near-identical tees and jeans', similar, { occasion: 'Casual', count: 3 }, {
    shouldRespectOccasion: true,
  }),
  s('wd-small-work', 'Small work wardrobe', smallWork, { occasion: 'Work', count: 3 }, {
    shouldRespectOccasion: true,
    requiredCategories: ['Tops', 'Bottoms'],
  }),
  s('wd-missing-shoes-formal', 'Formal with no shoes uses the dress path', withoutCategory(church, 'Shoes'), {
    occasion: 'Formal',
    count: 3,
  }, {
    forbiddenCategories: ['Shoes'],
    shouldRespectOccasion: true,
  }),
  s('wd-dress-heavy-party', 'Dress-heavy party closet', dressHeavy, { occasion: 'Party', count: 3 }, {
    shouldRespectOccasion: true,
  }),
  s('wd-limited-colour-work', 'Limited colour work closet', limitedColour, { occasion: 'Work', count: 3 }, {
    shouldRespectOccasion: true,
  }),
  s('wd-large-formal', 'Large wardrobe formal', large, { occasion: 'Formal', count: 3 }, {
    shouldRespectOccasion: true,
  }),
  s('wd-similar-work', 'Similar items for work', similar, { occasion: 'Work', count: 3 }, {
    shouldRespectOccasion: true,
  }),
  s('st-minimal', 'Minimal style preference', medium, {
    occasion: 'Casual',
    styleIds: ['minimal'],
    stylePreferences: ['minimalist'],
    count: 3,
  }, {
    preferredStyles: ['minimal'],
    shouldRespectOccasion: true,
  }),
  s('st-classic', 'Classic style preference', medium, {
    occasion: 'Work',
    styleIds: ['classic'],
    count: 3,
  }, {
    preferredStyles: ['classic'],
    shouldRespectOccasion: true,
  }),
  s('st-streetwear', 'Streetwear closet and preference', street, {
    occasion: 'Casual',
    styleIds: ['trendy'],
    stylePreferences: ['streetwear'],
    count: 3,
  }, {
    preferredStyles: ['streetwear'],
    shouldRespectOccasion: true,
  }),
  s('st-casual', 'Casual style preference', medium, {
    occasion: 'Casual',
    stylePreferences: ['casual'],
    count: 3,
  }, {
    preferredStyles: ['casual'],
    shouldRespectOccasion: true,
  }),
  s('st-formal', 'Formal style preference', medium, {
    occasion: 'Formal',
    stylePreferences: ['formal'],
    count: 3,
  }, {
    preferredStyles: ['formal'],
    shouldRespectOccasion: true,
  }),
  s('st-athletic', 'Athletic style preference', exercise, {
    occasion: 'Exercise',
    styleIds: ['relaxed'],
    count: 3,
  }, {
    preferredStyles: ['athletic'],
    shouldRespectOccasion: true,
  }),
  s('st-bold', 'Bold style preference', street, {
    occasion: 'Casual',
    styleIds: ['bold'],
    count: 3,
  }, {
    preferredStyles: ['bold'],
    shouldRespectOccasion: true,
  }),
  s('pz-cold-casual', 'Cold-start casual', medium, { occasion: 'Casual', count: 3 }, {
    shouldUsePersonalization: false,
    shouldRespectOccasion: true,
  }),
  s('pz-cold-work', 'Cold-start work', medium, { occasion: 'Work', count: 3 }, {
    shouldUsePersonalization: false,
    shouldRespectOccasion: true,
  }),
  s('pz-positive-navy-casual', 'Positive navy preference vector, casual', medium, {
    occasion: 'Casual',
    preferenceVector: navyPositive,
    count: 3,
  }, {
    shouldUsePersonalization: true,
    preferredColours: ['Navy'],
    shouldRespectOccasion: true,
  }),
  s('pz-positive-navy-work', 'Positive navy preference vector, work', medium, {
    occasion: 'Work',
    preferenceVector: navyPositive,
    count: 3,
  }, {
    shouldUsePersonalization: true,
    shouldRespectOccasion: true,
  }),
  s('pz-negative-red', 'Negative red preference vector', medium, {
    occasion: 'Casual',
    preferenceVector: redNegative,
    count: 3,
  }, {
    shouldUsePersonalization: true,
    forbiddenColours: [],
    shouldRespectOccasion: true,
  }),
  s('pz-mixed', 'Mixed navy-positive / red-negative vector', medium, {
    occasion: 'Casual',
    preferenceVector: mixedVector,
    count: 3,
  }, {
    shouldUsePersonalization: true,
    shouldRespectOccasion: true,
  }),
  s('pz-positive-formal', 'Positive formal behavioral vector', medium, {
    occasion: 'Formal',
    preferenceVector: formalPositive,
    count: 3,
  }, {
    shouldUsePersonalization: true,
    shouldRespectOccasion: true,
  }),
  s('pz-negative-athletic-work', 'Rejected athletic pieces, then a work request', medium, {
    occasion: 'Work',
    preferenceVector: athleticNegative,
    count: 3,
  }, {
    shouldUsePersonalization: true,
    shouldRespectOccasion: true,
  }),
  s('pz-mixed-date', 'Mixed vector on date night', medium, {
    occasion: 'Date Night',
    preferenceVector: mixedVector,
    count: 3,
  }, {
    shouldUsePersonalization: true,
    shouldRespectOccasion: true,
  }),
  s('pz-cold-exercise', 'Cold-start exercise', exercise, { occasion: 'Exercise', count: 3 }, {
    shouldUsePersonalization: false,
    shouldRespectOccasion: true,
  }),
];

export const GOLDEN_SCENARIO_COUNT = GOLDEN_SCENARIOS.length;
