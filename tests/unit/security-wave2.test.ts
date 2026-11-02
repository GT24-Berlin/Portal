/**
 * GT24 NEXT Security Wave 2 — automated regression tests
 *
 * Covers:
 *  SEC-002: Customer registration existence check (prevents PII overwrite)
 *  SEC-003: Signed case-access grant (HMAC-SHA256, CASE_ACCESS_SECRET)
 *           - mintCaseAccessGrant / verifyCaseAccessGrant
 *           - otp/refresh oracle fix
 *           - intake GET/POST auth
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { existsSync } from 'fs';
import path from 'path';

vi.mock('server-only', () => ({}));

const ROOT = path.resolve(__dirname, '../../src');

// ─────────────────────────────────────────────────────────────────────────────
// SEC-002: customer route uses create, not upsert
// ─────────────────────────────────────────────────────────────────────────────

describe('SEC-002: customer/route.ts uses create not upsert', () => {
  it('src/app/api/case/[token]/customer/route.ts does not contain upsert', () => {
    const filePath = path.join(ROOT, 'app/api/case/[token]/customer/route.ts');
    expect(existsSync(filePath)).toBe(true);
    const content = require('fs').readFileSync(filePath, 'utf-8');
    expect(content).not.toContain('caseCustomer.upsert');
    expect(content).toContain('caseCustomer.findUnique');
    expect(content).toContain('already_registered');
    expect(content).toContain('caseCustomer.create');
  });
});

describe('SEC-002: register/submit/route.ts uses create not upsert', () => {
  it('src/app/case/[token]/register/submit/route.ts does not contain upsert', () => {
    const filePath = path.join(
      ROOT,
      'app/case/[token]/register/submit/route.ts'
    );
    expect(existsSync(filePath)).toBe(true);
    const content = require('fs').readFileSync(filePath, 'utf-8');
    expect(content).not.toContain('caseCustomer.upsert');
    expect(content).toContain('caseCustomer.findUnique');
    expect(content).toContain('caseCustomer.create');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Grant library unit tests
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

const TEST_SECRET = 'a'.repeat(64);
const TEST_CASE_ID = 'case-abc-123';
const TEST_CUSTOMER_ID = 'cust-xyz-456';

describe('SEC-003: case-access-grant library', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  // T1: mint produces a token with 5 dot-separated parts
  it('T1: mintCaseAccessGrant produces 5-part token', async () => {
    const { mintCaseAccessGrant } = await import('@/lib/case-access-grant');
    withEnv({ CASE_ACCESS_SECRET: TEST_SECRET }, () => {
      const token = mintCaseAccessGrant(TEST_CASE_ID, TEST_CUSTOMER_ID);
      const parts = token.split('.');
      expect(parts).toHaveLength(5);
      expect(parts[0]).toBe(TEST_CASE_ID);
      expect(parts[1]).toBe(TEST_CUSTOMER_ID);
    });
  });

  // T2: mint then verify succeeds
  it('T2: valid grant verifies successfully', async () => {
    const { mintCaseAccessGrant, verifyCaseAccessGrant } = await import(
      '@/lib/case-access-grant'
    );
    withEnv({ CASE_ACCESS_SECRET: TEST_SECRET }, () => {
      const token = mintCaseAccessGrant(TEST_CASE_ID, TEST_CUSTOMER_ID);
      const result = verifyCaseAccessGrant(token, TEST_CASE_ID);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.caseId).toBe(TEST_CASE_ID);
        expect(result.customerId).toBe(TEST_CUSTOMER_ID);
      }
    });
  });

  // T3: expired grant rejected
  it('T3: expired grant is rejected', async () => {
    const { mintCaseAccessGrant, verifyCaseAccessGrant } = await import(
      '@/lib/case-access-grant'
    );
    withEnv({ CASE_ACCESS_SECRET: TEST_SECRET }, () => {
      // mint in the past (9 days ago)
      const pastNow = Date.now() - 9 * 24 * 60 * 60 * 1000;
      const token = mintCaseAccessGrant(
        TEST_CASE_ID,
        TEST_CUSTOMER_ID,
        pastNow
      );
      const result = verifyCaseAccessGrant(token, TEST_CASE_ID);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('expired');
    });
  });

  // T4: future iat rejected
  it('T4: future-issued grant is rejected', async () => {
    const { mintCaseAccessGrant, verifyCaseAccessGrant } = await import(
      '@/lib/case-access-grant'
    );
    withEnv({ CASE_ACCESS_SECRET: TEST_SECRET }, () => {
      const futureNow = Date.now() + 2 * 60 * 60 * 1000;
      const token = mintCaseAccessGrant(
        TEST_CASE_ID,
        TEST_CUSTOMER_ID,
        futureNow
      );
      const result = verifyCaseAccessGrant(token, TEST_CASE_ID);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('future_iat');
    });
  });

  // T5: malformed token rejected
  it('T5: malformed token (too few parts) is rejected', async () => {
    const { verifyCaseAccessGrant } = await import('@/lib/case-access-grant');
    withEnv({ CASE_ACCESS_SECRET: TEST_SECRET }, () => {
      const result = verifyCaseAccessGrant('only.three.parts', TEST_CASE_ID);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('malformed');
    });
  });

  // T6: modified payload rejected
  it('T6: modified payload invalidates signature', async () => {
    const { mintCaseAccessGrant, verifyCaseAccessGrant } = await import(
      '@/lib/case-access-grant'
    );
    withEnv({ CASE_ACCESS_SECRET: TEST_SECRET }, () => {
      const token = mintCaseAccessGrant(TEST_CASE_ID, TEST_CUSTOMER_ID);
      const parts = token.split('.');
      // tamper with exp
      parts[3] = String(Number(parts[3]) + 9999);
      const tampered = parts.join('.');
      const result = verifyCaseAccessGrant(tampered, TEST_CASE_ID);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('invalid_signature');
    });
  });

  // T7: wrong caseId rejected
  it('T7: grant for wrong case is rejected with case_mismatch', async () => {
    const { mintCaseAccessGrant, verifyCaseAccessGrant } = await import(
      '@/lib/case-access-grant'
    );
    withEnv({ CASE_ACCESS_SECRET: TEST_SECRET }, () => {
      const token = mintCaseAccessGrant(TEST_CASE_ID, TEST_CUSTOMER_ID);
      const result = verifyCaseAccessGrant(token, 'other-case-id');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('case_mismatch');
    });
  });

  // T8: invalid signature (wrong secret) rejected
  it('T8: grant verified with wrong secret is rejected', async () => {
    const { mintCaseAccessGrant, verifyCaseAccessGrant } = await import(
      '@/lib/case-access-grant'
    );
    let token = '';
    withEnv({ CASE_ACCESS_SECRET: TEST_SECRET }, () => {
      token = mintCaseAccessGrant(TEST_CASE_ID, TEST_CUSTOMER_ID);
    });
    withEnv({ CASE_ACCESS_SECRET: 'z'.repeat(64) }, () => {
      const result = verifyCaseAccessGrant(token, TEST_CASE_ID);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('invalid_signature');
    });
  });

  // T9: domain separation — OTP HMAC does not produce a valid case-access grant
  it('T9: OTP-style HMAC does not verify as a case-access grant', async () => {
    const crypto = await import('node:crypto');
    const { verifyCaseAccessGrant } = await import('@/lib/case-access-grant');
    withEnv({ CASE_ACCESS_SECRET: TEST_SECRET }, () => {
      // Simulate what an attacker would compute if they mistakenly thought
      // the grant uses the same domain as OTP
      const iat = Math.floor(Date.now() / 1000);
      const exp = iat + 7 * 24 * 3600;
      const wrongDomainMsg = `otp-domain:${TEST_CASE_ID}:${TEST_CUSTOMER_ID}:${iat}:${exp}`;
      const sig = crypto
        .createHmac('sha256', TEST_SECRET)
        .update(wrongDomainMsg)
        .digest('hex');
      const forgery = `${TEST_CASE_ID}.${TEST_CUSTOMER_ID}.${iat}.${exp}.${sig}`;
      const result = verifyCaseAccessGrant(forgery, TEST_CASE_ID);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('invalid_signature');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SEC-003: otp/refresh oracle protection (source-level checks)
// ─────────────────────────────────────────────────────────────────────────────

describe('SEC-003: otp/refresh no longer issues cookie from otpVerifiedAt alone', () => {
  it('refresh route imports verifyCaseAccessGrant', () => {
    const filePath = path.join(
      ROOT,
      'app/api/case/[token]/otp/refresh/route.ts'
    );
    expect(existsSync(filePath)).toBe(true);
    const content = require('fs').readFileSync(filePath, 'utf-8');
    expect(content).toContain('verifyCaseAccessGrant');
    expect(content).toContain('mintCaseAccessGrant');
  });

  it('refresh route does NOT issue cookie from otpVerifiedAt alone (old oracle pattern absent)', () => {
    const filePath = path.join(
      ROOT,
      'app/api/case/[token]/otp/refresh/route.ts'
    );
    const content = require('fs').readFileSync(filePath, 'utf-8');
    // Old oracle: check otpVerifiedAt then directly set cookie
    // The old pattern was: if (!c.customer?.otpVerifiedAt) return 403; res.cookies.set(... '1' ...)
    expect(content).not.toMatch(/cookies\.set\([^)]*'1'/);
  });

  it('refresh route returns 401 when no valid grant is present', () => {
    const filePath = path.join(
      ROOT,
      'app/api/case/[token]/otp/refresh/route.ts'
    );
    const content = require('fs').readFileSync(filePath, 'utf-8');
    expect(content).toContain('401');
    expect(content).toContain('no grant');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SEC-003: intake route auth gates (source-level checks)
// ─────────────────────────────────────────────────────────────────────────────

describe('SEC-003: intake route requires signed grant', () => {
  it('intake route imports verifyCaseAccessGrant', () => {
    const filePath = path.join(ROOT, 'app/api/case/[token]/intake/route.ts');
    expect(existsSync(filePath)).toBe(true);
    const content = require('fs').readFileSync(filePath, 'utf-8');
    expect(content).toContain('verifyCaseAccessGrant');
    expect(content).toContain('otpVerifiedAt');
    expect(content).toContain('customer_mismatch');
  });

  it('intake GET checks grant before returning data', () => {
    const filePath = path.join(ROOT, 'app/api/case/[token]/intake/route.ts');
    const content = require('fs').readFileSync(filePath, 'utf-8');
    // GET handler must have the auth check before returning intake data
    const getIndex = content.indexOf('export async function GET');
    const postIndex = content.indexOf('export async function POST');
    const authCheckInGet = content.indexOf('verifyCaseAccessGrant', getIndex);
    expect(authCheckInGet).toBeGreaterThan(getIndex);
    expect(authCheckInGet).toBeLessThan(postIndex);
  });

  it('intake POST checks grant before writing data', () => {
    const filePath = path.join(ROOT, 'app/api/case/[token]/intake/route.ts');
    const content = require('fs').readFileSync(filePath, 'utf-8');
    const postIndex = content.indexOf('export async function POST');
    const authCheckInPost = content.indexOf('verifyCaseAccessGrant', postIndex);
    expect(authCheckInPost).toBeGreaterThan(postIndex);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SEC-003: page.tsx uses grant validation
// ─────────────────────────────────────────────────────────────────────────────

describe('SEC-003: page.tsx uses verifyCaseAccessGrant', () => {
  it('page.tsx imports and calls verifyCaseAccessGrant', () => {
    const filePath = path.join(ROOT, 'app/case/[token]/page.tsx');
    expect(existsSync(filePath)).toBe(true);
    const content = require('fs').readFileSync(filePath, 'utf-8');
    expect(content).toContain('verifyCaseAccessGrant');
    expect(content).not.toContain("=== '1'");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SEC-003: verify/submit forwards signed grant cookie
// ─────────────────────────────────────────────────────────────────────────────

describe('SEC-003: verify/submit forwards signed grant cookie', () => {
  it('verify/submit extracts grant from internal response Set-Cookie', () => {
    const filePath = path.join(ROOT, 'app/case/[token]/verify/submit/route.ts');
    expect(existsSync(filePath)).toBe(true);
    const content = require('fs').readFileSync(filePath, 'utf-8');
    expect(content).toContain('caseAccessCookieName');
    expect(content).toContain('set-cookie');
    expect(content).not.toContain("'1'");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SEC-003: env-guard asserts CASE_ACCESS_SECRET
// ─────────────────────────────────────────────────────────────────────────────

describe('SEC-003: env-guard asserts CASE_ACCESS_SECRET', () => {
  it('env-guard source contains CASE_ACCESS_SECRET assertion', () => {
    const filePath = path.join(ROOT, 'lib/env-guard.ts');
    expect(existsSync(filePath)).toBe(true);
    const content = require('fs').readFileSync(filePath, 'utf-8');
    expect(content).toContain('CASE_ACCESS_SECRET');
    expect(content).toContain('SEC-003');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SEC-003: grant throws when CASE_ACCESS_SECRET is absent
// ─────────────────────────────────────────────────────────────────────────────

describe('SEC-003: case-access-grant fails closed when CASE_ACCESS_SECRET is absent', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('mintCaseAccessGrant throws when CASE_ACCESS_SECRET is not set', async () => {
    const { mintCaseAccessGrant } = await import('@/lib/case-access-grant');
    withEnv({ CASE_ACCESS_SECRET: undefined }, () => {
      expect(() => mintCaseAccessGrant(TEST_CASE_ID, TEST_CUSTOMER_ID)).toThrow(
        /CASE_ACCESS_SECRET/
      );
    });
  });

  it('mintCaseAccessGrant throws when CASE_ACCESS_SECRET is too short', async () => {
    const { mintCaseAccessGrant } = await import('@/lib/case-access-grant');
    withEnv({ CASE_ACCESS_SECRET: 'tooshort' }, () => {
      expect(() => mintCaseAccessGrant(TEST_CASE_ID, TEST_CUSTOMER_ID)).toThrow(
        /CASE_ACCESS_SECRET/
      );
    });
  });

  it('verifyCaseAccessGrant throws when CASE_ACCESS_SECRET is not set', async () => {
    const { verifyCaseAccessGrant } = await import('@/lib/case-access-grant');
    // First mint a valid token with a secret
    let token = '';
    const { mintCaseAccessGrant } = await import('@/lib/case-access-grant');
    withEnv({ CASE_ACCESS_SECRET: TEST_SECRET }, () => {
      token = mintCaseAccessGrant(TEST_CASE_ID, TEST_CUSTOMER_ID);
    });
    // Then verify with no secret — should throw
    withEnv({ CASE_ACCESS_SECRET: undefined }, () => {
      expect(() => verifyCaseAccessGrant(token, TEST_CASE_ID)).toThrow(
        /CASE_ACCESS_SECRET/
      );
    });
  });
});
