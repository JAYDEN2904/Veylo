// embeddings-backfill — cron-only; embed items missing or stale vectors.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireCronSecret } from '../_shared/internalAuth.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { createEmbedding } from '../_shared/openai.ts';
import { logUsage } from '../_shared/usage.ts';
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  EMBEDDING_VERSION,
  buildEmbeddingInputText,
  fingerprintEmbeddingSource,
  isFiniteVector,
  sourceFieldsFromItemRow,
} from '../_shared/embeddingFingerprint.ts';

const BATCH = 200;

function isFreshMetadata(metadata: unknown, sourceHash: string): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const row = metadata as Record<string, unknown>;
  return (
    row.model === EMBEDDING_MODEL &&
    row.version === EMBEDDING_VERSION &&
    row.dimensions === EMBEDDING_DIMENSIONS &&
    row.sourceHash === sourceHash
  );
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const deny = requireCronSecret(req);
  if (deny) return deny;

  const service = getServiceClient();

  const { data: items, error: itemsError } = await service
    .from('clothing_items')
    .select(
      'id, user_id, category, sub_category, tags, colors, material, pattern, season, gender_affinity, occasion_tags, image_path'
    )
    .eq('status', 'active')
    .limit(800);

  if (itemsError || !items) {
    return jsonResponse({ error: itemsError?.message ?? 'load failed' }, { status: 500 });
  }

  const ids = items.map((item: { id: string }) => item.id);
  const { data: embeddedRows } = await service
    .from('embeddings')
    .select('entity_id, metadata')
    .eq('entity_type', 'item')
    .in('entity_id', ids);

  const byEntity = new Map(
    (embeddedRows ?? []).map((row: { entity_id: string; metadata: unknown }) => [
      row.entity_id,
      row.metadata,
    ])
  );

  const pending = items
    .filter((row: { id: string }) => {
      const fields = sourceFieldsFromItemRow(row);
      const sourceHash = fingerprintEmbeddingSource(fields);
      return !isFreshMetadata(byEntity.get(row.id), sourceHash);
    })
    .slice(0, BATCH);

  let processed = 0;

  for (const row of pending as Array<{
    id: string;
    user_id: string;
    category?: string | null;
    sub_category?: string | null;
    tags?: string[] | null;
    colors?: string[] | null;
    material?: string | null;
    pattern?: string | null;
    season?: string[] | null;
    gender_affinity?: string | null;
    occasion_tags?: string[] | null;
    image_path?: string | null;
  }>) {
    const fields = sourceFieldsFromItemRow(row);
    const text = buildEmbeddingInputText(fields);
    if (!text.trim()) continue;
    const sourceHash = fingerprintEmbeddingSource(fields);

    try {
      const embedding = await createEmbedding(text);
      if (!isFiniteVector(embedding, EMBEDDING_DIMENSIONS)) {
        console.error('[embeddings-backfill]', row.id, 'invalid vector');
        continue;
      }
      await service.from('embeddings').upsert(
        {
          user_id: row.user_id,
          entity_type: 'item',
          entity_id: row.id,
          embedding,
          metadata: {
            source: 'embeddings-backfill',
            model: EMBEDDING_MODEL,
            dimensions: embedding.length,
            version: EMBEDDING_VERSION,
            sourceHash,
            updatedAt: new Date().toISOString(),
          },
        },
        { onConflict: 'user_id,entity_type,entity_id' }
      );
      processed += 1;
    } catch (err) {
      console.error('[embeddings-backfill]', row.id, err);
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
