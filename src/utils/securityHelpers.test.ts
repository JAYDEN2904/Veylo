/** Pure helpers mirrored from edge budget/rateLimit for Jest (no Deno.env). */

export function clientIpFromRequest(headers: Record<string, string | undefined>): string {
  const forwarded = headers['x-forwarded-for'];
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  if (headers['x-real-ip']?.trim()) return headers['x-real-ip'].trim();
  if (headers['cf-connecting-ip']?.trim()) return headers['cf-connecting-ip'].trim();
  return 'unknown';
}

export function secondsUntilUtcMidnight(now: Date): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
}

describe('rateLimit / budget pure helpers', () => {
  it('clientIpFromRequest prefers x-forwarded-for first hop', () => {
    expect(
      clientIpFromRequest({
        'x-forwarded-for': '203.0.113.10, 10.0.0.1',
        'x-real-ip': '198.51.100.1',
      })
    ).toBe('203.0.113.10');
  });

  it('clientIpFromRequest falls back to unknown', () => {
    expect(clientIpFromRequest({})).toBe('unknown');
  });

  it('secondsUntilUtcMidnight is positive', () => {
    const s = secondsUntilUtcMidnight(new Date('2026-07-27T12:00:00.000Z'));
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(86400);
  });
});
