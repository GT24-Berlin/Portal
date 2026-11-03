import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCaseWrite } from '@/lib/policy';

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

    // DB-backed authorization — no Clerk metadata fallback.
    // STATUS capability tries INTERNAL first, then ASSIGNED partner path.
    const guard = await requireCaseWrite(id, 'STATUS');
    if (!guard.ok) {
      const status = guard.status === 401 ? 401 : 403;
      return NextResponse.json(
        { ok: false, error: status === 401 ? 'Unauthorized' : 'Forbidden' },
        { status }
      );
    }

    // Determine caller tier from CaseOrganization org types
    const isInternalCaller = guard.caseOrgs.some(
      (co) => co.organization.type === 'INTERNAL'
    );

    const wantsBoth = Boolean(nextGutachter && nextAnwalt);

    if (!isInternalCaller) {
      // Partners cannot update both lanes simultaneously
      if (wantsBoth) {
        return NextResponse.json(
          { ok: false, error: 'Forbidden: cannot update both lanes' },
          { status: 403 }
        );
      }

      // Derive partner lane from ASSIGNED CaseOrganization's DB org type
      const assignedCaseOrg = guard.caseOrgs.find(
        (co) => co.role === 'ASSIGNED'
      );
      if (!assignedCaseOrg) {
        return NextResponse.json(
          { ok: false, error: 'Forbidden' },
          { status: 403 }
        );
      }

      const orgType = assignedCaseOrg.organization.type;
      const partnerLane =
        orgType === 'GUTACHTER'
          ? 'GUTACHTER'
          : orgType === 'LEGAL'
            ? 'ANWALT'
            : null;

      if (!partnerLane) {
        return NextResponse.json(
          { ok: false, error: 'Forbidden: unexpected partner org type' },
          { status: 403 }
        );
      }

      if (partnerLane === 'ANWALT' && nextGutachter) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Forbidden: ANWALT cannot update gutachterStatus'
          },
          { status: 403 }
        );
      }

      if (partnerLane === 'GUTACHTER' && nextAnwalt) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Forbidden: GUTACHTER cannot update anwaltStatus'
          },
          { status: 403 }
        );
      }
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
