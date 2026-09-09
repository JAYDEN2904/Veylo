import type { ClothingItem, WeatherData } from '../../types';
import { namedColorsToHsl } from '../../utils/hslColor';

export const item = (overrides: Partial<ClothingItem>): ClothingItem => {
  const colors = overrides.colors ?? ['White'];
  return {
    id: overrides.id ?? `item-${Math.random().toString(36).slice(2, 11)}`,
    imageUrl: 'https://example.com/i.jpg',
    category: 'Tops',
    colors,
    colorsHsl: overrides.colorsHsl ?? namedColorsToHsl(colors),
    tags: overrides.tags ?? ['casual'],
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
    ...overrides,
  };
};

export const mildWeather: WeatherData = {
  temperature: 18,
  condition: 'Clouds',
  description: 'mild',
  humidity: 55,
  windSpeed: 4,
  icon: '04d',
  feelsLike: 17,
  location: 'Test',
};

/** ~30-piece closet for integration / quality checks. */
export function realisticWardrobe(): ClothingItem[] {
  return [
    item({ id: 'rt-white-tee', colors: ['White'], tags: ['casual', 'minimal'], formalityScore: 2 }),
    item({
      id: 'rt-navy-tee',
      colors: ['Navy'],
      tags: ['casual', 'minimal'],
      formalityScore: 2,
      brand: 'Uniqlo',
    }),
    item({ id: 'rt-black-tee', colors: ['Black'], tags: ['casual'], formalityScore: 2 }),
    item({
      id: 'rt-oxford',
      colors: ['White'],
      tags: ['formal', 'work', 'collar'],
      formalityScore: 4,
    }),
    item({
      id: 'rt-linen',
      colors: ['Beige'],
      tags: ['casual', 'summer'],
      formalityScore: 2,
      season: ['summer'],
    }),
    item({
      id: 'rt-knit',
      colors: ['Grey'],
      tags: ['casual', 'warm'],
      formalityScore: 2,
      season: ['winter'],
    }),
    item({
      id: 'rt-silk',
      colors: ['Black'],
      tags: ['formal', 'elegant', 'evening'],
      formalityScore: 4,
    }),
    item({
      id: 'rt-stripe',
      colors: ['Blue'],
      tags: ['casual', 'work'],
      formalityScore: 3,
    }),
    item({
      id: 'rt-graphic',
      colors: ['Red'],
      tags: ['casual', 'bold', 'graphic'],
      formalityScore: 1,
    }),
    item({
      id: 'rt-hoodie',
      colors: ['Grey'],
      tags: ['casual', 'comfort'],
      formalityScore: 1,
      category: 'Outerwear',
    }),
    item({
      id: 'rb-navy-jeans',
      category: 'Bottoms',
      colors: ['Navy'],
      tags: ['casual', 'denim'],
      formalityScore: 2,
    }),
    item({
      id: 'rb-black-jeans',
      category: 'Bottoms',
      colors: ['Black'],
      tags: ['casual', 'denim'],
      formalityScore: 2,
    }),
    item({
      id: 'rb-chinos',
      category: 'Bottoms',
      colors: ['Khaki'],
      tags: ['casual', 'work', 'chino'],
      formalityScore: 3,
    }),
    item({
      id: 'rb-trousers',
      category: 'Bottoms',
      colors: ['Black'],
      tags: ['formal', 'tailored', 'work'],
      formalityScore: 4,
    }),
    item({
      id: 'rb-shorts',
      category: 'Bottoms',
      subCategory: 'shorts',
      colors: ['Blue'],
      tags: ['casual', 'summer'],
      formalityScore: 1,
      season: ['summer'],
    }),
    item({
      id: 'rb-joggers',
      category: 'Bottoms',
      colors: ['Grey'],
      tags: ['casual', 'athletic', 'gym'],
      formalityScore: 1,
    }),
    item({
      id: 'rs-white-sneakers',
      category: 'Shoes',
      colors: ['White'],
      tags: ['casual'],
      formalityScore: 2,
    }),
    item({
      id: 'rs-black-sneakers',
      category: 'Shoes',
      colors: ['Black'],
      tags: ['casual'],
      formalityScore: 2,
    }),
    item({
      id: 'rs-loafers',
      category: 'Shoes',
      colors: ['Brown'],
      tags: ['formal', 'work', 'loafer'],
      formalityScore: 4,
    }),
    item({
      id: 'rs-boots',
      category: 'Shoes',
      subCategory: 'boots',
      colors: ['Brown'],
      tags: ['casual', 'warm'],
      formalityScore: 2,
      season: ['winter'],
    }),
    item({
      id: 'ro-blazer',
      category: 'Outerwear',
      colors: ['Navy'],
      tags: ['formal', 'work', 'blazer'],
      formalityScore: 4,
    }),
    item({
      id: 'ro-denim-jacket',
      category: 'Outerwear',
      colors: ['Blue'],
      tags: ['casual', 'denim'],
      formalityScore: 2,
    }),
    item({
      id: 'ro-coat',
      category: 'Outerwear',
      colors: ['Black'],
      tags: ['warm', 'coat', 'wool'],
      formalityScore: 3,
      season: ['winter'],
    }),
    item({
      id: 'ra-belt',
      category: 'Accessories',
      colors: ['Brown'],
      tags: ['casual'],
      formalityScore: 2,
    }),
    item({
      id: 'ra-watch',
      category: 'Accessories',
      colors: ['Black'],
      tags: ['casual', 'work'],
      formalityScore: 3,
    }),
    item({
      id: 'ra-tote',
      category: 'Accessories',
      colors: ['Tan'],
      tags: ['casual'],
      formalityScore: 2,
    }),
    item({
      id: 'rd-black-dress',
      category: 'Dresses',
      colors: ['Black'],
      tags: ['formal', 'elegant', 'evening'],
      formalityScore: 4,
    }),
    item({
      id: 'rd-floral',
      category: 'Dresses',
      colors: ['Pink'],
      tags: ['casual', 'summer'],
      formalityScore: 2,
      season: ['summer'],
    }),
  ];
}

export function largeWardrobe(size: number): ClothingItem[] {
  const items: ClothingItem[] = [];
  const colors = ['White', 'Black', 'Navy', 'Blue', 'Grey', 'Red', 'Beige', 'Brown'];
  const categories = ['Tops', 'Bottoms', 'Shoes', 'Outerwear', 'Accessories', 'Dresses'] as const;
  for (let i = 0; i < size; i += 1) {
    const category = categories[i % categories.length];
    items.push(
      item({
        id: `lw-${i}`,
        category,
        colors: [colors[i % colors.length]],
        tags: i % 7 === 0 ? ['formal', 'work'] : ['casual'],
        formalityScore: (i % 4) + 1,
        subCategory: i % 5 === 0 && category === 'Bottoms' ? 'shorts' : undefined,
      })
    );
  }
  return items;
}

export function outfitSignature(items: ClothingItem[]): string {
  return items
    .map((entry) => entry.id)
    .sort()
    .join('|');
}
