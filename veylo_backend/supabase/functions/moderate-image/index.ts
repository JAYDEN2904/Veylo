// moderate-image — Vision moderation gate for feed uploads.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { moderateImageUrl, moderateText } from '../_shared/moderation.ts';

interface Payload {
  image_url?: string;
  bucket?: string;
  path?: string;
  caption?: string;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;
  const { userClient } = ctx;

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let imageUrl = payload.image_url;

  if (!imageUrl && payload.bucket && payload.path) {
    const { data, error } = await userClient.storage
      .from(payload.bucket)
      .createSignedUrl(payload.path, 600);
    if (error || !data?.signedUrl) {
      return jsonResponse({ error: 'Cannot sign image', detail: error?.message }, { status: 400 });
    }
    imageUrl = data.signedUrl;
  }

  if (!imageUrl) {
    return jsonResponse({ error: 'image_url or bucket+path required' }, { status: 400 });
  }

  try {
    const imageOutcome = await moderateImageUrl(imageUrl);
    if (imageOutcome.flagged) {
      return jsonResponse({ ok: false, flagged: true, scope: 'image' }, { status: 422 });
    }

    if (payload.caption?.trim()) {
      const textOutcome = await moderateText(payload.caption.trim());
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
