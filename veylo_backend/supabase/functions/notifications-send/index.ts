// notifications-send — service-role only; delivers Expo pushes + inbox rows.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireServiceRole } from '../_shared/internalAuth.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { sendExpoPush } from '../_shared/expoPush.ts';

interface Payload {
  user_id: string;
  title: string;
  body?: string;
  type?: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const deny = requireServiceRole(req);
  if (deny) return deny;

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!payload.user_id || !payload.title?.trim()) {
    return jsonResponse({ error: 'user_id and title required' }, { status: 400 });
  }

  const service = getServiceClient();

  await service.from('notifications').insert({
    user_id: payload.user_id,
    type: payload.type ?? 'push',
    title: payload.title.trim(),
    body: payload.body ?? null,
    data: payload.data ?? {},
  });

  const { data: tokens, error } = await service
    .from('push_tokens')
    .select('expo_push_token')
    .eq('user_id', payload.user_id);

  if (error) {
    return jsonResponse({ error: error.message }, { status: 500 });
  }

  const messages = (tokens ?? []).map((row: { expo_push_token: string }) => ({
    to: row.expo_push_token,
    title: payload.title.trim(),
    body: payload.body ?? '',
    data: payload.data ?? {},
    sound: 'default' as const,
  }));

  const sent = await sendExpoPush(messages);

  return jsonResponse({
    ok: true,
    inbox: true,
    push_targets: messages.length,
    push_ok: sent.ok,
    push_detail: sent.detail,
  });
});
