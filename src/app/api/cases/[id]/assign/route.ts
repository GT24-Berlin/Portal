import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCaseWrite } from '@/lib/policy';
import { createNotification } from '@/lib/notify';
import {
  NotificationType,
  type PartnerType,
  type OrganizationType
} from '@prisma/client';
import { sendMail } from '@/lib/mailer';
import { getPrimaryEmailForClerkUser } from '@/lib/clerk-email';
import { logOperationalEvent } from '@/lib/ops-log';

export const runtime = 'nodejs';

type TransactionClient = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];

type Body = {
  role?: 'GUTACHTER' | 'ANWALT';
  assigneeClerkUserId?: string;
  expiresInHours?: number;
  force?: boolean;
};

// Invariants that must all hold for a valid assignee.
// GUTACHTER assignment: profile+partner=GUTACHTER, org=GUTACHTER
// ANWALT assignment:    profile+partner=ANWALT, org=LEGAL
const ROLE_INVARIANTS: Record<
  'GUTACHTER' | 'ANWALT',
  { partnerType: PartnerType; orgType: OrganizationType }
> = {
  GUTACHTER: { partnerType: 'GUTACHTER', orgType: 'GUTACHTER' },
  ANWALT: { partnerType: 'ANWALT', orgType: 'LEGAL' }
};

type AssigneeCheckResult =
  | { ok: true; organizationId: string }
  | { ok: false; error: string };

