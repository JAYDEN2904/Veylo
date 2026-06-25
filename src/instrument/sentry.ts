import * as Sentry from 'sentry-expo';

let initialized = false;

/** Call once at app startup. No-op when EXPO_PUBLIC_SENTRY_DSN is unset. */
export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn || initialized) {
    return;
  }
  Sentry.init({
    dsn,
    debug: __DEV__,
    enableInExpoDevelopment: false,
    tracesSampleRate: __DEV__ ? 0 : 0.2,
  });
  initialized = true;
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!process.env.EXPO_PUBLIC_SENTRY_DSN) {
    if (__DEV__) {
      console.error('[captureException]', error, context);
    }
    return;
  }
  Sentry.Native.captureException(error, { extra: context });
}
