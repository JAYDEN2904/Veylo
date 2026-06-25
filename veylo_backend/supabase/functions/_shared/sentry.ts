/**
 * Best-effort error reporting for Edge Functions (optional DSN).
 */

export async function captureException(err: unknown, ctx?: Record<string, unknown>): Promise<void> {
  const dsn = Deno.env.get('SENTRY_EDGE_DSN');
  console.error('[edge]', err, ctx ?? {});
  if (!dsn) return;

  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/\//g, '');
    const key = url.password || url.username;
    const host = `${url.protocol}//${url.host}`;
    const envelopeEndpoint = `${host}/api/${projectId}/envelope/?sentry_key=${key}&sentry_version=7`;

    const msg = err instanceof Error ? err.message : String(err);

    await fetch(envelopeEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body: JSON.stringify({
        message: msg,
        level: 'error',
        extra: ctx ?? {},
      }),
    });
  } catch {
    /* swallow — telemetry must not throw */
  }
}
