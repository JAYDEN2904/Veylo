import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Fixed-window rate limiter backed by public.rate_limits (service_role writes only).
 */

export interface RateLimitOptions {
  windowSeconds: number;
  maxRequests: number;
}

export async function enforceRateLimit(
  service: SupabaseClient,
  cacheKey: string,
  opts: RateLimitOptions
): Promise<{ ok: boolean; retryAfterSeconds?: number }> {
  const windowMs = opts.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();

  const { data: row, error: selectError } = await service
    .from('rate_limits')
    .select('request_count')
    .eq('cache_key', cacheKey)
    .eq('window_start', windowStart)
    .maybeSingle();

  if (selectError) {
    console.error('[rateLimit] select', selectError.message);
    return { ok: true };
  }

  const current = row?.request_count ?? 0;
  if (current >= opts.maxRequests) {
    return {
      ok: false,
      retryAfterSeconds: opts.windowSeconds,
    };
  }

  const next = current + 1;
  const { error: upsertError } = await service.from('rate_limits').upsert(
    {
      cache_key: cacheKey,
      window_start: windowStart,
      request_count: next,
    },
    { onConflict: 'cache_key,window_start' }
  );

  if (upsertError) {
    console.error('[rateLimit] upsert', upsertError.message);
    return { ok: true };
  }

  return { ok: true };
}
