import {
  ClothingItem,
  StyleGap,
  PurchaseRecommendation,
  CompleteLookSuggestion,
  StyleProfile,
  RecommendationScoreBreakdown,
} from '../types';
import { OUTFIT_OCCASION_IDS, OUTFIT_STYLE_MOOD_IDS } from '../constants/outfitSignals';
import { cosineSimilarity } from './vectorSimilarity';

interface RecommendationOptions {
  styleProfile?: StyleProfile;
  items: ClothingItem[];
  outfits?: unknown[];
}

/**
 * Analyze wardrobe to identify style gaps
 */
export const analyzeStyleGaps = (options: RecommendationOptions): StyleGap[] => {
  const { items, styleProfile } = options;
  const gaps: StyleGap[] = [];

  // Count items by category
  const categoryCount: Record<string, number> = {};
  items.forEach((item) => {
    categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
  });

  // Essential categories that should exist
  const essentialCategories = ['Tops', 'Bottoms', 'Shoes', 'Outerwear'];

  essentialCategories.forEach((category) => {
    if (!categoryCount[category] || categoryCount[category] < 2) {
      const reason =
        categoryCount[category] === 0
          ? `You don't have any ${category.toLowerCase()} in your wardrobe`
          : `You only have ${categoryCount[category]} ${category.toLowerCase()}(s) — add variety for more outfits`;
      gaps.push({
        category,
        reason,
        suggestedItems: getSuggestedItemsForCategory(category),
        priority: categoryCount[category] === 0 ? 'high' : 'medium',
        reasons: [reason, 'Balanced closets usually include multiple options per core category'],
      });
    }
  });

  // Analyze color diversity
  const colorFrequency: Record<string, number> = {};
  items.forEach((item) => {
    item.colors.forEach((color) => {
      colorFrequency[color.toLowerCase()] = (colorFrequency[color.toLowerCase()] || 0) + 1;
    });
  });

  // Check for monochrome wardrobe
  const totalColors = Object.keys(colorFrequency).length;
  if (totalColors < 5 && items.length > 10) {
    gaps.push({
      category: 'Colors',
      reason: 'Your wardrobe could benefit from more color variety',
      suggestedItems: ['Neutral tones', 'Pop of color', 'Bold statement pieces'],
      priority: 'low',
      reasons: [
        'More hues make mixing-and-matching easier across occasions',
        `Works well with ${OUTFIT_OCCASION_IDS.slice(0, 3).join(', ')} looks`,
      ],
    });
  }

  // Analyze style preferences if available
  if (styleProfile) {
    const userStyles = styleProfile.preferences;

    // Check if user has items matching their style preferences
    userStyles.forEach((style) => {
      const matchingItems = items.filter((item) =>
        item.tags.some((tag) => tag.toLowerCase().includes(style))
      );

      if (matchingItems.length < 3) {
        gaps.push({
          category: style,
          reason: `Add more ${style} pieces to match your style preferences`,
          suggestedItems: getSuggestedItemsForStyle(style),
          priority: 'medium',
          reasons: [
            `Your profile leans ${style}; a few more pieces unlock more ${OUTFIT_STYLE_MOOD_IDS[0]}-to-${OUTFIT_STYLE_MOOD_IDS[2]} outfits`,
          ],
        });
      }
    });
  }

  return gaps;
};

/**
 * Generate purchase recommendations based on wardrobe gaps and style profile
 */
export const generatePurchaseRecommendations = (
  options: RecommendationOptions
): PurchaseRecommendation[] => {
  const raw = generatePurchaseRecommendationsList(options);
  const ranked = rankAndEnrichPurchaseRecommendations(raw.slice(0, 20), options);
  return ranked.slice(0, 10);
};

/**
 * Rank by composite score and attach breakdown + reason lines for UI.
 */
export const rankAndEnrichPurchaseRecommendations = (
  recs: PurchaseRecommendation[],
  options: RecommendationOptions
): PurchaseRecommendation[] => {
  return recs
    .map((rec) => enrichPurchaseRecommendation(rec, options))
    .sort((a, b) => {
      const ao = a.scoreBreakdown?.overall ?? a.styleMatchScore;
      const bo = b.scoreBreakdown?.overall ?? b.styleMatchScore;
      return bo - ao;
    });
};

