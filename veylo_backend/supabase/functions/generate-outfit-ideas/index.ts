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
  must_include_item_ids?: string[];
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
  if (c === 'dress' || c === 'jumpsuit' || c === 'dresses') return 'dress';
  if (c === 'shoes' || c === 'footwear' || c === 'sneakers') return 'shoes';
  if (c === 'outerwear' || c === 'jacket' || c === 'coat') return 'outerwear';
  if (c === 'accessory' || c === 'accessories' || c === 'bag' || c === 'hat') return 'accessory';
  return null;
}

function normalizeOccasion(raw?: string): string | undefined {
  if (!raw) return undefined;
  const key = raw.trim().toLowerCase();
  const map: Record<string, string> = {
    casual: 'Casual',
    work: 'Work',
    formal: 'Formal',
    exercise: 'Exercise',
    sport: 'Exercise',
    date: 'Date Night',
    'date night': 'Date Night',
    party: 'Party',
    evening: 'Party',
  };
  return map[key] ?? raw;
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

    let best: Item | null = null;
    let bestScore = -Infinity;
    for (const item of candidates) {
      if (alreadyUsed.has(item.id) || pickedIds.has(item.id)) continue;
      const s = scoreItemComposite(item, picks, styleTerms, weather, occasion);
      if (s > bestScore) {
        bestScore = s;
        best = item;
      }
    }
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
  const occasion = normalizeOccasion(payload.occasion);
  const styleTerms = styleTermSet(payload.style_preferences ?? []);
  const weather = payload.weather ?? null;
  const mustIncludeIds = [
    ...(payload.must_include_item_ids ?? []),
    ...(payload.must_include_item_id ? [payload.must_include_item_id] : []),
  ].filter((id, index, self) => self.indexOf(id) === index);

  let query = userClient
    .from('clothing_items')
    .select(
      'id, category, sub_category, colors, colors_hsl, tags, season, worn_count, last_worn, formality_score'
    )
    .eq('status', 'active');

  if (payload.season) {
    // Season values are stored lowercase from Vision (summer, fall, …).
    query = query.contains('season', [payload.season.trim().toLowerCase()]);
  }

  const { data, error } = await query;
  if (error) {
    return jsonResponse({ error: error.message }, { status: 500 });
  }

  const items = (data ?? []) as Item[];
  if (items.length === 0) {
    return jsonResponse({ ok: true, outfits: [], reason: 'empty_wardrobe' });
  }

  const mustIncludeItems = mustIncludeIds
    .map((id) => items.find((item) => item.id === id) ?? null)
    .filter((item): item is Item => item != null);
  if (mustIncludeIds.length > 0 && mustIncludeItems.length !== mustIncludeIds.length) {
    return jsonResponse({ ok: true, outfits: [], reason: 'filters_too_strict' });
  }

  const bySlot = new Map<Slot, Item[]>();
  for (const item of items) {
    const slot = canonicalSlot(item.category);
    if (!slot) continue;
    if (!bySlot.has(slot)) bySlot.set(slot, []);
    bySlot.get(slot)!.push(item);
  }

  const hasTop = (bySlot.get('top')?.length ?? 0) > 0;
  const hasBottom = (bySlot.get('bottom')?.length ?? 0) > 0;
  const hasDress = (bySlot.get('dress')?.length ?? 0) > 0;
  if (!hasDress && !(hasTop && hasBottom)) {
    return jsonResponse({
      ok: true,
      outfits: [],
      reason: 'insufficient_categories',
      message:
        'You need at least a top and a bottom (or a dress) in your wardrobe to build an outfit.',
    });
  }

  const preferDress =
    mustIncludeItems.length === 0 &&
    (occasion === 'Formal' || occasion === 'Date Night' || occasion === 'Party');
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
    let result: ReturnType<typeof pickOutfit> = null;
    let relaxed = false;
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

  // Last resort: with a top+bottom (or dress) wardrobe, always return one outfit.
  if (outfits.length === 0) {
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
      console.log('[generate-outfit-ideas] using forced fallback outfit', {
        itemCount: items.length,
        slots: [...bySlot.keys()],
      });
      outfits.push({
        name: occasion ?? 'Outfit',
        occasion: occasion ?? 'Casual',
        items: anchorPicks,
        style_match_score: 65,
        fit_score: 65,
        fit_reasoning: ['A simple pairing from your wardrobe.'],
        used_relaxed_filters: true,
      });
    }
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
