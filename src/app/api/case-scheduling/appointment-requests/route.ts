import { NextResponse } from 'next/server';

import { addMinutes } from '@/features/case-scheduling/lib/add-minutes';
import { getAvailableAppointmentSlots } from '@/features/case-scheduling/server/get-available-appointment-slots';
import { getSlotDurationMinutes } from '@/features/case-scheduling/lib/get-slot-duration-minutes';
import { isSlotRequestable } from '@/features/case-scheduling/lib/is-slot-requestable';
import { SCHEDULING_PARTNER_RESPONSE_HOURS } from '@/features/case-scheduling/lib/scheduling-config';
import {
  parseSlotDuration,
  parseSlotRole,
  parseSlotType
} from '@/features/case-scheduling/lib/availability-slot-input';
import { getPartnerProfile } from '@/features/partner-profile/lib/get-partner-profile';
import { emitAppointmentRequestCreated } from '@/features/case-scheduling/server/appointment-side-effects';
import type { CaseAppointmentRequestRow } from '@/features/case-scheduling/types';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CASE_APPOINTMENT_ROLE = {
  GUTACHTER: 'GUTACHTER',
  ANWALT: 'ANWALT'
} as const;

type CaseAppointmentRole =
  (typeof CASE_APPOINTMENT_ROLE)[keyof typeof CASE_APPOINTMENT_ROLE];

const CASE_APPOINTMENT_TYPE = {
  PHONE: 'PHONE',
  IN_PERSON: 'IN_PERSON'
} as const;

type CaseAppointmentType =
  (typeof CASE_APPOINTMENT_TYPE)[keyof typeof CASE_APPOINTMENT_TYPE];

const CASE_APPOINTMENT_DURATION = {
  MINUTES_15: 'MINUTES_15',
  MINUTES_30: 'MINUTES_30'
} as const;

type CaseAppointmentDuration =
  (typeof CASE_APPOINTMENT_DURATION)[keyof typeof CASE_APPOINTMENT_DURATION];

const CASE_APPOINTMENT_REQUEST_STATUS = {
  REQUESTED: 'REQUESTED',
  CONFIRMED: 'CONFIRMED',
  DECLINED: 'DECLINED',
  ALTERNATIVE_PROPOSED: 'ALTERNATIVE_PROPOSED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
} as const;

type CaseAppointmentRequestStatus =
  (typeof CASE_APPOINTMENT_REQUEST_STATUS)[keyof typeof CASE_APPOINTMENT_REQUEST_STATUS];

function toRow(row: {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  caseId: string;
  partnerId: string;
  role: CaseAppointmentRole;
  appointmentType: CaseAppointmentType;
  duration: CaseAppointmentDuration;
  status: CaseAppointmentRequestStatus;
  requestedStartAt: Date;
  requestedEndAt: Date;
  expiresAt: Date;
  customerNote: string | null;
  partnerResponseNote: string | null;
  confirmedAt: Date | null;
  declinedAt: Date | null;
  cancelledAt: Date | null;
}): CaseAppointmentRequestRow {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    caseId: row.caseId,
    partnerId: row.partnerId,
    role: row.role,
    appointmentType: row.appointmentType,
    duration: row.duration,
    status: row.status as CaseAppointmentRequestRow['status'],
    requestedStartAt: row.requestedStartAt.toISOString(),
    requestedEndAt: row.requestedEndAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    customerNote: row.customerNote,
    partnerResponseNote: row.partnerResponseNote,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    declinedAt: row.declinedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    latestProposalStartAt: null,
    latestProposalEndAt: null,
    latestProposalNote: null
  };
}

