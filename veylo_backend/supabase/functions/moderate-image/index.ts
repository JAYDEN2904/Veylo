// moderate-image — Vision moderation gate for feed uploads.
// Accepts only private-bucket paths (no free-form image_url — SSRF defense).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { moderateImageUrl, moderateText } from '../_shared/moderation.ts';
import { guardEndpoint } from '../_shared/endpointGuard.ts';
import { sanitizeText } from '../_shared/promptSafety.ts';

const ALLOWED_BUCKETS = new Set(['item-photos', 'avatars', 'tryon-results', 'feed-photos']);

interface Payload {
  bucket: string;
  path: string;
  caption?: string;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;
  const { user, userClient } = ctx;

  const blocked = await guardEndpoint(req, getServiceClient(), {
    functionName: 'moderate-image',
    userId: user.id,
    tier: 'moderate',
  });
  if (blocked) return blocked;

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!payload.bucket || !payload.path) {
    return jsonResponse({ error: 'bucket and path are required' }, { status: 400 });
  }
  if (!ALLOWED_BUCKETS.has(payload.bucket)) {
    return jsonResponse({ error: 'bucket not allowed' }, { status: 400 });
  }

  const { data, error } = await userClient.storage
    .from(payload.bucket)
    .createSignedUrl(payload.path, 600);
  if (error || !data?.signedUrl) {
    return jsonResponse({ error: 'Cannot sign image', detail: error?.message }, { status: 400 });
  }

  try {
    const imageOutcome = await moderateImageUrl(data.signedUrl);
    if (imageOutcome.flagged) {
      return jsonResponse({ ok: false, flagged: true, scope: 'image' }, { status: 422 });
    }

    const caption = sanitizeText(payload.caption, 2000);
    if (caption) {
      const textOutcome = await moderateText(caption);
      if (textOutcome.flagged) {
        return jsonResponse({ ok: false, flagged: true, scope: 'caption' }, { status: 422 });
      }
    }

    return jsonResponse({ ok: true, flagged: false });
  } catch (err) {
    console.error('[moderate-image]', err);
    return jsonResponse({ error: 'Moderation failed', detail: String(err) }, { status: 502 });
  }
});
