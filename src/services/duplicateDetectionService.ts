import { ClothingItem } from '../types';

export interface DuplicateCandidate {
  item1: ClothingItem;
  item2: ClothingItem;
  similarityScore: number; // 0-100
  reasons: string[];
}

/**
 * Calculate similarity between two items
 */
const calculateItemSimilarity = (
  item1: ClothingItem,
  item2: ClothingItem
): { score: number; reasons: string[] } => {
  let score = 0;
  const reasons: string[] = [];

  // Category match (high weight)
  if (item1.category === item2.category) {
    score += 30;
    reasons.push('Same category');
  }

  // Brand match (high weight)
  if (item1.brand && item2.brand && item1.brand.toLowerCase() === item2.brand.toLowerCase()) {
    score += 25;
    reasons.push('Same brand');
  }

  // Color similarity (medium weight)
  const commonColors = item1.colors.filter((c1) =>
    item2.colors.some((c2) => c1.toLowerCase() === c2.toLowerCase())
  );
  if (commonColors.length > 0) {
    score += 15 * commonColors.length;
    reasons.push(`${commonColors.length} matching color${commonColors.length > 1 ? 's' : ''}`);
  }

  // Tag similarity (medium weight)
  const commonTags = item1.tags.filter((t1) =>
    item2.tags.some((t2) => t1.toLowerCase() === t2.toLowerCase())
  );
  if (commonTags.length > 0) {
    score += 10 * commonTags.length;
    reasons.push(`${commonTags.length} matching tag${commonTags.length > 1 ? 's' : ''}`);
  }

  // Subcategory match (low weight)
  if (item1.subCategory && item2.subCategory && item1.subCategory === item2.subCategory) {
    score += 10;
    reasons.push('Same subcategory');
  }

  // Season overlap (low weight)
  if (item1.season && item2.season) {
    const commonSeasons = item1.season.filter((s) => item2.season!.includes(s));
    if (commonSeasons.length > 0) {
      score += 5 * commonSeasons.length;
      reasons.push('Season overlap');
    }
  }

  return {
    score: Math.min(100, score),
    reasons,
  };
};

/**
 * Detect potential duplicate items in wardrobe
 */
export const detectDuplicates = (
  items: ClothingItem[],
  similarityThreshold: number = 60
): DuplicateCandidate[] => {
  const duplicates: DuplicateCandidate[] = [];

  // Compare each item with every other item
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const { score, reasons } = calculateItemSimilarity(items[i], items[j]);

      if (score >= similarityThreshold) {
        duplicates.push({
          item1: items[i],
          item2: items[j],
          similarityScore: score,
          reasons,
        });
      }
    }
  }

  // Sort by similarity score (highest first)
  return duplicates.sort((a, b) => b.similarityScore - a.similarityScore);
};

/**
 * Get duplicate groups (items that are similar to multiple other items)
 */
export const getDuplicateGroups = (
  items: ClothingItem[],
  similarityThreshold: number = 60
): ClothingItem[][] => {
  const duplicates = detectDuplicates(items, similarityThreshold);
  const groups: ClothingItem[][] = [];
  const processed = new Set<string>();

  duplicates.forEach((dup) => {
    if (processed.has(dup.item1.id) || processed.has(dup.item2.id)) {
      return;
    }

    const group: ClothingItem[] = [dup.item1, dup.item2];
    processed.add(dup.item1.id);
    processed.add(dup.item2.id);

    // Find other items similar to items in this group
    duplicates.forEach((otherDup) => {
      if (
        (group.some((item) => item.id === otherDup.item1.id) &&
          !processed.has(otherDup.item2.id)) ||
        (group.some((item) => item.id === otherDup.item2.id) && !processed.has(otherDup.item1.id))
      ) {
        const newItem = group.some((item) => item.id === otherDup.item1.id)
          ? otherDup.item2
          : otherDup.item1;
        group.push(newItem);
        processed.add(newItem.id);
      }
    });

    groups.push(group);
  });

  return groups;
};