function enrichPurchaseRecommendation(
  rec: PurchaseRecommendation,
  options: RecommendationOptions
): PurchaseRecommendation {
  const styleMatch = rec.styleMatchScore;
  const completeness = rec.priority === 'high' ? 88 : rec.priority === 'medium' ? 68 : 48;
  const novelty = Math.min(95, 42 + Math.min(30, Math.floor(options.items.length / 2)));
  const overall = Math.min(
    100,
    Math.round(styleMatch * 0.45 + completeness * 0.35 + novelty * 0.2)
  );

  const scoreBreakdown: RecommendationScoreBreakdown = {
    overall,
    styleMatch,
    completeness,
    novelty,
  };

  const reasons = buildRecommendationReasonLines(rec, options);

  return {
    ...rec,
    scoreBreakdown,
    reasons,
  };
}

function buildRecommendationReasonLines(
  rec: PurchaseRecommendation,
  options: RecommendationOptions
): string[] {
  const lines: string[] = [rec.reason];
  if (options.styleProfile?.preferences?.length) {
    lines.push(
      `Fits your saved styles: ${options.styleProfile.preferences.slice(0, 3).join(', ')}`
    );
  }
  lines.push(`Strong match for how you dress (${rec.styleMatchScore}% style fit)`);
  if (rec.priority === 'high') {
    lines.push('High impact — fills a missing core category');
  }
  return [...new Set(lines)].slice(0, 4);
}

/** Top picks for feed / progressive disclosure */
export const getTopRankedPurchaseRecommendations = (
  options: RecommendationOptions,
  limit = 5
): PurchaseRecommendation[] => generatePurchaseRecommendations(options).slice(0, limit);

/** Internal: build list before ranking (same rules as generatePurchaseRecommendations body) */
function generatePurchaseRecommendationsList(
  options: RecommendationOptions
): PurchaseRecommendation[] {
  const { styleProfile, items } = options;
  const recommendations: PurchaseRecommendation[] = [];
  const gaps = analyzeStyleGaps(options);

  gaps.forEach((gap) => {
    if (gap.priority === 'high' || gap.priority === 'medium') {
      gap.suggestedItems.forEach((item, index) => {
        recommendations.push({
          id: `rec-${gap.category}-${index}`,
          itemDescription: `${item} — ${gap.category}`,
          category: gap.category,
          reason: gap.reason,
          styleMatchScore: styleProfile
            ? calculateStyleMatchForRecommendation(item, gap.category, styleProfile)
            : 70,
          priority: gap.priority,
        });
      });
    }
  });

  if (styleProfile) {
    const preferredColors = styleProfile.learnedPreferences.preferredColors;
    const missingColors = preferredColors.filter(
      (color) => !items.some((item) => item.colors.some((c) => c.toLowerCase() === color))
    );

    missingColors.slice(0, 3).forEach((color) => {
      recommendations.push({
        id: `rec-color-${color}`,
        itemDescription: `${color.charAt(0).toUpperCase() + color.slice(1)} piece`,
        category: 'Accessories',
        reason: `Add a ${color} piece to match your color preferences`,
        styleMatchScore: 85,
        priority: 'low',
      });
    });
  }

  return recommendations;
}

/**
 * Generate "complete the look" suggestions for a base item
 */
export const generateCompleteLookSuggestions = (
  baseItem: ClothingItem,
  allItems: ClothingItem[]
): CompleteLookSuggestion[] => {
  const suggestions: CompleteLookSuggestion[] = [];

  // Find items that complement the base item
  const complementaryItems = allItems.filter((item) => {
    if (item.id === baseItem.id) return false;

    // Don't suggest same category (e.g., top with top)
    if (item.category === baseItem.category) return false;

    // Check color compatibility (basic rules)
    const baseColors = baseItem.colors.map((c) => c.toLowerCase());
    const itemColors = item.colors.map((c) => c.toLowerCase());

    // Neutral colors go with everything
    const neutrals = ['black', 'white', 'gray', 'grey', 'beige', 'navy', 'brown', 'tan'];
    const baseIsNeutral = baseColors.some((c) => neutrals.includes(c));
    const itemIsNeutral = itemColors.some((c) => neutrals.includes(c));

    if (baseIsNeutral || itemIsNeutral) return true;

    // Check for color matching
    const hasMatchingColor = baseColors.some((baseColor) =>
      itemColors.some(
        (itemColor) => baseColor === itemColor || areColorsComplementary(baseColor, itemColor)
      )
    );

    return hasMatchingColor;
  });

  // Group by category and create suggestions
  const byCategory: Record<string, ClothingItem[]> = {};
  complementaryItems.forEach((item) => {
    if (!byCategory[item.category]) {
      byCategory[item.category] = [];
    }
    byCategory[item.category].push(item);
  });

  Object.entries(byCategory).forEach(([category, items]) => {
    suggestions.push({
      baseItem,
      suggestedItems: items.slice(0, 3),
      reason: `Complete your ${baseItem.category.toLowerCase()} with matching ${category.toLowerCase()}`,
      styleMatchScore: calculateStyleMatchForItems([baseItem, ...items]),
    });
  });

  return suggestions.sort((a, b) => b.styleMatchScore - a.styleMatchScore).slice(0, 5);
};

