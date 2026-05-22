import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { CaseAppointmentRole } from '@prisma/client';

import CaseTopNav from '@/components/case/case-top-nav';
import DatabaseUnavailableState from '@/components/system/database-unavailable';
import { isDatabaseUnavailableError } from '@/lib/database-error';
import { prisma } from '@/lib/prisma';
import { getPartnerProfile } from '@/features/partner-profile/lib/get-partner-profile';
import { getAvailableAppointmentSlots } from '@/features/case-scheduling/server/get-available-appointment-slots';
import CustomerAppointmentPlanner from '@/features/case-scheduling/components/customer-appointment-planner';
import type {
  AvailableAppointmentSlot,
  CaseAppointmentRequestRow
} from '@/features/case-scheduling/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type AppointmentSection = {
  role: CaseAppointmentRole;
  label: string;
  partnerName: string;
  companyName: string;
  addressLines: string[];
  slots: AppointmentSlotView[];
};

type AppointmentSlotView = AvailableAppointmentSlot & {
  displayRangeLabel: string;
  displayEndTimeLabel: string;
};

type AppointmentRequestView = CaseAppointmentRequestRow & {
  partnerContact: {
    contactPerson: string;
    companyName: string;
    email: string;
    phone: string;
    addressLines: string[];
  } | null;
};

function fmtDateTime(value: string | Date) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function roleLabel(role: CaseAppointmentRole) {
  return role === CaseAppointmentRole.GUTACHTER ? 'Gutachter' : 'Anwalt';
}

function statusLabel(status: string) {
  switch (status) {
    case 'REQUESTED':
      return 'Angefragt';
    case 'CONFIRMED':
      return 'Bestätigt';
    case 'DECLINED':
      return 'Abgelehnt';
    case 'ALTERNATIVE_PROPOSED':
      return 'Alternativvorschlag';
    case 'EXPIRED':
      return 'Abgelaufen';
    case 'CANCELLED':
      return 'Storniert';
    default:
      return status || '—';
  }
}

function durationLabel(value: string) {
  return value === 'MINUTES_15' ? '15 Minuten' : '30 Minuten';
}

function appointmentTypeLabel(value: string) {
  return value === 'PHONE' ? 'Telefon' : 'Persönlich';
}

function formatAppointmentSlotView(
  slot: AvailableAppointmentSlot
): AppointmentSlotView {
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).formatToParts(new Date(slot.startAt));

  const end = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(slot.endAt));

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';
  const weekday = get('weekday').replace(/[^A-Za-zÄÖÜäöüß]/g, '');
  const day = get('day');
  const month = get('month');
  const hour = get('hour');
  const minute = get('minute');

  return {
    ...slot,
    displayRangeLabel: `${weekday}. ${day}.${month}., ${hour}:${minute}`,
    displayEndTimeLabel: end
  };
}

function buildAddressLines(profile: {
  street: string;
  houseNumber: string;
  zipCode: string;
  city: string;
  country: string;
}) {
  const line1 = [profile.street, profile.houseNumber].filter(Boolean).join(' ');
  const line2 = [profile.zipCode, profile.city].filter(Boolean).join(' ');
  const lines = [line1, line2, profile.country].filter(Boolean);
  return lines;
}

function buildPartnerContactLines(profile: {
  companyName: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  houseNumber: string | null;
  zipCode: string | null;
  city: string | null;
  country: string | null;
}) {
  return buildAddressLines({
    street: profile.street ?? '',
    houseNumber: profile.houseNumber ?? '',
    zipCode: profile.zipCode ?? '',
    city: profile.city ?? '',
    country: profile.country ?? ''
  });
}

