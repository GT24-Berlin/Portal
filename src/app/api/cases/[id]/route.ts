import {
  expireAssignmentIfNeeded,
  isAssignmentUsable
} from '@/lib/assignments';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth, currentUser } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

// ---- Allowed status values (müssen 1:1 den Prisma Enums entsprechen) ----
const GUTACHTER_STATUS = new Set([
  'EINGEGANGEN',
  'DATEN_UNVOLLSTAENDIG',
  'GUTACHTER_KONTAKTIERT',
  'TERMIN_GEPLANT',
  'GUTACHTEN_IN_BEARBEITUNG',
  'GUTACHTEN_ERSTELLT',
  'ABGESCHLOSSEN'
]);

const ANWALT_STATUS = new Set([
  'FALL_EINGEGANGEN',
  'FALL_IN_PRUEFUNG',
  'RUECKFRAGEN_IN_KLAERUNG',
  'FALL_BERICHT_ERSTELLT',
  'FALL_ABGESCHLOSSEN'
]);

type PatchBody = {
  gutachterStatus?: string;
  anwaltStatus?: string;
  note?: string;
  occurredAt?: string;
};

export async function PATCH(
  req: Request,
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

    const user = await currentUser();
    const role = String(user?.publicMetadata?.role ?? '').toUpperCase();

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'Missing id' },
        { status: 400 }
      );
    }

    const body = (await req.json()) as PatchBody;

    const nextGutachter = body.gutachterStatus?.trim();
    const nextAnwalt = body.anwaltStatus?.trim();

    if (!nextGutachter && !nextAnwalt) {
      return NextResponse.json(
        { ok: false, error: 'Provide gutachterStatus and/or anwaltStatus' },
        { status: 400 }
      );
    }

    const isAdmin = role === 'ADMIN';
    const wantsBoth = Boolean(nextGutachter && nextAnwalt);

    if (!isAdmin) {
      const requiredLane = wantsBoth
        ? null
        : nextGutachter
          ? 'GUTACHTER'
          : nextAnwalt
            ? 'ANWALT'
            : null;

      if (!requiredLane || role !== requiredLane) {
        return NextResponse.json(
          { ok: false, error: 'Forbidden' },
          { status: 403 }
        );
      }

      const assignment = await prisma.caseAssignment.findFirst({
        where: {
          caseId: id,
          role: requiredLane as any,
          assigneeClerkUserId: userId,
          activeKey: 'ACTIVE'
        },
        select: {
          id: true,
          status: true,
          expiresAt: true,
          active: true,
          activeKey: true
        },
        orderBy: { assignedAt: 'desc' }
      });

      if (!assignment) {
        return NextResponse.json(
          { ok: false, error: 'Not found' },
          { status: 404 }
        );
      }

      if (assignment.activeKey !== 'ACTIVE') {
        return NextResponse.json(
          { ok: false, error: 'Not found' },
          { status: 404 }
        );
      }

      const now = new Date();
      const expiredResult = await expireAssignmentIfNeeded(assignment, now);

      if (expiredResult.expired) {
        return NextResponse.json(
          { ok: false, error: 'Not found' },
          { status: 404 }
        );
      }

      if (!isAssignmentUsable(assignment) || assignment.status !== 'ACCEPTED') {
        return NextResponse.json(
          { ok: false, error: 'Forbidden: assignment not accepted' },
          { status: 403 }
        );
      }
    }

    if (wantsBoth && !isAdmin) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden: cannot update both lanes' },
        { status: 403 }
      );
    }

    if (role === 'ANWALT' && nextGutachter) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden: ANWALT cannot update gutachterStatus' },
        { status: 403 }
      );
    }

    if (role === 'GUTACHTER' && nextAnwalt) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden: GUTACHTER cannot update anwaltStatus' },
        { status: 403 }
      );
    }

    if (role !== 'ANWALT' && role !== 'GUTACHTER' && role !== 'ADMIN') {
      return NextResponse.json(
        { ok: false, error: 'Forbidden: role not allowed' },
        { status: 403 }
      );
    }

    if (nextGutachter && !GUTACHTER_STATUS.has(nextGutachter)) {
      return NextResponse.json(
        { ok: false, error: `Invalid gutachterStatus: ${nextGutachter}` },
        { status: 400 }
      );
    }

    if (nextAnwalt && !ANWALT_STATUS.has(nextAnwalt)) {
      return NextResponse.json(
        { ok: false, error: `Invalid anwaltStatus: ${nextAnwalt}` },
        { status: 400 }
      );
    }

    const occurredAt = body.occurredAt ? new Date(body.occurredAt) : new Date();
    const note = body.note?.trim() || null;

    const eventsToCreate: Array<{
      lane: 'GUTACHTER' | 'ANWALT';
      status: string;
      note?: string | null;
      occurredAt: Date;
    }> = [];

    if (nextGutachter) {
      eventsToCreate.push({
        lane: 'GUTACHTER',
        status: nextGutachter,
        note,
        occurredAt
      });
    }

    if (nextAnwalt) {
      eventsToCreate.push({
        lane: 'ANWALT',
        status: nextAnwalt,
        note,
        occurredAt
      });
    }

    const updated = await prisma.case.update({
      where: { id },
      data: {
        ...(nextGutachter ? { gutachterStatus: nextGutachter as any } : {}),
        ...(nextAnwalt ? { anwaltStatus: nextAnwalt as any } : {}),
        ...(eventsToCreate.length
          ? { events: { create: eventsToCreate as any } }
          : {})
      },
      include: {
        events: { orderBy: { occurredAt: 'asc' } }
      }
    });

    return NextResponse.json({ ok: true, case: updated });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json(
        { ok: false, error: 'Case not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
