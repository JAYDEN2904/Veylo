// feed-list — RPC rows + signed image URLs.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/supabase.ts';

interface Payload {
  scope?: 'following' | 'public';
  limit?: number;
  offset?: number;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;
  const { userClient } = ctx;

  let payload: Payload = {};
  try {
    if (req.headers.get('content-length') !== '0') {
      payload = await req.json();
    }
  } catch {
    payload = {};
  }

  const scope = payload.scope ?? 'following';
  const limit = Math.min(Math.max(payload.limit ?? 20, 1), 50);
  const offset = Math.max(payload.offset ?? 0, 0);

  const { data: rows, error } = await userClient.rpc('feed_for_user', {
    feed_scope: scope,
    page_limit: limit,
    page_offset: offset,
  });

  if (error) {
    return jsonResponse({ error: error.message }, { status: 500 });
  }

  const list = rows ?? [];
  const enriched = [];
  const service = getServiceClient();

  for (const r of list as Array<Record<string, unknown>>) {
    const path = r.image_path as string;
    const { data: urlData } = await service.storage.from('feed-photos').createSignedUrl(path, 3600);
    enriched.push({
      ...r,
      image_signed_url: urlData?.signedUrl ?? null,
    });
  }

  return jsonResponse({ ok: true, posts: enriched });
});
