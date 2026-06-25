// tryon-generate — virtual try-on via Google Vertex AI virtual-try-on-001.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { logUsage } from '../_shared/usage.ts';
import { fetchImageAsBase64, firstPredictionBytes, vertexPredict } from '../_shared/vertex.ts';

interface Payload {
  user_image_path: string;
  user_image_bucket?: 'item-photos' | 'avatars' | 'tryon-results';
  garment_image_path: string;
  outfit_id?: string;
  session_id?: string;
}

const VTO_MODEL = 'virtual-try-on-001';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;
  const { user, userClient } = ctx;

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!payload.user_image_path || !payload.garment_image_path) {
    return jsonResponse(
      { error: 'user_image_path and garment_image_path are required' },
      { status: 400 }
    );
  }

  const userBucket = payload.user_image_bucket ?? 'item-photos';

  const [userSigned, garmentSigned] = await Promise.all([
    userClient.storage.from(userBucket).createSignedUrl(payload.user_image_path, 1800),
    userClient.storage.from('item-photos').createSignedUrl(payload.garment_image_path, 1800),
  ]);
  if (userSigned.error || !userSigned.data?.signedUrl) {
    return jsonResponse(
      { error: 'Cannot read user image', detail: userSigned.error?.message },
      { status: 400 }
    );
  }
  if (garmentSigned.error || !garmentSigned.data?.signedUrl) {
    return jsonResponse(
      { error: 'Cannot read garment image', detail: garmentSigned.error?.message },
      { status: 400 }
    );
  }

  let personB64: string;
  let productB64: string;
  try {
    [personB64, productB64] = await Promise.all([
      fetchImageAsBase64(userSigned.data.signedUrl),
      fetchImageAsBase64(garmentSigned.data.signedUrl),
    ]);
  } catch (err) {
    console.error('[tryon] image download failed', err);
    return jsonResponse(
      { error: 'Could not download input images', detail: String(err) },
      { status: 400 }
    );
  }

  let resultBytes: Uint8Array;
  let resultMime = 'image/png';
  try {
    const predictions = await vertexPredict(
      VTO_MODEL,
      [
        {
          personImage: {
            image: { bytesBase64Encoded: personB64 },
          },
          productImages: [
            {
              image: { bytesBase64Encoded: productB64 },
            },
          ],
        },
      ],
      { sampleCount: 1 }
    );
    const extracted = firstPredictionBytes(predictions);
    resultBytes = extracted.bytes;
    resultMime = extracted.mimeType;
  } catch (err) {
    console.error('[tryon] vertex predict failed', err);
    const service = getServiceClient();
    await service.from('try_on_history').insert({
      user_id: user.id,
      session_id: payload.session_id ?? null,
      outfit_id: payload.outfit_id ?? null,
      input_image_path: payload.user_image_path,
      result_image_path: null,
      items: [{ image_path: payload.garment_image_path }],
      replicate_prediction_id: null,
      status: 'failed',
      error: String(err),
    });
    return jsonResponse(
      { error: 'Try-on generation failed', detail: String(err) },
      { status: 502 }
    );
  }

  const service = getServiceClient();
  const ext = resultMime.includes('jpeg') || resultMime.includes('jpg') ? 'jpg' : 'png';
  const objectPath = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await service.storage
    .from('tryon-results')
    .upload(objectPath, resultBytes, {
      contentType: resultMime,
      upsert: false,
    });
  if (uploadError) {
    return jsonResponse(
      { error: 'Result upload failed', detail: uploadError.message },
      { status: 500 }
    );
  }

  const { data: record, error: insertError } = await service
    .from('try_on_history')
    .insert({
      user_id: user.id,
      session_id: payload.session_id ?? null,
      outfit_id: payload.outfit_id ?? null,
      input_image_path: payload.user_image_path,
      result_image_path: objectPath,
      items: [{ image_path: payload.garment_image_path }],
      replicate_prediction_id: null,
      status: 'succeeded',
    })
    .select('*')
    .single();

  if (insertError || !record) {
    return jsonResponse(
      { error: 'Failed to write try_on_history', detail: insertError?.message },
      { status: 500 }
    );
  }

  await logUsage(service, {
    user_id: user.id,
    function_name: 'tryon-generate',
    provider: 'google',
    units: 1,
    cost_usd: 0.04,
    metadata: { model: VTO_MODEL },
  });

  return jsonResponse({ ok: true, status: 'succeeded', record });
});
