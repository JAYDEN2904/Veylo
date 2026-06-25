// digest-weekly — cron-only stub that notifies active users (requires CRON_SECRET).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireCronSecret } from '../_shared/internalAuth.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { sendExpoPush } from '../_shared/expoPush.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const deny = requireCronSecret(req);
  if (deny) return deny;

  const service = getServiceClient();

  const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const { data: rows, error } = await service
    .from('outfit_events')
    .select('user_id')
    .gte('date', since);

  if (error) {
    return jsonResponse({ error: error.message }, { status: 500 });
  }

  const userIds = [...new Set((rows ?? []).map((r: { user_id: string }) => r.user_id))].slice(
    0,
    500
  );

  let notified = 0;

  for (const uid of userIds) {
    await service.from('notifications').insert({
      user_id: uid,
      type: 'weekly_digest',
      title: 'Your week in Veylo',
      body: 'Open the app for outfit ideas based on what you wore recently.',
      data: { kind: 'weekly_digest' },
    });

    const { data: tokens } = await service
      .from('push_tokens')
      .select('expo_push_token')
      .eq('user_id', uid);

    const messages = (tokens ?? []).map((row: { expo_push_token: string }) => ({
      to: row.expo_push_token,
      title: 'Your week in Veylo',
      body: 'Fresh outfit ideas are waiting.',
      data: { kind: 'weekly_digest' },
      sound: 'default' as const,
    }));

    if (messages.length > 0) {
      await sendExpoPush(messages);
    }
    notified += 1;
  }

  return jsonResponse({ ok: true, users_considered: userIds.length, notified });
});
