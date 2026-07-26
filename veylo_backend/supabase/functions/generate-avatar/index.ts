// generate-avatar — full-body avatar via Vertex Gemini image model.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { logUsage } from '../_shared/usage.ts';
import { fetchImage, vertexGenerateContentImage } from '../_shared/vertex.ts';

interface Payload {
  /** Storage path in item-photos or avatars bucket */
  photo_path: string;
  /** item-photos | avatars */
  photo_bucket?: 'item-photos' | 'avatars';
  body_type?: string;
}

/** Imagen capability models were retired; Gemini Flash Image is the supported path. */
const AVATAR_MODEL = 'gemini-2.5-flash-image';

const BODY_TYPE_PROMPTS: Record<string, string> = {
  petite: 'petite build, under 5 feet 4 inches tall',
  average: 'average height and build, around 5 feet 5 inches',
  tall: 'tall build, over 5 feet 7 inches',
  curvy: 'curvy build with natural proportions',
  athletic: 'athletic, toned build',
  'plus-size': 'plus-size build with confident posture',
  custom: 'natural body proportions',
};

function buildAvatarPrompt(bodyType?: string): string {
  const build = (bodyType && BODY_TYPE_PROMPTS[bodyType]) ?? BODY_TYPE_PROMPTS.custom;
  return (
    `Using the person in the reference photo, create a single full-body photorealistic avatar ` +
    `of that same person with ${build}. ` +
    `Keep their face, skin tone, hair, and identity recognizable. ` +
    `They should stand in a relaxed neutral pose, facing the camera, on a plain light gray studio background, ` +
    `with soft even lighting, natural skin texture, and simple neutral fitted clothing. ` +
    `Output one polished full-body portrait only — no collage, text, or watermark.`
  );
}

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

  if (!payload.photo_path) {
    return jsonResponse({ error: 'photo_path required' }, { status: 400 });
  }

  const bucket = payload.photo_bucket ?? 'item-photos';

  const { data: signed, error: signErr } = await userClient.storage
    .from(bucket)
    .createSignedUrl(payload.photo_path, 600);

  if (signErr || !signed?.signedUrl) {
    return jsonResponse({ error: 'Cannot read photo', detail: signErr?.message }, { status: 400 });
  }

  let referenceImage;
  try {
    referenceImage = await fetchImage(signed.signedUrl);
  } catch (err) {
    return jsonResponse(
      { error: 'Could not download photo', detail: String(err) },
      { status: 400 }
    );
  }

  const service = getServiceClient();
  const avatarRowId = crypto.randomUUID();
  const thumbPath = `${user.id}/avatar-${avatarRowId}.jpg`;

  const { error: pendingErr } = await userClient.from('avatars').insert({
    id: avatarRowId,
    user_id: user.id,
    provider: 'google_gemini',
    external_id: null,
    thumbnail_path: thumbPath,
    body_type: payload.body_type ?? null,
    status: 'processing',
    model_url: null,
  });

  if (pendingErr) {
    return jsonResponse(
      { error: 'Failed to create avatar record', detail: pendingErr.message },
      { status: 500 }
    );
  }

  let generatedBytes: Uint8Array;
  let contentType = 'image/jpeg';
  try {
    const generated = await vertexGenerateContentImage(AVATAR_MODEL, {
      prompt: buildAvatarPrompt(payload.body_type),
      imageBase64: referenceImage.base64,
      mimeType: referenceImage.mimeType,
      aspectRatio: '3:4',
    });
    generatedBytes = generated.bytes;
    contentType = generated.mimeType.startsWith('image/') ? generated.mimeType : 'image/png';
  } catch (err) {
    console.error('[generate-avatar] vertex generateContent failed', err);
    await userClient
      .from('avatars')
      .update({ status: 'failed', error: String(err) })
      .eq('id', avatarRowId);
    return jsonResponse(
      { error: 'Avatar generation failed', detail: String(err) },
      { status: 502 }
    );
  }

  const { error: upErr } = await userClient.storage
    .from('avatars')
    .upload(thumbPath, generatedBytes, {
      contentType,
      upsert: true,
    });

  if (upErr) {
    await userClient
      .from('avatars')
      .update({ status: 'failed', error: upErr.message })
      .eq('id', avatarRowId);
    return jsonResponse({ error: 'Avatar upload failed', detail: upErr.message }, { status: 500 });
  }

  const { data: row, error: updateErr } = await userClient
    .from('avatars')
    .update({ status: 'active', error: null })
    .eq('id', avatarRowId)
    .select('*')
    .single();

  if (updateErr || !row) {
    return jsonResponse(
      { error: updateErr?.message ?? 'Failed to finalize avatar row' },
      { status: 500 }
    );
  }

  const { error: profileErr } = await service
    .from('profiles')
    .update({
      avatar_url: thumbPath,
      body_type: payload.body_type ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (profileErr) {
    console.error('[generate-avatar] profile update failed', profileErr.message);
  }

  await logUsage(service, {
    user_id: user.id,
    function_name: 'generate-avatar',
    provider: 'google',
    units: 1,
    cost_usd: 0.04,
    metadata: { model: AVATAR_MODEL, body_type: payload.body_type ?? null },
  });

  const { data: pub } = await userClient.storage.from('avatars').createSignedUrl(thumbPath, 3600);

  return jsonResponse({
    ok: true,
    avatar: row,
    signed_thumbnail_url: pub?.signedUrl ?? null,
    message: 'Avatar generated with Gemini Flash Image.',
  });
});
