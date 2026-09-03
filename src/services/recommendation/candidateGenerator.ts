import type { ClothingItem } from '../../types';
import { normalizeCategory } from '../outfitCategoryNormalize';
import { scoreItemForSlot, type ScoreContext } from '../outfitScoring';
import {
  CANONICAL_SLOTS,
  DEFAULT_CANDIDATE_LIMITS,
  type CandidateLimits,
  type CandidatePool,
  type RecommendationRequest,
} from './types';
import { occasionTagKeywords, buildStyleBoostTerms } from './styleTerms';

export function buildScoreContext(request: RecommendationRequest): ScoreContext {
  const occasionKey = request.occasion ?? 'Casual';
  return {
    occasionTagKeywords: occasionTagKeywords(occasionKey),
    styleBoostTerms: buildStyleBoostTerms(request),
    weather: request.weather,
    paletteId: request.paletteId,
    occasionKey,
  };
}

function groupByCategory(items: ClothingItem[]): Record<string, ClothingItem[]> {
  const grouped: Record<string, ClothingItem[]> = {};
  for (const item of items) {
    const category = normalizeCategory(item.category);
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push({ ...item, category });
  }
  return grouped;
}

function sortByPreliminaryScore(
  items: ClothingItem[],
  scores: Map<string, number>
): ClothingItem[] {
  return [...items].sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));
}

function ensureAnchors(
  selected: ClothingItem[],
  categoryItems: ClothingItem[],
  anchorIds: Set<string>
): ClothingItem[] {
  const selectedIds = new Set(selected.map((item) => item.id));
  const missingAnchors = categoryItems.filter(
    (item) => anchorIds.has(item.id) && !selectedIds.has(item.id)
  );
  if (missingAnchors.length === 0) return selected;
  return [...missingAnchors, ...selected.filter((item) => !anchorIds.has(item.id))];
}

function ensureColorDiversity(selected: ClothingItem[], pool: ClothingItem[]): ClothingItem[] {
  if (selected.length === 0) return selected;
  const colors = new Set(
    selected.flatMap((item) => (item.colors ?? []).map((c) => c.toLowerCase()))
  );
  if (colors.size >= 2) return selected;

  const selectedIds = new Set(selected.map((item) => item.id));
  const extra = pool.find((item) => {
    if (selectedIds.has(item.id)) return false;
    return (item.colors ?? []).some((color) => !colors.has(color.toLowerCase()));
  });
  if (!extra) return selected;

  const withoutLast = selected.slice(0, Math.max(0, selected.length - 1));
  return [...withoutLast, extra];
}

function selectTopK(
  categoryItems: ClothingItem[],
  limit: number,
  scores: Map<string, number>,
  anchorIds: Set<string>
): ClothingItem[] {
  if (categoryItems.length === 0) return [];
  const ranked = sortByPreliminaryScore(categoryItems, scores);
  const top = ranked.slice(0, Math.max(limit, 0));
  const withAnchors = ensureAnchors(top, categoryItems, anchorIds);
  const categoryAnchorCount = categoryItems.filter((item) => anchorIds.has(item.id)).length;
  const capped = withAnchors.slice(0, Math.max(limit, categoryAnchorCount));
  const diverse = ensureColorDiversity(capped, ranked);
  return ensureAnchors(diverse, categoryItems, anchorIds);
}

export function getCandidateItemsByCategory(
  pool: ClothingItem[],
  request: RecommendationRequest,
  limits: CandidateLimits = DEFAULT_CANDIDATE_LIMITS
): CandidatePool {
  const grouped = groupByCategory(pool);
  const scoreCtx = buildScoreContext(request);
  const anchorIds = new Set(request.mustIncludeItemIds ?? []);
  const preliminaryScores = new Map<string, number>();

  for (const item of pool) {
    preliminaryScores.set(item.id, scoreItemForSlot(item, scoreCtx, []));
  }

  const byCategory: Record<string, ClothingItem[]> = {};
  for (const slot of CANONICAL_SLOTS) {
    const items = grouped[slot] ?? [];
    byCategory[slot] = selectTopK(items, limits[slot], preliminaryScores, anchorIds);
  }

  for (const [category, items] of Object.entries(grouped)) {
    if (byCategory[category]) continue;
    byCategory[category] = items;
  }

  const totalCandidates = Object.values(byCategory).reduce((sum, list) => sum + list.length, 0);
  return { byCategory, preliminaryScores, totalCandidates };
}

export function mergeCandidateLimits(overrides?: Partial<CandidateLimits>): CandidateLimits {
  if (!overrides) return DEFAULT_CANDIDATE_LIMITS;
  return { ...DEFAULT_CANDIDATE_LIMITS, ...overrides };
}
