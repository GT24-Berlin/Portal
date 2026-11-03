import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import {
  NotificationType,
  type PartnerType,
  type OrganizationType
} from '@prisma/client';
import { sendMail } from '@/lib/mailer';
import { logOperationalEvent } from '@/lib/ops-log';

export const runtime = 'nodejs';

// GUTACHTER assignment: profile+partner=GUTACHTER, org=GUTACHTER
// ANWALT assignment:    profile+partner=ANWALT, org=LEGAL
const ROLE_INVARIANTS: Record<
  'GUTACHTER' | 'ANWALT',
  { partnerType: PartnerType; orgType: OrganizationType }
> = {
  GUTACHTER: { partnerType: 'GUTACHTER', orgType: 'GUTACHTER' },
  ANWALT: { partnerType: 'ANWALT', orgType: 'LEGAL' }
};

type OrgResolutionResult =
  | { ok: true; organizationId: string }
  | { ok: false; error: string };

// Resolves the caller's organization from the DB chain.
// Must run OUTSIDE the transaction so we do not hold a tx slot during network I/O.
async function resolveCallerOrg(
  clerkUserId: string,
  assignRole: 'GUTACHTER' | 'ANWALT'
): Promise<OrgResolutionResult> {
  const profile = await prisma.partnerProfile.findUnique({
    where: { clerkUserId }
  });
  if (!profile) return { ok: false, error: 'Caller has no PartnerProfile' };
  if (!profile.partnerId)
    return { ok: false, error: 'PartnerProfile has no linked Partner' };

  const partner = await prisma.partner.findUnique({
    where: { id: profile.partnerId }
  });
  if (!partner) return { ok: false, error: 'Partner not found' };
  if (!partner.organizationId)
    return { ok: false, error: 'Partner has no linked Organization' };

  const organization = await prisma.organization.findUnique({
    where: { id: partner.organizationId }
  });
  if (!organization) return { ok: false, error: 'Organization not found' };
  if (organization.status !== 'ACTIVE')
    return { ok: false, error: 'Organization is not ACTIVE' };

  const { partnerType, orgType } = ROLE_INVARIANTS[assignRole];

  if (profile.role !== partnerType)
    return {
      ok: false,
      error: `Profile role mismatch: expected ${partnerType}, got ${profile.role}`
    };
  if (partner.type !== partnerType)
    return {
      ok: false,
      error: `Partner type mismatch: expected ${partnerType}, got ${partner.type}`
    };
  if (organization.type !== orgType)
    return {
      ok: false,
      error: `Organization type mismatch: expected ${orgType}, got ${organization.type}`
    };

  const membership = await prisma.membership.findFirst({
    where: { clerkUserId, organizationId: organization.id, status: 'ACTIVE' }
  });
  if (!membership)
    return { ok: false, error: 'No ACTIVE Membership in organization' };

  return { ok: true, organizationId: organization.id };
}

