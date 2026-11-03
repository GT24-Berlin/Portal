import 'server-only';

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import type {
  Organization,
  Membership,
  CaseOrganization,
  CaseFile,
  OrganizationType,
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
  CaseOrganizationRole,
  AssignmentRole,
  AssignmentStatus
} from '@prisma/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export type IdentityResult =
  | { ok: true; clerkUserId: string }
  | { ok: false; status: 401 };

export type MembershipWithOrg = Membership & { organization: Organization };

export type CaseOrganizationWithOrg = CaseOrganization & {
  organization: Organization;
};

// ── requireIdentity ───────────────────────────────────────────────────────────
//
// Verifies a Clerk session is present. Returns the clerkUserId.
// No authorization decision is made here — only identity.

export async function requireIdentity(): Promise<IdentityResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, status: 401 };
  return { ok: true, clerkUserId: userId };
}

// ── getActiveMemberships ──────────────────────────────────────────────────────
//
// Returns all ACTIVE memberships for a Clerk user where the organization
// is also ACTIVE. Read-only; no authorization enforcement.

export async function getActiveMemberships(
  clerkUserId: string
): Promise<MembershipWithOrg[]> {
  return prisma.membership.findMany({
    where: {
      clerkUserId,
      status: 'ACTIVE' satisfies MembershipStatus,
      organization: {
        status: 'ACTIVE' satisfies OrganizationStatus
      }
    },
    include: {
      organization: true
    }
  });
}

// ── getInternalMembership ─────────────────────────────────────────────────────
//
// Returns the ACTIVE membership in the GT24 INTERNAL organization for a user,
// or null if none exists. Used to identify internal admins/operators.

export async function getInternalMembership(
  clerkUserId: string
): Promise<MembershipWithOrg | null> {
  const membership = await prisma.membership.findFirst({
    where: {
      clerkUserId,
      status: 'ACTIVE' satisfies MembershipStatus,
      organization: {
        type: 'INTERNAL' satisfies OrganizationType,
        status: 'ACTIVE' satisfies OrganizationStatus
      }
    },
    include: {
      organization: true
    }
  });
  return membership;
}

// ── requireInternalAdmin ──────────────────────────────────────────────────────
//
// Enforces that the caller is an authenticated INTERNAL org ADMIN or OWNER.
// Returns 401 if no Clerk session, 403 if identity exists but authorization fails.
// No Clerk-role fallback. No publicMetadata fallback. Default deny.

export type InternalAdminResult =
  | { ok: true; clerkUserId: string }
  | { ok: false; status: 401 | 403 };

export async function requireInternalAdmin(): Promise<InternalAdminResult> {
  const identity = await requireIdentity();
  if (!identity.ok) return { ok: false, status: 401 };

  const membership = await getInternalMembership(identity.clerkUserId);
  if (!membership) return { ok: false, status: 403 };

  const adminRoles: MembershipRole[] = ['ADMIN', 'OWNER'];
  if (!adminRoles.includes(membership.role)) return { ok: false, status: 403 };

  return { ok: true, clerkUserId: identity.clerkUserId };
}

// ── getCaseOrganizations ──────────────────────────────────────────────────────
//
// Returns all CaseOrganization rows for a case, with the Organization relation.
// Read-only; no authorization enforcement.

export async function getCaseOrganizations(
  caseId: string
): Promise<CaseOrganizationWithOrg[]> {
  return prisma.caseOrganization.findMany({
    where: { caseId },
    include: { organization: true }
  });
}

// ── Phase 3B-2 types ──────────────────────────────────────────────────────────

export type CaseAccessResult =
  | {
      ok: true;
      clerkUserId: string;
      memberships: MembershipWithOrg[];
      caseOrgs: CaseOrganizationWithOrg[];
    }
  | { ok: false; status: 401 | 403 | 404 };

/**
 * Subset of CaseFile fields safe to return from policy helpers.
 * storageKey is present here for internal server use only — never forward it
 * to API responses; resolve it to a signed URL or omit it before returning.
 */
export type CaseFileMetadata = Pick<
  CaseFile,
  | 'id'
  | 'caseId'
  | 'storageKey'
  | 'filename'
  | 'mimeType'
  | 'size'
  | 'visibility'
  | 'category'
  | 'uploaderType'
  | 'uploaderId'
  | 'role'
>;

