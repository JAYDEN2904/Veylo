// style-chat — short assistant replies grounded on wardrobe summary.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { chatCompletionJson } from '../_shared/gpt.ts';
import { enforceRateLimit } from '../_shared/rateLimit.ts';
import { logUsage } from '../_shared/usage.ts';

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface Payload {
  messages?: ChatTurn[];
}

const REPLY_SCHEMA = {
  name: 'StyleAssistantReply',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      reply: { type: 'string' },
    },
    required: ['reply'],
  },
} as const;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;
  const { user, userClient } = ctx;

  const service = getServiceClient();
  const rl = await enforceRateLimit(service, `chat:${user.id}`, {
    windowSeconds: 60,
    maxRequests: 20,
  });
  if (!rl.ok) {
    return jsonResponse(
      { error: 'Rate limited', retry_after: rl.retryAfterSeconds },
      {
        status: 429,
      }
    );
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const turns = payload.messages ?? [];
  const lastUser = [...turns].reverse().find((m) => m.role === 'user');
  if (!lastUser?.content?.trim()) {
    return jsonResponse({ error: 'messages must include a user turn' }, { status: 400 });
  }

  const [{ data: profile }, { data: items }] = await Promise.all([
    userClient
      .from('style_profiles')
      .select('preferences, learned_preferences')
      .eq('user_id', user.id)
      .maybeSingle(),
    userClient
      .from('clothing_items')
      .select('category, tags, colors')
      .eq('status', 'active')
      .limit(80),
  ]);

  const wardrobeSummary = `Preferences: ${JSON.stringify(profile ?? {})}\nItems sample: ${JSON.stringify(items ?? [])}`;

  const transcript = turns
    .slice(-8)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');

  try {
    const out = await chatCompletionJson<{ reply: string }>(
      [
        {
          role: 'system',
          content: `You are Veylo's concise personal stylist. Ground answers in this wardrobe JSON summary when relevant. Keep replies under 120 words.\n${wardrobeSummary}`,
        },
        { role: 'user', content: transcript },
      ],
      { model: 'gpt-4o-mini', temperature: 0.6, jsonSchema: REPLY_SCHEMA }
    );

    await logUsage(service, {
      user_id: user.id,
      function_name: 'style-chat',
      provider: 'openai',
      units: 1,
      cost_usd: 0.003,
      metadata: { chars: lastUser.content.length },
    });

    return jsonResponse({ ok: true, reply: out.reply });
  } catch (err) {
    console.error('[style-chat]', err);
    return jsonResponse({ error: 'Chat failed', detail: String(err) }, { status: 502 });
  }
});
