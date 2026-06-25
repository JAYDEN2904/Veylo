// generate-outfit-ideas — server-side outfit suggestions.
//
// Input:
//   {
//     occasion?: 'Casual' | 'Work' | 'Formal' | 'Exercise' | 'Date Night' | 'Party',
//     season?: 'spring' | 'summer' | 'fall' | 'winter',
//     style_preferences?: string[],     // e.g. ['minimalist', 'streetwear']
//     count?: number,                   // how many distinct outfits to return (1-5)
//     persist?: boolean                 // if true, insert outfits + outfit_items rows
//   }
// Output:
//   { ok: true, outfits: Array<{ id?, name, occasion, items[], style_match_score, fit_score, used_relaxed_filters }> }
//
// Strategy (simplified port of src/services/outfitGenerationService.ts):
//   1. Pull active items via RLS (so we never leak across users).
//   2. Apply season + occasion-tag filters.
//   3. Bucket by canonical slot (top, bottom, dress, shoes, outerwear, accessory).
//   4. For each requested outfit, pick best-scored item per slot (excluding ones already used in earlier outfits to ensure variety).
//   5. Score = style match (tags overlap user prefs) + occasion match + recency penalty.
//   6. If persist=true, write rows so the frontend can refetch.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';

interface Payload {
  occasion?: string;
  season?: string;
  style_preferences?: string[];
  count?: number;
  persist?: boolean;
}

interface Item {
  id: string;
  category: string;
  sub_category: string | null;
  colors: string[];
  tags: string[];
  season: string[];
  worn_count: number;
  last_worn: string | null;
}

const OCCASION_KEYWORDS: Record<string, string[]> = {
  Work: ['work', 'business', 'professional', 'office'],
  Casual: ['casual', 'everyday', 'weekend', 'comfort'],
  Formal: ['formal', 'elegant', 'dressy', 'event', 'wedding'],
  Exercise: ['sport', 'workout', 'athletic', 'gym', 'active'],
  'Date Night': ['date', 'night', 'romantic', 'evening'],
  Party: ['party', 'evening', 'night', 'celebration', 'cocktail'],
};

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

function scoreItem(
  item: Item,
  occasion: string | undefined,
  styleTerms: Set<string>,
  alreadyUsedIds: Set<string>
): number {
  let score = 50;
  if (alreadyUsedIds.has(item.id)) score -= 30;

  const tagsLower = item.tags.map((t) => t.toLowerCase());
  if (occasion) {
    const kws = OCCASION_KEYWORDS[occasion] ?? [];
    if (tagsLower.some((t) => kws.some((kw) => t.includes(kw)))) score += 25;
  }

  for (const tag of tagsLower) {
    for (const term of styleTerms) {
      if (tag.includes(term)) {
        score += 8;
        break;
      }
    }
  }

  if (item.last_worn) {
    const days = (Date.now() - new Date(item.last_worn).getTime()) / 86_400_000;
    if (days < 3) score -= 15;
    else if (days > 30) score += 5;
  }

  if ((item.worn_count ?? 0) > 20) score -= 5;

  return score;
}

function pickOutfit(
  bySlot: Map<Slot, Item[]>,
  occasion: string | undefined,
  styleTerms: Set<string>,
  alreadyUsed: Set<string>,
  preferDress: boolean
): { picks: Item[]; score: number } | null {
  const tryDress = preferDress && (bySlot.get('dress')?.length ?? 0) > 0;

  const order: readonly Slot[] = tryDress ? DRESS_SLOTS : SLOT_ORDER;
  const picks: Item[] = [];
  let totalScore = 0;
  let scored = 0;

  for (const slot of order) {
    const candidates = bySlot.get(slot) ?? [];
    if (candidates.length === 0) continue;

    let best: Item | null = null;
    let bestScore = -Infinity;
    for (const item of candidates) {
      const s = scoreItem(item, occasion, styleTerms, alreadyUsed);
      if (s > bestScore) {
        bestScore = s;
        best = item;
      }
    }
    if (best) {
      picks.push(best);
      totalScore += bestScore;
      scored += 1;
    }
  }

  const slots = new Set(picks.map((p) => canonicalSlot(p.category)));
  const valid = slots.has('dress') || (slots.has('top') && slots.has('bottom'));
  if (!valid) return null;

  return {
    picks,
    score: scored > 0 ? Math.round(totalScore / scored) : 0,
  };
}

function styleTermSet(prefs: string[]): Set<string> {
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
  return out;
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

  let query = userClient
    .from('clothing_items')
    .select('id, category, sub_category, colors, tags, season, worn_count, last_worn')
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
    return jsonResponse({
      ok: true,
      outfits: [],
      reason: 'empty_wardrobe',
    });
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
    used_relaxed_filters: boolean;
  }> = [];

  for (let i = 0; i < count; i++) {
    let result = pickOutfit(bySlot, occasion, styleTerms, usedIds, preferDress);
    let relaxed = false;
    if (!result && occasion) {
      result = pickOutfit(bySlot, undefined, styleTerms, usedIds, preferDress);
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
      if (linkError) {
        console.error('[generate-outfit-ideas] link failed', linkError);
      }
    }
  }

  return jsonResponse({ ok: true, outfits });
});
