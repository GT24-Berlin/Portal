import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getAvailableAppointmentSlots } from '@/features/case-scheduling/server/get-available-appointment-slots';

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

function parseDateParam(value: string | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw;
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseRoleParam(value: string | null) {
  const raw = String(value ?? '')
    .trim()
    .toUpperCase();
  if (raw === 'GUTACHTER') return CASE_APPOINTMENT_ROLE.GUTACHTER;
  if (raw === 'ANWALT') return CASE_APPOINTMENT_ROLE.ANWALT;
  return null;
}

function parseAppointmentTypeParam(value: string | null) {
  const raw = String(value ?? '')
    .trim()
    .toUpperCase();
  if (!raw) return null;
  if (raw === 'PHONE') return CASE_APPOINTMENT_TYPE.PHONE;
  if (raw === 'IN_PERSON') return CASE_APPOINTMENT_TYPE.IN_PERSON;
  return null;
}

function parseDurationParam(value: string | null) {
  const raw = String(value ?? '')
    .trim()
    .toUpperCase();
  if (!raw) return null;
  if (raw === '15' || raw === 'MINUTES_15')
    return CASE_APPOINTMENT_DURATION.MINUTES_15;
  if (raw === '30' || raw === 'MINUTES_30')
    return CASE_APPOINTMENT_DURATION.MINUTES_30;
  return null;
}

function parseDaysParam(value: string | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const num = Number(raw);
  if (!Number.isInteger(num) || num < 1 || num > 30) return null;
  return num;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const partnerId = url.searchParams.get('partnerId')?.trim() ?? '';
    const role = parseRoleParam(url.searchParams.get('role'));
    const appointmentType = parseAppointmentTypeParam(
      url.searchParams.get('appointmentType')
    );
    const duration = parseDurationParam(url.searchParams.get('duration'));
    const days = parseDaysParam(url.searchParams.get('days'));
    const windowStart = parseDateParam(url.searchParams.get('windowStart'));
    const windowEnd = parseDateParam(url.searchParams.get('windowEnd'));

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

    if (url.searchParams.has('appointmentType') && !appointmentType) {
      return NextResponse.json(
        { ok: false, error: 'appointmentType invalid' },
        { status: 400 }
      );
    }

    if (url.searchParams.has('duration') && !duration) {
      return NextResponse.json(
        { ok: false, error: 'duration invalid' },
        { status: 400 }
      );
    }

    if (url.searchParams.has('days') && !days) {
      return NextResponse.json(
        { ok: false, error: 'days invalid' },
        { status: 400 }
      );
    }

    if (url.searchParams.has('windowStart') && !windowStart) {
      return NextResponse.json(
        { ok: false, error: 'windowStart invalid' },
        { status: 400 }
      );
    }

    if (url.searchParams.has('windowEnd') && !windowEnd) {
      return NextResponse.json(
        { ok: false, error: 'windowEnd invalid' },
        { status: 400 }
      );
    }

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: { id: true }
    });

    if (!partner) {
      return NextResponse.json(
        { ok: false, error: 'partner not found' },
        { status: 404 }
      );
    }

    const slots = await getAvailableAppointmentSlots({
      partnerId: partner.id,
      role,
      appointmentType,
      duration,
      days: days ?? undefined,
      windowStart: windowStart ?? undefined,
      windowEnd: windowEnd ?? undefined
    });

    const responseWindowStart = windowStart ?? new Date();
    const responseWindowEnd =
      windowEnd ??
      new Date(
        responseWindowStart.getTime() + (days ?? 14) * 24 * 60 * 60 * 1000
      );

    return NextResponse.json({
      ok: true,
      slots,
      count: slots.length,
      windowStart: responseWindowStart.toISOString(),
      windowEnd: responseWindowEnd.toISOString()
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