// Helper functions

function getSuggestedItemsForCategory(category: string): string[] {
  const suggestions: Record<string, string[]> = {
    Tops: ['T-Shirt', 'Button-up Shirt', 'Sweater', 'Blouse'],
    Bottoms: ['Jeans', 'Trousers', 'Shorts', 'Skirt'],
    Shoes: ['Sneakers', 'Dress Shoes', 'Boots', 'Sandals'],
    Outerwear: ['Jacket', 'Coat', 'Blazer', 'Cardigan'],
    Accessories: ['Belt', 'Watch', 'Bag', 'Hat'],
  };

  return suggestions[category] || ['Essential item'];
}

function getSuggestedItemsForStyle(style: string): string[] {
  const suggestions: Record<string, string[]> = {
    minimalist: ['Simple T-Shirt', 'Classic Jeans', 'Neutral Coat'],
    casual: ['Comfortable T-Shirt', 'Relaxed Jeans', 'Sneakers'],
    formal: ['Dress Shirt', 'Tailored Pants', 'Dress Shoes'],
    streetwear: ['Graphic Tee', 'Sneakers', 'Hoodie'],
    bohemian: ['Flowy Top', 'Maxi Skirt', 'Sandals'],
    vintage: ['Retro Blouse', 'High-Waisted Pants', 'Vintage Jacket'],
  };

  return suggestions[style] || ['Style-specific item'];
}

function calculateStyleMatchForRecommendation(
  item: string,
  category: string,
  styleProfile: StyleProfile
): number {
  // Simple heuristic: base score on style preferences
  let score = 50;

  styleProfile.preferences.forEach((pref) => {
    const itemLower = item.toLowerCase();
    if (itemLower.includes(pref)) {
      score += 10;
    }
  });

  // Boost score if it matches learned preferences
  if (styleProfile.learnedPreferences.preferredCategories.includes(category)) {
    score += 15;
  }

  return Math.min(100, score);
}

function calculateStyleMatchForItems(items: ClothingItem[]): number {
  // Simple compatibility score based on colors and categories
  let score = 60;

  // Check color harmony
  const colors = items.flatMap((item) => item.colors.map((c) => c.toLowerCase()));
  const uniqueColors = new Set(colors);

  // More colors might indicate better styling
  if (uniqueColors.size >= 2 && uniqueColors.size <= 4) {
    score += 20;
  }

  // Check category diversity
  const categories = new Set(items.map((item) => item.category));
  if (categories.size >= 3) {
    score += 20;
  }

  return Math.min(100, score);
}

function areColorsComplementary(color1: string, color2: string): boolean {
  // Simplified color complementarity rules
  const complementaryPairs = [
    ['red', 'green'],
    ['blue', 'orange'],
    ['yellow', 'purple'],
    ['pink', 'mint'],
    ['navy', 'coral'],
  ];

  return complementaryPairs.some((pair) => pair.includes(color1) && pair.includes(color2));
}

/** Rank item ids by cosine similarity to a query embedding (pgvector pipeline). */
export function rankItemIdsByEmbeddingSimilarity(
  queryEmbedding: number[],
  items: { id: string; embedding: number[] }[]
): string[] {
  return [...items]
    .map((row) => ({
      id: row.id,
      score: cosineSimilarity(queryEmbedding, row.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .map((r) => r.id);
}
