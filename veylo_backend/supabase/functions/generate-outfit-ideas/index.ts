// generate-outfit-ideas — occasion-aware hybrid scorer + optional Gemini refinement.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { guardEndpoint } from '../_shared/endpointGuard.ts';
import {
  buildOutfitReasoning,
  scoreItemComposite,
  scoreOutfitComposite,
  type ScoringItem,
  type WeatherInput,
} from '../_shared/outfitDimensionScoring.ts';
import {
  filterItemsForOccasion,
  getOccasionProfile,
  normalizeOccasionKey,
  type OccasionKey,
} from '../_shared/occasionProfiles.ts';
import type { GenderAffinity } from '../_shared/itemMetadata.ts';
import {
  applyRefinement,
  refineOutfitCandidates,
  type OutfitCandidate,
} from '../_shared/outfitRefinement.ts';

interface Payload {
  occasion?: string;
  season?: string;
  style_preferences?: string[];
  count?: number;
  persist?: boolean;
  weather?: WeatherInput;
  must_include_item_id?: string;
  must_include_item_ids?: string[];
}

interface Item extends ScoringItem {
  season: string[];
  gender_affinity?: GenderAffinity | null;
  occasion_tags?: string[] | null;
}

const SLOT_ORDER = ['top', 'bottom', 'shoes', 'outerwear', 'accessory'] as const;
const DRESS_SLOTS = ['dress', 'shoes', 'outerwear', 'accessory'] as const;
type Slot = (typeof SLOT_ORDER)[number] | 'dress';

/** Sample among the top-N scored candidates so regenerates / pill switches feel distinct. */
const TOP_K_SAMPLE = 3;

function canonicalSlot(category: string): Slot | null {
  const c = category.trim().toLowerCase();
  if (c.startsWith('top') || c.startsWith('shirt') || c === 'blouse' || c === 't-shirt')
    return 'top';
  if (c.startsWith('bottom') || c === 'pants' || c === 'jeans' || c === 'shorts' || c === 'skirt')
    return 'bottom';
  if (c === 'dress' || c === 'jumpsuit' || c === 'dresses') return 'dress';
  if (
    c === 'shoes' ||
    c === 'footwear' ||
    c === 'sneakers' ||
    c.includes('shoe') ||
    c.includes('boot') ||
    c.includes('sneaker')
  ) {
    return 'shoes';
  }
  if (c === 'outerwear' || c === 'jacket' || c === 'coat') return 'outerwear';
  if (c === 'accessory' || c === 'accessories' || c === 'bag' || c === 'hat') return 'accessory';
  return null;
}

function styleTermSet(prefs: string[]): string[] {
  const map: Record<string, string[]> = {
    minimalist: ['minimal', 'clean', 'simple'],
    casual: ['casual', 'relaxed', 'comfort'],
    formal: ['formal', 'tailored', 'dressy'],
    streetwear: ['street', 'urban'],
    bohemian: ['boho', 'flowy'],
    vintage: ['vintage', 'retro'],
  };
  const out = new Set<string>();
  for (const pref of prefs) {
    const terms = map[pref.toLowerCase()] ?? [pref.toLowerCase()];
    for (const t of terms) out.add(t);
  }
  return [...out];
}

function pickFromTopK(scored: Array<{ item: Item; score: number }>, k: number): Item | null {
  if (scored.length === 0) return null;
  const pool = scored.slice(0, Math.min(k, scored.length));
  const index = Math.floor(Math.random() * pool.length);
  return pool[index].item;
}