async function buildSection(input: {
  role: CaseAppointmentRole;
  clerkUserId: string | null;
}) {
  if (!input.clerkUserId) {
    return {
      role: input.role,
      label: roleLabel(input.role),
      partnerName: '',
      companyName: '',
      addressLines: [],
      slots: []
    } satisfies AppointmentSection;
  }

  const profile = await getPartnerProfile({
    clerkUserId: input.clerkUserId,
    role: input.role === CaseAppointmentRole.GUTACHTER ? 'GUTACHTER' : 'ANWALT'
  });

  const partner =
    profile.partnerId != null
      ? await prisma.partner.findUnique({
          where: { id: profile.partnerId },
          select: {
            name: true,
            email: true
          }
        })
      : null;

  const partnerName =
    profile.contactPerson?.trim() ||
    partner?.name?.trim() ||
    profile.companyName?.trim() ||
    '';

  const companyName =
    profile.companyName?.trim() || partner?.name?.trim() || '';
  const addressLines = buildAddressLines({
    street: profile.street,
    houseNumber: profile.houseNumber,
    zipCode: profile.zipCode,
    city: profile.city,
    country: profile.country
  });

  const slots = profile.partnerId
    ? await getAvailableAppointmentSlots({
        partnerId: profile.partnerId,
        role: input.role,
        days: 21
      })
    : [];

  return {
    role: input.role,
    label: roleLabel(input.role),
    partnerName,
    companyName,
    addressLines,
    slots: slots.map(formatAppointmentSlotView)
  } satisfies AppointmentSection;
}

function isActiveSchedulingAssignment(assignment: {
  activeKey: string | null;
  active?: boolean;
  status?: string;
}) {
  return (
    assignment.activeKey === 'ACTIVE' ||
    assignment.active === true ||
    assignment.status === 'PENDING' ||
    assignment.status === 'ACCEPTED'
  );
}

