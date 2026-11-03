/**
 * GT24 NEXT Phase 3B-2A — Case & file policy helper tests
 *
 * Covers: requireCaseAccess, requireCaseFileAccess,
 *         requireCaseAssignmentAccess, requireCaseWrite
 *
 * Liveness rule documented here:
 *   activeKey='ACTIVE' is the sole authority for assignment liveness.
 *   The `active` boolean must ALSO be true (both required, both must be
 *   consistent). A row with active=true but activeKey=null is NOT live.
 *   A row with activeKey='ACTIVE' but active=false is NOT live.
 *   Rationale: @@unique([caseId, role, activeKey]) makes activeKey the
 *   uniqueness mechanism; active=false + activeKey='ACTIVE' indicates a
 *   data inconsistency and should be denied rather than silently allowed.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn()
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    membership: { findMany: vi.fn(), findFirst: vi.fn() },
    caseOrganization: { findMany: vi.fn(), findFirst: vi.fn() },
    caseFile: { findFirst: vi.fn() },
    caseAssignment: { findFirst: vi.fn() }
  }
}));

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import {
  requireCaseAccess,
  requireCaseAssignmentAccess,
  requireCaseFileAccess,
  requireCaseWrite
} from '@/lib/policy';

// ── Fixture helpers ───────────────────────────────────────────────────────────

function mockAuth(userId: string | null) {
  vi.mocked(auth).mockResolvedValue({ userId } as any);
}

function membership(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mem-1',
    clerkUserId: 'user_test',
    organizationId: 'org-internal',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    organization: {
      id: 'org-internal',
      type: 'INTERNAL',
      status: 'ACTIVE',
      name: 'GT24 Internal',
      ...((overrides.organization as Record<string, unknown>) ?? {})
    },
    ...overrides
  };
}

function caseOrg(overrides: Record<string, unknown> = {}) {
  return {
    id: 'co-1',
    caseId: 'case-001',
    organizationId: 'org-internal',
    role: 'OWNER',
    createdAt: new Date(),
    organization: {
      id: 'org-internal',
      type: 'INTERNAL',
      status: 'ACTIVE',
      name: 'GT24 Internal'
    },
    ...overrides
  };
}

function caseFile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'file-1',
    caseId: 'case-001',
    storageKey: 'bucket/case-001/file-1.pdf',
    filename: 'gutachten.pdf',
    mimeType: 'application/pdf',
    size: 102400,
    visibility: 'INTERNAL',
    category: 'DOCUMENT',
    uploaderType: 'INTERNAL',
    uploaderId: 'user_test',
    role: null,
    ...overrides
  };
}

function assignment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'assign-1',
    caseId: 'case-001',
    role: 'GUTACHTER',
    assigneeClerkUserId: 'user_test',
    status: 'ACCEPTED',
    active: true,
    activeKey: 'ACTIVE',
    expiresAt: new Date(Date.now() + 86400000),
    assignedAt: new Date(),
    assignedByClerkUserId: 'user_admin',
    acceptedAt: new Date(),
    ...overrides
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// requireCaseAccess
// ─────────────────────────────────────────────────────────────────────────────

describe('requireCaseAccess', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when no Clerk session', async () => {
    mockAuth(null);
    const result = await requireCaseAccess('case-001');
    expect(result).toEqual({ ok: false, status: 401 });
  });

  it('returns 403 when user has no active memberships', async () => {
    mockAuth('user_test');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([]);
    const result = await requireCaseAccess('case-001');
    expect(result).toEqual({ ok: false, status: 403 });
  });

  it('returns 404 when memberships exist but no matching CaseOrganization', async () => {
    mockAuth('user_test');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      membership()
    ] as any);
    vi.mocked(prisma.caseOrganization.findMany).mockResolvedValue([]);
    const result = await requireCaseAccess('case-001');
    // 404 not 403 — avoids leaking case existence to authenticated users
    expect(result).toEqual({ ok: false, status: 404 });
  });

  it('returns ok when membership org has OWNER CaseOrganization', async () => {
    mockAuth('user_test');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      membership()
    ] as any);
    vi.mocked(prisma.caseOrganization.findMany).mockResolvedValue([
      caseOrg()
    ] as any);
    const result = await requireCaseAccess('case-001');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.clerkUserId).toBe('user_test');
      expect(result.caseOrgs).toHaveLength(1);
      expect(result.memberships).toHaveLength(1);
    }
  });

  it('returns ok when membership org has ASSIGNED CaseOrganization', async () => {
    mockAuth('user_test');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      membership({
        organizationId: 'org-gutachter',
        organization: {
          id: 'org-gutachter',
          type: 'GUTACHTER',
          status: 'ACTIVE'
        }
      })
    ] as any);
    vi.mocked(prisma.caseOrganization.findMany).mockResolvedValue([
      caseOrg({ organizationId: 'org-gutachter', role: 'ASSIGNED' })
    ] as any);
    const result = await requireCaseAccess('case-001');
    expect(result.ok).toBe(true);
  });

  it('returns ok when only one of multiple memberships has a matching CaseOrg', async () => {
    mockAuth('user_test');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      membership({ id: 'mem-1', organizationId: 'org-a' }),
      membership({ id: 'mem-2', organizationId: 'org-b' })
    ] as any);
    // Only org-b has a CaseOrg
    vi.mocked(prisma.caseOrganization.findMany).mockResolvedValue([
      caseOrg({ organizationId: 'org-b', role: 'ASSIGNED' })
    ] as any);
    const result = await requireCaseAccess('case-001');
    expect(result.ok).toBe(true);
  });

  it('inactive memberships are filtered by getActiveMemberships (returns [])', async () => {
    mockAuth('user_test');
    // getActiveMemberships filters status=ACTIVE — INACTIVE never returned
    vi.mocked(prisma.membership.findMany).mockResolvedValue([]);
    const result = await requireCaseAccess('case-001');
    expect(result).toEqual({ ok: false, status: 403 });
  });

  it('Clerk ADMIN metadata without DB membership returns 403', async () => {
    // Policy never consults Clerk publicMetadata — DB membership is authoritative
    mockAuth('user_clerk_admin_no_db');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([]);
    const result = await requireCaseAccess('case-001');
    expect(result).toEqual({ ok: false, status: 403 });
  });

  it('queries CaseOrg with org IDs scoped to the caller', async () => {
    mockAuth('user_test');
    const mem = membership({ organizationId: 'org-specific' });
    vi.mocked(prisma.membership.findMany).mockResolvedValue([mem] as any);
    vi.mocked(prisma.caseOrganization.findMany).mockResolvedValue([]);
    await requireCaseAccess('case-001');
    expect(vi.mocked(prisma.caseOrganization.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          caseId: 'case-001',
          organizationId: { in: ['org-specific'] }
        })
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireCaseFileAccess
// ─────────────────────────────────────────────────────────────────────────────

describe('requireCaseFileAccess', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 404 when fileId does not exist', async () => {
    vi.mocked(prisma.caseFile.findFirst).mockResolvedValue(null);
    const result = await requireCaseFileAccess('no-such-file', 'case-001');
    expect(result).toEqual({ ok: false, status: 404 });
  });

  it('returns 404 when fileId exists but caseId does not match', async () => {
    // findFirst is called with both id and caseId — mismatch returns null
    vi.mocked(prisma.caseFile.findFirst).mockResolvedValue(null);
    const result = await requireCaseFileAccess('file-1', 'case-WRONG');
    expect(result).toEqual({ ok: false, status: 404 });
  });

  it('returns 404 when file found but caller has no case access (401 unauthenticated)', async () => {
    vi.mocked(prisma.caseFile.findFirst).mockResolvedValue(caseFile() as any);
    mockAuth(null);
    const result = await requireCaseFileAccess('file-1', 'case-001');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it('returns 403 when file found but caller has no matching CaseOrg', async () => {
    vi.mocked(prisma.caseFile.findFirst).mockResolvedValue(caseFile() as any);
    mockAuth('user_test');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      membership()
    ] as any);
    vi.mocked(prisma.caseOrganization.findMany).mockResolvedValue([]);
    const result = await requireCaseFileAccess('file-1', 'case-001');
    // requireCaseAccess returns 404 for no-CaseOrg; propagated
    expect(result.ok).toBe(false);
    if (!result.ok) expect([403, 404]).toContain(result.status);
  });

  it('returns ok with file metadata when file found and case access passes', async () => {
    vi.mocked(prisma.caseFile.findFirst).mockResolvedValue(caseFile() as any);
    mockAuth('user_test');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      membership()
    ] as any);
    vi.mocked(prisma.caseOrganization.findMany).mockResolvedValue([
      caseOrg()
    ] as any);
    const result = await requireCaseFileAccess('file-1', 'case-001');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.file.id).toBe('file-1');
      expect(result.file.caseId).toBe('case-001');
    }
  });

  it('returned file result includes storageKey for internal server use', async () => {
    vi.mocked(prisma.caseFile.findFirst).mockResolvedValue(caseFile() as any);
    mockAuth('user_test');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      membership()
    ] as any);
    vi.mocked(prisma.caseOrganization.findMany).mockResolvedValue([
      caseOrg()
    ] as any);
    const result = await requireCaseFileAccess('file-1', 'case-001');
    expect(result.ok).toBe(true);
    if (result.ok) {
      // storageKey present for route-level resolution; never return it in API responses
      expect(result.file.storageKey).toBe('bucket/case-001/file-1.pdf');
    }
  });

  it('file lookup uses both fileId AND caseId to prevent cross-case enumeration', async () => {
    vi.mocked(prisma.caseFile.findFirst).mockResolvedValue(null);
    await requireCaseFileAccess('file-1', 'case-001');
    expect(vi.mocked(prisma.caseFile.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'file-1', caseId: 'case-001' }
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireCaseAssignmentAccess
// ─────────────────────────────────────────────────────────────────────────────

describe('requireCaseAssignmentAccess', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when no Clerk session', async () => {
    mockAuth(null);
    const result = await requireCaseAssignmentAccess('case-001');
    expect(result).toEqual({ ok: false, status: 401 });
  });

  it('returns 404 when no assignment found', async () => {
    mockAuth('user_test');
    vi.mocked(prisma.caseAssignment.findFirst).mockResolvedValue(null);
    const result = await requireCaseAssignmentAccess('case-001');
    expect(result).toEqual({ ok: false, status: 404 });
  });

  it('PENDING assignment is denied for mutation (filtered by status=ACCEPTED)', async () => {
    mockAuth('user_test');
    // DB query filters status=ACCEPTED, so PENDING returns null
    vi.mocked(prisma.caseAssignment.findFirst).mockResolvedValue(null);
    const result = await requireCaseAssignmentAccess('case-001');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it('ACCEPTED assignment with activeKey=ACTIVE returns ok', async () => {
    mockAuth('user_test');
    vi.mocked(prisma.caseAssignment.findFirst).mockResolvedValue(
      assignment() as any
    );
    const result = await requireCaseAssignmentAccess('case-001');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.clerkUserId).toBe('user_test');
      expect(result.assignment.status).toBe('ACCEPTED');
      expect(result.assignment.activeKey).toBe('ACTIVE');
    }
  });

  it('RELEASED assignment is denied (activeKey is null, filtered by query)', async () => {
    mockAuth('user_test');
    vi.mocked(prisma.caseAssignment.findFirst).mockResolvedValue(null);
    const result = await requireCaseAssignmentAccess('case-001');
    expect(result.ok).toBe(false);
  });

  it('EXPIRED assignment is denied (activeKey is null, filtered by query)', async () => {
    mockAuth('user_test');
    vi.mocked(prisma.caseAssignment.findFirst).mockResolvedValue(null);
    const result = await requireCaseAssignmentAccess('case-001');
    expect(result.ok).toBe(false);
  });

  it('active=true but activeKey=null is denied (liveness rule: activeKey is canonical)', async () => {
    mockAuth('user_test');
    // DB query filters activeKey='ACTIVE', so active=true + activeKey=null returns null
    vi.mocked(prisma.caseAssignment.findFirst).mockResolvedValue(null);
    const result = await requireCaseAssignmentAccess('case-001');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it('activeKey=ACTIVE but active=false is denied (both fields must be consistent)', async () => {
    mockAuth('user_test');
    // DB query also filters active=true, so activeKey='ACTIVE' + active=false returns null
    vi.mocked(prisma.caseAssignment.findFirst).mockResolvedValue(null);
    const result = await requireCaseAssignmentAccess('case-001');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it('assignment query is scoped to the caller and uses correct liveness filters', async () => {
    mockAuth('user_test');
    vi.mocked(prisma.caseAssignment.findFirst).mockResolvedValue(null);
    await requireCaseAssignmentAccess('case-001');
    expect(vi.mocked(prisma.caseAssignment.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          caseId: 'case-001',
          assigneeClerkUserId: 'user_test',
          activeKey: 'ACTIVE',
          status: 'ACCEPTED',
          active: true
        })
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireCaseWrite — ASSIGN capability
// ─────────────────────────────────────────────────────────────────────────────

describe('requireCaseWrite — ASSIGN', () => {
  beforeEach(() => vi.clearAllMocks());

  it('INTERNAL ADMIN with OWNER CaseOrg → ok', async () => {
    mockAuth('user_admin');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      membership({ role: 'ADMIN' })
    ] as any);
    vi.mocked(prisma.caseOrganization.findFirst).mockResolvedValue(
      caseOrg({ role: 'OWNER' }) as any
    );
    vi.mocked(prisma.caseOrganization.findMany).mockResolvedValue([
      caseOrg()
    ] as any);
    const result = await requireCaseWrite('case-001', 'ASSIGN');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.capability).toBe('ASSIGN');
  });

  it('INTERNAL OWNER with OWNER CaseOrg → ok', async () => {
    mockAuth('user_owner');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      membership({ role: 'OWNER' })
    ] as any);
    vi.mocked(prisma.caseOrganization.findFirst).mockResolvedValue(
      caseOrg({ role: 'OWNER' }) as any
    );
    vi.mocked(prisma.caseOrganization.findMany).mockResolvedValue([
      caseOrg()
    ] as any);
    const result = await requireCaseWrite('case-001', 'ASSIGN');
    expect(result.ok).toBe(true);
  });

  it('INTERNAL MEMBER → 403', async () => {
    mockAuth('user_member');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      membership({ role: 'MEMBER' })
    ] as any);
    const result = await requireCaseWrite('case-001', 'ASSIGN');
    expect(result).toEqual({ ok: false, status: 403 });
  });

  it('INTERNAL VIEWER → 403', async () => {
    mockAuth('user_viewer');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      membership({ role: 'VIEWER' })
    ] as any);
    const result = await requireCaseWrite('case-001', 'ASSIGN');
    expect(result).toEqual({ ok: false, status: 403 });
  });

  it('GUTACHTER org member → 403 (not INTERNAL)', async () => {
    mockAuth('user_gutachter');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      membership({
        role: 'ADMIN',
        organizationId: 'org-gutachter',
        organization: {
          id: 'org-gutachter',
          type: 'GUTACHTER',
          status: 'ACTIVE'
        }
      })
    ] as any);
    const result = await requireCaseWrite('case-001', 'ASSIGN');
    expect(result).toEqual({ ok: false, status: 403 });
  });

  it('INTERNAL ADMIN but no OWNER CaseOrg for this case → 404', async () => {
    mockAuth('user_admin');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      membership({ role: 'ADMIN' })
    ] as any);
    vi.mocked(prisma.caseOrganization.findFirst).mockResolvedValue(null);
    const result = await requireCaseWrite('case-001', 'ASSIGN');
    expect(result).toEqual({ ok: false, status: 404 });
  });

  it('unauthenticated → 401', async () => {
    mockAuth(null);
    const result = await requireCaseWrite('case-001', 'ASSIGN');
    expect(result).toEqual({ ok: false, status: 401 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireCaseWrite — FILES_ADMIN capability
// ─────────────────────────────────────────────────────────────────────────────

describe('requireCaseWrite — FILES_ADMIN', () => {
  beforeEach(() => vi.clearAllMocks());

  it('INTERNAL ADMIN with OWNER CaseOrg → ok', async () => {
    mockAuth('user_admin');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      membership({ role: 'ADMIN' })
    ] as any);
    vi.mocked(prisma.caseOrganization.findFirst).mockResolvedValue(
      caseOrg({ role: 'OWNER' }) as any
    );
    vi.mocked(prisma.caseOrganization.findMany).mockResolvedValue([
      caseOrg()
    ] as any);
    const result = await requireCaseWrite('case-001', 'FILES_ADMIN');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.capability).toBe('FILES_ADMIN');
  });

  it('GUTACHTER org member → 403', async () => {
    mockAuth('user_gutachter');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      membership({
        role: 'ADMIN',
        organizationId: 'org-gutachter',
        organization: {
          id: 'org-gutachter',
          type: 'GUTACHTER',
          status: 'ACTIVE'
        }
      })
    ] as any);
    const result = await requireCaseWrite('case-001', 'FILES_ADMIN');
    expect(result).toEqual({ ok: false, status: 403 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireCaseWrite — FILES_PARTNER capability
// ─────────────────────────────────────────────────────────────────────────────

describe('requireCaseWrite — FILES_PARTNER', () => {
  beforeEach(() => vi.clearAllMocks());

  it('partner with ASSIGNED CaseOrg + ACCEPTED active assignment → ok', async () => {
    mockAuth('user_gutachter');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      membership({
        organizationId: 'org-gutachter',
        organization: {
          id: 'org-gutachter',
          type: 'GUTACHTER',
          status: 'ACTIVE'
        }
      })
    ] as any);
    vi.mocked(prisma.caseOrganization.findMany).mockResolvedValue([
      caseOrg({ organizationId: 'org-gutachter', role: 'ASSIGNED' })
    ] as any);
    vi.mocked(prisma.caseAssignment.findFirst).mockResolvedValue(
      assignment({ assigneeClerkUserId: 'user_gutachter' }) as any
    );
    const result = await requireCaseWrite('case-001', 'FILES_PARTNER');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.capability).toBe('FILES_PARTNER');
      expect(result.assignment).toBeDefined();
    }
  });

  it('partner with ASSIGNED CaseOrg but no ACCEPTED active assignment → 403', async () => {
    mockAuth('user_gutachter');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      membership({
        organizationId: 'org-gutachter',
        organization: {
          id: 'org-gutachter',
          type: 'GUTACHTER',
          status: 'ACTIVE'
        }
      })
    ] as any);
    vi.mocked(prisma.caseOrganization.findMany).mockResolvedValue([
      caseOrg({ organizationId: 'org-gutachter', role: 'ASSIGNED' })
    ] as any);
    vi.mocked(prisma.caseAssignment.findFirst).mockResolvedValue(null);
    const result = await requireCaseWrite('case-001', 'FILES_PARTNER');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it('partner with ACCEPTED assignment but no ASSIGNED CaseOrg → 403', async () => {
    mockAuth('user_gutachter');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      membership({
        organizationId: 'org-gutachter',
        organization: {
          id: 'org-gutachter',
          type: 'GUTACHTER',
          status: 'ACTIVE'
        }
      })
    ] as any);
    // CaseOrg exists but role is INVOLVED, not ASSIGNED
    vi.mocked(prisma.caseOrganization.findMany).mockResolvedValue([
      caseOrg({ organizationId: 'org-gutachter', role: 'INVOLVED' })
    ] as any);
    vi.mocked(prisma.caseAssignment.findFirst).mockResolvedValue(
      assignment({ assigneeClerkUserId: 'user_gutachter' }) as any
    );
    const result = await requireCaseWrite('case-001', 'FILES_PARTNER');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it('no case access (no CaseOrg) → 404', async () => {
    mockAuth('user_gutachter');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      membership({
        organizationId: 'org-gutachter',
        organization: {
          id: 'org-gutachter',
          type: 'GUTACHTER',
          status: 'ACTIVE'
        }
      })
    ] as any);
    vi.mocked(prisma.caseOrganization.findMany).mockResolvedValue([]);
    const result = await requireCaseWrite('case-001', 'FILES_PARTNER');
    expect(result.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireCaseWrite — STATUS capability
// ─────────────────────────────────────────────────────────────────────────────

describe('requireCaseWrite — STATUS', () => {
  beforeEach(() => vi.clearAllMocks());

  it('INTERNAL ADMIN with OWNER CaseOrg → ok via internal path', async () => {
    mockAuth('user_admin');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      membership({ role: 'ADMIN' })
    ] as any);
    vi.mocked(prisma.caseOrganization.findFirst).mockResolvedValue(
      caseOrg({ role: 'OWNER' }) as any
    );
    vi.mocked(prisma.caseOrganization.findMany).mockResolvedValue([
      caseOrg()
    ] as any);
    const result = await requireCaseWrite('case-001', 'STATUS');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.capability).toBe('STATUS');
  });

  it('partner with ASSIGNED CaseOrg + ACCEPTED assignment → ok via partner path', async () => {
    mockAuth('user_gutachter');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      membership({
        organizationId: 'org-gutachter',
        organization: {
          id: 'org-gutachter',
          type: 'GUTACHTER',
          status: 'ACTIVE'
        }
      })
    ] as any);
    vi.mocked(prisma.caseOrganization.findMany).mockResolvedValue([
      caseOrg({ organizationId: 'org-gutachter', role: 'ASSIGNED' })
    ] as any);
    vi.mocked(prisma.caseAssignment.findFirst).mockResolvedValue(
      assignment({ assigneeClerkUserId: 'user_gutachter' }) as any
    );
    const result = await requireCaseWrite('case-001', 'STATUS');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.capability).toBe('STATUS');
      expect(result.assignment).toBeDefined();
    }
  });

  it('INTERNAL MEMBER with no partner path → 403', async () => {
    mockAuth('user_member');
    // INTERNAL MEMBER fails internal check; same user has no partner assignment
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      membership({ role: 'MEMBER' })
    ] as any);
    vi.mocked(prisma.caseOrganization.findMany).mockResolvedValue([]);
    const result = await requireCaseWrite('case-001', 'STATUS');
    expect(result.ok).toBe(false);
  });

  it('unauthenticated → 401', async () => {
    mockAuth(null);
    const result = await requireCaseWrite('case-001', 'STATUS');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Transition security: Clerk metadata cannot substitute for DB membership
// ─────────────────────────────────────────────────────────────────────────────

describe('Transition security', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Clerk publicMetadata ADMIN role without DB Membership → requireCaseAccess 403', async () => {
    // Simulates a user who has role=admin in Clerk publicMetadata but no DB Membership
    mockAuth('user_clerk_admin_only');
    vi.mocked(prisma.membership.findMany).mockResolvedValue([]);
    const result = await requireCaseAccess('case-001');
    expect(result).toEqual({ ok: false, status: 403 });
  });

  it('Clerk publicMetadata GUTACHTER role without DB Membership → requireCaseAssignmentAccess 401 (no Clerk userId mismatch) or denied', async () => {
    mockAuth('user_clerk_gutachter_only');
    vi.mocked(prisma.caseAssignment.findFirst).mockResolvedValue(null);
    const result = await requireCaseAssignmentAccess('case-001');
    // Identity resolves but assignment query returns nothing → 404
    expect(result.ok).toBe(false);
    if (!result.ok) expect([401, 404]).toContain(result.status);
  });
});
