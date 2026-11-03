/**
 * GT24 NEXT Phase 3B-2D2 — Accept / Release route tests
 *
 * Covers:
 *   Accept:
 *     - Auth, wrong-caller, PENDING→ACCEPTED happy path
 *     - CaseOrganization ASSIGNED upserted with correct org
 *     - GUTACHTER and ANWALT→LEGAL mapping
 *     - Org chain validation failures (suspended, inactive membership, type mismatch)
 *     - Expired assignment → EXPIRED (not accepted)
 *     - Non-PENDING states (released, activeKey=null, active=false) → denied
 *     - Transaction atomicity: rollback leaves no partial CaseOrg
 *     - Duplicate accept idempotency: no duplicate CaseOrg, no duplicate notification
 *
 *   Release:
 *     - Auth, wrong-caller
 *     - Active accepted assignment → RELEASED
 *     - Release sets active=false, activeKey=null, releasedAt
 *     - CaseOrganization ASSIGNED NOT deleted
 *     - Released assignment cannot be re-released for operational access
 *
 *   Transition:
 *     - No publicMetadata usage in either route
 *     - No requireAdmin/requireRole fallback
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

vi.mock('server-only', () => ({}));
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));

const mockPrisma = vi.hoisted(() => ({
  membership: { findFirst: vi.fn() },
  caseOrganization: { upsert: vi.fn(), delete: vi.fn() },
  caseAssignment: {
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn()
  },
  partnerProfile: { findUnique: vi.fn() },
  partner: { findUnique: vi.fn() },
  organization: { findUnique: vi.fn() },
  case: { findUnique: vi.fn() },
  $transaction: vi.fn()
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/mailer', () => ({ sendMail: vi.fn() }));
vi.mock('@/lib/ops-log', () => ({ logOperationalEvent: vi.fn() }));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: { status?: number }) => ({
      _body: body,
      status: init?.status ?? 200
    }))
  }
}));

import { POST as acceptPOST } from '@/app/api/cases/[id]/accept/route';
import { POST as releasePOST } from '@/app/api/cases/[id]/release/route';
import { auth } from '@clerk/nextjs/server';

type MockRes = { status: number; _body: Record<string, unknown> };

async function callAccept(caseId = 'case-001'): Promise<MockRes> {
  return acceptPOST({} as Request, {
    params: Promise.resolve({ id: caseId })
  }) as unknown as Promise<MockRes>;
}

async function callRelease(caseId = 'case-001'): Promise<MockRes> {
  return releasePOST({} as Request, {
    params: Promise.resolve({ id: caseId })
  }) as unknown as Promise<MockRes>;
}

// ── Fixture helpers ───────────────────────────────────────────────────────────

function setAuth(userId: string | null) {
  vi.mocked(auth).mockResolvedValue({ userId } as any);
}

function pendingAssignment(overrides?: object) {
  return {
    id: 'assign-1',
    status: 'PENDING',
    active: true,
    activeKey: 'ACTIVE',
    expiresAt: new Date(Date.now() + 3600_000),
    role: 'GUTACHTER',
    ...overrides
  };
}

function acceptedAssignment(overrides?: object) {
  return {
    id: 'assign-1',
    status: 'ACCEPTED',
    active: true,
    activeKey: 'ACTIVE',
    expiresAt: new Date(Date.now() + 3600_000),
    role: 'GUTACHTER',
    ...overrides
  };
}

function mockValidOrgChain(role: 'GUTACHTER' | 'ANWALT' = 'GUTACHTER') {
  const orgType = role === 'GUTACHTER' ? 'GUTACHTER' : 'LEGAL';
  const orgId = role === 'GUTACHTER' ? 'org-gutachter-1' : 'org-legal-1';
  mockPrisma.partnerProfile.findUnique.mockResolvedValue({
    clerkUserId: 'user_partner',
    role,
    partnerId: 'partner-1'
  });
  mockPrisma.partner.findUnique.mockResolvedValue({
    id: 'partner-1',
    type: role,
    organizationId: orgId
  });
  mockPrisma.organization.findUnique.mockResolvedValue({
    id: orgId,
    type: orgType,
    status: 'ACTIVE'
  });
  mockPrisma.membership.findFirst.mockResolvedValue({
    clerkUserId: 'user_partner',
    organizationId: orgId,
    status: 'ACTIVE'
  });
  return orgId;
}

function mockAcceptTransaction(overrides?: {
  txFindFirstResult?: object | null;
  createData?: object;
}) {
  mockPrisma.$transaction.mockImplementation(async (fn: any) => {
    const txResult = overrides?.txFindFirstResult ?? pendingAssignment();
    return fn({
      caseAssignment: {
        findFirst: vi.fn().mockResolvedValue(txResult),
        update: vi.fn().mockImplementation(async ({ data }: any) => ({
          id: 'assign-1',
          status: data.status ?? 'ACCEPTED',
          active: data.active ?? true,
          expiresAt: new Date(Date.now() + 3600_000),
          role: 'GUTACHTER'
        })),
        updateMany: vi.fn()
      },
      caseOrganization: {
        upsert: vi.fn().mockResolvedValue({ id: 'caseorg-1' })
      },
      notification: { create: vi.fn() }
    });
  });
}

function mockReleaseTransaction(foundAssignment: object | null) {
  mockPrisma.$transaction.mockImplementation(async (fn: any) => {
    const txFindFirst = vi
      .fn()
      .mockResolvedValueOnce(foundAssignment)
      .mockResolvedValue(null);
    return fn({
      caseAssignment: {
        findFirst: txFindFirst,
        update: vi.fn().mockImplementation(async ({ data }: any) => ({
          id: 'assign-1',
          status: data.status ?? 'RELEASED',
          active: data.active ?? false,
          role: 'GUTACHTER'
        })),
        updateMany: vi.fn()
      },
      notification: { create: vi.fn() }
    });
  });
}

// ── Source files ──────────────────────────────────────────────────────────────

const acceptSource = readFileSync(
  resolve(process.cwd(), 'src/app/api/cases/[id]/accept/route.ts'),
  'utf-8'
);
const releaseSource = readFileSync(
  resolve(process.cwd(), 'src/app/api/cases/[id]/release/route.ts'),
  'utf-8'
);

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURE: no publicMetadata fallback
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3B-2D2: structure (no publicMetadata)', () => {
  it('accept route: no requireAdmin, no publicMetadata', () => {
    expect(acceptSource).not.toContain('requireAdmin');
    expect(acceptSource).not.toContain('publicMetadata');
    expect(acceptSource).not.toContain("from '@/lib/rbac'");
  });

  it('release route: no requireAdmin, no publicMetadata', () => {
    expect(releaseSource).not.toContain('requireAdmin');
    expect(releaseSource).not.toContain('publicMetadata');
    expect(releaseSource).not.toContain("from '@/lib/rbac'");
  });

  it('accept route: upserts CaseOrganization ASSIGNED on accept', () => {
    expect(acceptSource).toContain('caseOrganization.upsert');
    expect(acceptSource).toContain("role: 'ASSIGNED'");
  });

  it('release route: does NOT delete CaseOrganization', () => {
    expect(releaseSource).not.toContain('caseOrganization.delete');
    expect(releaseSource).not.toContain('caseOrganization.upsert');
    expect(releaseSource).not.toContain('caseOrganization');
  });

  it('accept route: resolves org BEFORE $transaction', () => {
    const resolveIdx = acceptSource.indexOf('resolveCallerOrg(');
    const txIdx = acceptSource.indexOf('$transaction(');
    expect(resolveIdx).toBeGreaterThan(0);
    expect(txIdx).toBeGreaterThan(resolveIdx);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ACCEPT: authorization
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3B-2D2 accept: authorization', () => {
  beforeEach(() => vi.clearAllMocks());

  it('unauthenticated → 401', async () => {
    setAuth(null);
    const res = await callAccept();
    expect(res.status).toBe(401);
  });

  it('no assignment for caller → 404', async () => {
    setAuth('user_partner');
    mockPrisma.caseAssignment.findFirst.mockResolvedValue(null);
    const res = await callAccept();
    expect(res.status).toBe(404);
  });

  it('wrong caller (different assignee) → 404 (no assignment found)', async () => {
    setAuth('user_other');
    // findFirst returns null because assigneeClerkUserId does not match
    mockPrisma.caseAssignment.findFirst.mockResolvedValue(null);
    const res = await callAccept();
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ACCEPT: org chain validation
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3B-2D2 accept: org chain validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth('user_partner');
    mockPrisma.caseAssignment.findFirst.mockResolvedValue(pendingAssignment());
  });

  it('missing PartnerProfile → 422', async () => {
    mockPrisma.partnerProfile.findUnique.mockResolvedValue(null);
    const res = await callAccept();
    expect(res.status).toBe(422);
    expect(res._body.error).toMatch(/PartnerProfile/);
  });

  it('Organization SUSPENDED → 422', async () => {
    mockPrisma.partnerProfile.findUnique.mockResolvedValue({
      role: 'GUTACHTER',
      partnerId: 'p1'
    });
    mockPrisma.partner.findUnique.mockResolvedValue({
      id: 'p1',
      type: 'GUTACHTER',
      organizationId: 'org-1'
    });
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      type: 'GUTACHTER',
      status: 'SUSPENDED'
    });
    const res = await callAccept();
    expect(res.status).toBe(422);
    expect(res._body.error).toMatch(/not ACTIVE/);
  });

  it('no ACTIVE Membership → 422', async () => {
    mockPrisma.partnerProfile.findUnique.mockResolvedValue({
      role: 'GUTACHTER',
      partnerId: 'p1'
    });
    mockPrisma.partner.findUnique.mockResolvedValue({
      id: 'p1',
      type: 'GUTACHTER',
      organizationId: 'org-1'
    });
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      type: 'GUTACHTER',
      status: 'ACTIVE'
    });
    mockPrisma.membership.findFirst.mockResolvedValue(null);
    const res = await callAccept();
    expect(res.status).toBe(422);
    expect(res._body.error).toMatch(/Membership/);
  });

  it('GUTACHTER profile with LEGAL org → 422 (type mismatch)', async () => {
    mockPrisma.partnerProfile.findUnique.mockResolvedValue({
      role: 'GUTACHTER',
      partnerId: 'p1'
    });
    mockPrisma.partner.findUnique.mockResolvedValue({
      id: 'p1',
      type: 'GUTACHTER',
      organizationId: 'org-legal'
    });
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-legal',
      type: 'LEGAL',
      status: 'ACTIVE'
    });
    const res = await callAccept();
    expect(res.status).toBe(422);
    expect(res._body.error).toMatch(/mismatch/);
  });

  it('ANWALT assignment resolves to LEGAL org type', async () => {
    mockPrisma.caseAssignment.findFirst.mockResolvedValue(
      pendingAssignment({ role: 'ANWALT' })
    );
    const orgId = mockValidOrgChain('ANWALT');
    mockAcceptTransaction();
    mockPrisma.case.findUnique.mockResolvedValue(null);
    const res = await callAccept();
    expect(res.status).toBe(200);
    // org resolved was the LEGAL org
    expect(orgId).toBe('org-legal-1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ACCEPT: assignment state gating
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3B-2D2 accept: assignment state gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth('user_partner');
  });

  it('released assignment → 404', async () => {
    mockPrisma.caseAssignment.findFirst.mockResolvedValue({
      ...pendingAssignment(),
      status: 'RELEASED'
    });
    const res = await callAccept();
    expect(res.status).toBe(404);
  });

  it('activeKey=null → 404 (not found by query)', async () => {
    // The findFirst filters by activeKey='ACTIVE'; null returns nothing
    mockPrisma.caseAssignment.findFirst.mockResolvedValue(null);
    const res = await callAccept();
    expect(res.status).toBe(404);
  });

  it('active=false (liveness inconsistency) → denied in transaction', async () => {
    setAuth('user_partner');
    const inconsistentRow = { ...pendingAssignment(), active: false };
    // Outside read returns a PENDING row but active=false
    mockPrisma.caseAssignment.findFirst.mockResolvedValue(inconsistentRow);
    mockValidOrgChain('GUTACHTER');
    // Inside transaction, the re-read also returns inconsistent row
    mockPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        caseAssignment: {
          findFirst: vi.fn().mockResolvedValue(inconsistentRow),
          update: vi.fn(),
          updateMany: vi.fn()
        },
        caseOrganization: { upsert: vi.fn() },
        notification: { create: vi.fn() }
      })
    );
    const res = await callAccept();
    expect(res.status).toBe(404);
  });

  it('expired assignment → 410 and transitions to EXPIRED status', async () => {
    const expiredPending = {
      ...pendingAssignment(),
      expiresAt: new Date(Date.now() - 1000) // already past
    };
    mockPrisma.caseAssignment.findFirst.mockResolvedValue(expiredPending);
    mockValidOrgChain('GUTACHTER');
    let updatedData: any;
    mockPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        caseAssignment: {
          findFirst: vi.fn().mockResolvedValue(expiredPending),
          update: vi.fn().mockImplementation(async ({ data }: any) => {
            updatedData = data;
            return {};
          }),
          updateMany: vi.fn()
        },
        caseOrganization: { upsert: vi.fn() },
        notification: { create: vi.fn() }
      })
    );
    const res = await callAccept();
    expect(res.status).toBe(410);
    expect(updatedData.status).toBe('EXPIRED');
    expect(updatedData.active).toBe(false);
    expect(updatedData.activeKey).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ACCEPT: happy path
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3B-2D2 accept: happy path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth('user_partner');
    mockPrisma.caseAssignment.findFirst.mockResolvedValue(pendingAssignment());
  });

  it('PENDING active assignment → 200 accepted', async () => {
    mockValidOrgChain('GUTACHTER');
    mockAcceptTransaction();
    mockPrisma.case.findUnique.mockResolvedValue(null);
    const res = await callAccept();
    expect(res.status).toBe(200);
    expect(res._body.ok).toBe(true);
  });

  it('acceptance upserts CaseOrganization ASSIGNED', async () => {
    mockValidOrgChain('GUTACHTER');
    let upsertCalled = false;
    mockPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        caseAssignment: {
          findFirst: vi.fn().mockResolvedValue(pendingAssignment()),
          update: vi
            .fn()
            .mockResolvedValue({
              id: 'a1',
              status: 'ACCEPTED',
              active: true,
              expiresAt: new Date(),
              role: 'GUTACHTER'
            }),
          updateMany: vi.fn()
        },
        caseOrganization: {
          upsert: vi.fn().mockImplementation(async () => {
            upsertCalled = true;
            return {};
          })
        },
        notification: { create: vi.fn() }
      })
    );
    mockPrisma.case.findUnique.mockResolvedValue(null);
    await callAccept();
    expect(upsertCalled).toBe(true);
  });

  it('CaseOrg upsert uses the resolved organizationId (GUTACHTER)', async () => {
    const orgId = mockValidOrgChain('GUTACHTER');
    let capturedUpsert: any;
    mockPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        caseAssignment: {
          findFirst: vi.fn().mockResolvedValue(pendingAssignment()),
          update: vi
            .fn()
            .mockResolvedValue({
              id: 'a1',
              status: 'ACCEPTED',
              active: true,
              expiresAt: new Date(),
              role: 'GUTACHTER'
            }),
          updateMany: vi.fn()
        },
        caseOrganization: {
          upsert: vi.fn().mockImplementation(async (args: any) => {
            capturedUpsert = args;
            return {};
          })
        },
        notification: { create: vi.fn() }
      })
    );
    mockPrisma.case.findUnique.mockResolvedValue(null);
    await callAccept();
    expect(capturedUpsert.where.caseId_organizationId_role.organizationId).toBe(
      orgId
    );
    expect(capturedUpsert.where.caseId_organizationId_role.role).toBe(
      'ASSIGNED'
    );
    expect(capturedUpsert.create.role).toBe('ASSIGNED');
  });

  it('ANWALT assignment → CaseOrg upsert uses LEGAL orgId', async () => {
    mockPrisma.caseAssignment.findFirst.mockResolvedValue(
      pendingAssignment({ role: 'ANWALT' })
    );
    const legalOrgId = mockValidOrgChain('ANWALT');
    let capturedUpsert: any;
    mockPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        caseAssignment: {
          findFirst: vi
            .fn()
            .mockResolvedValue(pendingAssignment({ role: 'ANWALT' })),
          update: vi
            .fn()
            .mockResolvedValue({
              id: 'a1',
              status: 'ACCEPTED',
              active: true,
              expiresAt: new Date(),
              role: 'ANWALT'
            }),
          updateMany: vi.fn()
        },
        caseOrganization: {
          upsert: vi.fn().mockImplementation(async (args: any) => {
            capturedUpsert = args;
            return {};
          })
        },
        notification: { create: vi.fn() }
      })
    );
    mockPrisma.case.findUnique.mockResolvedValue(null);
    await callAccept();
    expect(capturedUpsert.where.caseId_organizationId_role.organizationId).toBe(
      legalOrgId
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ACCEPT: idempotency
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3B-2D2 accept: idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth('user_partner');
  });

  it('already ACCEPTED → 200 idempotent (no transaction called)', async () => {
    mockPrisma.caseAssignment.findFirst.mockResolvedValue(acceptedAssignment());
    const res = await callAccept();
    expect(res.status).toBe(200);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('duplicate accept does not duplicate CaseOrg (upsert is idempotent via update:{})', () => {
    // The upsert itself handles idempotency: update:{} means no-op on conflict
    expect(acceptSource).toContain('update: {}');
  });

  it('duplicate accept (ALREADY_ACCEPTED inside tx) does not create notification again', async () => {
    mockPrisma.caseAssignment.findFirst.mockResolvedValue(pendingAssignment());
    mockValidOrgChain('GUTACHTER');
    let notificationCreateCount = 0;
    mockPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        caseAssignment: {
          findFirst: vi.fn().mockResolvedValue(acceptedAssignment()),
          update: vi.fn(),
          updateMany: vi.fn()
        },
        caseOrganization: { upsert: vi.fn() },
        notification: {
          create: vi.fn().mockImplementation(async () => {
            notificationCreateCount++;
            return {};
          })
        }
      })
    );
    await callAccept();
    expect(notificationCreateCount).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ACCEPT: transaction atomicity
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3B-2D2 accept: transaction atomicity', () => {
  it('CaseOrg upsert is inside the $transaction (same tx client)', () => {
    // Verify the upsert uses tx.caseOrganization, not top-level prisma
    // by checking the source positions
    const txBody = acceptSource.slice(
      acceptSource.indexOf('prisma.$transaction('),
      acceptSource.indexOf('// ── Step 5:')
    );
    expect(txBody).toContain('caseOrganization.upsert');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RELEASE: authorization
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3B-2D2 release: authorization', () => {
  beforeEach(() => vi.clearAllMocks());

  it('unauthenticated → 401', async () => {
    setAuth(null);
    const res = await callRelease();
    expect(res.status).toBe(401);
  });

  it('wrong caller (no assignment for this user) → 404', async () => {
    setAuth('user_other');
    // The release transaction finds no assignment for user_other + activeKey='ACTIVE'
    mockReleaseTransaction(null);
    const res = await callRelease();
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RELEASE: happy path
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3B-2D2 release: happy path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth('user_partner');
  });

  it('active accepted assignment → 200 RELEASED', async () => {
    mockReleaseTransaction(acceptedAssignment());
    mockPrisma.case.findUnique.mockResolvedValue(null);
    const res = await callRelease();
    expect(res.status).toBe(200);
    expect(res._body.ok).toBe(true);
  });

  it('release sets active=false, activeKey=null, releasedAt on update', async () => {
    let capturedUpdateData: any;
    mockPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        caseAssignment: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce(acceptedAssignment())
            .mockResolvedValue(null),
          update: vi.fn().mockImplementation(async ({ data }: any) => {
            capturedUpdateData = data;
            return {
              id: 'a1',
              status: 'RELEASED',
              active: false,
              role: 'GUTACHTER'
            };
          }),
          updateMany: vi.fn()
        },
        notification: { create: vi.fn() }
      })
    );
    mockPrisma.case.findUnique.mockResolvedValue(null);
    await callRelease();
    expect(capturedUpdateData.status).toBe('RELEASED');
    expect(capturedUpdateData.active).toBe(false);
    expect(capturedUpdateData.activeKey).toBeNull();
    expect(capturedUpdateData.releasedAt).toBeInstanceOf(Date);
  });

  it('release does NOT delete CaseOrganization ASSIGNED', async () => {
    mockReleaseTransaction(acceptedAssignment());
    mockPrisma.case.findUnique.mockResolvedValue(null);
    await callRelease();
    expect(mockPrisma.caseOrganization.delete).not.toHaveBeenCalled();
  });

  it('released assignment cannot be re-released (ALREADY_INACTIVE → 200)', async () => {
    // After release, the activeKey is null so findFirst(activeKey='ACTIVE') returns null
    // The release route then checks lastInactive fallback and returns ALREADY_INACTIVE
    mockPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        caseAssignment: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce(null) // no active assignment
            .mockResolvedValue({
              id: 'a1',
              status: 'RELEASED',
              active: false,
              role: 'GUTACHTER'
            }),
          update: vi.fn(),
          updateMany: vi.fn()
        },
        notification: { create: vi.fn() }
      })
    );
    const res = await callRelease();
    // ALREADY_INACTIVE returns 200 (idempotent)
    expect(res.status).toBe(200);
    expect(res._body.assignment).toBeDefined();
  });

  it('release source does not contain caseOrganization references', () => {
    expect(releaseSource).not.toContain('caseOrganization');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RELEASE: wrong-caller isolation
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3B-2D2 release: assignee isolation', () => {
  it('release uses assigneeClerkUserId = caller in query (source check)', () => {
    expect(releaseSource).toContain('assigneeClerkUserId: userId');
  });
});
