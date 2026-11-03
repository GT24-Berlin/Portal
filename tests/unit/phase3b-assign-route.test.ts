/**
 * GT24 NEXT Phase 3B-2D1 — Assignment creation route tests
 *
 * Covers:
 *   - Assignor: DB-backed ASSIGN policy (no publicMetadata fallback)
 *   - Assignee: full chain validation (PartnerProfile → Partner → Org → Membership)
 *   - Transaction safety: invalid assignee cannot release existing assignment
 *   - CaseOrganization: ASSIGNED row NOT created on assignment creation
 *   - New assignment invariants: status=PENDING, active=true, activeKey='ACTIVE'
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

vi.mock('server-only', () => ({}));
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));

const mockPrisma = vi.hoisted(() => ({
  membership: { findMany: vi.fn(), findFirst: vi.fn() },
  caseOrganization: { findMany: vi.fn(), findFirst: vi.fn(), upsert: vi.fn() },
  caseFile: { findFirst: vi.fn() },
  caseAssignment: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn()
  },
  partnerProfile: { findUnique: vi.fn() },
  partner: { findUnique: vi.fn() },
  organization: { findUnique: vi.fn() },
  case: { findUnique: vi.fn() },
  notification: { create: vi.fn() },
  $transaction: vi.fn()
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/policy', () => ({ requireCaseWrite: vi.fn() }));
vi.mock('@/lib/notify', () => ({ createNotification: vi.fn() }));
vi.mock('@/lib/mailer', () => ({ sendMail: vi.fn() }));
vi.mock('@/lib/clerk-email', () => ({ getPrimaryEmailForClerkUser: vi.fn() }));
vi.mock('@/lib/ops-log', () => ({ logOperationalEvent: vi.fn() }));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: { status?: number }) => ({
      _body: body,
      status: init?.status ?? 200
    }))
  }
}));

import { POST } from '@/app/api/cases/[id]/assign/route';
import { requireCaseWrite } from '@/lib/policy';
import { getPrimaryEmailForClerkUser } from '@/lib/clerk-email';

type MockRes = { status: number; _body: Record<string, unknown> };
async function callPOST(body: object, caseId = 'case-001'): Promise<MockRes> {
  return POST({ json: () => Promise.resolve(body) } as unknown as Request, {
    params: Promise.resolve({ id: caseId })
  }) as unknown as Promise<MockRes>;
}

// ── Fixture helpers ───────────────────────────────────────────────────────────

function mockCaseWriteOk(clerkUserId = 'user_admin') {
  vi.mocked(requireCaseWrite).mockResolvedValue({
    ok: true,
    clerkUserId,
    capability: 'ASSIGN',
    caseOrgs: [],
    memberships: []
  } as any);
}

function mockCaseWriteDeny(status: 401 | 403 | 404) {
  vi.mocked(requireCaseWrite).mockResolvedValue({ ok: false, status } as any);
}

function mockValidAssignee(role: 'GUTACHTER' | 'ANWALT' = 'GUTACHTER') {
  const orgType = role === 'GUTACHTER' ? 'GUTACHTER' : 'LEGAL';
  const orgId = role === 'GUTACHTER' ? 'org-gutachter-1' : 'org-legal-1';
  mockPrisma.partnerProfile.findUnique.mockResolvedValue({
    clerkUserId: 'user_test_partner',
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
    clerkUserId: 'user_test_partner',
    organizationId: orgId,
    status: 'ACTIVE'
  });
}

function mockTransactionCreated(assignmentId = 'new-assign-1') {
  mockPrisma.$transaction.mockImplementation(async (fn: any) =>
    fn({
      caseAssignment: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi
          .fn()
          .mockResolvedValue({
            id: assignmentId,
            caseId: 'case-001',
            role: 'GUTACHTER',
            status: 'PENDING',
            active: true,
            expiresAt: new Date(),
            assigneeClerkUserId: 'user_test_partner'
          }),
        update: vi.fn(),
        updateMany: vi.fn()
      },
      notification: { create: vi.fn() }
    })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURE: no publicMetadata fallback in route
// ─────────────────────────────────────────────────────────────────────────────

const routeSource = readFileSync(
  resolve(process.cwd(), 'src/app/api/cases/[id]/assign/route.ts'),
  'utf-8'
);

describe('Phase 3B-2D1 assign route: structure', () => {
  it('does NOT import from rbac or use requireAdmin', () => {
    expect(routeSource).not.toContain("from '@/lib/rbac'");
    expect(routeSource).not.toContain('requireAdmin');
  });

  it('does NOT use publicMetadata, getRoleFromClaims, or getUserRole', () => {
    expect(routeSource).not.toContain('publicMetadata');
    expect(routeSource).not.toContain('getRoleFromClaims');
    expect(routeSource).not.toContain('getUserRole');
  });

  it('imports requireCaseWrite from policy', () => {
    expect(routeSource).toContain('requireCaseWrite');
    expect(routeSource).toContain("from '@/lib/policy'");
  });

  it('calls validateAssignee before $transaction', () => {
    const validateIdx = routeSource.indexOf('validateAssignee(');
    const txIdx = routeSource.indexOf('$transaction(');
    expect(validateIdx).toBeGreaterThan(0);
    expect(txIdx).toBeGreaterThan(validateIdx);
  });

  it('does NOT upsert or create CaseOrganization in this route', () => {
    expect(routeSource).not.toContain('caseOrganization.upsert');
    expect(routeSource).not.toContain('caseOrganization.create');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNOR: authorization
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3B-2D1 assign route: assignor authorization', () => {
  beforeEach(() => vi.clearAllMocks());

  it('unauthenticated → 401', async () => {
    mockCaseWriteDeny(401);
    const res = await callPOST({
      role: 'GUTACHTER',
      assigneeClerkUserId: 'user_test'
    });
    expect(res.status).toBe(401);
  });

  it('INTERNAL MEMBER (insufficient role) → 403', async () => {
    mockCaseWriteDeny(403);
    const res = await callPOST({
      role: 'GUTACHTER',
      assigneeClerkUserId: 'user_test'
    });
    expect(res.status).toBe(403);
  });

  it('admin without OWNER CaseOrg on case → 404', async () => {
    mockCaseWriteDeny(404);
    const res = await callPOST({
      role: 'GUTACHTER',
      assigneeClerkUserId: 'user_test'
    });
    expect(res.status).toBe(404);
  });

  it('Clerk publicMetadata ADMIN without DB membership → denied (403)', async () => {
    mockCaseWriteDeny(403);
    const res = await callPOST({
      role: 'GUTACHTER',
      assigneeClerkUserId: 'user_test'
    });
    expect(res.status).toBe(403);
  });

  it('ACTIVE INTERNAL ADMIN + OWNER CaseOrg proceeds past auth (422 from assignee)', async () => {
    mockCaseWriteOk();
    mockPrisma.partnerProfile.findUnique.mockResolvedValue(null);
    const res = await callPOST({
      role: 'GUTACHTER',
      assigneeClerkUserId: 'user_test'
    });
    expect(res.status).toBe(422);
    expect(vi.mocked(requireCaseWrite)).toHaveBeenCalledWith(
      'case-001',
      'ASSIGN'
    );
  });

  it('ACTIVE INTERNAL OWNER + OWNER CaseOrg proceeds past auth', async () => {
    mockCaseWriteOk('user_owner');
    mockPrisma.partnerProfile.findUnique.mockResolvedValue(null);
    const res = await callPOST({
      role: 'GUTACHTER',
      assigneeClerkUserId: 'user_test'
    });
    expect(res.status).toBe(422);
    expect(vi.mocked(requireCaseWrite)).toHaveBeenCalledWith(
      'case-001',
      'ASSIGN'
    );
  });

  it('requireCaseWrite called with ASSIGN capability', async () => {
    mockCaseWriteOk();
    mockPrisma.partnerProfile.findUnique.mockResolvedValue(null);
    await callPOST({ role: 'GUTACHTER', assigneeClerkUserId: 'user_test' });
    expect(vi.mocked(requireCaseWrite)).toHaveBeenCalledWith(
      'case-001',
      'ASSIGN'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNEE: validation chain
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3B-2D1 assign route: assignee validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCaseWriteOk();
  });

  it('missing PartnerProfile → 422', async () => {
    mockPrisma.partnerProfile.findUnique.mockResolvedValue(null);
    const res = await callPOST({
      role: 'GUTACHTER',
      assigneeClerkUserId: 'user_test'
    });
    expect(res.status).toBe(422);
    expect(res._body.error).toMatch(/PartnerProfile/);
  });

  it('PartnerProfile exists but partnerId is null → 422', async () => {
    mockPrisma.partnerProfile.findUnique.mockResolvedValue({
      clerkUserId: 'user_test',
      role: 'GUTACHTER',
      partnerId: null
    });
    const res = await callPOST({
      role: 'GUTACHTER',
      assigneeClerkUserId: 'user_test'
    });
    expect(res.status).toBe(422);
    expect(res._body.error).toMatch(/Partner/);
  });

  it('Partner not found → 422', async () => {
    mockPrisma.partnerProfile.findUnique.mockResolvedValue({
      clerkUserId: 'user_test',
      role: 'GUTACHTER',
      partnerId: 'partner-missing'
    });
    mockPrisma.partner.findUnique.mockResolvedValue(null);
    const res = await callPOST({
      role: 'GUTACHTER',
      assigneeClerkUserId: 'user_test'
    });
    expect(res.status).toBe(422);
    expect(res._body.error).toMatch(/Partner not found/);
  });

  it('Partner has no organizationId → 422', async () => {
    mockPrisma.partnerProfile.findUnique.mockResolvedValue({
      clerkUserId: 'user_test',
      role: 'GUTACHTER',
      partnerId: 'partner-1'
    });
    mockPrisma.partner.findUnique.mockResolvedValue({
      id: 'partner-1',
      type: 'GUTACHTER',
      organizationId: null
    });
    const res = await callPOST({
      role: 'GUTACHTER',
      assigneeClerkUserId: 'user_test'
    });
    expect(res.status).toBe(422);
    expect(res._body.error).toMatch(/Organization/);
  });

  it('Organization SUSPENDED → 422', async () => {
    mockPrisma.partnerProfile.findUnique.mockResolvedValue({
      clerkUserId: 'user_test',
      role: 'GUTACHTER',
      partnerId: 'partner-1'
    });
    mockPrisma.partner.findUnique.mockResolvedValue({
      id: 'partner-1',
      type: 'GUTACHTER',
      organizationId: 'org-1'
    });
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      type: 'GUTACHTER',
      status: 'SUSPENDED'
    });
    const res = await callPOST({
      role: 'GUTACHTER',
      assigneeClerkUserId: 'user_test'
    });
    expect(res.status).toBe(422);
    expect(res._body.error).toMatch(/not ACTIVE/);
  });

  it('no ACTIVE Membership → 422', async () => {
    mockPrisma.partnerProfile.findUnique.mockResolvedValue({
      clerkUserId: 'user_test',
      role: 'GUTACHTER',
      partnerId: 'partner-1'
    });
    mockPrisma.partner.findUnique.mockResolvedValue({
      id: 'partner-1',
      type: 'GUTACHTER',
      organizationId: 'org-1'
    });
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      type: 'GUTACHTER',
      status: 'ACTIVE'
    });
    mockPrisma.membership.findFirst.mockResolvedValue(null);
    const res = await callPOST({
      role: 'GUTACHTER',
      assigneeClerkUserId: 'user_test'
    });
    expect(res.status).toBe(422);
    expect(res._body.error).toMatch(/Membership/);
  });

  it('GUTACHTER role with LEGAL org → 422 (type mismatch)', async () => {
    mockPrisma.partnerProfile.findUnique.mockResolvedValue({
      clerkUserId: 'user_test',
      role: 'GUTACHTER',
      partnerId: 'partner-1'
    });
    mockPrisma.partner.findUnique.mockResolvedValue({
      id: 'partner-1',
      type: 'GUTACHTER',
      organizationId: 'org-legal'
    });
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-legal',
      type: 'LEGAL',
      status: 'ACTIVE'
    });
    const res = await callPOST({
      role: 'GUTACHTER',
      assigneeClerkUserId: 'user_test'
    });
    expect(res.status).toBe(422);
    expect(res._body.error).toMatch(/mismatch/);
  });

  it('ANWALT role with GUTACHTER org → 422 (type mismatch)', async () => {
    mockPrisma.partnerProfile.findUnique.mockResolvedValue({
      clerkUserId: 'user_test',
      role: 'ANWALT',
      partnerId: 'partner-1'
    });
    mockPrisma.partner.findUnique.mockResolvedValue({
      id: 'partner-1',
      type: 'ANWALT',
      organizationId: 'org-gutachter'
    });
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-gutachter',
      type: 'GUTACHTER',
      status: 'ACTIVE'
    });
    const res = await callPOST({
      role: 'ANWALT',
      assigneeClerkUserId: 'user_test'
    });
    expect(res.status).toBe(422);
    expect(res._body.error).toMatch(/mismatch/);
  });

  it('valid GUTACHTER mapping → assignment created (200)', async () => {
    mockValidAssignee('GUTACHTER');
    mockPrisma.case.findUnique.mockResolvedValue({ token: 'TOKEN123' });
    mockTransactionCreated();
    vi.mocked(getPrimaryEmailForClerkUser).mockResolvedValue(null as any);
    const res = await callPOST({
      role: 'GUTACHTER',
      assigneeClerkUserId: 'user_test_partner'
    });
    expect(res.status).toBe(200);
    expect(res._body.ok).toBe(true);
  });

  it('valid ANWALT mapping → assignment created (200)', async () => {
    mockValidAssignee('ANWALT');
    mockPrisma.case.findUnique.mockResolvedValue({ token: 'TOKEN456' });
    mockTransactionCreated('new-assign-2');
    vi.mocked(getPrimaryEmailForClerkUser).mockResolvedValue(null as any);
    const res = await callPOST({
      role: 'ANWALT',
      assigneeClerkUserId: 'user_test_partner'
    });
    expect(res.status).toBe(200);
    expect(res._body.ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION SAFETY
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3B-2D1 assign route: transaction safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCaseWriteOk();
  });

  it('invalid assignee + force=true does NOT call $transaction', async () => {
    mockPrisma.partnerProfile.findUnique.mockResolvedValue(null);
    await callPOST({
      role: 'GUTACHTER',
      assigneeClerkUserId: 'user_invalid',
      force: true
    });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('valid force replacement: new assignment status=PENDING active=true activeKey=ACTIVE', async () => {
    mockValidAssignee('GUTACHTER');
    mockPrisma.case.findUnique.mockResolvedValue({ token: 'TOKEN123' });
    let capturedCreateData: any;
    mockPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        caseAssignment: {
          findFirst: vi
            .fn()
            .mockResolvedValue({
              id: 'old-1',
              status: 'ACCEPTED',
              expiresAt: new Date()
            }),
          create: vi.fn().mockImplementation(async ({ data }: any) => {
            capturedCreateData = data;
            return { id: 'new-1', ...data };
          }),
          update: vi.fn(),
          updateMany: vi.fn()
        },
        notification: { create: vi.fn() }
      })
    );
    vi.mocked(getPrimaryEmailForClerkUser).mockResolvedValue(null as any);
    const res = await callPOST({
      role: 'GUTACHTER',
      assigneeClerkUserId: 'user_test_partner',
      force: true
    });
    expect(res.status).toBe(200);
    expect(capturedCreateData.status).toBe('PENDING');
    expect(capturedCreateData.active).toBe(true);
    expect(capturedCreateData.activeKey).toBe('ACTIVE');
  });

  it('new assignment has status=PENDING, active=true, activeKey=ACTIVE', async () => {
    mockValidAssignee('GUTACHTER');
    mockPrisma.case.findUnique.mockResolvedValue({ token: 'TOKEN123' });
    let capturedData: any;
    mockPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        caseAssignment: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockImplementation(async ({ data }: any) => {
            capturedData = data;
            return { id: 'new-1', ...data };
          }),
          update: vi.fn(),
          updateMany: vi.fn()
        },
        notification: { create: vi.fn() }
      })
    );
    vi.mocked(getPrimaryEmailForClerkUser).mockResolvedValue(null as any);
    await callPOST({
      role: 'GUTACHTER',
      assigneeClerkUserId: 'user_test_partner'
    });
    expect(capturedData.status).toBe('PENDING');
    expect(capturedData.active).toBe(true);
    expect(capturedData.activeKey).toBe('ACTIVE');
  });

  it('already assigned + force=false → 409', async () => {
    mockValidAssignee('GUTACHTER');
    mockPrisma.case.findUnique.mockResolvedValue({ token: 'TOKEN123' });
    mockPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        caseAssignment: {
          findFirst: vi
            .fn()
            .mockResolvedValue({
              id: 'existing-1',
              status: 'ACCEPTED',
              expiresAt: new Date()
            }),
          create: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn()
        },
        notification: { create: vi.fn() }
      })
    );
    const res = await callPOST({
      role: 'GUTACHTER',
      assigneeClerkUserId: 'user_test_partner',
      force: false
    });
    expect(res.status).toBe(409);
    expect(res._body.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASEORGANIZATION: not created on assignment creation
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3B-2D1 assign route: CaseOrganization not created', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCaseWriteOk();
  });

  it('assignment creation does NOT call caseOrganization.upsert', async () => {
    mockValidAssignee('GUTACHTER');
    mockPrisma.case.findUnique.mockResolvedValue({ token: 'TOKEN123' });
    mockTransactionCreated();
    vi.mocked(getPrimaryEmailForClerkUser).mockResolvedValue(null as any);
    await callPOST({
      role: 'GUTACHTER',
      assigneeClerkUserId: 'user_test_partner'
    });
    expect(mockPrisma.caseOrganization.upsert).not.toHaveBeenCalled();
  });

  it('route source does not contain caseOrganization.upsert or caseOrganization.create', () => {
    expect(routeSource).not.toContain('caseOrganization.upsert');
    expect(routeSource).not.toContain('caseOrganization.create');
  });
});
