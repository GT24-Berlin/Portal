import 'server-only';

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import type {
  Organization,
  Membership,
  CaseOrganization,
  OrganizationType,
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
  CaseOrganizationRole
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

// ── Re-export types for consumers ─────────────────────────────────────────────

export type {
  OrganizationType,
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
  CaseOrganizationRole
};