export default async function CaseAppointmentsPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  try {
    const { token } = await params;
    if (!token) notFound();

    const found = await prisma.case.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
        caseNumber: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            otpVerifiedAt: true
          }
        },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          select: {
            role: true,
            assigneeClerkUserId: true,
            activeKey: true,
            active: true,
            status: true
          }
        },
        appointmentRequests: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            partnerId: true,
            role: true,
            appointmentType: true,
            duration: true,
            status: true,
            requestedStartAt: true,
            requestedEndAt: true,
            updatedAt: true,
            createdAt: true,
            expiresAt: true,
            customerNote: true,
            partnerResponseNote: true,
            confirmedAt: true,
            declinedAt: true,
            cancelledAt: true,
            partner: {
              select: {
                name: true,
                email: true,
                profiles: {
                  select: {
                    role: true,
                    companyName: true,
                    contactPerson: true,
                    email: true,
                    phone: true,
                    street: true,
                    houseNumber: true,
                    zipCode: true,
                    city: true,
                    country: true
                  }
                }
              }
            },
            proposals: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                proposedStartAt: true,
                proposedEndAt: true,
                note: true
              }
            }
          }
        }
      }
    });

    if (!found) notFound();

    if (!found.customer?.id) {
      redirect(`/case/${token}/register`);
    }

    if (!found.customer.otpVerifiedAt) {
      redirect(`/case/${token}/verify`);
    }

    await cookies();

    const gutachterAssignment = found.assignments.find(
      (assignment) =>
        assignment.role === CaseAppointmentRole.GUTACHTER &&
        isActiveSchedulingAssignment(assignment)
    );
    const anwaltAssignment = found.assignments.find(
      (assignment) =>
        assignment.role === CaseAppointmentRole.ANWALT &&
        isActiveSchedulingAssignment(assignment)
    );

    const [gutachterSection, anwaltSection] = await Promise.all([
      buildSection({
        role: CaseAppointmentRole.GUTACHTER,
        clerkUserId: gutachterAssignment?.assigneeClerkUserId ?? null
      }),
      buildSection({
        role: CaseAppointmentRole.ANWALT,
        clerkUserId: anwaltAssignment?.assigneeClerkUserId ?? null
      })
    ]);

    const appointmentRequests: AppointmentRequestView[] =
      found.appointmentRequests.map((row) => {
        const matchedProfile =
          row.partner.profiles.find((profile) => profile.role === row.role) ??
          row.partner.profiles[0] ??
          null;
        const partnerContact =
          row.status === 'CONFIRMED' && matchedProfile
            ? {
                contactPerson:
                  matchedProfile.contactPerson?.trim() ||
                  row.partner.name?.trim() ||
                  '',
                companyName:
                  matchedProfile.companyName?.trim() ||
                  row.partner.name?.trim() ||
                  '',
                email:
                  matchedProfile.email?.trim() ||
                  row.partner.email?.trim() ||
                  '',
                phone: matchedProfile.phone?.trim() || '',
                addressLines: buildPartnerContactLines({
                  companyName: matchedProfile.companyName,
                  contactPerson: matchedProfile.contactPerson,
                  email: matchedProfile.email,
                  phone: matchedProfile.phone,
                  street: matchedProfile.street,
                  houseNumber: matchedProfile.houseNumber,
                  zipCode: matchedProfile.zipCode,
                  city: matchedProfile.city,
                  country: matchedProfile.country
                })
              }
            : null;

        return {
          id: row.id,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          caseId: found.id,
          partnerId: row.partnerId,
          role: row.role,
          appointmentType: row.appointmentType,
          duration: row.duration,
          status: row.status as CaseAppointmentRequestRow['status'],
          requestedStartAt: row.requestedStartAt.toISOString(),
          requestedEndAt: row.requestedEndAt.toISOString(),
          expiresAt: row.expiresAt.toISOString(),
          customerNote: row.customerNote ?? null,
          partnerResponseNote: row.partnerResponseNote ?? null,
          confirmedAt: row.confirmedAt?.toISOString() ?? null,
          declinedAt: row.declinedAt?.toISOString() ?? null,
          cancelledAt: row.cancelledAt?.toISOString() ?? null,
          latestProposalStartAt:
            row.proposals[0]?.proposedStartAt?.toISOString() ?? null,
          latestProposalEndAt:
            row.proposals[0]?.proposedEndAt?.toISOString() ?? null,
          latestProposalNote: row.proposals[0]?.note ?? null,
          partnerContact
        };
      });

    return (
      <div className='bg-background text-foreground h-[100dvh] overflow-y-auto'>
        <div className='mx-auto max-w-6xl space-y-8 px-4 py-10 pb-24'>
          <CaseTopNav
            token={token}
            active='appointments'
            title='Termin planen'
            subtitle={`Fallnummer: ${found.caseNumber ?? '—'} · ${
              [found.customer.firstName, found.customer.lastName]
                .filter(Boolean)
                .join(' ')
                .trim() || 'Kunde'
            }`}
          />

          <section className='border-border/60 bg-card/95 overflow-hidden rounded-[28px] border shadow-sm'>
            <div className='border-border/60 bg-muted/15 grid gap-4 border-b p-6 md:grid-cols-[1.4fr_0.6fr] md:p-8'>
              <div className='space-y-2'>
                <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                  Angefragte Termine
                </div>
                <div className='space-y-2'>
                  <h2 className='font-heading text-foreground text-2xl font-semibold tracking-tight md:text-3xl'>
                    Terminplanung
                  </h2>
                  <p className='text-muted-foreground max-w-3xl text-sm leading-6 md:text-[15px]'>
                    Hier kannst du für Gutachter und Anwalt getrennt freie,
                    anfragbare Slots ansehen und eine Terminanfrage absenden.
                    Die Buchung erfolgt nicht sofort, sondern erst nach Prüfung
                    durch den Partner.
                  </p>
                </div>
              </div>

              <div className='border-border/60 bg-background/80 grid gap-3 self-start rounded-2xl border p-4 shadow-sm'>
                <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase'>
                  Workflow
                </div>
                <div className='text-foreground text-sm font-medium'>
                  Slots prüfen, Anfrage senden, Bestätigung abwarten.
                </div>
                <div className='border-border/60 bg-muted/10 text-muted-foreground rounded-2xl border px-3 py-2 text-xs shadow-sm'>
                  Gutachter und Anwalt bleiben getrennt.
                </div>
              </div>
            </div>

            <div className='p-6 md:p-8'>
              <CustomerAppointmentPlanner
                caseId={found.id}
                token={found.token}
                sections={[gutachterSection, anwaltSection]}
              />
            </div>

            <section className='border-border/60 bg-background/80 border-t p-6 md:p-8'>
              <div className='space-y-1'>
                <p className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                  Secondary Context
                </p>
                <h3 className='font-heading text-foreground text-lg font-semibold tracking-tight'>
                  Übersicht der Terminanfragen
                </h3>
              </div>

              {appointmentRequests.length === 0 ? (
                <div className='text-muted-foreground border-border/60 bg-muted/10 mt-3 rounded-2xl border border-dashed p-5 text-sm shadow-sm'>
                  Noch keine Terminanfragen vorhanden.
                </div>
              ) : (
                <div className='mt-4 grid gap-3'>
                  {appointmentRequests.map((request) => (
                    <div
                      key={request.id}
                      className='border-border/60 bg-card/95 hover:bg-muted/10 rounded-2xl border px-4 py-4 text-sm shadow-sm transition-colors'
                    >
                      <div className='flex flex-wrap items-center justify-between gap-3'>
                        <div className='space-y-2'>
                          <div className='font-heading text-foreground text-base font-semibold tracking-tight'>
                            {roleLabel(request.role)} ·{' '}
                            {appointmentTypeLabel(request.appointmentType)} ·{' '}
                            {durationLabel(request.duration)}
                          </div>
                          <div className='text-muted-foreground text-sm'>
                            {fmtDateTime(request.requestedStartAt)} –{' '}
                            {fmtDateTime(request.requestedEndAt)}
                          </div>
                        </div>
                        <div className='border-border/60 bg-background/90 text-muted-foreground rounded-full border px-3 py-1.5 text-xs shadow-sm'>
                          {statusLabel(request.status)}
                        </div>
                      </div>

                      {request.customerNote ? (
                        <div className='text-muted-foreground mt-3 text-xs'>
                          Notiz: {request.customerNote}
                        </div>
                      ) : null}

                      {request.partnerResponseNote ? (
                        <div className='text-muted-foreground mt-2 text-xs'>
                          Partnernotiz: {request.partnerResponseNote}
                        </div>
                      ) : null}

                      {request.latestProposalStartAt &&
                      request.latestProposalEndAt ? (
                        <div className='text-muted-foreground mt-2 text-xs'>
                          Alternativtermin:{' '}
                          {fmtDateTime(request.latestProposalStartAt)} –{' '}
                          {fmtDateTime(request.latestProposalEndAt)}
                          {request.latestProposalNote
                            ? ` · ${request.latestProposalNote}`
                            : ''}
                        </div>
                      ) : null}

                      {request.status === 'CONFIRMED' &&
                      request.partnerContact ? (
                        <div className='mt-4 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4 text-sm shadow-sm'>
                          <div className='text-xs font-medium text-emerald-700'>
                            Kontakt des bestätigten Partners
                          </div>
                          <div className='text-foreground mt-1 font-medium'>
                            {request.partnerContact.contactPerson ||
                              request.partnerContact.companyName}
                          </div>
                          {request.partnerContact.email ? (
                            <div className='text-muted-foreground'>
                              E-Mail: {request.partnerContact.email}
                            </div>
                          ) : null}
                          {request.partnerContact.phone ? (
                            <div className='text-muted-foreground'>
                              Telefon: {request.partnerContact.phone}
                            </div>
                          ) : null}
                          {request.partnerContact.addressLines.length > 0 ? (
                            <div className='text-muted-foreground'>
                              {request.partnerContact.addressLines.join(' · ')}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>

          <div className='text-muted-foreground text-xs'>
            Deine Termine werden hier im laufenden Fall übersichtlich
            zusammengeführt.
          </div>
        </div>
      </div>
    );
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      const { token } = await params;
      return (
        <DatabaseUnavailableState
          title='Terminplanung ist gerade nicht verfügbar'
          description='Die Terminseite kann im Moment keine Daten aus der Datenbank laden.'
          retryHref={`/case/${token}/appointments`}
          retryLabel='Erneut laden'
        />
      );
    }

    throw error;
  }
}
