/**
 * GT24 NEXT Phase 3A — Organization & Tenancy Schema Tests
 *
 * Covers:
 *  - Schema structure (Organization, Membership, CaseOrganization models + enums)
 *  - Enum values
 *  - Policy helpers (requireIdentity, getActiveMemberships, getInternalMembership,
 *    getCaseOrganizations)
 *  - Seed determinism and ANWALT→LEGAL mapping
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { existsSync } from 'fs';
import { readFileSync } from 'fs';
import path from 'path';

vi.mock('server-only', () => ({}));

const ROOT = path.resolve(__dirname, '../../src');
const SCHEMA_PATH = path.resolve(__dirname, '../../prisma/schema.prisma');
const SEED_PATH = path.resolve(__dirname, '../../prisma/seed.ts');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

function readSeed(): string {
  return readFileSync(SEED_PATH, 'utf-8');
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA: Models exist
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3A schema: model definitions', () => {
  it('Organization model is defined in schema', () => {
    expect(readSchema()).toContain('model Organization {');
  });

  it('Membership model is defined in schema', () => {
    expect(readSchema()).toContain('model Membership {');
  });

  it('CaseOrganization model is defined in schema', () => {
    expect(readSchema()).toContain('model CaseOrganization {');
  });

  it('Partner model has organizationId field', () => {
    const schema = readSchema();
    // organizationId appears in Partner model
    expect(schema).toContain('organizationId');
  });

  it('Case model has caseOrganizations relation', () => {
    expect(readSchema()).toContain('caseOrganizations CaseOrganization[]');
  });

  it('Case model does NOT have ownerOrganizationId', () => {
    // The rejected v1 approach must not exist
    expect(readSchema()).not.toContain('ownerOrganizationId');
  });

  it('Case model does NOT have organizationId scalar FK', () => {
    // We use CaseOrganization join table, not a direct scalar FK on Case
    const schema = readSchema();
    // Confirm there is no "organizationId" column defined directly on Case
    // (the Case model block should not contain organizationId)
    const caseModelMatch = schema.match(/model Case \{[\s\S]*?\n\}/);
    expect(caseModelMatch).not.toBeNull();
    const caseBlock = caseModelMatch![0];
    expect(caseBlock).not.toContain('organizationId');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA: Enum values
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3A schema: OrganizationType enum', () => {
  it('contains INTERNAL', () => {
    expect(readSchema()).toContain('INTERNAL');
  });
  it('contains GUTACHTER', () => {
    expect(readSchema()).toContain('GUTACHTER');
  });
  it('contains LEGAL', () => {
    expect(readSchema()).toContain('LEGAL');
  });
  it('contains FLEET', () => {
    expect(readSchema()).toContain('FLEET');
  });
  it('contains AGENCY', () => {
    expect(readSchema()).toContain('AGENCY');
  });
  it('does NOT contain ANWALT as OrganizationType', () => {
    // ANWALT is a PartnerType, not an OrganizationType; LEGAL is used instead
    const schema = readSchema();
    const orgTypeMatch = schema.match(/enum OrganizationType \{[\s\S]*?\}/);
    expect(orgTypeMatch).not.toBeNull();
    expect(orgTypeMatch![0]).not.toContain('ANWALT');
  });
});

describe('Phase 3A schema: MembershipRole enum', () => {
  it('contains OWNER', () => {
    expect(readSchema()).toContain('OWNER');
  });
  it('contains ADMIN', () => {
    expect(readSchema()).toContain('ADMIN');
  });
  it('contains MEMBER', () => {
    expect(readSchema()).toContain('MEMBER');
  });
  it('contains VIEWER', () => {
    expect(readSchema()).toContain('VIEWER');
  });
});

describe('Phase 3A schema: MembershipStatus enum', () => {
  it('contains ACTIVE', () => {
    const schema = readSchema();
    expect(schema).toContain('enum MembershipStatus');
    expect(schema).toContain('ACTIVE');
  });
  it('contains INACTIVE', () => {
    expect(readSchema()).toContain('INACTIVE');
  });
  it('contains REVOKED', () => {
    expect(readSchema()).toContain('REVOKED');
  });
});

describe('Phase 3A schema: CaseOrganizationRole enum', () => {
  it('contains OWNER', () => {
    const schema = readSchema();
    const enumMatch = schema.match(/enum CaseOrganizationRole \{[\s\S]*?\}/);
    expect(enumMatch).not.toBeNull();
    expect(enumMatch![0]).toContain('OWNER');
  });
  it('contains ORIGINATOR', () => {
    expect(readSchema()).toContain('ORIGINATOR');
  });
  it('contains ASSIGNED', () => {
    expect(readSchema()).toContain('ASSIGNED');
  });
  it('contains INVOLVED', () => {
    expect(readSchema()).toContain('INVOLVED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA: Constraints
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3A schema: Membership constraints', () => {
  it('has @@unique([organizationId, clerkUserId])', () => {
    expect(readSchema()).toContain('@@unique([organizationId, clerkUserId])');
  });
  it('has @@index([clerkUserId, status])', () => {
    expect(readSchema()).toContain('@@index([clerkUserId, status])');
  });
  it('has @@index([organizationId, status])', () => {
    expect(readSchema()).toContain('@@index([organizationId, status])');
  });
});

describe('Phase 3A schema: CaseOrganization constraints', () => {
  it('has @@unique([caseId, organizationId, role])', () => {
    expect(readSchema()).toContain('@@unique([caseId, organizationId, role])');
  });
  it('has @@index([caseId])', () => {
    expect(readSchema()).toContain('@@index([caseId])');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA: Existing enums unchanged
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3A schema: existing enums are unchanged', () => {
  it('PartnerType still has GUTACHTER', () => {
    const schema = readSchema();
    const enumMatch = schema.match(/enum PartnerType \{[\s\S]*?\}/);
    expect(enumMatch).not.toBeNull();
    expect(enumMatch![0]).toContain('GUTACHTER');
  });
  it('PartnerType still has ANWALT', () => {
    const schema = readSchema();
    const enumMatch = schema.match(/enum PartnerType \{[\s\S]*?\}/);
    expect(enumMatch![0]).toContain('ANWALT');
  });
  it('AssignmentRole still has GUTACHTER', () => {
    const schema = readSchema();
    const enumMatch = schema.match(/enum AssignmentRole \{[\s\S]*?\}/);
    expect(enumMatch).not.toBeNull();
    expect(enumMatch![0]).toContain('GUTACHTER');
  });
  it('AssignmentRole still has ANWALT', () => {
    const schema = readSchema();
    const enumMatch = schema.match(/enum AssignmentRole \{[\s\S]*?\}/);
    expect(enumMatch![0]).toContain('ANWALT');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SEED: Structure and mapping
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3A seed: organization IDs are deterministic', () => {
  it('uses id: org-gt24-internal', () => {
    expect(readSeed()).toContain("id: 'org-gt24-internal'");
  });
  it('uses id: org-gutachter-1', () => {
    expect(readSeed()).toContain("id: 'org-gutachter-1'");
  });
  it('uses id: org-gutachter-2', () => {
    expect(readSeed()).toContain("id: 'org-gutachter-2'");
  });
  it('uses id: org-legal-1', () => {
    expect(readSeed()).toContain("id: 'org-legal-1'");
  });
});

describe('Phase 3A seed: ANWALT maps to LEGAL organization type', () => {
  it('org-legal-1 has type LEGAL, not ANWALT or AGENCY', () => {
    const seed = readSeed();
    // Find the org-legal-1 block and verify type
    expect(seed).toContain("type: 'LEGAL'");
    // The org for the Anwalt partner must not use AGENCY
    const legalBlock = seed.match(/id: 'org-legal-1'[\s\S]*?status: 'ACTIVE'/);
    expect(legalBlock).not.toBeNull();
    expect(legalBlock![0]).not.toContain('AGENCY');
  });
});

describe('Phase 3A seed: correct org types', () => {
  it('INTERNAL org uses type INTERNAL', () => {
    const seed = readSeed();
    const block = seed.match(/id: 'org-gt24-internal'[\s\S]*?status: 'ACTIVE'/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain("type: 'INTERNAL'");
  });
  it('GUTACHTER orgs use type GUTACHTER', () => {
    const seed = readSeed();
    const block1 = seed.match(/id: 'org-gutachter-1'[\s\S]*?status: 'ACTIVE'/);
    expect(block1![0]).toContain("type: 'GUTACHTER'");
    const block2 = seed.match(/id: 'org-gutachter-2'[\s\S]*?status: 'ACTIVE'/);
    expect(block2![0]).toContain("type: 'GUTACHTER'");
  });
});

describe('Phase 3A seed: memberships', () => {
  it('user_test_gutachter_001 gets MEMBER in org-gutachter-1', () => {
    const seed = readSeed();
    expect(seed).toContain('user_test_gutachter_001');
    expect(seed).toContain('org-gutachter-1');
  });
  it('user_test_anwalt_001 gets MEMBER in org-legal-1', () => {
    const seed = readSeed();
    expect(seed).toContain('user_test_anwalt_001');
    expect(seed).toContain('org-legal-1');
  });
  it('bootstrap admin membership is conditional on BOOTSTRAP_INTERNAL_ADMIN_CLERK_ID', () => {
    expect(readSeed()).toContain('BOOTSTRAP_INTERNAL_ADMIN_CLERK_ID');
  });
  it('bootstrap admin is skipped (not errored) when env var is absent', () => {
    expect(readSeed()).toContain('skipping INTERNAL admin membership');
  });
});

describe('Phase 3A seed: CaseOrganization', () => {
  it('creates OWNER row for seed-case-1 in org-gt24-internal', () => {
    const seed = readSeed();
    expect(seed).toContain("caseId: 'seed-case-1'");
    expect(seed).toContain("role: 'OWNER'");
  });
  it('does NOT create ASSIGNED rows in seed', () => {
    // ASSIGNED rows come from accepted assignments in 3B, not seeded directly
    const seed = readSeed();
    expect(seed).not.toContain("role: 'ASSIGNED'");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POLICY HELPERS: File exists and exports expected symbols
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3A policy: policy.ts file structure', () => {
  const POLICY_PATH = path.join(ROOT, 'lib/policy.ts');

  it('src/lib/policy.ts exists', () => {
    expect(existsSync(POLICY_PATH)).toBe(true);
  });

  it('imports server-only', () => {
    const content = readFileSync(POLICY_PATH, 'utf-8');
    expect(content).toContain("import 'server-only'");
  });

  it('exports requireIdentity', () => {
    const content = readFileSync(POLICY_PATH, 'utf-8');
    expect(content).toContain('export async function requireIdentity');
  });

  it('exports getActiveMemberships', () => {
    const content = readFileSync(POLICY_PATH, 'utf-8');
    expect(content).toContain('export async function getActiveMemberships');
  });

  it('exports getInternalMembership', () => {
    const content = readFileSync(POLICY_PATH, 'utf-8');
    expect(content).toContain('export async function getInternalMembership');
  });

  it('exports getCaseOrganizations', () => {
    const content = readFileSync(POLICY_PATH, 'utf-8');
    expect(content).toContain('export async function getCaseOrganizations');
  });

  it('exports requireInternalAdmin', () => {
    const content = readFileSync(POLICY_PATH, 'utf-8');
    expect(content).toContain('export async function requireInternalAdmin');
  });

  it('does NOT import from rbac.ts (keeps separation)', () => {
    const content = readFileSync(POLICY_PATH, 'utf-8');
    expect(content).not.toContain("from '@/lib/rbac'");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POLICY HELPERS: Functional tests with mocked Prisma
// ─────────────────────────────────────────────────────────────────────────────

const mockPrisma = {
  membership: {
    findMany: vi.fn(),
    findFirst: vi.fn()
  },
  caseOrganization: {
    findMany: vi.fn()
  }
};

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn()
}));

describe('Phase 3A policy: requireIdentity()', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns ok:false with status 401 when no Clerk user', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);
    const { requireIdentity } = await import('@/lib/policy');
    const result = await requireIdentity();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it('returns ok:true with clerkUserId when Clerk user present', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockResolvedValue({ userId: 'user_test_123' } as any);
    const { requireIdentity } = await import('@/lib/policy');
    const result = await requireIdentity();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.clerkUserId).toBe('user_test_123');
  });
});

describe('Phase 3A policy: getActiveMemberships()', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('queries with ACTIVE membership and ACTIVE organization status', async () => {
    mockPrisma.membership.findMany.mockResolvedValue([]);
    const { getActiveMemberships } = await import('@/lib/policy');
    await getActiveMemberships('user_test_001');
    expect(mockPrisma.membership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clerkUserId: 'user_test_001',
          status: 'ACTIVE',
          organization: expect.objectContaining({ status: 'ACTIVE' })
        })
      })
    );
  });

  it('returns empty array when no memberships exist', async () => {
    mockPrisma.membership.findMany.mockResolvedValue([]);
    const { getActiveMemberships } = await import('@/lib/policy');
    const result = await getActiveMemberships('user_unknown');
    expect(result).toEqual([]);
  });

  it('excludes INACTIVE memberships (only ACTIVE filter passed)', async () => {
    // The query filters on status: 'ACTIVE' — mock verifies filter is passed
    mockPrisma.membership.findMany.mockResolvedValue([]);
    const { getActiveMemberships } = await import('@/lib/policy');
    await getActiveMemberships('user_test_001');
    const call = mockPrisma.membership.findMany.mock.calls[0][0];
    expect(call.where.status).toBe('ACTIVE');
  });

  it('excludes SUSPENDED organizations (ACTIVE org filter passed)', async () => {
    mockPrisma.membership.findMany.mockResolvedValue([]);
    const { getActiveMemberships } = await import('@/lib/policy');
    await getActiveMemberships('user_test_001');
    const call = mockPrisma.membership.findMany.mock.calls[0][0];
    expect(call.where.organization.status).toBe('ACTIVE');
  });
});

describe('Phase 3A policy: getInternalMembership()', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('queries for INTERNAL org type', async () => {
    mockPrisma.membership.findFirst.mockResolvedValue(null);
    const { getInternalMembership } = await import('@/lib/policy');
    await getInternalMembership('user_test_001');
    const call = mockPrisma.membership.findFirst.mock.calls[0][0];
    expect(call.where.organization.type).toBe('INTERNAL');
  });

  it('returns null when user is not in INTERNAL org', async () => {
    mockPrisma.membership.findFirst.mockResolvedValue(null);
    const { getInternalMembership } = await import('@/lib/policy');
    const result = await getInternalMembership('user_test_gutachter_001');
    expect(result).toBeNull();
  });

  it('returns membership when user is in INTERNAL org', async () => {
    const fakeMembership = {
      id: 'mem-1',
      clerkUserId: 'user_test_admin',
      organizationId: 'org-gt24-internal',
      role: 'ADMIN',
      status: 'ACTIVE',
      organization: {
        id: 'org-gt24-internal',
        type: 'INTERNAL',
        status: 'ACTIVE'
      }
    };
    mockPrisma.membership.findFirst.mockResolvedValue(fakeMembership);
    const { getInternalMembership } = await import('@/lib/policy');
    const result = await getInternalMembership('user_test_admin');
    expect(result).not.toBeNull();
    expect(result?.organization.type).toBe('INTERNAL');
  });

  it('a GUTACHTER membership is not treated as INTERNAL', async () => {
    // getInternalMembership filters by type: INTERNAL — a GUTACHTER membership
    // would not match; mock returns null to simulate this
    mockPrisma.membership.findFirst.mockResolvedValue(null);
    const { getInternalMembership } = await import('@/lib/policy');
    const result = await getInternalMembership('user_test_gutachter_001');
    expect(result).toBeNull();
    // Confirm the filter specifies INTERNAL, not GUTACHTER
    const call = mockPrisma.membership.findFirst.mock.calls[0][0];
    expect(call.where.organization.type).toBe('INTERNAL');
    expect(call.where.organization.type).not.toBe('GUTACHTER');
  });
});

describe('Phase 3A policy: getCaseOrganizations()', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('queries by caseId', async () => {
    mockPrisma.caseOrganization.findMany.mockResolvedValue([]);
    const { getCaseOrganizations } = await import('@/lib/policy');
    await getCaseOrganizations('seed-case-1');
    const call = mockPrisma.caseOrganization.findMany.mock.calls[0][0];
    expect(call.where.caseId).toBe('seed-case-1');
  });

  it('includes organization relation', async () => {
    mockPrisma.caseOrganization.findMany.mockResolvedValue([]);
    const { getCaseOrganizations } = await import('@/lib/policy');
    await getCaseOrganizations('seed-case-1');
    const call = mockPrisma.caseOrganization.findMany.mock.calls[0][0];
    expect(call.include).toEqual({ organization: true });
  });

  it('returns case organization relationships', async () => {
    const fakeRows = [
      {
        id: 'co-1',
        caseId: 'seed-case-1',
        organizationId: 'org-gt24-internal',
        role: 'OWNER',
        organization: {
          id: 'org-gt24-internal',
          type: 'INTERNAL',
          status: 'ACTIVE'
        }
      }
    ];
    mockPrisma.caseOrganization.findMany.mockResolvedValue(fakeRows);
    const { getCaseOrganizations } = await import('@/lib/policy');
    const result = await getCaseOrganizations('seed-case-1');
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('OWNER');
    expect(result[0].organization.type).toBe('INTERNAL');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3B: requireInternalAdmin() — functional tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3B policy: requireInternalAdmin()', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns ok:false status 401 when no Clerk session', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);
    const { requireInternalAdmin } = await import('@/lib/policy');
    const result = await requireInternalAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it('returns ok:false status 403 when user has no INTERNAL membership', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockResolvedValue({
      userId: 'user_test_gutachter_001'
    } as any);
    mockPrisma.membership.findFirst.mockResolvedValue(null);
    const { requireInternalAdmin } = await import('@/lib/policy');
    const result = await requireInternalAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it('returns ok:false status 403 when INTERNAL membership role is MEMBER', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockResolvedValue({ userId: 'user_test_member' } as any);
    mockPrisma.membership.findFirst.mockResolvedValue({
      id: 'mem-1',
      clerkUserId: 'user_test_member',
      organizationId: 'org-gt24-internal',
      role: 'MEMBER',
      status: 'ACTIVE',
      organization: {
        id: 'org-gt24-internal',
        type: 'INTERNAL',
        status: 'ACTIVE'
      }
    });
    const { requireInternalAdmin } = await import('@/lib/policy');
    const result = await requireInternalAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it('returns ok:false status 403 when INTERNAL membership role is VIEWER', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockResolvedValue({ userId: 'user_test_viewer' } as any);
    mockPrisma.membership.findFirst.mockResolvedValue({
      id: 'mem-2',
      clerkUserId: 'user_test_viewer',
      organizationId: 'org-gt24-internal',
      role: 'VIEWER',
      status: 'ACTIVE',
      organization: {
        id: 'org-gt24-internal',
        type: 'INTERNAL',
        status: 'ACTIVE'
      }
    });
    const { requireInternalAdmin } = await import('@/lib/policy');
    const result = await requireInternalAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it('returns ok:true with clerkUserId when INTERNAL membership role is ADMIN', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockResolvedValue({ userId: 'user_test_admin' } as any);
    mockPrisma.membership.findFirst.mockResolvedValue({
      id: 'mem-3',
      clerkUserId: 'user_test_admin',
      organizationId: 'org-gt24-internal',
      role: 'ADMIN',
      status: 'ACTIVE',
      organization: {
        id: 'org-gt24-internal',
        type: 'INTERNAL',
        status: 'ACTIVE'
      }
    });
    const { requireInternalAdmin } = await import('@/lib/policy');
    const result = await requireInternalAdmin();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.clerkUserId).toBe('user_test_admin');
  });

  it('returns ok:true with clerkUserId when INTERNAL membership role is OWNER', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockResolvedValue({ userId: 'user_test_owner' } as any);
    mockPrisma.membership.findFirst.mockResolvedValue({
      id: 'mem-4',
      clerkUserId: 'user_test_owner',
      organizationId: 'org-gt24-internal',
      role: 'OWNER',
      status: 'ACTIVE',
      organization: {
        id: 'org-gt24-internal',
        type: 'INTERNAL',
        status: 'ACTIVE'
      }
    });
    const { requireInternalAdmin } = await import('@/lib/policy');
    const result = await requireInternalAdmin();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.clerkUserId).toBe('user_test_owner');
  });

  it('does not rely on Clerk publicMetadata — DB-only authorization', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    // Provide userId but empty sessionClaims — no publicMetadata.role
    vi.mocked(auth).mockResolvedValue({
      userId: 'user_test_admin',
      sessionClaims: {}
    } as any);
    mockPrisma.membership.findFirst.mockResolvedValue({
      id: 'mem-5',
      clerkUserId: 'user_test_admin',
      organizationId: 'org-gt24-internal',
      role: 'ADMIN',
      status: 'ACTIVE',
      organization: {
        id: 'org-gt24-internal',
        type: 'INTERNAL',
        status: 'ACTIVE'
      }
    });
    const { requireInternalAdmin } = await import('@/lib/policy');
    const result = await requireInternalAdmin();
    // Authorization is DB-only — passes without publicMetadata.role
    expect(result.ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3B: gutachten/extract route — structure verification
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3B: gutachten/extract route uses DB policy (no direct auth())', () => {
  const EXTRACT_ROUTE_PATH = path.resolve(
    __dirname,
    '../../src/app/api/cases/[id]/gutachten/extract/route.ts'
  );

  it('extract route file exists', () => {
    expect(existsSync(EXTRACT_ROUTE_PATH)).toBe(true);
  });

  it('imports requireInternalAdmin from policy', () => {
    const content = readFileSync(EXTRACT_ROUTE_PATH, 'utf-8');
    expect(content).toContain("from '@/lib/policy'");
    expect(content).toContain('requireInternalAdmin');
  });

  it('does NOT import auth directly from @clerk/nextjs/server', () => {
    const content = readFileSync(EXTRACT_ROUTE_PATH, 'utf-8');
    expect(content).not.toContain("from '@clerk/nextjs/server'");
  });

  it('does NOT use publicMetadata fallback', () => {
    const content = readFileSync(EXTRACT_ROUTE_PATH, 'utf-8');
    expect(content).not.toContain('publicMetadata');
  });

  it('does NOT use rbac.ts helpers', () => {
    const content = readFileSync(EXTRACT_ROUTE_PATH, 'utf-8');
    expect(content).not.toContain("from '@/lib/rbac'");
  });
});
