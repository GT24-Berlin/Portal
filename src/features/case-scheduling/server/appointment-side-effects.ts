import {
  CaseAppointmentDuration,
  CaseAppointmentRole,
  CaseAppointmentType,
  NotificationType
} from '@prisma/client';

import { createNotification } from '@/lib/notify';
import { sendMail } from '@/lib/mailer';
import { logOperationalEvent } from '@/lib/ops-log';

type AppointmentMailContext = {
  caseId: string;
  caseNumber: string | null;
  token: string;
  customerId: string | null;
  customerEmail: string | null;
  customerName: string;
  partnerId: string;
  partnerClerkUserId: string | null;
  partnerEmail: string | null;
  partnerName: string;
  partnerCompany: string | null;
  role: CaseAppointmentRole;
  appointmentType: CaseAppointmentType;
  duration: CaseAppointmentDuration;
  requestedStartAt: Date;
  requestedEndAt: Date;
  customerNote: string | null;
  partnerResponseNote: string | null;
};

type RequestOutcome = 'CONFIRMED' | 'DECLINED' | 'ALTERNATIVE_PROPOSED';

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

function roleLabel(role: CaseAppointmentRole) {
  return role === CaseAppointmentRole.GUTACHTER ? 'Gutachter' : 'Anwalt';
}

function typeLabel(type: CaseAppointmentType) {
  return type === CaseAppointmentType.PHONE ? 'Telefon' : 'Persönlich';
}

function durationLabel(duration: CaseAppointmentDuration) {
  return duration === CaseAppointmentDuration.MINUTES_15
    ? '15 Minuten'
    : '30 Minuten';
}

function fmtDateTime(value: Date) {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(value);
}

function caseLabel(input: AppointmentMailContext) {
  return input.caseNumber ?? 'Fall ohne Nummer';
}

async function safeStep(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    console.warn(
      `[scheduling] ${label} failed:`,
      error instanceof Error ? error.message : String(error)
    );
  }
}

export async function emitAppointmentRequestCreated(
  input: AppointmentMailContext
) {
  const label = caseLabel(input);
  const partnerLine = [input.partnerCompany, input.partnerName]
    .filter(Boolean)
    .join(' · ');

  await safeStep('partner notification', async () => {
    if (!input.partnerClerkUserId) return;

    await createNotification({
      recipientClerkUserId: input.partnerClerkUserId,
      type: NotificationType.APPOINTMENT_REQUEST_CREATED,
      title: 'Neue Terminanfrage',
      body: `Fall ${label} · ${roleLabel(input.role)} · ${typeLabel(input.appointmentType)} · ${durationLabel(input.duration)} · ${fmtDateTime(input.requestedStartAt)}`,
      href: '/dashboard/partner-profile/calendar',
      caseId: input.caseId
    });
  });

  await safeStep('partner mail', async () => {
    if (!input.partnerEmail) return;

    await sendMail({
      to: input.partnerEmail,
      subject: `Neue Terminanfrage – ${label}`,
      text:
        `Es liegt eine neue Terminanfrage vor.\n\n` +
        `Fall: ${label}\n` +
        `Rolle: ${roleLabel(input.role)}\n` +
        `Terminart: ${typeLabel(input.appointmentType)}\n` +
        `Dauer: ${durationLabel(input.duration)}\n` +
        `Angefragt: ${fmtDateTime(input.requestedStartAt)} – ${fmtDateTime(input.requestedEndAt)}\n` +
        `Kundenportal: ${appUrl()}/case/${input.token}/appointments\n` +
        `Partnerbereich: ${appUrl()}/dashboard/partner-profile/calendar\n`,
      html: `
        <p>Es liegt eine <b>neue Terminanfrage</b> vor.</p>
        <p>
          <b>Fall:</b> ${label}<br />
          <b>Rolle:</b> ${roleLabel(input.role)}<br />
          <b>Terminart:</b> ${typeLabel(input.appointmentType)}<br />
          <b>Dauer:</b> ${durationLabel(input.duration)}<br />
          <b>Angefragt:</b> ${fmtDateTime(input.requestedStartAt)} – ${fmtDateTime(input.requestedEndAt)}
        </p>
        ${partnerLine ? `<p><b>Partner:</b> ${partnerLine}</p>` : ''}
        <p><a href="${appUrl()}/dashboard/partner-profile/calendar">Kalender / Anfragen öffnen</a></p>
      `
    });
  });

  await logOperationalEvent({
    caseId: input.caseId,
    domain: 'SCHEDULING',
    action: 'REQUEST_CREATED',
    result: 'SUCCESS',
    actorType: 'CUSTOMER',
    actorId: input.customerId,
    message: `Appointment request created for ${roleLabel(input.role)}`,
    metadata: {
      request: {
        role: input.role,
        appointmentType: input.appointmentType,
        duration: input.duration,
        requestedStartAt: input.requestedStartAt.toISOString(),
        requestedEndAt: input.requestedEndAt.toISOString()
      }
    }
  });
}

