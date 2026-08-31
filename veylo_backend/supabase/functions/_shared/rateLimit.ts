import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Fixed-window rate limiter backed by public.rate_limits (service_role writes only).
 *
 * failClosed=true  → DB errors reject the request (paid / spend-sensitive endpoints)
 * failClosed=false → DB errors allow the request (cheap endpoints; prefer availability)
 */

export interface RateLimitOptions {
  windowSeconds: number;
  maxRequests: number;
  /** When true, limiter/DB errors block the request instead of allowing it. */
  failClosed?: boolean;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds?: number;
  reason?: 'limit' | 'unavailable';
}

/** Extract client IP from common proxy headers (Supabase Edge / CDN). */
export function clientIpFromRequest(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const cf = req.headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf;
  return 'unknown';
}

export async function enforceRateLimit(
  service: SupabaseClient,
  cacheKey: string,
  opts: RateLimitOptions
): Promise<RateLimitResult> {
  const failClosed = opts.failClosed ?? false;
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
    return failClosed
      ? { ok: false, retryAfterSeconds: opts.windowSeconds, reason: 'unavailable' }
      : { ok: true };
  }

  const current = row?.request_count ?? 0;
  if (current >= opts.maxRequests) {
    return {
      ok: false,
      retryAfterSeconds: opts.windowSeconds,
      reason: 'limit',
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
    return failClosed
      ? { ok: false, retryAfterSeconds: opts.windowSeconds, reason: 'unavailable' }
      : { ok: true };
  }

  return { ok: true };
}

/**
 * Enforce both user-keyed and IP-keyed limits. Either failure blocks the request.
 */
export async function enforceUserAndIpRateLimit(
  service: SupabaseClient,
  opts: {
    functionName: string;
    userId?: string | null;
    ip: string;
    windowSeconds: number;
    maxPerUser: number;
    maxPerIp: number;
    failClosed?: boolean;
  }
): Promise<RateLimitResult> {
  const failClosed = opts.failClosed ?? false;

  if (opts.userId) {
    const userRl = await enforceRateLimit(service, `${opts.functionName}:user:${opts.userId}`, {
      windowSeconds: opts.windowSeconds,
      maxRequests: opts.maxPerUser,
      failClosed,
    });
    if (!userRl.ok) return userRl;
  }

  return enforceRateLimit(service, `${opts.functionName}:ip:${opts.ip}`, {
    windowSeconds: opts.windowSeconds,
    maxRequests: opts.maxPerIp,
    failClosed,
  });
}
