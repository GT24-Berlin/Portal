import { NextResponse } from 'next/server';

import { emitAppointmentRequestOutcome } from '@/features/case-scheduling/server/appointment-side-effects';
import { getPartnerProfile } from '@/features/partner-profile/lib/get-partner-profile';
import { prisma } from '@/lib/prisma';
import { resolvePartnerSchedulingContext } from '@/features/case-scheduling/server/resolve-partner-scheduling-context';
import {
  canRespondToAppointmentRequest,
  loadPartnerAppointmentRequest
} from '@/features/case-scheduling/server/partner-appointment-requests';
import { syncAppointmentToCalendars } from '@/features/calendar-sync/server/sync-appointment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    const requestRow = await prisma.caseAppointmentRequest.findFirst({
      where: {
        id,
        partnerId: resolved.context.partnerId
      },
      select: {
        id: true,
        status: true,
        appointmentType: true,
        role: true,
        requestedStartAt: true,
        requestedEndAt: true
      }
    });

    if (!requestRow) {
      return NextResponse.json(
        { ok: false, error: 'request not found' },
        { status: 404 }
      );
    }

    if (!canRespondToAppointmentRequest(requestRow.status)) {
      return NextResponse.json(
        { ok: false, error: 'status not eligible for confirmation' },
        { status: 409 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const partnerResponseNote = String(body.partnerResponseNote ?? '').trim();

    await prisma.caseAppointmentRequest.update({
      where: { id: requestRow.id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        ...(partnerResponseNote ? { partnerResponseNote } : {})
      }
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
        partnerResponseNote: partnerResponseNote || null,
        outcome: 'CONFIRMED'
      });
    }

    // Fire-and-forget calendar sync — must never block or crash the main flow
    syncAppointmentToCalendars({
      partnerId: resolved.context.partnerId,
      appointmentRequestId: requestRow.id,
      action: 'create',
      appointmentType: String(requestRow.appointmentType),
      role: String(requestRow.role),
      startAt: requestRow.requestedStartAt,
      endAt: requestRow.requestedEndAt,
      caseNumber: caseRow?.caseNumber ?? null
    }).catch(() => {
      /* intentional silent fail */
    });

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
