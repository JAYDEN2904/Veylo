import { ClothingItem } from '../types';

export interface SmartCollection {
  id: string;
  name: string;
  description: string;
  items: ClothingItem[];
  type: 'occasion' | 'season' | 'color' | 'brand' | 'custom';
}

/**
 * Auto-group items by occasion based on tags
 */
export const createOccasionCollections = (items: ClothingItem[]): SmartCollection[] => {
  const occasionTags: Record<string, string[]> = {
    Work: ['work', 'business', 'professional', 'office', 'formal'],
    Casual: ['casual', 'everyday', 'weekend', 'comfort'],
    Formal: ['formal', 'elegant', 'dressy', 'event', 'wedding'],
    Exercise: ['sport', 'workout', 'athletic', 'gym', 'active'],
    'Date Night': ['date', 'night', 'romantic', 'evening'],
    Travel: ['travel', 'vacation', 'trip'],
    Beach: ['beach', 'summer', 'swim', 'resort'],
  };

  const collections: SmartCollection[] = [];

  Object.entries(occasionTags).forEach(([occasion, tags]) => {
    const matchingItems = items.filter((item) =>
      item.tags.some((itemTag) =>
        tags.some((tag) => itemTag.toLowerCase().includes(tag.toLowerCase()))
      )
    );

    if (matchingItems.length > 0) {
      collections.push({
        id: `occasion-${occasion.toLowerCase().replace(' ', '-')}`,
        name: occasion,
        description: `${matchingItems.length} items for ${occasion.toLowerCase()} occasions`,
        items: matchingItems,
        type: 'occasion',
      });
    }
  });

  return collections;
};

/**
 * Auto-group items by season
 */
export const createSeasonCollections = (items: ClothingItem[]): SmartCollection[] => {
  const seasons = ['Spring', 'Summer', 'Fall', 'Winter'];
  const collections: SmartCollection[] = [];

  seasons.forEach((season) => {
    const matchingItems = items.filter((item) => item.season?.includes(season));

    if (matchingItems.length > 0) {
      collections.push({
        id: `season-${season.toLowerCase()}`,
        name: season,
        description: `${matchingItems.length} items perfect for ${season.toLowerCase()}`,
        items: matchingItems,
        type: 'season',
      });
    }
  });

  return collections;
};

/**
 * Auto-group items by color
 */
export const createColorCollections = (items: ClothingItem[]): SmartCollection[] => {
  const colorFrequency: Record<string, ClothingItem[]> = {};

  items.forEach((item) => {
    item.colors.forEach((color) => {
      const colorKey = color.toLowerCase();
      if (!colorFrequency[colorKey]) {
        colorFrequency[colorKey] = [];
      }
      if (!colorFrequency[colorKey].find((i) => i.id === item.id)) {
        colorFrequency[colorKey].push(item);
      }
    });
  });

  return Object.entries(colorFrequency)
    .filter(([_, items]) => items.length >= 2) // Only show colors with 2+ items
    .map(([color, items]) => ({
      id: `color-${color}`,
      name: color.charAt(0).toUpperCase() + color.slice(1),
      description: `${items.length} items in ${color}`,
      items,
      type: 'color' as const,
    }))
    .sort((a, b) => b.items.length - a.items.length); // Sort by item count
};

/**
 * Auto-group items by brand
 */
export const createBrandCollections = (items: ClothingItem[]): SmartCollection[] => {
  const brandFrequency: Record<string, ClothingItem[]> = {};

  items.forEach((item) => {
    if (item.brand) {
      const brandKey = item.brand.toLowerCase();
      if (!brandFrequency[brandKey]) {
        brandFrequency[brandKey] = [];
      }
      brandFrequency[brandKey].push(item);
    }
  });

  return Object.entries(brandFrequency)
    .filter(([_, items]) => items.length >= 2) // Only show brands with 2+ items
    .map(([brand, items]) => ({
      id: `brand-${brand}`,
      name: brand,
      description: `${items.length} items from ${brand}`,
      items,
      type: 'brand' as const,
    }))
    .sort((a, b) => b.items.length - a.items.length);
};

/**
 * Get all smart collections
 */
export const getAllSmartCollections = (items: ClothingItem[]): SmartCollection[] => {
  return [
    ...createOccasionCollections(items),
    ...createSeasonCollections(items),
    ...createColorCollections(items),
    ...createBrandCollections(items),
  ];
};
