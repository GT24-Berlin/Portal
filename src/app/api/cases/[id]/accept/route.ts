import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { NotificationType } from '@prisma/client';
import { sendMail } from '@/lib/mailer';
import { logOperationalEvent } from '@/lib/ops-log';

export const runtime = 'nodejs';

type AcceptResult =
  | {
      kind: 'NOT_ASSIGNED';
    }
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
  | {
      kind: 'EXPIRED';
      assignmentId: string;
      role: string;
    }
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

    const result = await prisma.$transaction(
      async (tx): Promise<AcceptResult> => {
        const assignment = await tx.caseAssignment.findFirst({
          where: {
            caseId,
            assigneeClerkUserId: userId,
            activeKey: 'ACTIVE'
          },
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

        if (!assignment) {
          return { kind: 'NOT_ASSIGNED' };
        }

        const role = String(assignment.role);

        if (assignment.status === 'ACCEPTED') {
          return {
            kind: 'ALREADY_ACCEPTED',
            assignment: {
              id: assignment.id,
              status: 'ACCEPTED',
              active: Boolean(assignment.active),
              expiresAt: assignment.expiresAt,
              role
            }
          };
        }

        if (assignment.status !== 'PENDING') {
          return { kind: 'NOT_ASSIGNED' };
        }

        if (assignment.expiresAt <= now) {
          await tx.caseAssignment.update({
            where: { id: assignment.id },
            data: {
              status: 'EXPIRED' as any,
              active: false,
              activeKey: null
            }
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

          return {
            kind: 'EXPIRED',
            assignmentId: assignment.id,
            role
          };
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

    if (result.kind === 'NOT_ASSIGNED') {
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
          role: result.assignment.role,
          status: result.assignment.status
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
        metadata: {
          assignmentId: result.assignmentId,
          role: result.role
        }
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
        status: result.assignment.status
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

      const caseLabel = c?.caseNumber ?? caseId.slice(0, 8);
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