export type CaseFileAccessResult =
  | {
      ok: true;
      clerkUserId: string;
      file: CaseFileMetadata;
      memberships: MembershipWithOrg[];
      caseOrgs: CaseOrganizationWithOrg[];
    }
  | { ok: false; status: 401 | 403 | 404 };

export type AssignmentContext = {
  id: string;
  caseId: string;
  role: AssignmentRole;
  assigneeClerkUserId: string;
  status: AssignmentStatus;
  active: boolean;
  activeKey: string | null;
  expiresAt: Date;
  assignedAt: Date;
  acceptedAt: Date | null;
};

export type CaseAssignmentAccessResult =
  | { ok: true; clerkUserId: string; assignment: AssignmentContext }
  | { ok: false; status: 401 | 404 };

export type CaseWriteCapability =
  | 'STATUS'
  | 'ASSIGN'
  | 'FILES_ADMIN'
  | 'FILES_PARTNER';

export type CaseWriteResult =
  | {
      ok: true;
      clerkUserId: string;
      capability: CaseWriteCapability;
      assignment?: AssignmentContext;
      caseOrgs: CaseOrganizationWithOrg[];
      memberships: MembershipWithOrg[];
    }
  | { ok: false; status: 401 | 403 | 404 };

// ── requireCaseAccess ─────────────────────────────────────────────────────────
//
// Level 1 access gate: caller must have an ACTIVE membership in an org that
// holds a CaseOrganization row for this case. Returns 404 (not 403) when no
// matching CaseOrg exists to avoid leaking case existence to authenticated
// users who simply have no relationship to the case.

export async function requireCaseAccess(
  caseId: string
): Promise<CaseAccessResult> {
  const identity = await requireIdentity();
  if (!identity.ok) return { ok: false, status: 401 };

  const memberships = await getActiveMemberships(identity.clerkUserId);
  if (memberships.length === 0) return { ok: false, status: 403 };

  const orgIds = memberships.map((m) => m.organizationId);
  const caseOrgs = await prisma.caseOrganization.findMany({
    where: { caseId, organizationId: { in: orgIds } },
    include: { organization: true }
  });

  if (caseOrgs.length === 0) return { ok: false, status: 404 };

  return { ok: true, clerkUserId: identity.clerkUserId, memberships, caseOrgs };
}

// ── requireCaseFileAccess ─────────────────────────────────────────────────────
//
// Looks up a CaseFile by both fileId AND caseId (prevents cross-case
// enumeration), then gates on requireCaseAccess. The returned file metadata
// includes storageKey for internal server use only — strip it before returning
// anything to a client response.

export async function requireCaseFileAccess(
  fileId: string,
  caseId: string
): Promise<CaseFileAccessResult> {
  const file = await prisma.caseFile.findFirst({
    where: { id: fileId, caseId },
    select: {
      id: true,
      caseId: true,
      storageKey: true,
      filename: true,
      mimeType: true,
      size: true,
      visibility: true,
      category: true,
      uploaderType: true,
      uploaderId: true,
      role: true
    }
  });

  if (!file) return { ok: false, status: 404 };

  const access = await requireCaseAccess(caseId);
  if (!access.ok) return access;

  return {
    ok: true,
    clerkUserId: access.clerkUserId,
    file,
    memberships: access.memberships,
    caseOrgs: access.caseOrgs
  };
}

// ── requireCaseAssignmentAccess ───────────────────────────────────────────────
//
// Level 2 individual access gate: caller must have an ACCEPTED assignment with
// activeKey='ACTIVE' for this case. activeKey is the canonical liveness signal
// (@@unique([caseId, role, activeKey]) NULL trick); the active boolean field is
// intentionally NOT used as a filter here — activeKey alone is authoritative.
//
// Liveness rule: activeKey='ACTIVE' is required. A row with active=true but
// activeKey=null is NOT considered live. A row with activeKey='ACTIVE' but
// active=false is also NOT live — both fields must be consistent with
// activeKey='ACTIVE'. PENDING → denied for mutation (status filter enforces
// ACCEPTED). RELEASED/EXPIRED → denied (activeKey will be null on those rows).

