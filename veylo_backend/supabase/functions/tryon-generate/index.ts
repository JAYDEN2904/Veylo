// tryon-generate — virtual try-on via Google VTO, or accessory composite via Gemini image edit.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { logUsage } from '../_shared/usage.ts';
import { guardEndpoint } from '../_shared/endpointGuard.ts';
import {
  fetchImage,
  fetchImageAsBase64,
  firstPredictionBytes,
  vertexGenerateContentImage,
  vertexPredict,
} from '../_shared/vertex.ts';

interface Payload {
  user_image_path: string;
  user_image_bucket?: 'item-photos' | 'avatars' | 'tryon-results';
  garment_image_path: string;
  outfit_id?: string;
  session_id?: string;
  mode?: 'clothing' | 'accessory';
}

const VTO_MODEL = 'virtual-try-on-001';
const ACCESSORY_MODEL = 'gemini-2.5-flash-image';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Local outfit ids (`outfit-1736…`) are not Postgres UUIDs — drop them so history insert can succeed. */
function asUuidOrNull(value: string | undefined | null): string | null {
  if (!value) return null;
  return UUID_RE.test(value) ? value : null;
}

function buildAccessoryPrompt(): string {
  return (
    `You are given two images: (1) a full-body photo of a person already wearing an outfit, ` +
    `and (2) a product photo of an accessory (bag, hat, scarf, belt, jewelry, etc.). ` +
    `Edit image 1 so the person is naturally carrying or wearing the accessory from image 2. ` +
    `Keep the person's face, body, pose, lighting, and existing clothing unchanged. ` +
    `Place the accessory realistically (e.g. handbag on a shoulder or in hand, hat on head). ` +
    `Output one photorealistic full-body image only — no collage, text, or watermark.`
  );
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;
  const { user, userClient } = ctx;

  const service = getServiceClient();
  const blocked = await guardEndpoint(req, service, {
    functionName: 'tryon-generate',
    userId: user.id,
    tier: 'strict',
  });
  if (blocked) return blocked;

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

  const mode = payload.mode === 'accessory' ? 'accessory' : 'clothing';
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

  let resultBytes: Uint8Array;
  let resultMime = 'image/png';
  let modelUsed = VTO_MODEL;
  let costUsd = 0.04;

  try {
    if (mode === 'accessory') {
      modelUsed = ACCESSORY_MODEL;
      costUsd = 0.02;
      const [personImage, accessoryImage] = await Promise.all([
        fetchImage(userSigned.data.signedUrl),
        fetchImage(garmentSigned.data.signedUrl),
      ]);
      const generated = await vertexGenerateContentImage(ACCESSORY_MODEL, {
        prompt: buildAccessoryPrompt(),
        imageBase64: personImage.base64,
        mimeType: personImage.mimeType,
        aspectRatio: '3:4',
        extraImages: [{ base64: accessoryImage.base64, mimeType: accessoryImage.mimeType }],
      });
      resultBytes = generated.bytes;
      resultMime = generated.mimeType;
    } else {
      const [personB64, productB64] = await Promise.all([
        fetchImageAsBase64(userSigned.data.signedUrl),
        fetchImageAsBase64(garmentSigned.data.signedUrl),
      ]);
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
    }
  } catch (err) {
    console.error('[tryon] generation failed', err);
    await service.from('try_on_history').insert({
      user_id: user.id,
      session_id: payload.session_id ?? null,
      outfit_id: asUuidOrNull(payload.outfit_id),
      input_image_path: payload.user_image_path,
      result_image_path: null,
      items: [{ image_path: payload.garment_image_path, mode }],
      replicate_prediction_id: null,
      status: 'failed',
      error: String(err),
    });
    return jsonResponse(
      { error: 'Try-on generation failed', detail: String(err) },
      { status: 502 }
    );
  }

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
      outfit_id: asUuidOrNull(payload.outfit_id),
      input_image_path: payload.user_image_path,
      result_image_path: objectPath,
      items: [{ image_path: payload.garment_image_path, mode }],
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
    cost_usd: costUsd,
    metadata: { model: modelUsed, mode },
  });

  return jsonResponse({ ok: true, status: 'succeeded', record });
});
