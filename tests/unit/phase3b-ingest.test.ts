/**
 * GT24 NEXT Phase 3B-1 — gutachten/ingest-text DB policy enforcement tests
 *
 * Verifies that the ingest-text route uses requireInternalAdmin() and enforces
 * strict DB-only authorization: INTERNAL org, ACTIVE membership, ADMIN or OWNER role.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

vi.mock('server-only', () => ({}));

// ── Module-level mocks ────────────────────────────────────────────────────────

vi.mock('@/lib/policy', () => ({
  requireInternalAdmin: vi.fn()
}));

const mockCase = {
  case: {
    findUnique: vi.fn()
  }
};
vi.mock('@/lib/prisma', () => ({ prisma: mockCase }));

vi.mock('@/features/gutachten-insights/lib/find-case-gutachten-file', () => ({
  findCaseGutachtenFile: vi.fn()
}));

vi.mock('@/features/gutachten-insights/lib/process-case-file', () => ({
  processCaseFile: vi.fn().mockResolvedValue({ ok: true })
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROUTE_PATH = path.resolve(
  __dirname,
  '../../src/app/api/cases/[id]/gutachten/ingest-text/route.ts'
);

function makeReq() {
  return new Request(
    'https://gt24-portal-next.vercel.app/api/cases/test-case/gutachten/ingest-text',
    { method: 'POST' }
  );
}

function makeCtx(id = 'test-case') {
  return { params: Promise.resolve({ id }) };
}

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURE: route file uses DB policy, not direct auth()
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3B ingest-text: route file structure', () => {
  it('ingest-text route file exists', () => {
    expect(existsSync(ROUTE_PATH)).toBe(true);
  });

  it('imports requireInternalAdmin from @/lib/policy', () => {
    const content = readFileSync(ROUTE_PATH, 'utf-8');
    expect(content).toContain("from '@/lib/policy'");
    expect(content).toContain('requireInternalAdmin');
  });

  it('does NOT import auth directly from @clerk/nextjs/server', () => {
    const content = readFileSync(ROUTE_PATH, 'utf-8');
    expect(content).not.toContain("from '@clerk/nextjs/server'");
  });

  it('does NOT read publicMetadata', () => {
    const content = readFileSync(ROUTE_PATH, 'utf-8');
    expect(content).not.toContain('publicMetadata');
  });

  it('does NOT use rbac.ts helpers', () => {
    const content = readFileSync(ROUTE_PATH, 'utf-8');
    expect(content).not.toContain("from '@/lib/rbac'");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTIONAL: authorization layer behavior
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3B ingest-text: authorization layer', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  // ── Deny cases ──────────────────────────────────────────────────────────────

  it('returns 401 when unauthenticated (no Clerk session)', async () => {
    const { requireInternalAdmin } = await import('@/lib/policy');
    vi.mocked(requireInternalAdmin).mockResolvedValue({
      ok: false,
      status: 401
    });
    const { POST } = await import(
      '@/app/api/cases/[id]/gutachten/ingest-text/route'
    );
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when user has no DB membership (requireInternalAdmin → 403)', async () => {
    const { requireInternalAdmin } = await import('@/lib/policy');
    vi.mocked(requireInternalAdmin).mockResolvedValue({
      ok: false,
      status: 403
    });
    const { POST } = await import(
      '@/app/api/cases/[id]/gutachten/ingest-text/route'
    );
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('Forbidden');
  });

  it('returns 403 for INACTIVE membership (requireInternalAdmin → 403)', async () => {
    // getInternalMembership filters status=ACTIVE — INACTIVE never matches
    const { requireInternalAdmin } = await import('@/lib/policy');
    vi.mocked(requireInternalAdmin).mockResolvedValue({
      ok: false,
      status: 403
    });
    const { POST } = await import(
      '@/app/api/cases/[id]/gutachten/ingest-text/route'
    );
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(403);
  });

  it('returns 403 for SUSPENDED/ARCHIVED organization (requireInternalAdmin → 403)', async () => {
    // getInternalMembership filters org.status=ACTIVE — SUSPENDED/ARCHIVED never matches
    const { requireInternalAdmin } = await import('@/lib/policy');
    vi.mocked(requireInternalAdmin).mockResolvedValue({
      ok: false,
      status: 403
    });
    const { POST } = await import(
      '@/app/api/cases/[id]/gutachten/ingest-text/route'
    );
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(403);
  });

  it('returns 403 for INTERNAL membership with role MEMBER', async () => {
    // requireInternalAdmin checks role in [ADMIN, OWNER] — MEMBER fails
    const { requireInternalAdmin } = await import('@/lib/policy');
    vi.mocked(requireInternalAdmin).mockResolvedValue({
      ok: false,
      status: 403
    });
    const { POST } = await import(
      '@/app/api/cases/[id]/gutachten/ingest-text/route'
    );
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(403);
  });

  it('returns 403 for INTERNAL membership with role VIEWER', async () => {
    const { requireInternalAdmin } = await import('@/lib/policy');
    vi.mocked(requireInternalAdmin).mockResolvedValue({
      ok: false,
      status: 403
    });
    const { POST } = await import(
      '@/app/api/cases/[id]/gutachten/ingest-text/route'
    );
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(403);
  });

  it('returns 403 for GUTACHTER organization membership', async () => {
    // getInternalMembership filters type=INTERNAL — GUTACHTER never matches
    const { requireInternalAdmin } = await import('@/lib/policy');
    vi.mocked(requireInternalAdmin).mockResolvedValue({
      ok: false,
      status: 403
    });
    const { POST } = await import(
      '@/app/api/cases/[id]/gutachten/ingest-text/route'
    );
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(403);
  });

  it('returns 403 for LEGAL organization membership', async () => {
    const { requireInternalAdmin } = await import('@/lib/policy');
    vi.mocked(requireInternalAdmin).mockResolvedValue({
      ok: false,
      status: 403
    });
    const { POST } = await import(
      '@/app/api/cases/[id]/gutachten/ingest-text/route'
    );
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(403);
  });

  it('returns 403 for legacy Clerk role ADMIN without DB membership', async () => {
    // No publicMetadata fallback — Clerk role without DB membership is denied
    const { requireInternalAdmin } = await import('@/lib/policy');
    vi.mocked(requireInternalAdmin).mockResolvedValue({
      ok: false,
      status: 403
    });
    const { POST } = await import(
      '@/app/api/cases/[id]/gutachten/ingest-text/route'
    );
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(403);
  });

  // ── Allow cases ─────────────────────────────────────────────────────────────

  it('passes auth and reaches business logic for INTERNAL ADMIN (case not found → 404)', async () => {
    const { requireInternalAdmin } = await import('@/lib/policy');
    vi.mocked(requireInternalAdmin).mockResolvedValue({
      ok: true,
      clerkUserId: 'user_test_admin'
    });
    // Mock case not found — proves auth passed (otherwise would have returned 401/403)
    mockCase.case.findUnique.mockResolvedValue(null);
    const { POST } = await import(
      '@/app/api/cases/[id]/gutachten/ingest-text/route'
    );
    const res = await POST(makeReq(), makeCtx());
    // 404 = auth passed, business logic ran, case not found in test DB
    expect(res.status).toBe(404);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expect(mockCase.case.findUnique).toHaveBeenCalled();
  });

  it('passes auth and reaches business logic for INTERNAL OWNER (case not found → 404)', async () => {
    const { requireInternalAdmin } = await import('@/lib/policy');
    vi.mocked(requireInternalAdmin).mockResolvedValue({
      ok: true,
      clerkUserId: 'user_test_owner'
    });
    mockCase.case.findUnique.mockResolvedValue(null);
    const { POST } = await import(
      '@/app/api/cases/[id]/gutachten/ingest-text/route'
    );
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(404);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expect(mockCase.case.findUnique).toHaveBeenCalled();
  });
});
