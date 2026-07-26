import { ClothingItem, WeatherData } from '../types';

/**
 * Check if an item is weather-appropriate
 */
export const isItemWeatherAppropriate = (item: ClothingItem, weather: WeatherData): boolean => {
  const temp = weather.temperature;
  const condition = weather.condition.toLowerCase();
  const category = item.category.toLowerCase();
  const subCategory = (item.subCategory ?? '').toLowerCase();
  const tags = (item.tags ?? []).map((t) => t.toLowerCase());
  const season = item.season?.map((s) => s.toLowerCase()) || [];
  const isShorts = category.includes('shorts') || subCategory.includes('shorts');

  // Temperature-based filtering
  if (temp >= 75) {
    // Hot weather - prefer light, summer items
    if (
      category.includes('outerwear') &&
      !tags.some((t) => t.includes('light') || t.includes('linen'))
    ) {
      return false;
    }
    if (season.includes('winter') && !season.includes('summer')) {
      return false;
    }
    if (tags.some((t) => t.includes('warm') || t.includes('wool') || t.includes('heavy'))) {
      return false;
    }
  } else if (temp >= 60) {
    // Warm weather - light layers OK, avoid heavy outerwear
    if (tags.some((t) => t.includes('heavy') || t.includes('winter') || t.includes('coat'))) {
      return false;
    }
  } else if (temp >= 50) {
    // Cool weather - need some layers
    if (isShorts && !tags.some((t) => t.includes('long'))) {
      return false;
    }
    if (season.includes('summer') && !season.includes('fall') && !season.includes('spring')) {
      return false;
    }
  } else {
    // Cold weather - prefer warm items
    if (isShorts) {
      return false;
    }
    if (season.includes('summer') && !season.includes('fall') && !season.includes('winter')) {
      return false;
    }
    if (tags.some((t) => t.includes('light') || t.includes('linen')) && temp < 45) {
      return false;
    }
  }

  // Condition-based filtering (rain, snow, etc.)
  if (condition.includes('rain') || condition.includes('drizzle')) {
    // Prefer items that can handle moisture
    if (tags.some((t) => t.includes('waterproof') || t.includes('water-resistant'))) {
      return true;
    }
    // Avoid items that shouldn't get wet
    if (
      tags.some((t) => t.includes('suede') || t.includes('leather')) &&
      !tags.some((t) => t.includes('treated'))
    ) {
      return false;
    }
  }

  if (condition.includes('snow')) {
    // Need warm, protective items
    if (temp < 32 && !category.includes('outerwear') && !tags.some((t) => t.includes('warm'))) {
      return false;
    }
  }

  return true;
};

/**
 * Get weather-appropriate items from wardrobe
 */
export const filterItemsByWeather = (
  items: ClothingItem[],
  weather: WeatherData
): ClothingItem[] => {
  return items.filter((item) => isItemWeatherAppropriate(item, weather));
};

/**
 * Score how weather-appropriate an outfit is
 */
export const scoreOutfitWeatherAppropriateness = (
  items: ClothingItem[],
  weather: WeatherData
): number => {
  if (items.length === 0) return 0;

  let score = 0;
  const temp = weather.temperature;
  const condition = weather.condition.toLowerCase();

  items.forEach((item) => {
    const category = item.category.toLowerCase();
    const tags = item.tags.map((t) => t.toLowerCase());

    // Temperature scoring
    if (temp >= 75) {
      if (
        category.includes('tops') &&
        tags.some((t) => t.includes('light') || t.includes('breathable'))
      ) {
        score += 20;
      }
      if (category.includes('shorts')) score += 15;
      if (category.includes('outerwear') && tags.some((t) => t.includes('light'))) score += 10;
    } else if (temp >= 60) {
      if (category.includes('tops') || category.includes('bottoms')) score += 15;
      if (
        category.includes('outerwear') &&
        tags.some((t) => t.includes('light') || t.includes('cardigan'))
      ) {
        score += 15;
      }
    } else if (temp >= 50) {
      if (category.includes('outerwear')) score += 20;
      if (category.includes('tops') && !tags.some((t) => t.includes('tank'))) score += 15;
    } else {
      if (
        category.includes('outerwear') &&
        tags.some((t) => t.includes('warm') || t.includes('coat'))
      ) {
        score += 25;
      }
      if (
        category.includes('tops') &&
        tags.some((t) => t.includes('sweater') || t.includes('warm'))
      ) {
        score += 20;
      }
    }

    // Condition scoring
    if (condition.includes('rain')) {
      if (tags.some((t) => t.includes('waterproof') || t.includes('water-resistant'))) {
        score += 15;
      }
    }
  });

  // Normalize to 0-100
  const maxPossibleScore = items.length * 20;
  return Math.min(100, Math.round((score / maxPossibleScore) * 100));
};
