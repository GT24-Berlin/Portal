import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createNotification } from '@/lib/notify';
import { NotificationType } from '@prisma/client';
import { sendMail } from '@/lib/mailer';
import { getPrimaryEmailForClerkUser } from '@/lib/clerk-email';
import { requireAdmin } from '@/lib/rbac';
import { logOperationalEvent } from '@/lib/ops-log';

export const runtime = 'nodejs';

type TransactionClient = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];

type Role = 'ADMIN' | 'GUTACHTER' | 'ANWALT' | '';

type Body = {
  role?: 'GUTACHTER' | 'ANWALT';
  assigneeClerkUserId?: string;
  expiresInHours?: number; // default 24
  force?: boolean; // optional: bestehende Zuweisung ersetzen
};

function getRoleFromClaims(claims: any): Role {
  const r =
    claims?.publicMetadata?.role ??
    claims?.metadata?.role ??
    claims?.user?.publicMetadata?.role ??
    '';
  return String(r) as Role;
}

async function getUserRole(userId: string, sessionClaims: any): Promise<Role> {
  // 1) zuerst aus Claims
  let role = getRoleFromClaims(sessionClaims);
  if (role) return role;

  // 2) Fallback: User aus Clerk laden (SDK-Compat: clerkClient kann obj ODER function sein)
  const client: any =
    typeof clerkClient === 'function'
      ? await (clerkClient as any)()
      : (clerkClient as any);

  const u = await client.users.getUser(userId);
  role = String((u.publicMetadata as any)?.role ?? '') as Role;

  return role;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: guard.status === 401 ? 'Unauthorized' : 'Forbidden'
        },
        { status: guard.status }
      );
    }
    const userId = guard.userId;

    const { id: caseId } = await params;
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

    // Case existiert?
    const exists = await prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, token: true }
    });

    if (!exists) {
      return NextResponse.json(
        { ok: false, error: 'Case not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

    const created = await prisma.$transaction(async (tx: TransactionClient) => {
      // ACTIVE ist ausschließlich über activeKey="ACTIVE" definiert
      let active = await tx.caseAssignment.findFirst({
        where: { caseId, role: assignRole as any, activeKey: 'ACTIVE' },
        orderBy: { assignedAt: 'desc' },
        select: { id: true, status: true, expiresAt: true }
      });

      // Sicherheitsnetz: inkonsistente active-Zeile deaktivieren
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
        // zuerst die gefundene ACTIVE-Zeile sauber freigeben
        await tx.caseAssignment.update({
          where: { id: active.id },
          data: {
            status: 'RELEASED' as any,
            active: false,
            activeKey: null,
            releasedAt: now
          }
        });

        // Safety-net: falls es Altlasten/Race gab -> alles für Case+Role deaktivieren
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
          assignedByClerkUserId: userId
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

    if (created.kind === 'CREATED') {
      await logOperationalEvent({
        caseId,
        domain: 'ASSIGNMENT',
        action: 'ASSIGN',
        result: 'SUCCESS',
        actorType: 'ADMIN',
        actorId: userId,
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
          const inboxUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/dashboard/inbox`;

          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
          const caseUrl = exists?.token ? `${appUrl}/case/${exists.token}` : '';

          await sendMail({
            to: toEmail,
            subject: `Gutachtery24 – Neuer Fall zugewiesen (${assignRole})`,
            text:
              `Dir wurde ein Fall als ${assignRole} zugewiesen.\n` +
              `Bitte innerhalb von ${expiresInHours}h in der Inbox annehmen oder freigeben.\n\n` +
              `Inbox: ${inboxUrl}\n` +
              (exists?.token ? `Kunden-Tracker: ${caseUrl}\n` : ''),
            html: `
  <p>Dir wurde ein Fall als <b>${assignRole}</b> zugewiesen.</p>
  <p>Bitte innerhalb von <b>${expiresInHours}h</b> in der Inbox annehmen oder freigeben.</p>
  <p><a href="${inboxUrl}">Zur Inbox öffnen</a></p>
  ${exists?.token ? `<p><a href="${caseUrl}">Kunden-Tracker öffnen</a></p>` : ''}
`
          });
        }
      } catch (e) {
        console.warn(
          'Email send failed (ASSIGNMENT_CREATED): SMTP unavailable'
        );
      }
    }

    if (created.kind === 'ALREADY_ASSIGNED') {
      await logOperationalEvent({
        caseId,
        domain: 'ASSIGNMENT',
        action: 'ASSIGN',
        result: 'ALREADY_DONE',
        actorType: 'ADMIN',
        actorId: userId,
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

    return NextResponse.json({ ok: true, assignment: created.assignment });
  } catch (e: any) {
    await logOperationalEvent({
      caseId: null,
      domain: 'ASSIGNMENT',
      action: 'ASSIGN',
      result: 'FAILED',
      actorType: 'ADMIN',
      actorId: null,
      message: 'Assignment creation failed',
      metadata: {
        error: String(e?.message ?? e)
      }
    });

    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
