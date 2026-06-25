// feed-add-comment

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { moderateText } from '../_shared/moderation.ts';

interface Payload {
  post_id: string;
  body: string;
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

  const body = payload.body?.trim();
  if (!payload.post_id || !body) {
    return jsonResponse({ error: 'post_id and body required' }, { status: 400 });
  }

  try {
    const mod = await moderateText(body);
    if (mod.flagged) {
      return jsonResponse({ error: 'Comment failed moderation' }, { status: 422 });
    }
  } catch (err) {
    return jsonResponse({ error: String(err) }, { status: 502 });
  }

  const { data: row, error } = await userClient
    .from('feed_comments')
    .insert({ post_id: payload.post_id, user_id: user.id, body })
    .select('*')
    .single();

  if (error || !row) {
    return jsonResponse({ error: error?.message ?? 'insert failed' }, { status: 500 });
  }

  return jsonResponse({ ok: true, comment: row });
});
