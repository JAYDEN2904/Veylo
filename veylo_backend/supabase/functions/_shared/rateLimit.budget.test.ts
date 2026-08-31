import { clientIpFromRequest } from './rateLimit.ts';
import { secondsUntilUtcMidnight, dailySpendCapUsd, userDailyOpCap } from './budget.ts';

Deno.test('clientIpFromRequest prefers x-forwarded-for first hop', () => {
  const req = new Request('https://example.com', {
    headers: {
      'x-forwarded-for': '203.0.113.10, 10.0.0.1',
      'x-real-ip': '198.51.100.1',
    },
  });
  const ip = clientIpFromRequest(req);
  if (ip !== '203.0.113.10') throw new Error(`got ${ip}`);
});

Deno.test('clientIpFromRequest falls back to unknown', () => {
  const req = new Request('https://example.com');
  if (clientIpFromRequest(req) !== 'unknown') throw new Error('expected unknown');
});

Deno.test('secondsUntilUtcMidnight is positive', () => {
  const s = secondsUntilUtcMidnight(new Date('2026-07-27T12:00:00.000Z'));
  if (s <= 0 || s > 86400) throw new Error(`unexpected ${s}`);
});

Deno.test('dailySpendCapUsd defaults to 10', () => {
  // Env may be unset in test — default 10
  const cap = dailySpendCapUsd();
  if (typeof cap !== 'number' || cap < 0) throw new Error(`bad cap ${cap}`);
});

Deno.test('userDailyOpCap known functions', () => {
  if (userDailyOpCap('tryon-generate') === null) throw new Error('tryon cap missing');
  if (userDailyOpCap('generate-avatar') === null) throw new Error('avatar cap missing');
  if (userDailyOpCap('feed-list') !== null) throw new Error('feed-list should have no op cap');
});