function parseDate(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const token = String(body.token ?? '').trim();
    const caseId = String(body.caseId ?? '').trim();
    const partnerId = String(body.partnerId ?? '').trim();
    const role = parseSlotRole(body.role);
    const appointmentType = parseSlotType(body.appointmentType);
    const duration = parseSlotDuration(body.duration);
    const requestedStartAt = parseDate(body.requestedStartAt);
    const requestedEndAt = parseDate(body.requestedEndAt);
    const customerNote = String(body.customerNote ?? '').trim();

    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'token missing' },
        { status: 400 }
      );
    }

    if (!partnerId) {
      return NextResponse.json(
        { ok: false, error: 'partnerId missing' },
        { status: 400 }
      );
    }

    if (!role) {
      return NextResponse.json(
        { ok: false, error: 'role missing or invalid' },
        { status: 400 }
      );
    }

    if (!appointmentType) {
      return NextResponse.json(
        { ok: false, error: 'appointmentType missing or invalid' },
        { status: 400 }
      );
    }

    if (!duration) {
      return NextResponse.json(
        { ok: false, error: 'duration missing or invalid' },
        { status: 400 }
      );
    }

    if (!requestedStartAt || !requestedEndAt) {
      return NextResponse.json(
        {
          ok: false,
          error: 'requestedStartAt/requestedEndAt missing or invalid'
        },
        { status: 400 }
      );
    }

    if (requestedEndAt.getTime() <= requestedStartAt.getTime()) {
      return NextResponse.json(
        { ok: false, error: 'requestedEndAt must be after requestedStartAt' },
        { status: 400 }
      );
    }

    const caseRow = await prisma.case.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
        caseNumber: true,
        customer: {
          select: {
            id: true,
            otpVerifiedAt: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        assignments: {
          select: {
            role: true,
            assigneeClerkUserId: true,
            activeKey: true
          }
        }
      }
    });

    if (!caseRow) {
      return NextResponse.json(
        { ok: false, error: 'case not found' },
        { status: 404 }
      );
    }

    if (caseId && caseId !== caseRow.id) {
      return NextResponse.json(
        { ok: false, error: 'caseId does not match token' },
        { status: 400 }
      );
    }

    if (!caseRow.customer?.id) {
      return NextResponse.json(
        { ok: false, error: 'customer not registered' },
        { status: 400 }
      );
    }

    if (!caseRow.customer.otpVerifiedAt) {
      return NextResponse.json(
        { ok: false, error: 'customer not verified' },
        { status: 403 }
      );
    }

    const activeAssignment = caseRow.assignments.find(
      (assignment) =>
        assignment.role === role && assignment.activeKey === 'ACTIVE'
    );

    if (!activeAssignment?.assigneeClerkUserId) {
      return NextResponse.json(
        { ok: false, error: 'no active partner for requested role' },
        { status: 409 }
      );
    }

    const partnerProfile = await getPartnerProfile({
      clerkUserId: activeAssignment.assigneeClerkUserId,
      role: role === CASE_APPOINTMENT_ROLE.GUTACHTER ? 'GUTACHTER' : 'ANWALT'
    });

    if (!partnerProfile.partnerId) {
      return NextResponse.json(
        { ok: false, error: 'partner profile missing' },
        { status: 409 }
      );
    }

    if (partnerProfile.partnerId !== partnerId) {
      return NextResponse.json(
        { ok: false, error: 'partnerId does not match active assignment' },
        { status: 400 }
      );
    }

    if (!isSlotRequestable(requestedStartAt)) {
      return NextResponse.json(
        { ok: false, error: 'slot is not requestable yet' },
        { status: 400 }
      );
    }

    const durationMinutes = getSlotDurationMinutes(duration);
    if (!durationMinutes) {
      return NextResponse.json(
        { ok: false, error: 'duration invalid' },
        { status: 400 }
      );
    }

    if (
      requestedEndAt.getTime() - requestedStartAt.getTime() !==
      durationMinutes * 60 * 1000
    ) {
      return NextResponse.json(
        { ok: false, error: 'requestedEndAt must match requested duration' },
        { status: 400 }
      );
    }

    const availableSlots = await getAvailableAppointmentSlots({
      partnerId: partnerProfile.partnerId,
      role,
      appointmentType,
      duration,
      windowStart: requestedStartAt,
      windowEnd: requestedEndAt
    });

    const exactSlot = availableSlots.find(
      (slot) =>
        slot.startAt === requestedStartAt.toISOString() &&
        slot.endAt === requestedEndAt.toISOString() &&
        slot.partnerId === partnerProfile.partnerId &&
        slot.role === role &&
        slot.appointmentType === appointmentType &&
        slot.duration === duration
    );

    if (!exactSlot) {
      return NextResponse.json(
        { ok: false, error: 'slot is no longer available' },
        { status: 409 }
      );
    }

    const request = await prisma.caseAppointmentRequest.create({
      data: {
        caseId: caseRow.id,
        partnerId: partnerProfile.partnerId,
        role,
        appointmentType,
        duration,
        status: CASE_APPOINTMENT_REQUEST_STATUS.REQUESTED,
        requestedStartAt,
        requestedEndAt,
        expiresAt: addMinutes(
          new Date(),
          SCHEDULING_PARTNER_RESPONSE_HOURS * 60
        ),
        customerNote: customerNote ? customerNote : null
      }
    });

    await emitAppointmentRequestCreated({
      caseId: caseRow.id,
      caseNumber: caseRow.caseNumber ?? null,
      token: caseRow.token,
      customerId: caseRow.customer.id,
      customerEmail: caseRow.customer.email,
      customerName: [caseRow.customer.firstName, caseRow.customer.lastName]
        .filter(Boolean)
        .join(' '),
      partnerId: partnerProfile.partnerId,
      partnerClerkUserId: activeAssignment.assigneeClerkUserId,
      partnerEmail: partnerProfile.email || null,
      partnerName:
        partnerProfile.contactPerson?.trim() ||
        partnerProfile.companyName?.trim() ||
        partnerProfile.email ||
        'Partner',
      partnerCompany: partnerProfile.companyName?.trim() || null,
      role,
      appointmentType,
      duration,
      requestedStartAt,
      requestedEndAt,
      customerNote: customerNote ? customerNote : null,
      partnerResponseNote: null
    });

    return NextResponse.json({
      ok: true,
      request: toRow(request)
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
