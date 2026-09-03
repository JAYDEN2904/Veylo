import type { ClothingItem } from '../../../types';
import {
  getOccasionProfile,
  isBannedForOccasion,
  scoreOccasionFit,
} from '../../../utils/occasionProfiles';
import { clothingItemToScoringInput } from '../../outfitDimensionScoring';

function toOccasionItem(item: ClothingItem) {
  const input = clothingItemToScoringInput(item);
  return {
    id: item.id,
    category: item.category,
    subCategory: item.subCategory,
    colors: item.colors,
    tags: item.tags,
    occasionTags: input.occasion_tags,
    formalityScore: input.formality_score,
    genderAffinity: input.gender_affinity,
  };
}

/**
 * Occasion is judged on the whole outfit. One matching piece cannot make
 * an otherwise banned or incoherent set excellent.
 */
export function scoreOutfitOccasion(items: ClothingItem[], occasion?: string): number {
  if (!occasion || items.length === 0) return 70;
  const profile = getOccasionProfile(occasion);
  if (!profile) return 70;

  const occasionItems = items.map(toOccasionItem);
  const scores = occasionItems.map((entry) => {
    if (isBannedForOccasion(entry, profile)) return 5;
    return scoreOccasionFit(entry, profile);
  });
  const bannedCount = scores.filter((score) => score <= 5).length;
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const weakest = Math.min(...scores);

  if (bannedCount > 0) {
    return Math.max(0, Math.min(20, Math.round(mean * 0.4 + weakest * 0.6)));
  }

  return Math.max(0, Math.min(100, Math.round(mean * 0.55 + weakest * 0.45)));
}
