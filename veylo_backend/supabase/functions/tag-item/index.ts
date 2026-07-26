// tag-item — classify a wardrobe photo via Google Cloud Vision and persist tags + embedding.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { tagGarmentFromVision } from '../_shared/cloudVision.ts';
import { createEmbedding } from '../_shared/openai.ts';
import { logUsage } from '../_shared/usage.ts';

interface TagItemPayload {
  item_id: string;
  image_path?: string;
  scan_queue_id?: string;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;
  const { user, userClient } = ctx;

  let payload: TagItemPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!payload.item_id) {
    return jsonResponse({ error: 'item_id required' }, { status: 400 });
  }

  const { data: row, error: loadError } = await userClient
    .from('clothing_items')
    .select('*')
    .eq('id', payload.item_id)
    .maybeSingle();

  if (loadError || !row) {
    return jsonResponse({ error: loadError?.message ?? 'Item not found' }, { status: 404 });
  }

  const imagePath = payload.image_path ?? row.image_path;
  if (!imagePath) {
    return jsonResponse({ error: 'No image_path on item' }, { status: 400 });
  }

  const { data: signed, error: signedError } = await userClient.storage
    .from('item-photos')
    .createSignedUrl(imagePath, 600);

  if (signedError || !signed?.signedUrl) {
    return jsonResponse(
      { error: signedError?.message ?? 'Could not sign image URL' },
      { status: 500 }
    );
  }

  if (payload.scan_queue_id) {
    await userClient
      .from('scan_queue')
      .update({ status: 'processing', error: null })
      .eq('id', payload.scan_queue_id);
  }

  let tags;
  try {
    tags = await tagGarmentFromVision(signed.signedUrl);
  } catch (err) {
    console.error('[tag-item] Cloud Vision failed', err);
    if (payload.scan_queue_id) {
      await userClient
        .from('scan_queue')
        .update({ status: 'failed', error: String(err) })
        .eq('id', payload.scan_queue_id);
    } else {
      await userClient
        .from('scan_queue')
        .update({ status: 'failed', error: String(err) })
        .eq('image_path', imagePath);
    }
    return jsonResponse({ error: 'Vision API failed', detail: String(err) }, { status: 502 });
  }

  const description = [
    tags.category,
    tags.sub_category,
    tags.colors.join(' '),
    tags.material_guess,
    tags.pattern,
    tags.style_tags.join(' '),
  ]
    .filter(Boolean)
    .join(' ');

  let embedding: number[] | null = null;
  try {
    embedding = await createEmbedding(description);
  } catch (err) {
    console.error('[tag-item] embedding failed (non-fatal)', err);
  }

  const formalityScore = deriveFormalityScore(tags.category, tags.style_tags);

  const { data: updated, error: updateError } = await userClient
    .from('clothing_items')
    .update({
      category: tags.category,
      sub_category: tags.sub_category,
      colors: tags.colors,
      colors_hsl: tags.colors_hsl,
      brand: tags.brand_guess ?? row.brand,
      season: tags.season,
      tags: tags.style_tags,
      material: tags.material_guess,
      pattern: tags.pattern,
      formality_score: formalityScore,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.item_id)
    .select('*')
    .single();

  if (updateError || !updated) {
    return jsonResponse({ error: updateError?.message ?? 'Update failed' }, { status: 500 });
  }

  if (payload.scan_queue_id) {
    await userClient
      .from('scan_queue')
      .update({ status: 'done', error: null })
      .eq('id', payload.scan_queue_id);
  }

  if (embedding) {
    const service = getServiceClient();
    const { error: embError } = await service.from('embeddings').upsert(
      {
        user_id: user.id,
        entity_type: 'item',
        entity_id: payload.item_id,
        embedding,
        metadata: { description, confidence: tags.confidence },
      },
      { onConflict: 'user_id,entity_type,entity_id' }
    );
    if (embError) console.error('[tag-item] embedding upsert failed', embError);

    await logUsage(service, {
      user_id: user.id,
      function_name: 'tag-item',
      provider: 'google',
      units: 1,
      cost_usd: 0.0015,
      metadata: { confidence: tags.confidence, category: tags.category },
    });
  }

  return jsonResponse({ ok: true, item: updated, tags });
});

function deriveFormalityScore(category: string, styleTags: string[]): number {
  const tagBlob = [category, ...styleTags].join(' ').toLowerCase();
  const athleticTokens = [
    'sport',
    'athletic',
    'gym',
    'workout',
    'running',
    'training',
    'active',
    'yoga',
    'activewear',
  ];
  const formalTokens = [
    'formal',
    'suit',
    'tuxedo',
    'gown',
    'black-tie',
    'black tie',
    'evening wear',
    'elegant',
    'dressy',
  ];
  const smartCasualTokens = [
    'blazer',
    'chino',
    'smart',
    'business',
    'professional',
    'office',
    'work',
    'polo',
  ];

  if (athleticTokens.some((t) => tagBlob.includes(t))) return 1;
  if (formalTokens.some((t) => tagBlob.includes(t))) return 4;
  if (smartCasualTokens.some((t) => tagBlob.includes(t))) return 3;
  return 2;
}
