import { jsonResponse } from './cors.ts';

/**
 * Validates CRON_SECRET header for scheduled Edge Functions.
 */
export function requireCronSecret(req: Request): Response | null {
  const expected = Deno.env.get('CRON_SECRET');
  if (!expected) {
    return jsonResponse({ error: 'CRON_SECRET is not configured' }, { status: 501 });
  }
  const provided = req.headers.get('x-cron-secret');
  if (provided !== expected) {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/**
 * Validates Authorization Bearer matches the service role key (machine callers).
 */
export function requireServiceRole(req: Request): Response | null {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const auth = req.headers.get('Authorization');
  if (!key || auth !== `Bearer ${key}`) {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
