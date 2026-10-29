/**
 * GT24 NEXT Bootstrap Safety Harness — env-guard tests
 *
 * These tests verify that assertNextEnvironment() correctly rejects
 * production resources and accepts valid NEXT configuration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock 'server-only' so tests can import server-side modules
vi.mock('server-only', () => ({}));

// Dynamic import after mocking
async function loadGuard() {
  // Clear module cache to re-evaluate with fresh env
  const { assertNextEnvironment } = await import('@/lib/env-guard');
  return { assertNextEnvironment };
}

function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }
  }
}

const SAFE_NEXT_ENV = {
  GT24_ENVIRONMENT: 'next',
  NEXT_PUBLIC_APP_URL: 'https://gt24-portal-next.vercel.app',
  SUPABASE_STORAGE_BUCKET: 'gt24-next-case-files',
  SMTP_HOST: '',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_abc123',
  CLERK_SECRET_KEY: 'sk_test_abc123',
  MAIL_FROM: 'noreply@gt24-test.internal',
  ADMIN_NOTIFY_EMAIL: 'admin@gt24-test.internal',
  OTP_SECRET: 'a'.repeat(64)
};

describe('env-guard: assertNextEnvironment()', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('passes with valid NEXT environment', async () => {
    const { assertNextEnvironment } = await loadGuard();
    withEnv(SAFE_NEXT_ENV, () => {
      expect(() => assertNextEnvironment()).not.toThrow();
    });
  });

  // SC-06: GT24_ENVIRONMENT missing
  it('SC-06: rejects when GT24_ENVIRONMENT is unset', async () => {
    const { assertNextEnvironment } = await loadGuard();
    withEnv({ ...SAFE_NEXT_ENV, GT24_ENVIRONMENT: undefined }, () => {
      expect(() => assertNextEnvironment()).toThrow(
        /GT24_ENVIRONMENT must be 'next'/
      );
    });
  });

  it('SC-06: rejects when GT24_ENVIRONMENT is production', async () => {
    const { assertNextEnvironment } = await loadGuard();
    withEnv({ ...SAFE_NEXT_ENV, GT24_ENVIRONMENT: 'production' }, () => {
      expect(() => assertNextEnvironment()).toThrow(
        /GT24_ENVIRONMENT must be 'next'/
      );
    });
  });

  // SC-04: Production app domain
  it('SC-04: rejects portal.gutachtery24.de in APP_URL', async () => {
    const { assertNextEnvironment } = await loadGuard();
    withEnv(
      {
        ...SAFE_NEXT_ENV,
        NEXT_PUBLIC_APP_URL: 'https://portal.gutachtery24.de'
      },
      () => {
        expect(() => assertNextEnvironment()).toThrow(/production domain/);
      }
    );
  });

  // SC-11: Production storage bucket
  it('SC-11: rejects gt24-case-files bucket', async () => {
    const { assertNextEnvironment } = await loadGuard();
    withEnv(
      { ...SAFE_NEXT_ENV, SUPABASE_STORAGE_BUCKET: 'gt24-case-files' },
      () => {
        expect(() => assertNextEnvironment()).toThrow(/production bucket/);
      }
    );
  });

  // SC-05: Production SMTP
  it('SC-05: rejects smtp.all-inkl.com', async () => {
    const { assertNextEnvironment } = await loadGuard();
    withEnv({ ...SAFE_NEXT_ENV, SMTP_HOST: 'smtp.all-inkl.com' }, () => {
      expect(() => assertNextEnvironment()).toThrow(/All-Inkl/);
    });
  });

  it('SC-05: rejects server.all-inkl.com', async () => {
    const { assertNextEnvironment } = await loadGuard();
    withEnv({ ...SAFE_NEXT_ENV, SMTP_HOST: 'server.all-inkl.com' }, () => {
      expect(() => assertNextEnvironment()).toThrow(/All-Inkl/);
    });
  });

  // SC-02: Production Clerk keys
  it('SC-02: rejects pk_live_ Clerk key', async () => {
    const { assertNextEnvironment } = await loadGuard();
    withEnv(
      {
        ...SAFE_NEXT_ENV,
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_production_key'
      },
      () => {
        expect(() => assertNextEnvironment()).toThrow(/pk_live_/);
      }
    );
  });

  it('SC-02: rejects sk_live_ Clerk key', async () => {
    const { assertNextEnvironment } = await loadGuard();
    withEnv(
      { ...SAFE_NEXT_ENV, CLERK_SECRET_KEY: 'sk_live_production_key' },
      () => {
        expect(() => assertNextEnvironment()).toThrow(/sk_live_/);
      }
    );
  });

  // SC-10: Real email addresses
  it('SC-10: rejects @gutachtery24.de in MAIL_FROM', async () => {
    const { assertNextEnvironment } = await loadGuard();
    withEnv({ ...SAFE_NEXT_ENV, MAIL_FROM: 'noreply@gutachtery24.de' }, () => {
      expect(() => assertNextEnvironment()).toThrow(/@gutachtery24\.de/);
    });
  });

  it('SC-10: rejects @gutachtery24.de in ADMIN_NOTIFY_EMAIL', async () => {
    const { assertNextEnvironment } = await loadGuard();
    withEnv(
      { ...SAFE_NEXT_ENV, ADMIN_NOTIFY_EMAIL: 'admin@gutachtery24.de' },
      () => {
        expect(() => assertNextEnvironment()).toThrow(/@gutachtery24\.de/);
      }
    );
  });
});
