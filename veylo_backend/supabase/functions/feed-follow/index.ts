// feed-follow — follow / unfollow users.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';

interface Payload {
  followee_id: string;
  follow?: boolean;
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

  if (!payload.followee_id || payload.followee_id === user.id) {
    return jsonResponse({ error: 'invalid followee_id' }, { status: 400 });
  }

  const follow = payload.follow !== false;

  if (follow) {
    const { error } = await userClient
      .from('follows')
      .upsert(
        { follower_id: user.id, followee_id: payload.followee_id },
        { onConflict: 'follower_id,followee_id' }
      );
    if (error) return jsonResponse({ error: error.message }, { status: 500 });
    return jsonResponse({ ok: true, following: true });
  }

  const { error } = await userClient
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('followee_id', payload.followee_id);

  if (error) return jsonResponse({ error: error.message }, { status: 500 });
  return jsonResponse({ ok: true, following: false });
});
