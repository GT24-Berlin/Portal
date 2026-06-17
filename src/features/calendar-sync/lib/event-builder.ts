import type { CalendarEventInput } from '../types';

function toIso(d: Date): string {
  return d.toISOString();
}

/** ISO 8601 basic format for iCal: 20260618T090000Z */
function toIcalDate(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

export function buildGoogleEventPayload(input: CalendarEventInput): object {
  return {
    summary: input.title,
    description: input.description,
    start: { dateTime: toIso(input.startAt), timeZone: 'Europe/Berlin' },
    end: { dateTime: toIso(input.endAt), timeZone: 'Europe/Berlin' },
    ...(input.location ? { location: input.location } : {})
  };
}

export function buildMicrosoftEventPayload(input: CalendarEventInput): object {
  return {
    subject: input.title,
    body: { contentType: 'text', content: input.description },
    start: { dateTime: toIso(input.startAt), timeZone: 'Europe/Berlin' },
    end: { dateTime: toIso(input.endAt), timeZone: 'Europe/Berlin' },
    ...(input.location ? { location: { displayName: input.location } } : {})
  };
}

export function buildAppleIcalString(
  input: CalendarEventInput,
  uid: string
): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gutachtery24//CalendarSync//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcalDate(new Date())}`,
    `DTSTART:${toIcalDate(input.startAt)}`,
    `DTEND:${toIcalDate(input.endAt)}`,
    `SUMMARY:${input.title}`,
    `DESCRIPTION:${input.description.replace(/\n/g, '\\n')}`,
    ...(input.location ? [`LOCATION:${input.location}`] : []),
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

export function buildCalendarEventInput(params: {
  appointmentRequestId: string;
  appointmentType: string;
  role: string;
  startAt: Date;
  endAt: Date;
  caseNumber?: string | null;
}): CalendarEventInput {
  const typeLabel =
    params.appointmentType === 'PHONE'
      ? 'Telefontermin'
      : 'Persönlicher Termin';
  const roleLabel = params.role === 'GUTACHTER' ? 'Gutachter' : 'Anwalt';
  const caseRef = params.caseNumber ? ` · Fall ${params.caseNumber}` : '';

  return {
    appointmentRequestId: params.appointmentRequestId,
    title: `${typeLabel} – Gutachtery24${caseRef}`,
    description: [
      `${typeLabel} (${roleLabel}) via Gutachtery24 Portal.`,
      '',
      `Termin-ID: ${params.appointmentRequestId}`
    ].join('\n'),
    startAt: params.startAt,
    endAt: params.endAt
  };
}
