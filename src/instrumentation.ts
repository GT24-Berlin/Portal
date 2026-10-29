import * as Sentry from '@sentry/nextjs';
import { assertNextEnvironment } from '@/lib/env-guard';

const sentryOptions: Sentry.NodeOptions | Sentry.EdgeOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  spotlight: process.env.NODE_ENV === 'development',
  // SEC-014: sendDefaultPii=true sends PII to Sentry — review before enabling Sentry in NEXT
  sendDefaultPii: true,
  // SEC-014: tracesSampleRate=1 samples 100% of requests — reduce before production
  tracesSampleRate: 1,
  debug: false
};

export async function register() {
  // GT24 environment guard — runs at startup, fail-closed
  // Only enforced when GT24_ENVIRONMENT is set (skips in raw local dev without .env)
  if (process.env.GT24_ENVIRONMENT) {
    assertNextEnvironment();
  }

  // Sentry disabled when NEXT_PUBLIC_SENTRY_DISABLED=true (required in initial NEXT bootstrap)
  const sentryEnabled = process.env.NEXT_PUBLIC_SENTRY_DISABLED !== 'true';

  if (sentryEnabled) {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      Sentry.init(sentryOptions);
    }
    if (process.env.NEXT_RUNTIME === 'edge') {
      Sentry.init(sentryOptions);
    }
  }
}

export const onRequestError = Sentry.captureRequestError;
