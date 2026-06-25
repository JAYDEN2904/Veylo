import { ClothingItem } from '../types';

export interface SearchFilters {
  query?: string;
  category?: string;
  brand?: string;
  colors?: string[];
  tags?: string[];
  season?: string[];
  minLastWornDays?: number; // Items not worn in X days
  maxLastWornDays?: number; // Items worn within X days
  wornCountMin?: number;
  wornCountMax?: number;
}

/**
 * Advanced search with multiple filter options
 */
export const searchItems = (items: ClothingItem[], filters: SearchFilters): ClothingItem[] => {
  let results = [...items];

  // Text query search (searches in brand, category, tags, notes)
  if (filters.query && filters.query.trim()) {
    const queryLower = filters.query.toLowerCase().trim();
    results = results.filter((item) => {
      const searchableText = [
        item.brand,
        item.category,
        item.subCategory,
        item.notes,
        ...item.tags,
        ...item.colors,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(queryLower);
    });
  }

  // Category filter
  if (filters.category) {
    results = results.filter((item) => item.category === filters.category);
  }

  // Brand filter
  if (filters.brand) {
    results = results.filter((item) => item.brand?.toLowerCase() === filters.brand?.toLowerCase());
  }

  // Color filter (item must have at least one matching color)
  if (filters.colors && filters.colors.length > 0) {
    results = results.filter((item) =>
      item.colors.some((color) =>
        filters.colors!.some((filterColor) =>
          color.toLowerCase().includes(filterColor.toLowerCase())
        )
      )
    );
  }

  // Tag filter (item must have at least one matching tag)
  if (filters.tags && filters.tags.length > 0) {
    results = results.filter((item) =>
      item.tags.some((tag) =>
        filters.tags!.some((filterTag) => tag.toLowerCase().includes(filterTag.toLowerCase()))
      )
    );
  }

  // Season filter
  if (filters.season && filters.season.length > 0) {
    results = results.filter((item) =>
      item.season?.some((season) => filters.season!.includes(season))
    );
  }

  // Last worn filters
  if (filters.minLastWornDays !== undefined) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - filters.minLastWornDays);
    results = results.filter((item) => {
      if (!item.lastWorn) return true; // Items never worn pass this filter
      return new Date(item.lastWorn) < cutoffDate;
    });
  }

  if (filters.maxLastWornDays !== undefined) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - filters.maxLastWornDays);
    results = results.filter((item) => {
      if (!item.lastWorn) return false; // Items never worn fail this filter
      return new Date(item.lastWorn) >= cutoffDate;
    });
  }

  // Worn count filters
  if (filters.wornCountMin !== undefined) {
    results = results.filter((item) => (item.wornCount || 0) >= filters.wornCountMin!);
  }

  if (filters.wornCountMax !== undefined) {
    results = results.filter((item) => (item.wornCount || 0) <= filters.wornCountMax!);
  }

  return results;
};

/**
 * Get unique values for filter dropdowns
 */
export const getFilterOptions = (items: ClothingItem[]) => {
  const brands = new Set<string>();
  const colors = new Set<string>();
  const tags = new Set<string>();
  const categories = new Set<string>();
  const seasons = new Set<string>();

  items.forEach((item) => {
    if (item.brand) brands.add(item.brand);
    item.colors.forEach((c) => colors.add(c));
    item.tags.forEach((t) => tags.add(t));
    categories.add(item.category);
    item.season?.forEach((s) => seasons.add(s));
  });

  return {
    brands: Array.from(brands).sort(),
    colors: Array.from(colors).sort(),
    tags: Array.from(tags).sort(),
    categories: Array.from(categories).sort(),
    seasons: Array.from(seasons).sort(),
  };
};
