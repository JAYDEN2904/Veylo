// tryon-status — lookup try_on_history row (legacy Replicate polling removed).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';

interface Payload {
  prediction_id: string;
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
  if (!payload.prediction_id) {
    return jsonResponse({ error: 'prediction_id required' }, { status: 400 });
  }

  const { data: row, error: loadError } = await userClient
    .from('try_on_history')
    .select('*')
    .eq('replicate_prediction_id', payload.prediction_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (loadError || !row) {
    return jsonResponse({ error: 'Record not found' }, { status: 404 });
  }

  if (row.status === 'succeeded' && row.result_image_path) {
    return jsonResponse({ ok: true, status: 'succeeded', record: row });
  }

  if (row.status === 'failed') {
    return jsonResponse({
      ok: false,
      status: 'failed',
      error: row.error ?? 'Try-on failed',
      record: row,
    });
  }

  return jsonResponse({
    ok: true,
    status: 'processing',
    prediction_id: payload.prediction_id,
    message:
      'Try-on is synchronous with Google VTO; pending rows may be from legacy Replicate runs.',
    record: row,
  });
});