function pickOutfit(
  bySlot: Map<Slot, Item[]>,
  occasion: OccasionKey | undefined,
  styleTerms: string[],
  alreadyUsed: Set<string>,
  preferDress: boolean,
  weather?: WeatherInput | null,
  mustIncludeItems: Item[] = []
): { picks: Item[]; score: number; reasoning: string[] } | null {
  const anchors = mustIncludeItems.filter((item) => !alreadyUsed.has(item.id));
  const anchorIsDress = anchors.some((item) => canonicalSlot(item.category) === 'dress');
  const tryDress =
    (preferDress || anchorIsDress) && ((bySlot.get('dress')?.length ?? 0) > 0 || anchorIsDress);
  const order: readonly Slot[] = tryDress ? DRESS_SLOTS : SLOT_ORDER;
  const picks: Item[] = [];
  const pickedIds = new Set<string>();

  for (const anchor of anchors) {
    if (!pickedIds.has(anchor.id)) {
      picks.push(anchor);
      pickedIds.add(anchor.id);
    }
  }

  for (const slot of order) {
    const hasInSlot = picks.some((item) => canonicalSlot(item.category) === slot);
    if (hasInSlot) continue;

    const candidates = bySlot.get(slot) ?? [];
    if (candidates.length === 0) continue;

    const scored: Array<{ item: Item; score: number }> = [];
    for (const item of candidates) {
      if (alreadyUsed.has(item.id) || pickedIds.has(item.id)) continue;
      const s = scoreItemComposite(item, picks, styleTerms, weather, occasion);
      scored.push({ item, score: s });
    }
    scored.sort((a, b) => b.score - a.score);

    const best = pickFromTopK(scored, TOP_K_SAMPLE);
    if (best) {
      picks.push(best);
      pickedIds.add(best.id);
    }
  }

  for (const anchor of anchors) {
    if (!picks.some((p) => p.id === anchor.id)) {
      picks.push(anchor);
    }
  }

  const slots = new Set(picks.map((p) => canonicalSlot(p.category)));
  const valid = slots.has('dress') || (slots.has('top') && slots.has('bottom'));
  if (!valid) return null;

  const score = scoreOutfitComposite(picks, styleTerms, weather, occasion);
  const reasoning = buildOutfitReasoning(picks, styleTerms, weather, occasion);
  return { picks, score, reasoning };
}

function buildSlotMap(items: Item[]): Map<Slot, Item[]> {
  const bySlot = new Map<Slot, Item[]>();
  for (const item of items) {
    const slot = canonicalSlot(item.category);
    if (!slot) continue;
    if (!bySlot.has(slot)) bySlot.set(slot, []);
    bySlot.get(slot)!.push(item);
  }
  return bySlot;
}

