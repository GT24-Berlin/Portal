/**
 * Phase 3B-2E-C — INTERNAL Role Gate Tests
 *
 * Verifies that INTERNAL org membership alone does NOT grant admin scope.
 * Admin scope requires: organization.type=INTERNAL + membership.role in [ADMIN, OWNER].
 *
 * Covers:
 *   CASE LIST:   INTERNAL ADMIN/OWNER → admin-scoped query; MEMBER/VIEWER → partner-scoped
 *   CASE DETAIL: INTERNAL ADMIN/OWNER → canEdit=true; MEMBER/VIEWER → canEdit=false, no admin UI
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

vi.mock('server-only', () => ({}));

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mockRequireIdentity = vi.hoisted(() => vi.fn());
const mockGetActiveMemberships = vi.hoisted(() => vi.fn());
const mockRequireCaseAccess = vi.hoisted(() => vi.fn());
const mockRequireCaseAssignmentAccess = vi.hoisted(() => vi.fn());
const mockCaseFindMany = vi.hoisted(() => vi.fn());
const mockCaseFindUnique = vi.hoisted(() => vi.fn());
const mockCaseFileFindMany = vi.hoisted(() => vi.fn());

// Component mocks that record whether they were included in the JSX tree
const MockAdminCasesTable = vi.hoisted(() => vi.fn(() => null));
const MockCaseAssignmentAdmin = vi.hoisted(() => vi.fn(() => null));
const MockCaseStatusEditor = vi.hoisted(() => vi.fn(() => null));

vi.mock('@/lib/policy', () => ({
  requireIdentity: mockRequireIdentity,
  getActiveMemberships: mockGetActiveMemberships,
  requireCaseAccess: mockRequireCaseAccess,
  requireCaseAssignmentAccess: mockRequireCaseAssignmentAccess
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    case: {
      findMany: mockCaseFindMany,
      findUnique: mockCaseFindUnique
    },
    caseFile: {
      findMany: mockCaseFileFindMany
    }
  }
}));

vi.mock('@/components/cases/admin-cases-table', () => ({
  default: MockAdminCasesTable
}));

vi.mock('@/components/cases/case-assignment-admin', () => ({
  default: MockCaseAssignmentAdmin
}));

vi.mock('@/components/cases/case-status-editor', () => ({
  default: MockCaseStatusEditor
}));

vi.mock('@/components/layout/page-container', () => ({
  default: ({ children }: { children: unknown }) => children
}));

vi.mock('@/components/cases/case-files-upload', () => ({
  default: () => null
}));
vi.mock('@/components/system/database-unavailable', () => ({
  default: () => null
}));
vi.mock('@/lib/database-error', () => ({
  isDatabaseUnavailableError: () => false
}));
vi.mock(
  '@/features/case-detail/components/case-operations-log-accordion',
  () => ({
    default: () => null
  })
);
vi.mock('@/features/case-detail/components/case-customer-info-card', () => ({
  default: () => null
}));
vi.mock('@/features/case-detail/components/case-accident-data-card', () => ({
  default: () => null
}));
vi.mock('@/features/case-detail/components/case-photo-gallery', () => ({
  default: () => null
}));
vi.mock('@/features/case-detail/lib/get-case-photo-files', () => ({
  getCasePhotoFiles: () => []
}));
vi.mock('next/link', () => ({
  default: ({ children }: { children: unknown }) => children
}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((p: string) => {
    throw new Error(`NEXT_REDIRECT:${p}`);
  }),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  })
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMembership(role: string, orgType = 'INTERNAL') {
  return {
    id: `mem-${role}`,
    clerkUserId: 'user_internal',
    organizationId: 'org-internal',
    role,
    status: 'ACTIVE',
    organization: {
      id: 'org-internal',
      type: orgType,
      status: 'ACTIVE',
      name: 'GT24'
    }
  } as any;
}

function makeInternalCaseAccessResult(membershipRole: string) {
  const membership = makeMembership(membershipRole);
  return {
    ok: true as const,
    clerkUserId: 'user_internal',
    memberships: [membership],
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
    ]
  };
}

function makeMinimalCase() {
  return {
    id: 'case-1',
    caseNumber: 'GT-001',
    token: 'tok-abc',
    gutachterStatus: 'EINGEGANGEN',
    anwaltStatus: 'FALL_EINGEGANGEN',
    customer: null,
    intake: null,
    events: [],
    lead: null,
    partner: null,
    operationalEvents: []
  } as any;
}

// Recursively search a React element tree for elements of a given type
function findInTree(node: any, targetType: unknown): any[] {
  if (!node || typeof node !== 'object') return [];
  const results: any[] = [];
  if (node.type === targetType) results.push(node);
  const children = node.props?.children;
  if (children) {
    const arr = Array.isArray(children) ? children.flat(Infinity) : [children];
    for (const child of arr) {
      results.push(...findInTree(child, targetType));
    }
  }
  return results;
}

// ── CASE LIST: INTERNAL role gate ─────────────────────────────────────────────

describe('Case list — INTERNAL role gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCaseFindMany.mockResolvedValue([]);
  });

  it('INTERNAL ADMIN: prisma query uses OWNER-scoped CaseOrganization filter', async () => {
    mockRequireIdentity.mockResolvedValue({
      ok: true,
      clerkUserId: 'user_internal'
    });
    mockGetActiveMemberships.mockResolvedValue([makeMembership('ADMIN')]);

    const { default: CasesPage } = await import('@/app/dashboard/cases/page');
    await CasesPage({ searchParams: Promise.resolve({}) });

    expect(mockCaseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          caseOrganizations: expect.objectContaining({
            some: expect.objectContaining({ role: 'OWNER' })
          })
        })
      })
    );
  });

  it('INTERNAL OWNER: prisma query uses OWNER-scoped CaseOrganization filter', async () => {
    mockRequireIdentity.mockResolvedValue({
      ok: true,
      clerkUserId: 'user_internal'
    });
    mockGetActiveMemberships.mockResolvedValue([makeMembership('OWNER')]);

    const { default: CasesPage } = await import('@/app/dashboard/cases/page');
    await CasesPage({ searchParams: Promise.resolve({}) });

    expect(mockCaseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          caseOrganizations: expect.objectContaining({
            some: expect.objectContaining({ role: 'OWNER' })
          })
        })
      })
    );
  });

  it('INTERNAL MEMBER: prisma query does NOT use OWNER-scoped filter (falls to partner path)', async () => {
    mockRequireIdentity.mockResolvedValue({
      ok: true,
      clerkUserId: 'user_internal'
    });
    mockGetActiveMemberships.mockResolvedValue([makeMembership('MEMBER')]);

    const { default: CasesPage } = await import('@/app/dashboard/cases/page');
    await CasesPage({ searchParams: Promise.resolve({}) });

    // findMany should be called with ASSIGNED filter (partner path), not OWNER
    const calls = mockCaseFindMany.mock.calls;
    const hadOwnerCall = calls.some((args) =>
      JSON.stringify(args[0]?.where?.caseOrganizations?.some).includes(
        '"OWNER"'
      )
    );
    expect(hadOwnerCall).toBe(false);
  });

  it('INTERNAL VIEWER: prisma query does NOT use OWNER-scoped filter (falls to partner path)', async () => {
    mockRequireIdentity.mockResolvedValue({
      ok: true,
      clerkUserId: 'user_internal'
    });
    mockGetActiveMemberships.mockResolvedValue([makeMembership('VIEWER')]);

    const { default: CasesPage } = await import('@/app/dashboard/cases/page');
    await CasesPage({ searchParams: Promise.resolve({}) });

    const calls = mockCaseFindMany.mock.calls;
    const hadOwnerCall = calls.some((args) =>
      JSON.stringify(args[0]?.where?.caseOrganizations?.some).includes(
        '"OWNER"'
      )
    );
    expect(hadOwnerCall).toBe(false);
  });

  it('INTERNAL ADMIN: AdminCasesTable is included in the rendered tree', async () => {
    mockRequireIdentity.mockResolvedValue({
      ok: true,
      clerkUserId: 'user_internal'
    });
    mockGetActiveMemberships.mockResolvedValue([makeMembership('ADMIN')]);

    const { default: CasesPage } = await import('@/app/dashboard/cases/page');
    const tree = await CasesPage({ searchParams: Promise.resolve({}) });

    expect(findInTree(tree, MockAdminCasesTable)).toHaveLength(1);
  });

  it('INTERNAL MEMBER: AdminCasesTable is NOT in the rendered tree', async () => {
    mockRequireIdentity.mockResolvedValue({
      ok: true,
      clerkUserId: 'user_internal'
    });
    mockGetActiveMemberships.mockResolvedValue([makeMembership('MEMBER')]);

    const { default: CasesPage } = await import('@/app/dashboard/cases/page');
    const tree = await CasesPage({ searchParams: Promise.resolve({}) });

    expect(findInTree(tree, MockAdminCasesTable)).toHaveLength(0);
  });
});

// ── CASE DETAIL: INTERNAL role gate ───────────────────────────────────────────

describe('Case detail — INTERNAL role gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCaseFindUnique.mockResolvedValue(makeMinimalCase());
    mockCaseFileFindMany.mockResolvedValue([]);
  });

  it('INTERNAL ADMIN: CaseAssignmentAdmin is included in the tree', async () => {
    mockRequireCaseAccess.mockResolvedValue(
      makeInternalCaseAccessResult('ADMIN')
    );

    const { default: CaseDetailPage } = await import(
      '@/app/dashboard/cases/[id]/page'
    );
    const tree = await CaseDetailPage({
      params: Promise.resolve({ id: 'case-1' })
    });

    expect(findInTree(tree, MockCaseAssignmentAdmin)).toHaveLength(1);
  });

  it('INTERNAL OWNER: CaseAssignmentAdmin is included in the tree', async () => {
    mockRequireCaseAccess.mockResolvedValue(
      makeInternalCaseAccessResult('OWNER')
    );

    const { default: CaseDetailPage } = await import(
      '@/app/dashboard/cases/[id]/page'
    );
    const tree = await CaseDetailPage({
      params: Promise.resolve({ id: 'case-1' })
    });

    expect(findInTree(tree, MockCaseAssignmentAdmin)).toHaveLength(1);
  });

  it('INTERNAL MEMBER: CaseAssignmentAdmin is NOT in the tree', async () => {
    mockRequireCaseAccess.mockResolvedValue(
      makeInternalCaseAccessResult('MEMBER')
    );

    const { default: CaseDetailPage } = await import(
      '@/app/dashboard/cases/[id]/page'
    );
    const tree = await CaseDetailPage({
      params: Promise.resolve({ id: 'case-1' })
    });

    expect(findInTree(tree, MockCaseAssignmentAdmin)).toHaveLength(0);
  });

  it('INTERNAL VIEWER: CaseAssignmentAdmin is NOT in the tree', async () => {
    mockRequireCaseAccess.mockResolvedValue(
      makeInternalCaseAccessResult('VIEWER')
    );

    const { default: CaseDetailPage } = await import(
      '@/app/dashboard/cases/[id]/page'
    );
    const tree = await CaseDetailPage({
      params: Promise.resolve({ id: 'case-1' })
    });

    expect(findInTree(tree, MockCaseAssignmentAdmin)).toHaveLength(0);
  });

  it('INTERNAL ADMIN: CaseStatusEditor receives role=ADMIN', async () => {
    mockRequireCaseAccess.mockResolvedValue(
      makeInternalCaseAccessResult('ADMIN')
    );

    const { default: CaseDetailPage } = await import(
      '@/app/dashboard/cases/[id]/page'
    );
    const tree = await CaseDetailPage({
      params: Promise.resolve({ id: 'case-1' })
    });

    const editors = findInTree(tree, MockCaseStatusEditor);
    expect(editors).toHaveLength(1);
    expect(editors[0].props.role).toBe('ADMIN');
  });

  it('INTERNAL MEMBER: CaseStatusEditor receives role="" (canEdit=false)', async () => {
    mockRequireCaseAccess.mockResolvedValue(
      makeInternalCaseAccessResult('MEMBER')
    );

    const { default: CaseDetailPage } = await import(
      '@/app/dashboard/cases/[id]/page'
    );
    const tree = await CaseDetailPage({
      params: Promise.resolve({ id: 'case-1' })
    });

    const editors = findInTree(tree, MockCaseStatusEditor);
    expect(editors).toHaveLength(1);
    expect(editors[0].props.role).toBe('');
  });

  it('INTERNAL VIEWER: CaseStatusEditor receives role="" (canEdit=false)', async () => {
    mockRequireCaseAccess.mockResolvedValue(
      makeInternalCaseAccessResult('VIEWER')
    );

    const { default: CaseDetailPage } = await import(
      '@/app/dashboard/cases/[id]/page'
    );
    const tree = await CaseDetailPage({
      params: Promise.resolve({ id: 'case-1' })
    });

    const editors = findInTree(tree, MockCaseStatusEditor);
    expect(editors).toHaveLength(1);
    expect(editors[0].props.role).toBe('');
  });

  it('GUTACHTER partner path unchanged: requireCaseAssignmentAccess still called', async () => {
    const gutachterOrg = {
      id: 'org-gutachter',
      type: 'GUTACHTER',
      status: 'ACTIVE',
      name: 'Gutachter GmbH'
    } as any;
    mockRequireCaseAccess.mockResolvedValue({
      ok: true,
      clerkUserId: 'user_gutachter',
      memberships: [
        {
          id: 'm-g',
          clerkUserId: 'user_gutachter',
          organizationId: 'org-gutachter',
          role: 'MEMBER',
          status: 'ACTIVE',
          organization: gutachterOrg
        } as any
      ],
      caseOrgs: [
        {
          id: 'co-g',
          caseId: 'case-1',
          organizationId: 'org-gutachter',
          role: 'ASSIGNED',
          organization: gutachterOrg
        } as any
      ]
    });
    mockRequireCaseAssignmentAccess.mockResolvedValue({
      ok: true,
      clerkUserId: 'user_gutachter',
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
      } as any
    });

    const { default: CaseDetailPage } = await import(
      '@/app/dashboard/cases/[id]/page'
    );
    await CaseDetailPage({ params: Promise.resolve({ id: 'case-1' }) });

    expect(mockRequireCaseAssignmentAccess).toHaveBeenCalledWith('case-1');
  });
});

// ── Source: role predicate present ────────────────────────────────────────────

describe('Phase 3B-2E-C source checks', () => {
  const LIST_PATH = path.resolve(
    __dirname,
    '../../src/app/dashboard/cases/page.tsx'
  );
  const DETAIL_PATH = path.resolve(
    __dirname,
    '../../src/app/dashboard/cases/[id]/page.tsx'
  );

  it('case list: isInternalUser checks m.role ADMIN or OWNER', () => {
    const src = readFileSync(LIST_PATH, 'utf-8');
    expect(src).toContain('isInternalUser');
    expect(src).toContain("m.role === 'ADMIN' || m.role === 'OWNER'");
  });

  it('case list: does not use publicMetadata or rbac', () => {
    const src = readFileSync(LIST_PATH, 'utf-8');
    expect(src).not.toContain('publicMetadata');
    expect(src).not.toContain("from '@/lib/rbac'");
  });

  it('case detail: isInternalAdmin is defined and checks m.role', () => {
    const src = readFileSync(DETAIL_PATH, 'utf-8');
    expect(src).toContain('isInternalAdmin');
    expect(src).toContain("m.role === 'ADMIN' || m.role === 'OWNER'");
  });

  it('case detail: CaseAssignmentAdmin is gated on isInternalAdmin', () => {
    const src = readFileSync(DETAIL_PATH, 'utf-8');
    expect(src).toContain('isInternalAdmin ? <CaseAssignmentAdmin');
    expect(src).not.toContain('isInternalCaller ? <CaseAssignmentAdmin');
  });

  it('case detail: does not use publicMetadata or rbac', () => {
    const src = readFileSync(DETAIL_PATH, 'utf-8');
    expect(src).not.toContain('publicMetadata');
    expect(src).not.toContain("from '@/lib/rbac'");
  });
});