export async function emitAppointmentRequestOutcome(
  input: AppointmentMailContext & {
    outcome: RequestOutcome;
    proposal?: {
      startAt: Date;
      endAt: Date;
      note: string | null;
    } | null;
  }
) {
  const label = caseLabel(input);
  const customerUrl = `${appUrl()}/case/${input.token}/appointments`;
  const outcomeLabel =
    input.outcome === 'CONFIRMED'
      ? 'bestätigt'
      : input.outcome === 'DECLINED'
        ? 'abgelehnt'
        : 'Alternativtermin vorgeschlagen';

  await safeStep('customer mail', async () => {
    if (!input.customerEmail) return;

    const appointmentTime =
      input.outcome === 'ALTERNATIVE_PROPOSED' && input.proposal
        ? `${fmtDateTime(input.proposal.startAt)} – ${fmtDateTime(input.proposal.endAt)}`
        : `${fmtDateTime(input.requestedStartAt)} – ${fmtDateTime(input.requestedEndAt)}`;

    await sendMail({
      to: input.customerEmail,
      subject: `Terminanfrage ${outcomeLabel} – ${label}`,
      text:
        `Der Status deiner Terminanfrage hat sich geändert.\n\n` +
        `Fall: ${label}\n` +
        `Status: ${outcomeLabel}\n` +
        `Zeit: ${appointmentTime}\n` +
        `Portal: ${customerUrl}\n`,
      html: `
        <p>Der Status deiner Terminanfrage wurde aktualisiert.</p>
        <p>
          <b>Fall:</b> ${label}<br />
          <b>Status:</b> ${outcomeLabel}<br />
          <b>Zeit:</b> ${appointmentTime}
        </p>
        ${input.partnerResponseNote ? `<p><b>Hinweis des Partners:</b> ${input.partnerResponseNote}</p>` : ''}
        ${
          input.outcome === 'ALTERNATIVE_PROPOSED' && input.proposal
            ? `<p><b>Alternativvorschlag:</b> ${fmtDateTime(input.proposal.startAt)} – ${fmtDateTime(input.proposal.endAt)}</p>`
            : ''
        }
        <p><a href="${customerUrl}">Terminseite öffnen</a></p>
      `
    });
  });

  await logOperationalEvent({
    caseId: input.caseId,
    domain: 'SCHEDULING',
    action:
      input.outcome === 'CONFIRMED'
        ? 'REQUEST_CONFIRMED'
        : input.outcome === 'DECLINED'
          ? 'REQUEST_DECLINED'
          : 'REQUEST_ALTERNATIVE_PROPOSED',
    result: 'SUCCESS',
    actorType: 'PARTNER',
    actorId: input.partnerId,
    message: `Appointment request ${outcomeLabel} for ${roleLabel(input.role)}`,
    metadata: {
      request: {
        role: input.role,
        appointmentType: input.appointmentType,
        duration: input.duration,
        requestedStartAt: input.requestedStartAt.toISOString(),
        requestedEndAt: input.requestedEndAt.toISOString(),
        status: input.outcome
      },
      proposal: input.proposal
        ? {
            startAt: input.proposal.startAt.toISOString(),
            endAt: input.proposal.endAt.toISOString(),
            note: input.proposal.note
          }
        : null
    }
  });
}
