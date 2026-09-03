import type { RecommendationRequest } from './types';

export const OCCASION_TAG_KEYWORDS: Record<string, string[]> = {
  Work: ['work', 'business', 'professional', 'office'],
  Casual: ['casual', 'everyday', 'weekend', 'comfort'],
  Formal: ['formal', 'elegant', 'dressy', 'event', 'wedding'],
  Exercise: ['sport', 'workout', 'athletic', 'gym', 'active'],
  'Date Night': ['date', 'night', 'romantic', 'evening'],
  Party: ['party', 'evening', 'night', 'celebration', 'cocktail'],
};

const STYLE_PREF_TERMS: Record<string, string[]> = {
  minimalist: ['minimal', 'minimalist', 'clean'],
  casual: ['casual', 'relaxed', 'comfort'],
  formal: ['formal', 'tailored', 'dressy'],
  streetwear: ['street', 'urban', 'streetwear'],
  bohemian: ['boho', 'bohemian', 'flowy'],
  vintage: ['vintage', 'retro'],
};

const FLOW_STYLE_TERMS: Record<string, string[]> = {
  minimal: ['minimal', 'minimalist', 'clean'],
  classic: ['classic', 'tailored', 'timeless'],
  trendy: ['trendy', 'modern', 'streetwear'],
  bold: ['bold', 'statement'],
  relaxed: ['relaxed', 'casual', 'comfort'],
  elegant: ['elegant', 'refined', 'dressy'],
};

export function buildStyleBoostTerms(request: RecommendationRequest): string[] {
  const terms = new Set<string>();
  (request.stylePreferences ?? []).forEach((pref) => {
    (STYLE_PREF_TERMS[pref] ?? [pref]).forEach((term) => terms.add(term.toLowerCase()));
  });
  (request.styleIds ?? []).forEach((id) => {
    (FLOW_STYLE_TERMS[id] ?? []).forEach((term) => terms.add(term.toLowerCase()));
  });
  return [...terms];
}

export function occasionTagKeywords(occasionKey?: string): string[] {
  if (!occasionKey) return OCCASION_TAG_KEYWORDS.Casual;
  return OCCASION_TAG_KEYWORDS[occasionKey] ?? OCCASION_TAG_KEYWORDS.Casual;
}
