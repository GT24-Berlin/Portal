/**
 * Phase 3B-2E — Case Access Enforcement Tests
 *
 * Covers:
 *   PATCH: /api/cases/[id]           — status mutation
 *   POST:  /api/admin/leads/[id]/case — case creation
 *
 * Authorization model:
 *   PATCH STATUS:
 *     requireCaseWrite(STATUS) → INTERNAL admin (both lanes) or ASSIGNED partner (own lane)
 *     Lane derived from DB org type: GUTACHTER→GUTACHTER, LEGAL→ANWALT
 *   POST CASE CREATION:
 *     requireInternalAdmin() → INTERNAL org + ADMIN/OWNER role
 *     OWNER CaseOrganization created atomically in transaction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mockRequireCaseWrite = vi.hoisted(() => vi.fn());
const mockRequireInternalAdmin = vi.hoisted(() => vi.fn());
const mockGetInternalMembership = vi.hoisted(() => vi.fn());
const mockCaseUpdate = vi.hoisted(() => vi.fn());
const mockLeadFindUnique = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const mockGetNextCaseNumber = vi.hoisted(() => vi.fn());
const mockCreateCaseWithUniqueToken = vi.hoisted(() => vi.fn());

vi.mock('@/lib/policy', () => ({
  requireCaseWrite: mockRequireCaseWrite,
  requireInternalAdmin: mockRequireInternalAdmin,
  getInternalMembership: mockGetInternalMembership
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    case: { update: mockCaseUpdate },
    lead: { findUnique: mockLeadFindUnique },
    $transaction: mockTransaction
  }
}));

vi.mock('@/features/case-number/server/get-next-case-number', () => ({
  getNextCaseNumber: mockGetNextCaseNumber
}));

vi.mock('@/features/case-token/server/case-token', () => ({
  createCaseWithUniqueToken: mockCreateCaseWithUniqueToken
}));

// ── Route imports (after mocks) ───────────────────────────────────────────────

import { PATCH } from '@/app/api/cases/[id]/route';
import { POST } from '@/app/api/admin/leads/[id]/case/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeLeadParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchReq(body: Record<string, unknown>) {
  return new Request('http://localhost/api/cases/case-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

function makeInternalGuard() {
  return {
    ok: true as const,
    clerkUserId: 'user_internal',
    capability: 'STATUS' as const,
    caseOrgs: [
      {
        id: 'co-1',
        caseId: 'case-1',
        organizationId: 'org-internal',
        role: 'OWNER',
        organization: {
          id: 'org-internal',
          type: 'INTERNAL',
          status: 'ACTIVE',
          name: 'GT24'
        }
      } as any
    ],
    memberships: [] as any[]
  };
}

function makeGutachterGuard() {
  return {
    ok: true as const,
    clerkUserId: 'user_gutachter',
    capability: 'STATUS' as const,
    assignment: {
      id: 'a1',
      caseId: 'case-1',
      role: 'GUTACHTER',
      assigneeClerkUserId: 'user_gutachter',
      status: 'ACCEPTED',
      active: true,
      activeKey: 'ACTIVE',
      expiresAt: new Date(Date.now() + 86400000),
      assignedAt: new Date(),
      acceptedAt: new Date()
    } as any,
    caseOrgs: [
      {
        id: 'co-2',
        caseId: 'case-1',
        organizationId: 'org-gutachter',
        role: 'ASSIGNED',
        organization: {
          id: 'org-gutachter',
          type: 'GUTACHTER',
          status: 'ACTIVE',
          name: 'Gutachter GmbH'
        }
      } as any
    ],
    memberships: [] as any[]
  };
}

function makeLegalGuard() {
  return {
    ok: true as const,
    clerkUserId: 'user_anwalt',
    capability: 'STATUS' as const,
    assignment: {
      id: 'a2',
      caseId: 'case-1',
      role: 'ANWALT',
      assigneeClerkUserId: 'user_anwalt',
      status: 'ACCEPTED',
      active: true,
      activeKey: 'ACTIVE',
      expiresAt: new Date(Date.now() + 86400000),
      assignedAt: new Date(),
      acceptedAt: new Date()
    } as any,
    caseOrgs: [
      {
        id: 'co-3',
        caseId: 'case-1',
        organizationId: 'org-legal',
        role: 'ASSIGNED',
        organization: {
          id: 'org-legal',
          type: 'LEGAL',
          status: 'ACTIVE',
          name: 'Kanzlei GmbH'
        }
      } as any
    ],
    memberships: [] as any[]
  };
}

function makeUpdatedCase() {
  return {
    id: 'case-1',
    gutachterStatus: 'EINGEGANGEN',
    anwaltStatus: 'FALL_EINGEGANGEN',
    events: []
  };
}

// ── PATCH /api/cases/[id] ─────────────────────────────────────────────────────

describe('PATCH /api/cases/[id] — status mutation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCaseUpdate.mockResolvedValue(makeUpdatedCase());
  });

  // ── Auth checks ────────────────────────────────────────────────────────────

  it('returns 401 when requireCaseWrite returns 401', async () => {
    mockRequireCaseWrite.mockResolvedValue({ ok: false, status: 401 });
    const res = await PATCH(
      patchReq({ gutachterStatus: 'EINGEGANGEN' }),
      makeParams('case-1')
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({
      ok: false,
      error: 'Unauthorized'
    });
  });

  it('returns 403 when requireCaseWrite returns 403', async () => {
    mockRequireCaseWrite.mockResolvedValue({ ok: false, status: 403 });
    const res = await PATCH(
      patchReq({ gutachterStatus: 'EINGEGANGEN' }),
      makeParams('case-1')
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ ok: false, error: 'Forbidden' });
  });

  it('returns 403 when requireCaseWrite returns 404', async () => {
    mockRequireCaseWrite.mockResolvedValue({ ok: false, status: 404 });
    const res = await PATCH(
      patchReq({ gutachterStatus: 'EINGEGANGEN' }),
      makeParams('case-1')
    );
    expect(res.status).toBe(403);
  });

  // ── Input validation ───────────────────────────────────────────────────────

  it('returns 400 when neither gutachterStatus nor anwaltStatus provided', async () => {
    mockRequireCaseWrite.mockResolvedValue(makeInternalGuard());
    const res = await PATCH(patchReq({}), makeParams('case-1'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid gutachterStatus value', async () => {
    mockRequireCaseWrite.mockResolvedValue(makeInternalGuard());
    const res = await PATCH(
      patchReq({ gutachterStatus: 'INVALID_STATUS' }),
      makeParams('case-1')
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false });
  });

  it('returns 400 for invalid anwaltStatus value', async () => {
    mockRequireCaseWrite.mockResolvedValue(makeInternalGuard());
    const res = await PATCH(
      patchReq({ anwaltStatus: 'NOT_A_STATUS' }),
      makeParams('case-1')
    );
    expect(res.status).toBe(400);
  });

  // ── INTERNAL admin path ────────────────────────────────────────────────────

  it('INTERNAL admin can update gutachterStatus', async () => {
    mockRequireCaseWrite.mockResolvedValue(makeInternalGuard());
    const res = await PATCH(
      patchReq({ gutachterStatus: 'EINGEGANGEN' }),
      makeParams('case-1')
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockCaseUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'case-1' } })
    );
  });

  it('INTERNAL admin can update anwaltStatus', async () => {
    mockRequireCaseWrite.mockResolvedValue(makeInternalGuard());
    const res = await PATCH(
      patchReq({ anwaltStatus: 'FALL_EINGEGANGEN' }),
      makeParams('case-1')
    );
    expect(res.status).toBe(200);
  });

  it('INTERNAL admin can update both lanes simultaneously', async () => {
    mockRequireCaseWrite.mockResolvedValue(makeInternalGuard());
    const res = await PATCH(
      patchReq({
        gutachterStatus: 'EINGEGANGEN',
        anwaltStatus: 'FALL_EINGEGANGEN'
      }),
      makeParams('case-1')
    );
    expect(res.status).toBe(200);
  });

  // ── GUTACHTER partner path ─────────────────────────────────────────────────

  it('GUTACHTER partner can update gutachterStatus', async () => {
    mockRequireCaseWrite.mockResolvedValue(makeGutachterGuard());
    const res = await PATCH(
      patchReq({ gutachterStatus: 'GUTACHTER_KONTAKTIERT' }),
      makeParams('case-1')
    );
    expect(res.status).toBe(200);
  });

  it('GUTACHTER partner is blocked from updating anwaltStatus', async () => {
    mockRequireCaseWrite.mockResolvedValue(makeGutachterGuard());
    const res = await PATCH(
      patchReq({ anwaltStatus: 'FALL_EINGEGANGEN' }),
      makeParams('case-1')
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({
      error: expect.stringContaining('GUTACHTER cannot update anwaltStatus')
    });
  });

  it('GUTACHTER partner is blocked from updating both lanes', async () => {
    mockRequireCaseWrite.mockResolvedValue(makeGutachterGuard());
    const res = await PATCH(
      patchReq({
        gutachterStatus: 'EINGEGANGEN',
        anwaltStatus: 'FALL_EINGEGANGEN'
      }),
      makeParams('case-1')
    );
    expect(res.status).toBe(403);
  });

  // ── LEGAL (ANWALT) partner path ────────────────────────────────────────────

  it('LEGAL partner can update anwaltStatus', async () => {
    mockRequireCaseWrite.mockResolvedValue(makeLegalGuard());
    const res = await PATCH(
      patchReq({ anwaltStatus: 'FALL_IN_PRUEFUNG' }),
      makeParams('case-1')
    );
    expect(res.status).toBe(200);
  });

  it('LEGAL partner is blocked from updating gutachterStatus', async () => {
    mockRequireCaseWrite.mockResolvedValue(makeLegalGuard());
    const res = await PATCH(
      patchReq({ gutachterStatus: 'EINGEGANGEN' }),
      makeParams('case-1')
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({
      error: expect.stringContaining('ANWALT cannot update gutachterStatus')
    });
  });

  it('LEGAL partner is blocked from updating both lanes', async () => {
    mockRequireCaseWrite.mockResolvedValue(makeLegalGuard());
    const res = await PATCH(
      patchReq({
        gutachterStatus: 'EINGEGANGEN',
        anwaltStatus: 'FALL_EINGEGANGEN'
      }),
      makeParams('case-1')
    );
    expect(res.status).toBe(403);
  });

  // ── P2025 (case not found) ─────────────────────────────────────────────────

  it('returns 404 when prisma throws P2025', async () => {
    mockRequireCaseWrite.mockResolvedValue(makeInternalGuard());
    mockCaseUpdate.mockRejectedValue({ code: 'P2025' });
    const res = await PATCH(
      patchReq({ gutachterStatus: 'EINGEGANGEN' }),
      makeParams('case-1')
    );
    expect(res.status).toBe(404);
  });

  // ── Lane derivation from DB org type (never Clerk role) ───────────────────

  it('uses DB org type for lane — GUTACHTER org grants GUTACHTER lane', async () => {
    mockRequireCaseWrite.mockResolvedValue(makeGutachterGuard());
    await PATCH(
      patchReq({ gutachterStatus: 'GUTACHTEN_ERSTELLT' }),
      makeParams('case-1')
    );
    expect(mockCaseUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ gutachterStatus: 'GUTACHTEN_ERSTELLT' })
      })
    );
  });

  it('uses DB org type for lane — LEGAL org grants ANWALT lane', async () => {
    mockRequireCaseWrite.mockResolvedValue(makeLegalGuard());
    await PATCH(
      patchReq({ anwaltStatus: 'FALL_ABGESCHLOSSEN' }),
      makeParams('case-1')
    );
    expect(mockCaseUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ anwaltStatus: 'FALL_ABGESCHLOSSEN' })
      })
    );
  });
});

// ── POST /api/admin/leads/[id]/case ───────────────────────────────────────────

describe('POST /api/admin/leads/[id]/case — case creation', () => {
  const mockReq = new Request('http://localhost/api/admin/leads/lead-1/case', {
    method: 'POST'
  });

  const mockCaseRecord = {
    id: 'case-new',
    token: 'tok-abc',
    caseNumber: 'GT-2026-001',
    events: []
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ── Auth checks ────────────────────────────────────────────────────────────

  it('returns 401 when requireInternalAdmin returns 401', async () => {
    mockRequireInternalAdmin.mockResolvedValue({ ok: false, status: 401 });
    const res = await POST(mockReq, makeLeadParams('lead-1'));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({
      ok: false,
      error: 'Unauthorized'
    });
  });

  it('returns 403 when requireInternalAdmin returns 403', async () => {
    mockRequireInternalAdmin.mockResolvedValue({ ok: false, status: 403 });
    const res = await POST(mockReq, makeLeadParams('lead-1'));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ ok: false, error: 'Forbidden' });
  });

  it('returns 403 when getInternalMembership returns null', async () => {
    mockRequireInternalAdmin.mockResolvedValue({
      ok: true,
      clerkUserId: 'user_internal'
    });
    mockGetInternalMembership.mockResolvedValue(null);
    const res = await POST(mockReq, makeLeadParams('lead-1'));
    expect(res.status).toBe(403);
  });

  // ── Lead not found ─────────────────────────────────────────────────────────

  it('returns 404 when lead does not exist', async () => {
    mockRequireInternalAdmin.mockResolvedValue({
      ok: true,
      clerkUserId: 'user_internal'
    });
    mockGetInternalMembership.mockResolvedValue({
      organizationId: 'org-internal'
    });
    mockLeadFindUnique.mockResolvedValue(null);
    const res = await POST(mockReq, makeLeadParams('lead-missing'));
    expect(res.status).toBe(404);
  });

  // ── Idempotency: case already exists ──────────────────────────────────────

  it('returns existing case when lead already has a case', async () => {
    mockRequireInternalAdmin.mockResolvedValue({
      ok: true,
      clerkUserId: 'user_internal'
    });
    mockGetInternalMembership.mockResolvedValue({
      organizationId: 'org-internal'
    });
    const existingCase = {
      id: 'case-existing',
      token: 'tok-existing',
      caseNumber: 'GT-2026-000',
      createdAt: new Date()
    };
    mockLeadFindUnique.mockResolvedValue({
      id: 'lead-1',
      case: existingCase
    });
    const res = await POST(mockReq, makeLeadParams('lead-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.alreadyExisted).toBe(true);
    expect(body.case.id).toBe('case-existing');
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  // ── Successful creation ────────────────────────────────────────────────────

  it('creates case with OWNER CaseOrganization atomically in transaction', async () => {
    mockRequireInternalAdmin.mockResolvedValue({
      ok: true,
      clerkUserId: 'user_internal'
    });
    mockGetInternalMembership.mockResolvedValue({
      organizationId: 'org-internal'
    });
    mockLeadFindUnique.mockResolvedValue({ id: 'lead-1', case: null });

    mockTransaction.mockImplementation(async (fn: Function) => {
      const mockTx = {
        case: {
          create: vi.fn().mockResolvedValue(mockCaseRecord)
        },
        caseOrganization: {
          upsert: vi.fn().mockResolvedValue({ id: 'co-new' })
        },
        lead: {
          update: vi
            .fn()
            .mockResolvedValue({ id: 'lead-1', status: 'IN_PROGRESS' })
        }
      };
      mockGetNextCaseNumber.mockResolvedValue('GT-2026-001');
      mockCreateCaseWithUniqueToken.mockImplementation(
        async (createFn: Function) => createFn('tok-abc')
      );
      return fn(mockTx);
    });

    const res = await POST(mockReq, makeLeadParams('lead-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.alreadyExisted).toBeUndefined();
  });

  it('OWNER CaseOrganization uses the caller internal org ID from DB', async () => {
    mockRequireInternalAdmin.mockResolvedValue({
      ok: true,
      clerkUserId: 'user_internal'
    });
    mockGetInternalMembership.mockResolvedValue({
      organizationId: 'org-internal-correct'
    });
    mockLeadFindUnique.mockResolvedValue({ id: 'lead-1', case: null });

    const caseOrgUpsert = vi.fn().mockResolvedValue({ id: 'co-new' });

    mockTransaction.mockImplementation(async (fn: Function) => {
      const mockTx = {
        case: { create: vi.fn().mockResolvedValue(mockCaseRecord) },
        caseOrganization: { upsert: caseOrgUpsert },
        lead: { update: vi.fn().mockResolvedValue({}) }
      };
      mockGetNextCaseNumber.mockResolvedValue('GT-2026-001');
      mockCreateCaseWithUniqueToken.mockImplementation(
        async (createFn: Function) => createFn('tok-abc')
      );
      return fn(mockTx);
    });

    await POST(mockReq, makeLeadParams('lead-1'));

    expect(caseOrgUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          organizationId: 'org-internal-correct',
          role: 'OWNER'
        })
      })
    );
  });

  it('lead is updated to IN_PROGRESS in the same transaction', async () => {
    mockRequireInternalAdmin.mockResolvedValue({
      ok: true,
      clerkUserId: 'user_internal'
    });
    mockGetInternalMembership.mockResolvedValue({
      organizationId: 'org-internal'
    });
    mockLeadFindUnique.mockResolvedValue({ id: 'lead-1', case: null });

    const leadUpdate = vi.fn().mockResolvedValue({});

    mockTransaction.mockImplementation(async (fn: Function) => {
      const mockTx = {
        case: { create: vi.fn().mockResolvedValue(mockCaseRecord) },
        caseOrganization: { upsert: vi.fn().mockResolvedValue({}) },
        lead: { update: leadUpdate }
      };
      mockGetNextCaseNumber.mockResolvedValue('GT-2026-001');
      mockCreateCaseWithUniqueToken.mockImplementation(
        async (createFn: Function) => createFn('tok-abc')
      );
      return fn(mockTx);
    });

    await POST(mockReq, makeLeadParams('lead-1'));

    expect(leadUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lead-1' },
        data: { status: 'IN_PROGRESS' }
      })
    );
  });
});

// ── Structure / no-publicMetadata checks ──────────────────────────────────────

describe('Phase 3B-2E structure checks', () => {
  it('PATCH route does not import from @/lib/rbac', async () => {
    const source = await import('fs').then((fs) =>
      fs.readFileSync(
        new URL('../../src/app/api/cases/[id]/route.ts', import.meta.url)
          .pathname,
        'utf-8'
      )
    );
    expect(source).not.toContain("from '@/lib/rbac'");
    expect(source).not.toContain('currentUser');
    expect(source).not.toContain('publicMetadata');
  });

  it('PATCH route imports requireCaseWrite from @/lib/policy', async () => {
    const source = await import('fs').then((fs) =>
      fs.readFileSync(
        new URL('../../src/app/api/cases/[id]/route.ts', import.meta.url)
          .pathname,
        'utf-8'
      )
    );
    expect(source).toContain('requireCaseWrite');
    expect(source).toContain("from '@/lib/policy'");
  });

  it('case creation route does not import from @/lib/rbac', async () => {
    const source = await import('fs').then((fs) =>
      fs.readFileSync(
        new URL(
          '../../src/app/api/admin/leads/[id]/case/route.ts',
          import.meta.url
        ).pathname,
        'utf-8'
      )
    );
    expect(source).not.toContain("from '@/lib/rbac'");
    expect(source).not.toContain('publicMetadata');
  });

  it('case creation route creates OWNER CaseOrganization atomically', async () => {
    const source = await import('fs').then((fs) =>
      fs.readFileSync(
        new URL(
          '../../src/app/api/admin/leads/[id]/case/route.ts',
          import.meta.url
        ).pathname,
        'utf-8'
      )
    );
    expect(source).toContain('caseOrganization');
    expect(source).toContain("role: 'OWNER'");
    expect(source).toContain('$transaction');
  });
});
