// generate-outfit-ideas — server-side outfit suggestions (weighted 30/25/20/15/10 scorer).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import {
  buildOutfitReasoning,
  scoreItemComposite,
  scoreOutfitComposite,
  type ScoringItem,
  type WeatherInput,
} from '../_shared/outfitDimensionScoring.ts';

interface Payload {
  occasion?: string;
  season?: string;
  style_preferences?: string[];
  count?: number;
  persist?: boolean;
  weather?: WeatherInput;
  must_include_item_id?: string;
}

interface Item extends ScoringItem {
  season: string[];
}

const SLOT_ORDER = ['top', 'bottom', 'shoes', 'outerwear', 'accessory'] as const;
const DRESS_SLOTS = ['dress', 'shoes', 'outerwear', 'accessory'] as const;
type Slot = (typeof SLOT_ORDER)[number] | 'dress';

function canonicalSlot(category: string): Slot | null {
  const c = category.trim().toLowerCase();
  if (c.startsWith('top') || c.startsWith('shirt') || c === 'blouse' || c === 't-shirt')
    return 'top';
  if (c.startsWith('bottom') || c === 'pants' || c === 'jeans' || c === 'shorts' || c === 'skirt')
    return 'bottom';
  if (c === 'dress' || c === 'jumpsuit') return 'dress';
  if (c === 'shoes' || c === 'footwear' || c === 'sneakers') return 'shoes';
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

function pickOutfit(
  bySlot: Map<Slot, Item[]>,
  occasion: string | undefined,
  styleTerms: string[],
  alreadyUsed: Set<string>,
  preferDress: boolean,
  weather?: WeatherInput | null,
  mustInclude?: Item | null
): { picks: Item[]; score: number; reasoning: string[] } | null {
  const tryDress =
    (preferDress || (mustInclude != null && canonicalSlot(mustInclude.category) === 'dress')) &&
    ((bySlot.get('dress')?.length ?? 0) > 0 ||
      (mustInclude != null && canonicalSlot(mustInclude.category) === 'dress'));
  const order: readonly Slot[] = tryDress ? DRESS_SLOTS : SLOT_ORDER;
  const picks: Item[] = [];
  const forcedSlot = mustInclude ? canonicalSlot(mustInclude.category) : null;

  for (const slot of order) {
    if (mustInclude && forcedSlot === slot) {
      if (!alreadyUsed.has(mustInclude.id)) picks.push(mustInclude);
      continue;
    }
    const candidates = bySlot.get(slot) ?? [];
    if (candidates.length === 0) continue;

    let best: Item | null = null;
    let bestScore = -Infinity;
    for (const item of candidates) {
      if (alreadyUsed.has(item.id)) continue;
      if (mustInclude && item.id === mustInclude.id) continue;
      const s = scoreItemComposite(item, picks, styleTerms, weather, occasion);
      if (s > bestScore) {
        bestScore = s;
        best = item;
      }
    }
    if (best) picks.push(best);
  }

  if (mustInclude && !picks.some((p) => p.id === mustInclude.id)) {
    picks.push(mustInclude);
  }

  const slots = new Set(picks.map((p) => canonicalSlot(p.category)));
  const valid = slots.has('dress') || (slots.has('top') && slots.has('bottom'));
  if (!valid) return null;

  const score = scoreOutfitComposite(picks, styleTerms, weather, occasion);
  const reasoning = buildOutfitReasoning(picks, styleTerms, weather, occasion);
  return { picks, score, reasoning };
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;
  const { user, userClient } = ctx;

  let payload: Payload = {};
  if (req.headers.get('content-length') !== '0') {
    try {
      payload = await req.json();
    } catch {
      // empty body is fine
    }
  }

  const count = Math.min(Math.max(payload.count ?? 3, 1), 5);
  const occasion = payload.occasion;
  const styleTerms = styleTermSet(payload.style_preferences ?? []);
  const weather = payload.weather ?? null;
  const mustIncludeId = payload.must_include_item_id;

  let query = userClient
    .from('clothing_items')
    .select(
      'id, category, sub_category, colors, colors_hsl, tags, season, worn_count, last_worn, formality_score'
    )
    .eq('status', 'active');

  if (payload.season) {
    query = query.contains('season', [payload.season]);
  }

  const { data, error } = await query;
  if (error) {
    return jsonResponse({ error: error.message }, { status: 500 });
  }

  const items = (data ?? []) as Item[];
  if (items.length === 0) {
    return jsonResponse({ ok: true, outfits: [], reason: 'empty_wardrobe' });
  }

  const mustInclude = mustIncludeId
    ? (items.find((item) => item.id === mustIncludeId) ?? null)
    : null;
  if (mustIncludeId && !mustInclude) {
    return jsonResponse({ ok: true, outfits: [], reason: 'filters_too_strict' });
  }

  const bySlot = new Map<Slot, Item[]>();
  for (const item of items) {
    const slot = canonicalSlot(item.category);
    if (!slot) continue;
    if (!bySlot.has(slot)) bySlot.set(slot, []);
    bySlot.get(slot)!.push(item);
  }

  const preferDress = occasion === 'Formal' || occasion === 'Date Night' || occasion === 'Party';
  const usedIds = new Set<string>();
  const outfits: Array<{
    id?: string;
    name: string;
    occasion: string;
    items: Item[];
    style_match_score: number;
    fit_score: number;
    fit_reasoning: string[];
    used_relaxed_filters: boolean;
  }> = [];

  for (let i = 0; i < count; i++) {
    let result = pickOutfit(
      bySlot,
      occasion,
      styleTerms,
      usedIds,
      preferDress,
      weather,
      mustInclude
    );
    let relaxed = false;
    if (!result && occasion) {
      result = pickOutfit(
        bySlot,
        undefined,
        styleTerms,
        usedIds,
        preferDress,
        weather,
        mustInclude
      );
      relaxed = true;
    }
    if (!result) break;

    for (const item of result.picks) usedIds.add(item.id);

    outfits.push({
      name: occasion ?? 'Outfit',
      occasion: occasion ?? 'Casual',
      items: result.picks,
      style_match_score: Math.min(100, result.score),
      fit_score: Math.min(100, result.score),
      fit_reasoning: result.reasoning,
      used_relaxed_filters: relaxed,
    });
  }

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
      outfit.id = row.id;

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