type AcceptResult =
  | { kind: 'NOT_ASSIGNED' }
  | {
      kind: 'ALREADY_ACCEPTED';
      assignment: {
        id: string;
        status: string;
        active: boolean;
        expiresAt: Date;
        role: string;
      };
    }
  | { kind: 'EXPIRED'; assignmentId: string; role: string }
  | {
      kind: 'ACCEPTED';
      assignment: {
        id: string;
        status: string;
        active: boolean;
        expiresAt: Date;
        role: string;
      };
    };

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: caseId } = await params;
    if (!caseId) {
      return NextResponse.json(
        { ok: false, error: 'Missing case id' },
        { status: 400 }
      );
    }

    const now = new Date();

    // ── Step 1: Read current assignment state outside transaction ───────────
    // Needed to detect ALREADY_ACCEPTED early and to get the role for org
    // resolution before entering a transaction.

    const currentAssignment = await prisma.caseAssignment.findFirst({
      where: { caseId, assigneeClerkUserId: userId, activeKey: 'ACTIVE' },
      orderBy: { assignedAt: 'desc' },
      select: {
        id: true,
        status: true,
        active: true,
        activeKey: true,
        expiresAt: true,
        role: true
      }
    });

    if (!currentAssignment) {
      await logOperationalEvent({
        caseId,
        domain: 'ASSIGNMENT',
        action: 'ACCEPT',
        result: 'DENIED',
        actorType: 'PARTNER',
        actorId: userId,
        message: 'Accept denied: no active assignment found',
        metadata: {}
      });
      return NextResponse.json(
        { ok: false, error: 'Not assigned' },
        { status: 404 }
      );
    }

    const assignRole = String(currentAssignment.role) as 'GUTACHTER' | 'ANWALT';

    // ── Step 2: Idempotency — already accepted ──────────────────────────────
    // Return existing state without re-running the transaction (avoids
    // duplicate notifications and redundant CaseOrganization upserts).

    if (currentAssignment.status === 'ACCEPTED') {
      await logOperationalEvent({
        caseId,
        domain: 'ASSIGNMENT',
        action: 'ACCEPT',
        result: 'ALREADY_DONE',
        actorType: 'PARTNER',
        actorId: userId,
        message: `Assignment already accepted for role ${assignRole}`,
        metadata: { assignmentId: currentAssignment.id, role: assignRole }
      });
      return NextResponse.json({
        ok: true,
        assignment: {
          id: currentAssignment.id,
          status: 'ACCEPTED',
          active: Boolean(currentAssignment.active),
          expiresAt: currentAssignment.expiresAt
        }
      });
    }

    if (currentAssignment.status !== 'PENDING') {
      await logOperationalEvent({
        caseId,
        domain: 'ASSIGNMENT',
        action: 'ACCEPT',
        result: 'DENIED',
        actorType: 'PARTNER',
        actorId: userId,
        message: 'Accept denied: assignment not in PENDING state',
        metadata: { status: String(currentAssignment.status) }
      });
      return NextResponse.json(
        { ok: false, error: 'Not assigned' },
        { status: 404 }
      );
    }

    // ── Step 3: Resolve caller's organization (outside transaction) ─────────
    // The resolved organizationId is used inside the transaction to upsert
    // CaseOrganization. Failing here does not modify any assignment state.

    const orgResolution = await resolveCallerOrg(userId, assignRole);
    if (!orgResolution.ok) {
      return NextResponse.json(
        { ok: false, error: orgResolution.error },
        { status: 422 }
      );
    }
    const { organizationId } = orgResolution;

    // ── Step 4: Transaction — accept + upsert CaseOrganization ─────────────
    // Atomically:
    //   1. Re-read and verify assignment (TOCTOU guard)
    //   2. Handle expiry if needed
    //   3. Update assignment to ACCEPTED
    //   4. Upsert CaseOrganization(role=ASSIGNED)
    //   5. Create acceptance notification
    //
    // Either both the assignment update and the CaseOrganization upsert
    // commit, or neither does.

    const result = await prisma.$transaction(
      async (tx): Promise<AcceptResult> => {
        const assignment = await tx.caseAssignment.findFirst({
          where: { caseId, assigneeClerkUserId: userId, activeKey: 'ACTIVE' },
          orderBy: { assignedAt: 'desc' },
          select: {
            id: true,
            status: true,
            active: true,
            activeKey: true,
            expiresAt: true,
            role: true
          }
        });

        if (!assignment) return { kind: 'NOT_ASSIGNED' };

        const role = String(assignment.role);

        // Liveness guard: activeKey='ACTIVE' + active=false is inconsistent
        if (!assignment.active) {
          await tx.caseAssignment.update({
            where: { id: assignment.id },
            data: { activeKey: null }
          });
          return { kind: 'NOT_ASSIGNED' };
        }

        if (assignment.status === 'ACCEPTED') {
          return {
            kind: 'ALREADY_ACCEPTED',
            assignment: {
              id: assignment.id,
              status: 'ACCEPTED',
              active: true,
              expiresAt: assignment.expiresAt,
              role
            }
          };
        }

        if (assignment.status !== 'PENDING') return { kind: 'NOT_ASSIGNED' };

        if (assignment.expiresAt <= now) {
          await tx.caseAssignment.update({
            where: { id: assignment.id },
            data: { status: 'EXPIRED' as any, active: false, activeKey: null }
          });
          await tx.notification.create({
            data: {
              userId,
              type: NotificationType.ASSIGNMENT_EXPIRED,
              title: 'Zuweisung abgelaufen',
              body: `Die Zuweisung für Case ${caseId} ist abgelaufen.`,
              href: '/dashboard/inbox',
              caseId,
              role: role as any,
              readAt: null
            }
          });
          return { kind: 'EXPIRED', assignmentId: assignment.id, role };
        }

        const updated = await tx.caseAssignment.update({
          where: { id: assignment.id },
          data: {
            status: 'ACCEPTED' as any,
            acceptedAt: now,
            active: true,
            activeKey: 'ACTIVE'
          },
          select: {
            id: true,
            status: true,
            active: true,
            expiresAt: true,
            role: true
          }
        });

        // Upsert CaseOrganization ASSIGNED — canonical Phase 3B invariant.
        // Idempotent: repeated accepts do not duplicate this row.
        await tx.caseOrganization.upsert({
          where: {
            caseId_organizationId_role: {
              caseId,
              organizationId,
              role: 'ASSIGNED'
            }
          },
          update: {},
          create: { caseId, organizationId, role: 'ASSIGNED' }
        });

        await tx.notification.create({
          data: {
            userId,
            type: NotificationType.ASSIGNMENT_ACCEPTED,
            title: 'Zuweisung angenommen',
            body: `Du hast den Fall als ${String(updated.role)} angenommen.`,
            href: '/dashboard/inbox',
            caseId,
            role: updated.role as any,
            readAt: null
          }
        });

        return {
          kind: 'ACCEPTED',
          assignment: {
            id: updated.id,
            status: String(updated.status),
            active: Boolean(updated.active),
            expiresAt: updated.expiresAt,
            role: String(updated.role)
          }
        };
      }
    );

    // ── Step 5: Post-transaction side effects ───────────────────────────────

    if (result.kind === 'NOT_ASSIGNED') {
      await logOperationalEvent({
        caseId,
        domain: 'ASSIGNMENT',
        action: 'ACCEPT',
        result: 'DENIED',
        actorType: 'PARTNER',
        actorId: userId,
        message: 'Accept denied: assignment state changed during transaction',
        metadata: {}
      });
      return NextResponse.json(
        { ok: false, error: 'Not assigned' },
        { status: 404 }
      );
    }

    if (result.kind === 'ALREADY_ACCEPTED') {
      await logOperationalEvent({
        caseId,
        domain: 'ASSIGNMENT',
        action: 'ACCEPT',
        result: 'ALREADY_DONE',
        actorType: 'PARTNER',
        actorId: userId,
        message: `Assignment already accepted for role ${result.assignment.role}`,
        metadata: {
          assignmentId: result.assignment.id,
          role: result.assignment.role
        }
      });
      return NextResponse.json({
        ok: true,
        assignment: {
          id: result.assignment.id,
          status: result.assignment.status,
          active: result.assignment.active,
          expiresAt: result.assignment.expiresAt
        }
      });
    }

    if (result.kind === 'EXPIRED') {
      await logOperationalEvent({
        caseId,
        domain: 'ASSIGNMENT',
        action: 'ACCEPT',
        result: 'EXPIRED',
        actorType: 'PARTNER',
        actorId: userId,
        message: `Assignment expired before accept for role ${result.role}`,
        metadata: { assignmentId: result.assignmentId, role: result.role }
      });
      return NextResponse.json(
        { ok: false, error: 'Expired' },
        { status: 410 }
      );
    }

    await logOperationalEvent({
      caseId,
      domain: 'ASSIGNMENT',
      action: 'ACCEPT',
      result: 'SUCCESS',
      actorType: 'PARTNER',
      actorId: userId,
      message: `Assignment accepted for role ${result.assignment.role}`,
      metadata: {
        assignmentId: result.assignment.id,
        role: result.assignment.role,
        organizationId
      }
    });

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      const adminEmail =
        process.env.ADMIN_NOTIFY_EMAIL ??
        process.env.SMTP_USER ??
        'info@gutachtery.de';
      const c = await prisma.case.findUnique({
        where: { id: caseId },
        select: { token: true, caseNumber: true }
      });
      const caseLabel = c?.caseNumber ?? 'Fall ohne Nummer';
      const dashboardUrl = `${appUrl}/dashboard/cases/${caseId}`;
      const trackerUrl = c?.token ? `${appUrl}/case/${c.token}` : null;
      await sendMail({
        to: adminEmail,
        subject: `Gutachtery24 – Fall angenommen (${result.assignment.role}) – ${caseLabel}`,
        text:
          `Der Partner hat den Fall angenommen.\n\n` +
          `Role: ${result.assignment.role}\n` +
          `Case: ${caseLabel}\n` +
          `Dashboard: ${dashboardUrl}\n` +
          (trackerUrl ? `Kunden-Tracker: ${trackerUrl}\n` : ''),
        html: `
        <p><b>Fall angenommen</b></p>
        <p>Role: <b>${result.assignment.role}</b></p>
        <p>Case: <b>${caseLabel}</b></p>
        <p><a href="${dashboardUrl}">Dashboard Case öffnen</a></p>
        ${trackerUrl ? `<p><a href="${trackerUrl}">Kunden-Tracker öffnen</a></p>` : ''}
      `
      });
    } catch (e) {
      console.warn('Email send failed (ASSIGNMENT_ACCEPTED): SMTP unavailable');
    }

    return NextResponse.json({
      ok: true,
      assignment: {
        id: result.assignment.id,
        status: result.assignment.status,
        active: result.assignment.active,
        expiresAt: result.assignment.expiresAt
      }
    });
  } catch (e: any) {
    await logOperationalEvent({
      caseId: null,
      domain: 'ASSIGNMENT',
      action: 'ACCEPT',
      result: 'FAILED',
      actorType: 'PARTNER',
      actorId: null,
      message: 'Assignment accept failed',
      metadata: { error: String(e?.message ?? e) }
    });
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