// Validates the full DB chain: PartnerProfile → Partner → Organization → Membership.
// Must succeed BEFORE any transaction that could release an existing assignment.
async function validateAssignee(
  assigneeClerkUserId: string,
  assignRole: 'GUTACHTER' | 'ANWALT'
): Promise<AssigneeCheckResult> {
  const profile = await prisma.partnerProfile.findUnique({
    where: { clerkUserId: assigneeClerkUserId }
  });
  if (!profile) return { ok: false, error: 'Assignee has no PartnerProfile' };
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
      error: `PartnerProfile role mismatch: expected ${partnerType}, got ${profile.role}`
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
    where: {
      clerkUserId: assigneeClerkUserId,
      organizationId: organization.id,
      status: 'ACTIVE'
    }
  });
  if (!membership)
    return {
      ok: false,
      error: 'Assignee has no ACTIVE Membership in their Organization'
    };

  return { ok: true, organizationId: organization.id };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await params;

  try {
    // ── Step 1: Input validation ──────────────────────────────────────────

    if (!caseId) {
      return NextResponse.json(
        { ok: false, error: 'Missing case id' },
        { status: 400 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const assignRole = body.role;
    const assignee = body.assigneeClerkUserId?.trim();
    const expiresInHours = Number(body.expiresInHours ?? 24);
    const force = Boolean(body.force ?? false);

    if (
      !assignRole ||
      (assignRole !== 'GUTACHTER' && assignRole !== 'ANWALT')
    ) {
      return NextResponse.json(
        { ok: false, error: 'role must be GUTACHTER or ANWALT' },
        { status: 400 }
      );
    }

    if (!assignee) {
      return NextResponse.json(
        { ok: false, error: 'assigneeClerkUserId is required' },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(expiresInHours) ||
      expiresInHours <= 0 ||
      expiresInHours > 168
    ) {
      return NextResponse.json(
        { ok: false, error: 'expiresInHours must be 1..168' },
        { status: 400 }
      );
    }

    // ── Step 2: Authorize caller — DB-backed ASSIGN policy ────────────────
    // requireCaseWrite(ASSIGN) enforces:
    //   - authenticated Clerk identity
    //   - ACTIVE Membership in ACTIVE INTERNAL org
    //   - Membership.role = ADMIN or OWNER
    //   - CaseOrganization(role=OWNER) for this case
    // Returns 404 when the case is not visible to the caller (no OWNER CaseOrg).

    const guard = await requireCaseWrite(caseId, 'ASSIGN');
    if (!guard.ok) {
      const status = guard.status;
      const error =
        status === 401
          ? 'Unauthorized'
          : status === 404
            ? 'Not found'
            : 'Forbidden';
      return NextResponse.json({ ok: false, error }, { status });
    }
    const actorId = guard.clerkUserId;

    // ── Step 3: Validate assignee BEFORE any transaction ──────────────────
    // Validates the full chain: PartnerProfile → Partner → Organization →
    // Membership. An invalid replacement must never release a valid assignment,
    // so this check runs outside and before the transaction.

    const assigneeCheck = await validateAssignee(assignee, assignRole);
    if (!assigneeCheck.ok) {
      return NextResponse.json(
        { ok: false, error: assigneeCheck.error },
        { status: 422 }
      );
    }

    // Case token needed for email (safe to fetch after authorization passes)
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      select: { token: true }
    });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

    // ── Step 4: Transaction — release old (if force) + create new ─────────
    // Assignee is already validated. All reads and writes are atomic.
    // New assignment: status=PENDING, active=true, activeKey='ACTIVE'.
    // ASSIGNED CaseOrganization is NOT created here — only on accept (3B-2D2).

    const created = await prisma.$transaction(async (tx: TransactionClient) => {
      // ACTIVE is exclusively defined via activeKey='ACTIVE'
      let active = await tx.caseAssignment.findFirst({
        where: { caseId, role: assignRole as any, activeKey: 'ACTIVE' },
        orderBy: { assignedAt: 'desc' },
        select: { id: true, status: true, expiresAt: true }
      });

      // Safety net: inconsistent row with non-operational status
      if (
        active &&
        active.status !== 'PENDING' &&
        active.status !== 'ACCEPTED'
      ) {
        await tx.caseAssignment.update({
          where: { id: active.id },
          data: { active: false, activeKey: null }
        });
        active = null;
      }

      if (active && !force) {
        return { kind: 'ALREADY_ASSIGNED' as const, active };
      }

      if (active && force) {
        await tx.caseAssignment.update({
          where: { id: active.id },
          data: {
            status: 'RELEASED' as any,
            active: false,
            activeKey: null,
            releasedAt: now
          }
        });
        // Safety net: clear any stale races for this case+role
        await tx.caseAssignment.updateMany({
          where: {
            caseId,
            role: assignRole as any,
            OR: [{ active: true }, { activeKey: 'ACTIVE' as any }]
          },
          data: {
            status: 'RELEASED' as any,
            active: false,
            activeKey: null,
            releasedAt: now
          }
        });
        active = null;
      }

      const newRow = await tx.caseAssignment.create({
        data: {
          caseId,
          role: assignRole as any,
          assigneeClerkUserId: assignee,
          status: 'PENDING' as any,
          active: true,
          activeKey: 'ACTIVE',
          assignedAt: now,
          expiresAt,
          assignedByClerkUserId: actorId
        },
        select: {
          id: true,
          caseId: true,
          role: true,
          status: true,
          active: true,
          expiresAt: true,
          assigneeClerkUserId: true
        }
      });

      await tx.notification.create({
        data: {
          userId: assignee,
          type: NotificationType.ASSIGNMENT_CREATED,
          title: 'Neuer Fall zugewiesen',
          body: `Dir wurde ein Fall als ${assignRole} zugewiesen. Bitte innerhalb von ${expiresInHours}h annehmen oder freigeben.`,
          href: '/dashboard/inbox',
          caseId,
          role: assignRole as any,
          readAt: null
        }
      });

      return { kind: 'CREATED' as const, assignment: newRow };
    });

    // ── Step 5: Post-transaction side effects ─────────────────────────────

    if (created.kind === 'CREATED') {
      await logOperationalEvent({
        caseId,
        domain: 'ASSIGNMENT',
        action: 'ASSIGN',
        result: 'SUCCESS',
        actorType: 'ADMIN',
        actorId,
        message: `Assignment created for role ${assignRole}`,
        metadata: {
          role: assignRole,
          assigneeClerkUserId: assignee,
          expiresInHours,
          force,
          assignmentId: created.assignment.id
        }
      });

      try {
        const toEmail = await getPrimaryEmailForClerkUser(assignee);
        if (toEmail) {
          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
          const inboxUrl = `${appUrl}/dashboard/inbox`;
          const caseUrl = caseRecord?.token
            ? `${appUrl}/case/${caseRecord.token}`
            : '';
          await sendMail({
            to: toEmail,
            subject: `Gutachtery24 – Neuer Fall zugewiesen (${assignRole})`,
            text:
              `Dir wurde ein Fall als ${assignRole} zugewiesen.\n` +
              `Bitte innerhalb von ${expiresInHours}h in der Inbox annehmen oder freigeben.\n\n` +
              `Inbox: ${inboxUrl}\n` +
              (caseRecord?.token ? `Kunden-Tracker: ${caseUrl}\n` : ''),
            html: `
  <p>Dir wurde ein Fall als <b>${assignRole}</b> zugewiesen.</p>
  <p>Bitte innerhalb von <b>${expiresInHours}h</b> in der Inbox annehmen oder freigeben.</p>
  <p><a href="${inboxUrl}">Zur Inbox öffnen</a></p>
  ${caseRecord?.token ? `<p><a href="${caseUrl}">Kunden-Tracker öffnen</a></p>` : ''}
`
          });
        }
      } catch (e) {
        console.warn(
          'Email send failed (ASSIGNMENT_CREATED): SMTP unavailable'
        );
      }

      return NextResponse.json({ ok: true, assignment: created.assignment });
    }

    if (created.kind === 'ALREADY_ASSIGNED') {
      await logOperationalEvent({
        caseId,
        domain: 'ASSIGNMENT',
        action: 'ASSIGN',
        result: 'ALREADY_DONE',
        actorType: 'ADMIN',
        actorId,
        message: `Assignment already active for role ${assignRole}`,
        metadata: {
          role: assignRole,
          assigneeClerkUserId: assignee,
          expiresInHours,
          force,
          activeAssignmentId: created.active.id,
          activeStatus: created.active.status
        }
      });

      return NextResponse.json(
        {
          ok: false,
          error: 'Already assigned (active). Use force:true to replace.',
          active: created.active
        },
        { status: 409 }
      );
    }
  } catch (e: any) {
    await logOperationalEvent({
      caseId,
      domain: 'ASSIGNMENT',
      action: 'ASSIGN',
      result: 'FAILED',
      actorType: 'ADMIN',
      actorId: null,
      message: 'Assignment creation failed',
      metadata: { error: String(e?.message ?? e) }
    });

    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
