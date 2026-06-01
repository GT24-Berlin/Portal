import { NextResponse } from 'next/server';

import { emitAppointmentRequestOutcome } from '@/features/case-scheduling/server/appointment-side-effects';
import { getAvailableAppointmentSlots } from '@/features/case-scheduling/server/get-available-appointment-slots';
import { getSlotDurationMinutes } from '@/features/case-scheduling/lib/get-slot-duration-minutes';
import { isSlotRequestable } from '@/features/case-scheduling/lib/is-slot-requestable';
import { getPartnerProfile } from '@/features/partner-profile/lib/get-partner-profile';
import { prisma } from '@/lib/prisma';
import { resolvePartnerSchedulingContext } from '@/features/case-scheduling/server/resolve-partner-scheduling-context';
import {
  canProposeAlternative,
  loadPartnerAppointmentRequest,
  loadPartnerAppointmentRequestRecord
} from '@/features/case-scheduling/server/partner-appointment-requests';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseDate(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await resolvePartnerSchedulingContext();
    if ('error' in resolved && resolved.error) {
      return NextResponse.json(
        { ok: false, error: resolved.error.error },
        { status: resolved.error.status }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'id missing' },
        { status: 400 }
      );
    }

    const requestRow = await loadPartnerAppointmentRequestRecord(
      resolved.context.partnerId,
      id
    );

    if (!requestRow) {
      return NextResponse.json(
        { ok: false, error: 'request not found' },
        { status: 404 }
      );
    }

    if (!canProposeAlternative(requestRow.status)) {
      return NextResponse.json(
        { ok: false, error: 'status not eligible for alternative proposal' },
        { status: 409 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const proposedStartAt = parseDate(body.proposedStartAt);
    const proposedEndAt = parseDate(body.proposedEndAt);
    const note = String(body.note ?? '').trim();

    if (!proposedStartAt || !proposedEndAt) {
      return NextResponse.json(
        {
          ok: false,
          error: 'proposedStartAt/proposedEndAt missing or invalid'
        },
        { status: 400 }
      );
    }

    if (proposedEndAt.getTime() <= proposedStartAt.getTime()) {
      return NextResponse.json(
        { ok: false, error: 'proposedEndAt must be after proposedStartAt' },
        { status: 400 }
      );
    }

    if (!isSlotRequestable(proposedStartAt)) {
      return NextResponse.json(
        { ok: false, error: 'slot is not requestable yet' },
        { status: 400 }
      );
    }

    const durationMinutes = getSlotDurationMinutes(requestRow.duration);
    if (!durationMinutes) {
      return NextResponse.json(
        { ok: false, error: 'request duration invalid' },
        { status: 400 }
      );
    }

    if (
      proposedEndAt.getTime() - proposedStartAt.getTime() !==
      durationMinutes * 60 * 1000
    ) {
      return NextResponse.json(
        { ok: false, error: 'proposedEndAt must match request duration' },
        { status: 400 }
      );
    }

    const availableSlots = await getAvailableAppointmentSlots({
      partnerId: requestRow.partnerId,
      role: requestRow.role,
      appointmentType: requestRow.appointmentType,
      duration: requestRow.duration,
      excludeRequestId: requestRow.id,
      windowStart: proposedStartAt,
      windowEnd: proposedEndAt
    });

    const exactSlot = availableSlots.find(
      (slot) =>
        slot.startAt === proposedStartAt.toISOString() &&
        slot.endAt === proposedEndAt.toISOString() &&
        slot.partnerId === requestRow.partnerId &&
        slot.role === requestRow.role &&
        slot.appointmentType === requestRow.appointmentType &&
        slot.duration === requestRow.duration
    );

    if (!exactSlot) {
      return NextResponse.json(
        { ok: false, error: 'proposed slot is not available' },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.caseAppointmentProposal.create({
        data: {
          appointmentRequestId: requestRow.id,
          proposedStartAt,
          proposedEndAt,
          note: note ? note : null
        }
      });

      await tx.caseAppointmentRequest.update({
        where: { id: requestRow.id },
        data: {
          status: 'ALTERNATIVE_PROPOSED',
          partnerResponseNote: note
            ? note
            : (requestRow.partnerResponseNote ?? null)
        }
      });
    });

    const request = await loadPartnerAppointmentRequest(
      resolved.context.partnerId,
      requestRow.id
    );

    const [caseRow, partnerProfile] = await Promise.all([
      prisma.case.findUnique({
        where: { id },
        select: {
          id: true,
          token: true,
          caseNumber: true,
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }),
      getPartnerProfile({
        clerkUserId: resolved.guard.userId!,
        role: resolved.guard.role as 'GUTACHTER' | 'ANWALT'
      })
    ]);

    if (caseRow && request) {
      await emitAppointmentRequestOutcome({
        caseId: caseRow.id,
        caseNumber: caseRow.caseNumber ?? null,
        token: caseRow.token,
        customerId: caseRow.customer?.id ?? null,
        customerEmail: caseRow.customer?.email ?? null,
        customerName:
          [caseRow.customer?.firstName, caseRow.customer?.lastName]
            .filter(Boolean)
            .join(' ') || '',
        partnerId: partnerProfile.partnerId ?? resolved.context.partnerId,
        partnerClerkUserId: resolved.guard.userId!,
        partnerEmail: partnerProfile.email || null,
        partnerName:
          partnerProfile.contactPerson?.trim() ||
          partnerProfile.companyName?.trim() ||
          partnerProfile.email ||
          'Partner',
        partnerCompany: partnerProfile.companyName?.trim() || null,
        role: request.role,
        appointmentType: request.appointmentType,
        duration: request.duration,
        requestedStartAt: new Date(request.requestedStartAt),
        requestedEndAt: new Date(request.requestedEndAt),
        customerNote: request.customerNote,
        partnerResponseNote: note || null,
        outcome: 'ALTERNATIVE_PROPOSED',
        proposal: {
          startAt: proposedStartAt,
          endAt: proposedEndAt,
          note: note || null
        }
      });
    }

    return NextResponse.json({
      ok: true,
      request
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
