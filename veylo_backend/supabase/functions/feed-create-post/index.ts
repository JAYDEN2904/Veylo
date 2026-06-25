// feed-create-post — validates moderation then inserts feed row.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { moderateImageUrl, moderateText } from '../_shared/moderation.ts';

interface Payload {
  image_path: string;
  caption?: string;
  outfit_id?: string;
  item_ids?: string[];
  visibility?: 'public' | 'followers' | 'private';
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

  if (!payload.image_path) {
    return jsonResponse({ error: 'image_path required' }, { status: 400 });
  }

  const vis = payload.visibility ?? 'public';

  const { data: signed, error: signErr } = await userClient.storage
    .from('feed-photos')
    .createSignedUrl(payload.image_path, 600);

  if (signErr || !signed?.signedUrl) {
    return jsonResponse(
      { error: 'Cannot read feed image', detail: signErr?.message },
      { status: 400 }
    );
  }

  try {
    const imgMod = await moderateImageUrl(signed.signedUrl);
    if (imgMod.flagged) {
      return jsonResponse({ error: 'Image failed moderation' }, { status: 422 });
    }
    if (payload.caption?.trim()) {
      const capMod = await moderateText(payload.caption.trim());
      if (capMod.flagged) {
        return jsonResponse({ error: 'Caption failed moderation' }, { status: 422 });
      }
    }
  } catch (err) {
    return jsonResponse({ error: 'Moderation error', detail: String(err) }, { status: 502 });
  }

  const { data: post, error: postErr } = await userClient
    .from('feed_posts')
    .insert({
      user_id: user.id,
      image_path: payload.image_path,
      caption: payload.caption ?? null,
      outfit_id: payload.outfit_id ?? null,
      visibility: vis,
    })
    .select('*')
    .single();

  if (postErr || !post) {
    return jsonResponse({ error: postErr?.message ?? 'insert failed' }, { status: 500 });
  }

  const ids = payload.item_ids ?? [];
  if (ids.length > 0) {
    const rows = ids.map((item_id) => ({ post_id: post.id, item_id }));
    await userClient.from('feed_post_items').insert(rows);
  }

  return jsonResponse({ ok: true, post });
});
