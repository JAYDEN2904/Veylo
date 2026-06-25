// generate-embedding — reusable text → 1536-dim embedding wrapper.
//
// Input:  { text: string, model?: string }
// Output: { ok: true, embedding: number[], model: string, dimensions: number }
//
// Used by frontend recommendation flows that build a query vector
// (e.g. "find items similar to this outfit description") before calling the
// match_items RPC.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { createEmbedding } from '../_shared/openai.ts';
import { logUsage } from '../_shared/usage.ts';

const MAX_INPUT_CHARS = 8000;

interface Payload {
  text: string;
  model?: string;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;
  const { user } = ctx;

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const text = payload.text?.trim();
  if (!text) {
    return jsonResponse({ error: 'text is required' }, { status: 400 });
  }
  if (text.length > MAX_INPUT_CHARS) {
    return jsonResponse({ error: `text exceeds ${MAX_INPUT_CHARS} char limit` }, { status: 400 });
  }

  const model = payload.model ?? 'text-embedding-3-small';

  let embedding: number[];
  try {
    embedding = await createEmbedding(text, model);
  } catch (err) {
    console.error('[generate-embedding] failed', err);
    return jsonResponse({ error: 'Embedding API failed', detail: String(err) }, { status: 502 });
  }

  await logUsage(getServiceClient(), {
    user_id: user.id,
    function_name: 'generate-embedding',
    provider: 'openai',
    units: 1,
    cost_usd: 0.00002 * Math.ceil(text.length / 4), // rough token estimate
    metadata: { model, chars: text.length },
  });

  return jsonResponse({
    ok: true,
    embedding,
    model,
    dimensions: embedding.length,
  });
});
