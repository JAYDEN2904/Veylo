// style-chat — short assistant replies grounded on wardrobe summary.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { chatCompletionJson } from '../_shared/gpt.ts';
import { guardEndpoint } from '../_shared/endpointGuard.ts';
import { logUsage } from '../_shared/usage.ts';
import {
  fenceUntrustedData,
  PROMPT_INJECTION_SYSTEM_PREAMBLE,
  sanitizeStringList,
  sanitizeText,
} from '../_shared/promptSafety.ts';

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

const MAX_TURNS = 8;
const MAX_TURN_CHARS = 1000;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;
  const { user, userClient } = ctx;

  const service = getServiceClient();
  const blocked = await guardEndpoint(req, service, {
    functionName: 'style-chat',
    userId: user.id,
    tier: 'paid_chat',
  });
  if (blocked) return blocked;

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const turns = (payload.messages ?? [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .slice(-MAX_TURNS)
    .map((m) => ({
      role: m.role,
      content: sanitizeText(m.content, MAX_TURN_CHARS),
    }))
    .filter((m) => m.content.length > 0);

  const lastUser = [...turns].reverse().find((m) => m.role === 'user');
  if (!lastUser?.content) {
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

  const safeProfile = {
    preferences: profile?.preferences ?? null,
    learned_preferences: profile?.learned_preferences ?? null,
  };
  const safeItems = (items ?? []).map(
    (item: { category?: string; tags?: string[] | null; colors?: string[] | null }) => ({
      category: sanitizeText(item.category, 40),
      tags: sanitizeStringList(item.tags, { maxItems: 8, maxItemLen: 32 }),
      colors: sanitizeStringList(item.colors, { maxItems: 5, maxItemLen: 24 }),
    })
  );

  const wardrobeBlock = fenceUntrustedData('wardrobe_summary', {
    preferences: safeProfile,
    items_sample: safeItems,
  });

  const transcript = turns.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

  try {
    const out = await chatCompletionJson<{ reply: string }>(
      [
        {
          role: 'system',
          content: `${PROMPT_INJECTION_SYSTEM_PREAMBLE}

You are Veylo's concise personal stylist. Ground answers in the wardrobe data block when relevant. Keep replies under 120 words.

${wardrobeBlock}`,
        },
        {
          role: 'user',
          content: fenceUntrustedData('chat_transcript', transcript),
        },
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
