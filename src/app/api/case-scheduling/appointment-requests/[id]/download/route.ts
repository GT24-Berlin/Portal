import { NextResponse } from 'next/server';

import { getPartnerProfile } from '@/features/partner-profile/lib/get-partner-profile';
import { resolvePartnerSchedulingContext } from '@/features/case-scheduling/server/resolve-partner-scheduling-context';
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

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

function roleLabel(role: CaseAppointmentRole) {
  return role === CASE_APPOINTMENT_ROLE.GUTACHTER ? 'Gutachter' : 'Anwalt';
}

function typeLabel(type: CaseAppointmentType) {
  return type === CASE_APPOINTMENT_TYPE.PHONE ? 'Telefon' : 'Persönlich';
}

function durationLabel(minutes: string) {
  return minutes === 'MINUTES_15' ? '15 Minuten' : '30 Minuten';
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function formatUtcDate(value: Date) {
  const pad = (num: number) => String(num).padStart(2, '0');
  return (
    [
      value.getUTCFullYear(),
      pad(value.getUTCMonth() + 1),
      pad(value.getUTCDate())
    ].join('') +
    'T' +
    [
      pad(value.getUTCHours()),
      pad(value.getUTCMinutes()),
      pad(value.getUTCSeconds())
    ].join('') +
    'Z'
  );
}

function buildLocation(input: {
  appointmentType: CaseAppointmentType;
  street: string;
  houseNumber: string;
  zipCode: string;
  city: string;
  country: string;
}) {
  if (input.appointmentType === CASE_APPOINTMENT_TYPE.PHONE) {
    return 'Telefontermin';
  }

  const line1 = [input.street, input.houseNumber].filter(Boolean).join(' ');
  const line2 = [input.zipCode, input.city].filter(Boolean).join(' ');
  return (
    [line1, line2, input.country].filter(Boolean).join(', ') || 'Vor-Ort-Termin'
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    if (!requestId) {
      return NextResponse.json(
        { ok: false, error: 'request id missing' },
        { status: 400 }
      );
    }

    const resolved = await resolvePartnerSchedulingContext();
    if ('error' in resolved) {
      const error = resolved.error;
      return NextResponse.json(
        { ok: false, error: error?.error ?? 'Forbidden' },
        { status: error?.status ?? 403 }
      );
    }

    const requestRow = await prisma.caseAppointmentRequest.findFirst({
      where: {
        id: requestId,
        partnerId: resolved.context.partnerId
      },
      select: {
        id: true,
        caseId: true,
        partnerId: true,
        role: true,
        appointmentType: true,
        duration: true,
        status: true,
        requestedStartAt: true,
        requestedEndAt: true,
        confirmedAt: true,
        case: {
          select: {
            caseNumber: true,
            token: true,
            customer: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    if (!requestRow) {
      return NextResponse.json(
        { ok: false, error: 'appointment request not found' },
        { status: 404 }
      );
    }

    if (requestRow.status !== 'CONFIRMED') {
      return NextResponse.json(
        { ok: false, error: 'only confirmed appointments can be downloaded' },
        { status: 409 }
      );
    }

    const profile = await getPartnerProfile({
      clerkUserId: resolved.guard.userId!,
      role: resolved.guard.role as 'GUTACHTER' | 'ANWALT'
    });

    const partnerName =
      profile.contactPerson?.trim() || profile.companyName?.trim() || 'Partner';
    const customerName = [
      requestRow.case.customer?.firstName,
      requestRow.case.customer?.lastName
    ]
      .filter(Boolean)
      .join(' ')
      .trim();
    const location = buildLocation({
      appointmentType: requestRow.appointmentType,
      street: profile.street,
      houseNumber: profile.houseNumber,
      zipCode: profile.zipCode,
      city: profile.city,
      country: profile.country
    });

    const caseLabel = requestRow.case.caseNumber ?? 'Fall ohne Nummer';
    const summary = `Termin bestätigt – ${roleLabel(requestRow.role)} – ${caseLabel}`;
    const descriptionLines = [
      `Fall: ${caseLabel}`,
      `Rolle: ${roleLabel(requestRow.role)}`,
      `Terminart: ${typeLabel(requestRow.appointmentType)}`,
      `Dauer: ${durationLabel(requestRow.duration)}`,
      customerName ? `Kunde: ${customerName}` : null,
      profile.email ? `E-Mail: ${profile.email}` : null,
      profile.phone ? `Telefon: ${profile.phone}` : null,
      `Partnerbereich: ${appUrl()}/dashboard/partner-profile/calendar`
    ].filter(Boolean) as string[];

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Gutachtery24//Scheduling//DE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:appointment-${requestRow.id}@gutachtery24`,
      `DTSTAMP:${formatUtcDate(new Date())}`,
      `DTSTART:${formatUtcDate(requestRow.requestedStartAt)}`,
      `DTEND:${formatUtcDate(requestRow.requestedEndAt)}`,
      'STATUS:CONFIRMED',
      `SUMMARY:${escapeIcsText(summary)}`,
      `DESCRIPTION:${escapeIcsText(descriptionLines.join('\\n'))}`,
      `LOCATION:${escapeIcsText(location)}`,
      `URL:${escapeIcsText(`${appUrl()}/dashboard/partner-profile/calendar`)}`,
      `ORGANIZER;CN=${escapeIcsText(partnerName)}:MAILTO:${escapeIcsText(profile.email || 'no-reply@example.com')}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const filename = `termin-${caseLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${requestRow.id.slice(0, 8)}.ics`;

    return new Response(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Appointment download failed:', error);
    return NextResponse.json(
      { ok: false, error: 'download failed' },
      { status: 500 }
    );
  }
}
