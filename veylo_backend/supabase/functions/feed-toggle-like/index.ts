// feed-toggle-like — idempotent like/unlike.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';

interface Payload {
  post_id: string;
  liked?: boolean;
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

  if (!payload.post_id) {
    return jsonResponse({ error: 'post_id required' }, { status: 400 });
  }

  const wantLike = payload.liked !== false;

  if (wantLike) {
    const { error } = await userClient
      .from('feed_likes')
      .upsert({ post_id: payload.post_id, user_id: user.id }, { onConflict: 'post_id,user_id' });
    if (error) return jsonResponse({ error: error.message }, { status: 500 });
    return jsonResponse({ ok: true, liked: true });
  }

  const { error } = await userClient
    .from('feed_likes')
    .delete()
    .eq('post_id', payload.post_id)
    .eq('user_id', user.id);

  if (error) return jsonResponse({ error: error.message }, { status: 500 });
  return jsonResponse({ ok: true, liked: false });
});
