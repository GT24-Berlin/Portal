import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { NotificationType } from '@prisma/client';
import { sendMail } from '@/lib/mailer';

export const runtime = 'nodejs';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  // ✅ Rolle aus DB ableiten (nicht aus Body)
  const assignment = await prisma.caseAssignment.findFirst({
    where: { caseId, assigneeClerkUserId: userId, active: true },
    orderBy: { assignedAt: 'desc' },
    select: { id: true, status: true, role: true }
  });

  if (!assignment) {
    return NextResponse.json(
      { ok: false, error: 'Not assigned' },
      { status: 404 }
    );
  }

  const role = String(assignment.role); // "GUTACHTER" | "ANWALT"

  // ✅ Idempotent: wenn bereits released/expired -> ok zurück
  if (assignment.status === 'RELEASED' || assignment.status === 'EXPIRED') {
    return NextResponse.json({
      ok: true,
      assignment: {
        id: assignment.id,
        status: assignment.status,
        active: false
      }
    });
  }

  const updated = await prisma.caseAssignment.update({
    where: { id: assignment.id },
    data: { status: 'RELEASED' as any, active: false, releasedAt: now },
    select: { id: true, status: true, active: true }
  });

  // ---- Notification (für den User, der freigegeben hat) ----
  await prisma.notification.create({
    data: {
      userId,
      type: NotificationType.ASSIGNMENT_RELEASED,
      title: 'Zuweisung freigegeben',
      body: `Du hast den Fall als ${role} freigegeben.`,
      href: '/dashboard/inbox',
      caseId,
      role: role as any,
      readAt: null
    }
  });

  // ---- Mail an Admin (info@...) ----
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
      subject: `Gutachtery24 – Fall freigegeben (${role}) – ${caseLabel}`,
      text:
        `Der Partner hat den Fall freigegeben.\n\n` +
        `Role: ${role}\n` +
        `Case: ${caseLabel}\n` +
        `Dashboard: ${dashboardUrl}\n` +
        (trackerUrl ? `Kunden-Tracker: ${trackerUrl}\n` : ''),
      html: `
        <p><b>Fall freigegeben</b></p>
        <p>Role: <b>${role}</b></p>
        <p>Case: <b>${caseLabel}</b></p>
        <p><a href="${dashboardUrl}">Dashboard Case öffnen</a></p>
        ${trackerUrl ? `<p><a href="${trackerUrl}">Kunden-Tracker öffnen</a></p>` : ''}
      `
    });
  } catch (e) {
    console.error('Email send failed (ASSIGNMENT_RELEASED):', e);
  }

  return NextResponse.json({ ok: true, assignment: updated });
}
