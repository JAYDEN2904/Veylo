import { ClothingItem, Outfit } from '../types';

export interface OutfitFitPrediction {
  outfit: Outfit;
  fitScore: number; // 0-100
  reasoning: string[];
}

export interface OutfitDifficultyScore {
  outfit: Outfit;
  difficultyScore: number; // 0-100 (higher = more put together/complex)
  factors: {
    itemCount: number;
    colorComplexity: number;
    styleConsistency: number;
    categoryDiversity: number;
  };
}

/**
 * Predict how well items fit together based on past combinations
 * (In production, this would use ML/AI, here we use heuristics)
 */
export const predictOutfitFit = (
  outfit: Outfit,
  outfitHistory: Outfit[] // Past outfits worn together
): OutfitFitPrediction => {
  let fitScore = 50; // Base score
  const reasoning: string[] = [];

  // Check if items have been worn together before
  const outfitItemIds = new Set(outfit.items.map((item) => item.id));
  const matchingHistory = outfitHistory.filter((pastOutfit) => {
    const pastItemIds = new Set(pastOutfit.items.map((item) => item.id));
    const overlap = [...outfitItemIds].filter((id) => pastItemIds.has(id)).length;
    return overlap >= 2; // At least 2 items worn together before
  });

  if (matchingHistory.length > 0) {
    fitScore += 30;
    reasoning.push(`Items have been worn together ${matchingHistory.length} time(s) before`);
  }

  // Check color harmony
  const colors = outfit.items.flatMap((item) => item.colors.map((c) => c.toLowerCase()));
  const uniqueColors = new Set(colors);
  const colorCount = uniqueColors.size;

  if (colorCount >= 2 && colorCount <= 4) {
    fitScore += 15;
    reasoning.push('Good color variety');
  } else if (colorCount === 1) {
    fitScore -= 10;
    reasoning.push('Limited color variety');
  } else {
    fitScore -= 5;
    reasoning.push('Too many colors (might clash)');
  }

  // Check category diversity (should have variety but not too many)
  const categories = new Set(outfit.items.map((item) => item.category));
  if (categories.size >= 3 && categories.size <= 5) {
    fitScore += 10;
    reasoning.push('Good category mix');
  }

  // Check brand consistency (optional - some prefer matching brands)
  const brands = outfit.items.map((item) => item.brand).filter(Boolean) as string[];
  const uniqueBrands = new Set(brands);

  if (uniqueBrands.size === 1 && brands.length > 1) {
    fitScore += 5;
    reasoning.push('Consistent brand');
  }

  // Check tag/style consistency
  const allTags = outfit.items.flatMap((item) => item.tags);
  const tagFrequency: Record<string, number> = {};
  allTags.forEach((tag) => {
    tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
  });

  const commonTags = Object.entries(tagFrequency)
    .filter(([_, count]) => count >= 2)
    .map(([tag]) => tag);

  if (commonTags.length > 0) {
    fitScore += 10;
    reasoning.push(`Shared style tags: ${commonTags.join(', ')}`);
  }

  return {
    outfit,
    fitScore: Math.max(0, Math.min(100, fitScore)),
    reasoning,
  };
};

/**
 * Calculate outfit difficulty/complexity score
 * Higher score = more "put together" / complex outfit
 */
export const calculateOutfitDifficulty = (outfit: Outfit): OutfitDifficultyScore => {
  const items = outfit.items;

  // Item count factor (more items = slightly more complex)
  const itemCount = items.length;
  const itemCountScore = Math.min(25, itemCount * 5);

  // Color complexity
  const colors = items.flatMap((item) => item.colors);
  const uniqueColors = new Set(colors.map((c) => c.toLowerCase()));
  const colorComplexity = uniqueColors.size >= 4 ? 25 : uniqueColors.size * 5;

  // Style consistency (check for matching tags/styles)
  const allTags = items.flatMap((item) => item.tags);
  const tagFrequency: Record<string, number> = {};
  allTags.forEach((tag) => {
    tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
  });
  const sharedTags = Object.values(tagFrequency).filter((count) => count >= 2).length;
  const styleConsistency = Math.min(25, sharedTags * 5);

  // Category diversity
  const categories = new Set(items.map((item) => item.category));
  const categoryDiversity = Math.min(25, categories.size * 5);

  const difficultyScore = itemCountScore + colorComplexity + styleConsistency + categoryDiversity;

  return {
    outfit,
    difficultyScore: Math.min(100, difficultyScore),
    factors: {
      itemCount: itemCountScore,
      colorComplexity,
      styleConsistency,
      categoryDiversity,
    },
  };
};

/**
 * Get outfit difficulty label
 */
export const getOutfitDifficultyLabel = (score: number): string => {
  if (score >= 80) return 'Very Put Together';
  if (score >= 60) return 'Well Styled';
  if (score >= 40) return 'Balanced';
  if (score >= 20) return 'Simple';
  return 'Minimal';
};