function wardrobeCanFormOutfit(bySlot: Map<Slot, Item[]>): boolean {
  const hasTop = (bySlot.get('top')?.length ?? 0) > 0;
  const hasBottom = (bySlot.get('bottom')?.length ?? 0) > 0;
  const hasDress = (bySlot.get('dress')?.length ?? 0) > 0;
  return hasDress || (hasTop && hasBottom);
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;
  const { user, userClient } = ctx;

  const blocked = await guardEndpoint(req, getServiceClient(), {
    functionName: 'generate-outfit-ideas',
    userId: user.id,
    tier: 'light',
  });
  if (blocked) return blocked;

  let payload: Payload = {};
  if (req.headers.get('content-length') !== '0') {
    try {
      payload = await req.json();
    } catch {
      // empty body is fine
    }
  }

  const count = Math.min(Math.max(payload.count ?? 3, 1), 5);
  const occasion = normalizeOccasionKey(payload.occasion);
  const profile = occasion ? getOccasionProfile(occasion) : null;
  const styleTerms = styleTermSet(payload.style_preferences ?? []);
  const weather = payload.weather ?? null;
  const mustIncludeIds = [
    ...(payload.must_include_item_ids ?? []),
    ...(payload.must_include_item_id ? [payload.must_include_item_id] : []),
  ].filter((id, index, self) => self.indexOf(id) === index);

  let query = userClient
    .from('clothing_items')
    .select(
      'id, category, sub_category, colors, colors_hsl, tags, season, worn_count, last_worn, formality_score, gender_affinity, occasion_tags'
    )
    .eq('status', 'active');

  if (payload.season) {
    query = query.contains('season', [payload.season.trim().toLowerCase()]);
  }

  const { data, error } = await query;
  if (error) {
    return jsonResponse({ error: error.message }, { status: 500 });
  }

  const allItems = (data ?? []) as Item[];
  if (allItems.length === 0) {
    return jsonResponse({ ok: true, outfits: [], reason: 'empty_wardrobe' });
  }

  const mustIncludeItems = mustIncludeIds
    .map((id) => allItems.find((item) => item.id === id) ?? null)
    .filter((item): item is Item => item != null);
  if (mustIncludeIds.length > 0 && mustIncludeItems.length !== mustIncludeIds.length) {
    return jsonResponse({ ok: true, outfits: [], reason: 'filters_too_strict' });
  }

  // Hard occasion filter first; relax if wardrobe cannot form an outfit.
  let workingItems = allItems;
  let usedRelaxedFilters = false;
  if (profile && mustIncludeItems.length === 0) {
    const filtered = filterItemsForOccasion(allItems, profile, { hardBan: true });
    if (wardrobeCanFormOutfit(buildSlotMap(filtered))) {
      workingItems = filtered;
    } else {
      usedRelaxedFilters = true;
      workingItems = allItems;
    }
  }

  const bySlot = buildSlotMap(workingItems);
  if (!wardrobeCanFormOutfit(bySlot)) {
    return jsonResponse({
      ok: true,
      outfits: [],
      reason: 'insufficient_categories',
      message:
        'You need at least a top and a bottom (or a dress) in your wardrobe to build an outfit.',
    });
  }

  const preferDress = mustIncludeItems.length === 0 && (profile?.preferDress ?? false);
  const usedIds = new Set<string>();
  const candidates: OutfitCandidate[] = [];

  // Generate extra candidates so refinement can drop weak ones.
  const generateCount = Math.min(count + 2, 6);
  for (let i = 0; i < generateCount; i++) {
    let result: ReturnType<typeof pickOutfit> = null;
    let relaxed = usedRelaxedFilters;
    try {
      result = pickOutfit(
        bySlot,
        occasion,
        styleTerms,
        usedIds,
        preferDress,
        weather,
        mustIncludeItems
      );
      if (!result && occasion && mustIncludeItems.length === 0) {
        result = pickOutfit(
          bySlot,
          undefined,
          styleTerms,
          usedIds,
          preferDress,
          weather,
          mustIncludeItems
        );
        relaxed = true;
      }
    } catch (err) {
      console.error('[generate-outfit-ideas] pickOutfit failed', err);
      result = null;
    }
    if (!result) break;

    for (const item of result.picks) usedIds.add(item.id);
    candidates.push({
      index: candidates.length,
      items: result.picks,
      score: result.score,
      reasoning: result.reasoning,
    });
    if (relaxed) usedRelaxedFilters = true;
  }

  // Last resort: forced simple pairing
  if (candidates.length === 0) {
    const dress = bySlot.get('dress')?.[0];
    const top = bySlot.get('top')?.[0];
    const bottom = bySlot.get('bottom')?.[0];
    const anchorPicks =
      mustIncludeItems.length > 0
        ? mustIncludeItems
        : dress != null
          ? [dress]
          : top != null && bottom != null
            ? [top, bottom]
            : [];
    const anchorSlots = new Set(anchorPicks.map((item) => canonicalSlot(item.category)));
    const validAnchorOutfit =
      anchorSlots.has('dress') || (anchorSlots.has('top') && anchorSlots.has('bottom'));
    if (anchorPicks.length > 0 && validAnchorOutfit) {
      candidates.push({
        index: 0,
        items: anchorPicks,
        score: 65,
        reasoning: buildOutfitReasoning(anchorPicks, styleTerms, weather, occasion),
      });
      usedRelaxedFilters = true;
    }
  }

  let refined = candidates;
  if (candidates.length > 0 && occasion) {
    const decisions = await refineOutfitCandidates(occasion, candidates);
    refined = applyRefinement(candidates, decisions);
  }

  const outfits = refined.slice(0, count).map((c) => ({
    name: occasion ?? 'Outfit',
    occasion: occasion ?? 'Casual',
    items: c.items as Item[],
    style_match_score: Math.min(100, c.score),
    fit_score: Math.min(100, c.score),
    fit_reasoning: c.reasoning,
    used_relaxed_filters: usedRelaxedFilters,
  }));

  if (payload.persist && outfits.length > 0) {
    for (const outfit of outfits) {
      const { data: row, error: insertError } = await userClient
        .from('outfits')
        .insert({
          user_id: user.id,
          name: outfit.name,
          occasion: outfit.occasion,
          tags: [outfit.occasion.toLowerCase()],
          style_match_score: outfit.style_match_score,
          fit_score: outfit.fit_score,
        })
        .select('id')
        .single();

      if (insertError || !row) {
        console.error('[generate-outfit-ideas] insert failed', insertError);
        continue;
      }
      (outfit as { id?: string }).id = row.id;

      const itemRows = outfit.items.map((item, position) => ({
        outfit_id: row.id,
        item_id: item.id,
        position,
      }));
      const { error: linkError } = await userClient.from('outfit_items').insert(itemRows);
      if (linkError) console.error('[generate-outfit-ideas] link failed', linkError);
    }
  }

  return jsonResponse({ ok: true, outfits });
});
