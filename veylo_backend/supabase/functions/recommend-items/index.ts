// recommend-items — wardrobe-aware ranking via GPT + optional vector RPC.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { createEmbedding } from '../_shared/openai.ts';
import { chatCompletionJson } from '../_shared/gpt.ts';
import { enforceRateLimit } from '../_shared/rateLimit.ts';
import { logUsage } from '../_shared/usage.ts';
import { captureException } from '../_shared/sentry.ts';

type Context = 'feed' | 'gaps' | 'similar';

interface Payload {
  context?: Context;
  item_id?: string;
  occasion?: string;
  season?: string;
  limit?: number;
}

interface RankedRow {
  item_id: string;
  reason: string;
  score: number;
}

const RESPONSE_SCHEMA = {
  name: 'ItemRecommendations',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      items: {
        type: 'array',
        maxItems: 20,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            item_id: { type: 'string' },
            reason: { type: 'string' },
            score: { type: 'number' },
          },
          required: ['item_id', 'reason', 'score'],
        },
      },
    },
    required: ['items'],
  },
} as const;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;
  const { user, userClient } = ctx;

  const service = getServiceClient();
  const rl = await enforceRateLimit(service, `rec:${user.id}`, {
    windowSeconds: 60,
    maxRequests: 30,
  });
  if (!rl.ok) {
    return jsonResponse(
      { error: 'Rate limited', retry_after: rl.retryAfterSeconds },
      {
        status: 429,
      }
    );
  }

  let payload: Payload = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const context: Context = payload.context ?? 'feed';
  const limit = Math.min(Math.max(payload.limit ?? 8, 1), 20);

  const { data: items, error: itemsError } = await userClient
    .from('clothing_items')
    .select('id, category, sub_category, colors, tags, season, worn_count, last_worn')
    .eq('status', 'active');

  if (itemsError) {
    await captureException(itemsError, { fn: 'recommend-items' });
    return jsonResponse({ error: itemsError.message }, { status: 500 });
  }

  const rows = items ?? [];
  if (rows.length === 0) {
    return jsonResponse({ ok: true, items: [], reason: 'empty_wardrobe' });
  }

  let seedIds: string[] = rows.map((r: { id: string }) => r.id);

  if (context === 'similar' && payload.item_id) {
    try {
      const descParts = rows
        .filter((r: { id: string }) => r.id === payload.item_id)
        .map(
          (r: {
            category: string;
            sub_category?: string | null;
            colors?: string[] | null;
            tags?: string[] | null;
          }) =>
            [r.category, r.sub_category, ...(r.colors ?? []), ...(r.tags ?? [])]
              .filter(Boolean)
              .join(' ')
        );
      const desc = descParts[0] ?? 'wardrobe item';
      const embedding = await createEmbedding(desc);
      const { data: matches, error: rpcError } = await userClient.rpc('match_items', {
        query_embedding: embedding,
        match_count: limit * 2,
        similarity_threshold: 0.2,
      });
      if (!rpcError && Array.isArray(matches) && matches.length > 0) {
        seedIds = matches
          .map((m: { item_id: string }) => m.item_id)
          .filter((id: string) => id !== payload.item_id);
      }
    } catch (e) {
      console.error('[recommend-items] embedding branch', e);
    }
  }

  const catalog = rows
    .filter((r: { id: string }) => seedIds.includes(r.id))
    .slice(0, 40)
    .map(
      (r: {
        id: string;
        category: string;
        sub_category?: string | null;
        colors?: string[] | null;
        tags?: string[] | null;
        season?: string[] | null;
      }) =>
        `${r.id}: ${r.category}${r.sub_category ? ` (${r.sub_category})` : ''} colors=${(r.colors ?? []).join(',')} tags=${(r.tags ?? []).join(',')} seasons=${(r.season ?? []).join(',')}`
    )
    .join('\n');

  const system = `You rank wardrobe item IDs for a smart-closet app. Context=${context}. Only use item ids from the catalog lines. Return up to ${limit} items with short reasons and scores 0-100. Occasion hint: ${payload.occasion ?? 'any'}. Season hint: ${payload.season ?? 'any'}.`;

  try {
    const parsed = await chatCompletionJson<{ items: RankedRow[] }>(
      [
        { role: 'system', content: system },
        { role: 'user', content: `Catalog:\n${catalog}` },
      ],
      { model: 'gpt-4o-mini', jsonSchema: RESPONSE_SCHEMA }
    );

    const allowed = new Set(rows.map((r: { id: string }) => r.id));
    const filtered = (parsed.items ?? []).filter((x) => allowed.has(x.item_id)).slice(0, limit);

    await logUsage(service, {
      user_id: user.id,
      function_name: 'recommend-items',
      provider: 'openai',
      units: 1,
      cost_usd: 0.004,
      metadata: { context, count: filtered.length },
    });

    return jsonResponse({ ok: true, items: filtered });
  } catch (err) {
    await captureException(err, { fn: 'recommend-items', userId: user.id });
    return jsonResponse({ error: 'Recommendation failed', detail: String(err) }, { status: 502 });
  }
});
