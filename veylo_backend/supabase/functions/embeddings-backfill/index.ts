// embeddings-backfill — cron-only; embed items missing vectors.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireCronSecret } from '../_shared/internalAuth.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { createEmbedding } from '../_shared/openai.ts';
import { logUsage } from '../_shared/usage.ts';

const BATCH = 200;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const deny = requireCronSecret(req);
  if (deny) return deny;

  const service = getServiceClient();

  const { data: items, error: itemsError } = await service
    .from('clothing_items')
    .select('id, user_id, category, sub_category, tags, colors')
    .eq('status', 'active')
    .limit(800);

  if (itemsError || !items) {
    return jsonResponse({ error: itemsError?.message ?? 'load failed' }, { status: 500 });
  }

  const ids = items.map((i: { id: string }) => i.id);
  const { data: embeddedRows } = await service
    .from('embeddings')
    .select('entity_id')
    .eq('entity_type', 'item')
    .in('entity_id', ids);

  const embedded = new Set((embeddedRows ?? []).map((r: { entity_id: string }) => r.entity_id));

  const pending = items.filter((i: { id: string }) => !embedded.has(i.id)).slice(0, BATCH);

  let processed = 0;

  for (const row of pending as Array<{
    id: string;
    user_id: string;
    category: string;
    sub_category?: string | null;
    tags?: string[] | null;
    colors?: string[] | null;
  }>) {
    const text = [row.category, row.sub_category, ...(row.colors ?? []), ...(row.tags ?? [])]
      .filter(Boolean)
      .join(' ');

    if (!text.trim()) continue;

    try {
      const embedding = await createEmbedding(text);
      await service.from('embeddings').upsert(
        {
          user_id: row.user_id,
          entity_type: 'item',
          entity_id: row.id,
          embedding,
          metadata: { source: 'embeddings-backfill' },
        },
        { onConflict: 'user_id,entity_type,entity_id' }
      );
      processed += 1;
    } catch (e) {
      console.error('[embeddings-backfill]', row.id, e);
    }
  }

  await logUsage(service, {
    user_id: null,
    function_name: 'embeddings-backfill',
    provider: 'internal',
    units: processed,
    metadata: { batch: BATCH },
  });

  return jsonResponse({ ok: true, scanned: pending.length, embedded: processed });
});
