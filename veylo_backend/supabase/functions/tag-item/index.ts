// tag-item — classify a wardrobe photo and persist tags + embedding.
//
// Input:  { item_id: string, image_path?: string }
//   - item_id: row in public.clothing_items owned by the caller
//   - image_path: optional override; defaults to clothing_items.image_path
// Output: { ok: true, item: {...full row}, tags: VisionTagResult }
//
// Flow:
//   1. Verify caller's JWT
//   2. Load the row (RLS-scoped)
//   3. Sign a read URL for the image in `item-photos`
//   4. GPT-4o Vision → strict JSON tags
//   5. Update clothing_items with tags
//   6. text-embedding-3-small over a synthetic description → upsert embeddings
//   7. Log api_usage and return

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { tagGarment, createEmbedding } from '../_shared/openai.ts';
import { logUsage } from '../_shared/usage.ts';

interface TagItemPayload {
  item_id: string;
  image_path?: string;
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

  // KNOWN LIMITATION: No background removal step is applied before sending the
  // image to GPT-4o. The Virtual Try-On flat-lay feature (FS-10) therefore
  // composites raw photos rather than isolated garment PNGs, which degrades the
  // flat-lay result. To fix this properly, add a remove.bg API call (or an
  // OpenAI image-edit pass) here before tagging, store the cleaned PNG path
  // separately, and reference it in the try-on pipeline. Tracked as A5 in the
  // audit fix list.

  let tags;
  try {
    tags = await tagGarment(signed.signedUrl);
  } catch (err) {
    console.error('[tag-item] vision failed', err);
    await userClient
      .from('scan_queue')
      .update({ status: 'failed', error: String(err) })
      .eq('image_path', imagePath);
    return jsonResponse({ error: 'Vision API failed', detail: String(err) }, { status: 502 });
  }

  const description = [
    tags.category,
    tags.sub_category,
    tags.colors.join(' '),
    tags.material_guess,
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
      brand: tags.brand_guess ?? row.brand,
      season: tags.season,
      tags: tags.style_tags,
      formality_score: formalityScore,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.item_id)
    .select('*')
    .single();

  if (updateError || !updated) {
    return jsonResponse({ error: updateError?.message ?? 'Update failed' }, { status: 500 });
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
    if (embError) {
      console.error('[tag-item] embedding upsert failed', embError);
    }

    await logUsage(service, {
      user_id: user.id,
      function_name: 'tag-item',
      provider: 'openai',
      units: 1,
      cost_usd: 0.012,
      metadata: { confidence: tags.confidence, category: tags.category },
    });
  }

  return jsonResponse({ ok: true, item: updated, tags });
});

/**
 * Derives a formality score (1–4) from the AI-detected category and style tags.
 *
 * Scale:
 *   1 = Athletic / activewear
 *   2 = Casual / everyday
 *   3 = Smart casual / business casual
 *   4 = Formal / black-tie
 */
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
