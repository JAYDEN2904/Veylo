/**
 * Shared vocabulary for outfit generation and recommendations.
 * Keep in sync with occasion/style pickers in outfit flows.
 */
export const OUTFIT_OCCASION_IDS = ['casual', 'work', 'date', 'party', 'sport', 'formal'] as const;

export type OutfitOccasionId = (typeof OUTFIT_OCCASION_IDS)[number];

export const OUTFIT_STYLE_MOOD_IDS = [
  'minimal',
  'classic',
  'trendy',
  'bold',
  'relaxed',
  'elegant',
] as const;

export type OutfitStyleMoodId = (typeof OUTFIT_STYLE_MOOD_IDS)[number];
