/**
 * Expo Push API — batches of up to ~100 messages per request.
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface ExpoPushMessage {
  to: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
}

export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<{
  ok: boolean;
  detail?: unknown;
}> {
  if (messages.length === 0) {
    return { ok: true };
  }

  const chunks: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    const token = Deno.env.get('EXPO_ACCESS_TOKEN');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(chunk),
    });

    if (!res.ok) {
      return { ok: false, detail: await res.text() };
    }
  }

  return { ok: true };
}