export async function requireCaseAssignmentAccess(
  caseId: string
): Promise<CaseAssignmentAccessResult> {
  const identity = await requireIdentity();
  if (!identity.ok) return { ok: false, status: 401 };

  const assignment = await prisma.caseAssignment.findFirst({
    where: {
      caseId,
      assigneeClerkUserId: identity.clerkUserId,
      activeKey: 'ACTIVE',
      status: 'ACCEPTED' satisfies AssignmentStatus,
      active: true
    },
    select: {
      id: true,
      caseId: true,
      role: true,
      assigneeClerkUserId: true,
      status: true,
      active: true,
      activeKey: true,
      expiresAt: true,
      assignedAt: true,
      acceptedAt: true
    }
  });

  if (!assignment) return { ok: false, status: 404 };

  return { ok: true, clerkUserId: identity.clerkUserId, assignment };
}

// ── requireCaseWrite ──────────────────────────────────────────────────────────
//
// Capability-gated write authorization. Four capabilities:
//   ASSIGN      — INTERNAL ADMIN/OWNER with OWNER CaseOrg for this case
//   FILES_ADMIN — same as ASSIGN
//   FILES_PARTNER — caller's org has ASSIGNED CaseOrg + ACCEPTED active assignment
//   STATUS      — either path above (INTERNAL OWNER-CaseOrg OR accepted partner)

export async function requireCaseWrite(
  caseId: string,
  capability: CaseWriteCapability
): Promise<CaseWriteResult> {
  if (capability === 'ASSIGN' || capability === 'FILES_ADMIN') {
    return _requireInternalOwnerWrite(caseId, capability);
  }

  if (capability === 'FILES_PARTNER') {
    return _requirePartnerWrite(caseId, capability);
  }

  // STATUS: try INTERNAL OWNER path first, then partner path
  const internalResult = await _requireInternalOwnerWrite(caseId, 'STATUS');
  if (internalResult.ok) return internalResult;

  const partnerResult = await _requirePartnerWrite(caseId, 'STATUS');
  if (partnerResult.ok) return partnerResult;

  // Return the more specific denial from the partner path if identity succeeded
  return internalResult.status === 401 ? internalResult : partnerResult;
}

async function _requireInternalOwnerWrite(
  caseId: string,
  capability: CaseWriteCapability
): Promise<CaseWriteResult> {
  const identity = await requireIdentity();
  if (!identity.ok) return { ok: false, status: 401 };

  const memberships = await getActiveMemberships(identity.clerkUserId);
  if (memberships.length === 0) return { ok: false, status: 403 };

  const internalMembership = memberships.find(
    (m) =>
      (m.organization.type satisfies OrganizationType) === 'INTERNAL' &&
      (['ADMIN', 'OWNER'] as MembershipRole[]).includes(m.role)
  );
  if (!internalMembership) return { ok: false, status: 403 };

  const ownerCaseOrg = await prisma.caseOrganization.findFirst({
    where: {
      caseId,
      organizationId: internalMembership.organizationId,
      role: 'OWNER' satisfies CaseOrganizationRole
    },
    include: { organization: true }
  });
  if (!ownerCaseOrg) return { ok: false, status: 404 };

  const orgIds = memberships.map((m) => m.organizationId);
  const caseOrgs = await prisma.caseOrganization.findMany({
    where: { caseId, organizationId: { in: orgIds } },
    include: { organization: true }
  });

  return {
    ok: true,
    clerkUserId: identity.clerkUserId,
    capability,
    caseOrgs,
    memberships
  };
}

async function _requirePartnerWrite(
  caseId: string,
  capability: CaseWriteCapability
): Promise<CaseWriteResult> {
  const access = await requireCaseAccess(caseId);
  if (!access.ok) {
    if (access.status === 401) return { ok: false, status: 401 };
    if (access.status === 403) return { ok: false, status: 403 };
    return { ok: false, status: 404 };
  }

  const hasAssignedOrg = access.caseOrgs.some(
    (co) => (co.role satisfies CaseOrganizationRole) === 'ASSIGNED'
  );
  if (!hasAssignedOrg) return { ok: false, status: 403 };

  const assignmentAccess = await requireCaseAssignmentAccess(caseId);
  if (!assignmentAccess.ok) return { ok: false, status: 403 };

  return {
    ok: true,
    clerkUserId: access.clerkUserId,
    capability,
    assignment: assignmentAccess.assignment,
    caseOrgs: access.caseOrgs,
    memberships: access.memberships
  };
}

// ── Re-export types for consumers ─────────────────────────────────────────────

export type {
  OrganizationType,
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
  CaseOrganizationRole,
  AssignmentRole,
  AssignmentStatus
};
