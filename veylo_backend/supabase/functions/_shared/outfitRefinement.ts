/**
 * Gemini text pass — reorder/reject outfit candidates and write natural reasoning.
 */

import { fenceUntrustedData, sanitizeText } from './promptSafety.ts';
import { vertexGenerateContentText } from './vertex.ts';
import type { ScoringItem } from './outfitDimensionScoring.ts';

const REFINEMENT_MODEL = 'gemini-2.0-flash-001';
const REFINEMENT_TIMEOUT_MS = 8_000;

export interface OutfitCandidate {
  index: number;
  items: ScoringItem[];
  score: number;
  reasoning: string[];
}

export interface RefinedOutfit {
  index: number;
  keep: boolean;
  reasoning: string;
}

interface RefinementResponse {
  outfits: Array<{
    index: number;
    keep: boolean;
    reasoning: string;
  }>;
}

function summarizeItem(item: ScoringItem): Record<string, unknown> {
  return {
    category: item.category,
    sub_category: item.sub_category ?? null,
    colors: (item.colors ?? []).slice(0, 3),
    tags: (item.tags ?? []).slice(0, 6),
    occasion_tags: (item.occasion_tags ?? []).slice(0, 6),
    formality_score: item.formality_score ?? null,
    gender_affinity: item.gender_affinity ?? 'unisex',
  };
}

function buildPrompt(occasion: string, candidates: OutfitCandidate[]): string {
  const payload = {
    occasion,
    candidates: candidates.map((c) => ({
      index: c.index,
      score: c.score,
      items: c.items.map(summarizeItem),
    })),
  };

  return [
    'You are a fashion stylist reviewing outfit candidates from a personal wardrobe.',
    'For the given occasion, decide which outfits to keep and write ONE short, specific reasoning sentence per kept outfit.',
    'Reject outfits that mix conflicting formality, gender-coded pieces that clash, athletic shoes with formal wear, or otherwise feel wrong for the occasion.',
    'Reasoning must mention concrete pieces (e.g. colours, categories) — never generic lines like "includes pieces you have not worn recently".',
    'Respond ONLY with JSON matching: {"outfits":[{"index":0,"keep":true,"reasoning":"..."}]}',
    '',
    fenceUntrustedData('outfit_candidates', payload),
  ].join('\n');
}

function parseRefinement(raw: string): RefinementResponse | null {
  try {
    // Strip optional markdown fences
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const parsed = JSON.parse(cleaned) as RefinementResponse;
    if (!parsed || !Array.isArray(parsed.outfits)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: number | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('refinement timeout')), ms) as unknown as number;
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Ask Gemini to validate candidates and rewrite reasoning.
 * On failure returns null so the caller keeps algorithmic results + template reasoning.
 */
export async function refineOutfitCandidates(
  occasion: string,
  candidates: OutfitCandidate[]
): Promise<RefinedOutfit[] | null> {
  if (candidates.length === 0) return [];

  try {
    const raw = await withTimeout(
      vertexGenerateContentText(REFINEMENT_MODEL, buildPrompt(occasion, candidates), {
        temperature: 0.35,
        maxOutputTokens: 800,
      }),
      REFINEMENT_TIMEOUT_MS
    );
    const parsed = parseRefinement(raw);
    if (!parsed) return null;

    return parsed.outfits
      .filter((o) => typeof o.index === 'number')
      .map((o) => ({
        index: o.index,
        keep: o.keep !== false,
        reasoning: sanitizeText(o.reasoning ?? '', 180) || 'A cohesive look for this occasion.',
      }));
  } catch (err) {
    console.error('[outfitRefinement] failed (non-fatal)', err);
    return null;
  }
}

/**
 * Apply refinement: drop rejected outfits, replace reasoning on kept ones.
 * If refinement rejects everything, keep the original top candidate with template reasoning.
 */
export function applyRefinement<T extends OutfitCandidate>(
  candidates: T[],
  refined: RefinedOutfit[] | null
): T[] {
  if (!refined || refined.length === 0) return candidates;

  const byIndex = new Map(refined.map((r) => [r.index, r]));
  const kept: T[] = [];

  for (const candidate of candidates) {
    const decision = byIndex.get(candidate.index);
    if (!decision) {
      kept.push(candidate);
      continue;
    }
    if (!decision.keep) continue;
    kept.push({
      ...candidate,
      reasoning: [decision.reasoning],
    });
  }

  if (kept.length === 0 && candidates.length > 0) {
    return [candidates[0]];
  }
  return kept;
}
