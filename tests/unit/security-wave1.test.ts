/**
 * GT24 NEXT Security Wave 1 — automated regression tests
 *
 * Covers:
 *  SEC-008: debug/prisma endpoint deleted
 *  SEC-009: debug/email and debug/send-test-mail endpoints deleted
 *  SEC-005: OTP_SECRET fail-closed (env-guard + case-otp)
 *  SEC-001: POST /api/cases orphaned route deleted
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { existsSync } from 'fs';
import path from 'path';

vi.mock('server-only', () => ({}));

const ROOT = path.resolve(__dirname, '../../src');

// ─────────────────────────────────────────────────────────────────────────────
// SEC-008 / SEC-009: Debug routes must not exist
// ─────────────────────────────────────────────────────────────────────────────

describe('SEC-008: debug/prisma route deleted', () => {
  it('src/app/api/debug/prisma/route.ts does not exist', () => {
    expect(existsSync(path.join(ROOT, 'app/api/debug/prisma/route.ts'))).toBe(
      false
    );
  });
});

describe('SEC-009: debug email routes deleted', () => {
  it('src/app/api/debug/email/route.ts does not exist', () => {
    expect(existsSync(path.join(ROOT, 'app/api/debug/email/route.ts'))).toBe(
      false
    );
  });

  it('src/app/api/debug/send-test-mail/route.ts does not exist', () => {
    expect(
      existsSync(path.join(ROOT, 'app/api/debug/send-test-mail/route.ts'))
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SEC-001: POST /api/cases orphaned route deleted
// ─────────────────────────────────────────────────────────────────────────────

describe('SEC-001: orphaned POST /api/cases route deleted', () => {
  it('src/app/api/cases/route.ts does not exist', () => {
    expect(existsSync(path.join(ROOT, 'app/api/cases/route.ts'))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SEC-005: OTP_SECRET fail-closed via env-guard
// ─────────────────────────────────────────────────────────────────────────────

function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

const BASE_NEXT_ENV = {
  GT24_ENVIRONMENT: 'next',
  NEXT_PUBLIC_APP_URL: 'https://gt24-portal-next.vercel.app',
  SUPABASE_STORAGE_BUCKET: 'gt24-next-case-files',
  SMTP_HOST: '',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_abc123',
  CLERK_SECRET_KEY: 'sk_test_abc123',
  MAIL_FROM: 'noreply@gt24-test.internal',
  ADMIN_NOTIFY_EMAIL: 'admin@gt24-test.internal'
};

describe('SEC-005: assertNextEnvironment rejects missing or insecure OTP_SECRET', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('SEC-005: rejects when OTP_SECRET is absent', async () => {
    const { assertNextEnvironment } = await import('@/lib/env-guard');
    withEnv({ ...BASE_NEXT_ENV, OTP_SECRET: undefined }, () => {
      expect(() => assertNextEnvironment()).toThrow(/OTP_SECRET/);
    });
  });

  it('SEC-005: rejects when OTP_SECRET is the known insecure fallback', async () => {
    const { assertNextEnvironment } = await import('@/lib/env-guard');
    withEnv({ ...BASE_NEXT_ENV, OTP_SECRET: 'dev-secret-change-me' }, () => {
      expect(() => assertNextEnvironment()).toThrow(/OTP_SECRET/);
    });
  });

  it('SEC-005: passes when OTP_SECRET is set to a real value', async () => {
    const { assertNextEnvironment } = await import('@/lib/env-guard');
    withEnv({ ...BASE_NEXT_ENV, OTP_SECRET: 'a'.repeat(64) }, () => {
      expect(() => assertNextEnvironment()).not.toThrow();
    });
  });
});

describe('SEC-005: case-otp throws when OTP_SECRET is absent', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('hashOtpCode throws when OTP_SECRET is not set', async () => {
    const saved = process.env.OTP_SECRET;
    delete process.env.OTP_SECRET;
    try {
      await expect(
        import('@/lib/case-otp').then(({ hashOtpCode }) => {
          hashOtpCode('123456');
        })
      ).rejects.toThrow(/OTP_SECRET/);
    } finally {
      if (saved !== undefined) process.env.OTP_SECRET = saved;
    }
  });
});
