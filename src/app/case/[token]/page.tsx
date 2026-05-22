import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import CaseIntakeForm from '@/components/case/case-intake-form';
import { cookies } from 'next/headers';
import CaseOtpCookieRefresh from '@/components/case/case-otp-cookie-refresh';
import CaseTopNav from '@/components/case/case-top-nav';
import CaseCustomerUploadsMini from '@/components/case/case-customer-uploads-mini';
import DatabaseUnavailableState from '@/components/system/database-unavailable';
import { isDatabaseUnavailableError } from '@/lib/database-error';
import CustomerJourneyCard from '@/features/customer-journey/components/customer-journey-card';
import { getCustomerJourney } from '@/features/customer-journey/lib/get-customer-journey';
import { getPartnerProfile } from '@/features/partner-profile/lib/get-partner-profile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type TimelineStep = { label: string; done: boolean; date?: string };

type PartnerContactSummary = {
  name: string;
  companyName: string;
};

const GUTACHTER_FLOW = [
  { key: 'EINGEGANGEN', label: 'Eingegangen' },
  { key: 'DATEN_UNVOLLSTAENDIG', label: 'Daten unvollständig' },
  { key: 'GUTACHTER_KONTAKTIERT', label: 'Gutachter kontaktiert' },
  { key: 'TERMIN_GEPLANT', label: 'Termin geplant' },
  { key: 'GUTACHTEN_IN_BEARBEITUNG', label: 'Gutachten in Bearbeitung' },
  { key: 'GUTACHTEN_ERSTELLT', label: 'Gutachten erstellt' },
  { key: 'ABGESCHLOSSEN', label: 'Abgeschlossen' }
] as const;

const ANWALT_FLOW = [
  { key: 'FALL_EINGEGANGEN', label: 'Fall eingegangen' },
  { key: 'FALL_IN_PRUEFUNG', label: 'Fall in Prüfung' },
  { key: 'RUECKFRAGEN_IN_KLAERUNG', label: 'Rückfragen in Klärung' },
  { key: 'FALL_BERICHT_ERSTELLT', label: 'Fall Bericht erstellt' },
  { key: 'FALL_ABGESCHLOSSEN', label: 'Fall inkl. Einschätzung abgeschlossen' }
] as const;

function fmt(dt?: Date | null) {
  if (!dt) return '';
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dt);
}

function buildCustomerName(input: {
  firstName?: string | null;
  lastName?: string | null;
}) {
  return [input.firstName, input.lastName].filter(Boolean).join(' ').trim();
}

function buildPartnerSummary(input: {
  contactPerson?: string | null;
  companyName?: string | null;
  partnerName?: string | null;
  fallbackLabel: string;
}): PartnerContactSummary {
  return {
    name:
      input.contactPerson?.trim() ||
      input.partnerName?.trim() ||
      input.companyName?.trim() ||
      input.fallbackLabel,
    companyName: input.companyName?.trim() || ''
  };
}

function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className='space-y-3'>
      {steps.map((step, idx) => (
        <li key={idx} className='flex items-start gap-3'>
          <div
            className={`mt-1 h-3 w-3 rounded-full border ${
              step.done ? 'bg-foreground' : 'bg-background'
            }`}
          />
          <div className='flex-1'>
            <div className='flex items-center justify-between gap-3'>
              <p
                className={step.done ? 'font-medium' : 'text-muted-foreground'}
              >
                {step.label}
              </p>
              <p className='text-muted-foreground text-sm'>{step.date ?? ''}</p>
            </div>
            {idx < steps.length - 1 && (
              <div className='bg-border mt-3 ml-[5px] h-6 w-px' />
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function buildTimeline(
  flow: readonly { key: string; label: string }[],
  currentKey: string,
  events: { lane: 'GUTACHTER' | 'ANWALT'; status: string; occurredAt: Date }[],
  lane: 'GUTACHTER' | 'ANWALT'
): TimelineStep[] {
  const idxCurrent = Math.max(
    0,
    flow.findIndex((s) => s.key === currentKey)
  );

  const eventMap = new Map<string, Date>();
  for (const e of events) {
    if (e.lane !== lane) continue;
    if (!eventMap.has(e.status)) eventMap.set(e.status, e.occurredAt);
  }

  return flow.map((s, idx) => ({
    label: s.label,
    done: idx <= idxCurrent,
    date: fmt(eventMap.get(s.key) ?? null)
  }));
}

export default async function CaseTokenPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  try {
    //  Next 16: params ist Promise → MUSS awaited werden
    const { token } = await params;

    if (!token) notFound();

    const found = await prisma.case.findUnique({
      where: { token },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            otpVerifiedAt: true
          }
        },
        intake: true,
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
        events: {
          orderBy: { occurredAt: 'asc' }
        }
      }
    });

    if (!found) notFound();

    // 1) Registrierung-Gate
    if (!found.customer) {
      redirect(`/case/${token}/register`);
    }

    // 2) OTP-Gate: wenn noch NICHT verified -> verify page
    if (!found.customer.otpVerifiedAt) {
      redirect(`/case/${token}/verify`);
    }

    // 3) OPTIONAL: Cookie-Gate nur als Zusatzschutz (nicht mehr Pflicht)
    const jar = await cookies();
    const hasAccess = jar.get(`case_access_${token}`)?.value === '1';

    // Wenn verified aber Cookie fehlt -> NICHT mehr blocken (kein Redirect!)

    const events = (found.events ?? []).map((e) => ({
      lane: e.lane as 'GUTACHTER' | 'ANWALT',
      status: e.status,
      occurredAt: e.occurredAt
    }));

    const [gutachterAssignmentRaw, anwaltAssignmentRaw] = [
      found.assignments.find(
        (assignment) =>
          assignment.role === 'GUTACHTER' &&
          assignment.active === true &&
          assignment.activeKey === 'ACTIVE'
      ) ?? null,
      found.assignments.find(
        (assignment) =>
          assignment.role === 'ANWALT' &&
          assignment.active === true &&
          assignment.activeKey === 'ACTIVE'
      ) ?? null
    ];

    const [gutachterProfile, anwaltProfile] = await Promise.all([
      gutachterAssignmentRaw?.assigneeClerkUserId
        ? getPartnerProfile({
            clerkUserId: gutachterAssignmentRaw.assigneeClerkUserId,
            role: 'GUTACHTER'
          })
        : Promise.resolve(null),
      anwaltAssignmentRaw?.assigneeClerkUserId
        ? getPartnerProfile({
            clerkUserId: anwaltAssignmentRaw.assigneeClerkUserId,
            role: 'ANWALT'
          })
        : Promise.resolve(null)
    ]);

    const customerName = buildCustomerName(found.customer);
    const gutachterSummary = gutachterProfile
      ? buildPartnerSummary({
          contactPerson: gutachterProfile.contactPerson,
          companyName: gutachterProfile.companyName,
          fallbackLabel: 'Wird zugewiesen'
        })
      : buildPartnerSummary({
          fallbackLabel: 'Wird zugewiesen'
        });
    const anwaltSummary = anwaltProfile
      ? buildPartnerSummary({
          contactPerson: anwaltProfile.contactPerson,
          companyName: anwaltProfile.companyName,
          fallbackLabel: 'Wird zugewiesen'
        })
      : buildPartnerSummary({
          fallbackLabel: 'Wird zugewiesen'
        });

    const gutachterTimeline = buildTimeline(
      GUTACHTER_FLOW,
      found.gutachterStatus,
      events,
      'GUTACHTER'
    );

    const anwaltTimeline = buildTimeline(
      ANWALT_FLOW,
      found.anwaltStatus,
      events,
      'ANWALT'
    );

    const lastEvent = found.events?.length
      ? found.events[found.events.length - 1]
      : null;

    const journey = getCustomerJourney({
      gutachterStatus: String(found.gutachterStatus),
      anwaltStatus: String(found.anwaltStatus)
    });

    return (
      <div className='bg-background text-foreground h-[100dvh] overflow-y-auto'>
        <div className='mx-auto max-w-5xl space-y-8 px-4 py-8 pb-24'>
          <CaseTopNav
            token={token}
            active='status'
            title='Dein Fallstatus'
            subtitle={`Fallnummer: ${found.caseNumber ?? '—'} · Kunde: ${
              customerName || '—'
            }`}
            showEdit
          />

          <div className='bg-card/95 border-border/60 space-y-5 rounded-[28px] border p-6 shadow-sm md:p-8'>
            <div className='flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between'>
              <div className='space-y-3'>
                <p className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                  Fallübersicht
                </p>
                <div className='space-y-2'>
                  <h1 className='font-heading text-foreground text-3xl font-semibold tracking-tight md:text-4xl'>
                    Dein Fallstatus
                  </h1>
                  <p className='text-muted-foreground max-w-2xl text-sm leading-6 md:text-[15px]'>
                    Hier siehst du die wichtigsten Eckdaten, die aktuelle
                    Bearbeitung und die Ansprechpartner für deinen Fall in einer
                    ruhigen Übersicht.
                  </p>
                  <div className='flex flex-wrap gap-2 pt-1'>
                    <span className='border-border/60 bg-background/80 text-foreground rounded-full border px-3 py-1 text-xs shadow-sm'>
                      Aktueller Schritt:{' '}
                      {journey.currentLabel ?? 'In Bearbeitung'}
                    </span>
                    <span className='border-border/60 bg-background/80 text-muted-foreground rounded-full border px-3 py-1 text-xs shadow-sm'>
                      Nächster Schritt: {journey.nextLabel ?? 'Keiner offen'}
                    </span>
                  </div>
                </div>
              </div>

              <div className='grid gap-3 sm:grid-cols-3 lg:min-w-[420px] lg:grid-cols-1 xl:grid-cols-3'>
                <div className='border-border/60 bg-foreground/5 rounded-2xl border p-4 shadow-sm'>
                  <p className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                    Fallnummer
                  </p>
                  <p className='text-foreground font-mono text-lg font-semibold'>
                    {found.caseNumber ?? '—'}
                  </p>
                </div>

                <div className='border-border/60 bg-background/80 rounded-2xl border p-4 shadow-sm'>
                  <p className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                    Ihr Gutachter
                  </p>
                  <p className='text-foreground font-medium'>
                    {gutachterSummary.name}
                  </p>
                  {gutachterSummary.companyName ? (
                    <p className='text-muted-foreground text-xs'>
                      {gutachterSummary.companyName}
                    </p>
                  ) : null}
                </div>

                <div className='border-border/60 bg-background/80 rounded-2xl border p-4 shadow-sm'>
                  <p className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                    Ihr Anwalt
                  </p>
                  <p className='text-foreground font-medium'>
                    {anwaltSummary.name}
                  </p>
                  {anwaltSummary.companyName ? (
                    <p className='text-muted-foreground text-xs'>
                      {anwaltSummary.companyName}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className='grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,0.92fr)]'>
            <div className='space-y-6'>
              <CustomerJourneyCard data={journey} />

              <div className='bg-card/95 border-border/60 flex flex-col gap-3 rounded-2xl border px-5 py-5 shadow-sm md:flex-row md:items-center md:justify-between'>
                <div>
                  <p className='text-muted-foreground text-sm'>
                    Letztes Update
                  </p>
                  <p className='text-foreground font-medium'>
                    {fmt(lastEvent?.occurredAt ?? found.updatedAt)}
                  </p>
                </div>
                <div className='text-muted-foreground text-sm'>
                  Gutachter:{' '}
                  <span className='text-foreground'>
                    {GUTACHTER_FLOW.find((x) => x.key === found.gutachterStatus)
                      ?.label ?? found.gutachterStatus}
                  </span>
                  {' · '}
                  Anwalt:{' '}
                  <span className='text-foreground'>
                    {ANWALT_FLOW.find((x) => x.key === found.anwaltStatus)
                      ?.label ?? found.anwaltStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className='space-y-4'>
              <div className='bg-card/95 border-border/60 rounded-[28px] border px-5 py-6 shadow-sm'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-muted-foreground text-sm'>Track</p>
                    <h2 className='font-heading text-foreground text-xl font-semibold tracking-tight'>
                      Gutachter
                    </h2>
                    <p className='text-muted-foreground text-sm'>
                      Status:{' '}
                      <span className='text-foreground font-medium'>
                        {GUTACHTER_FLOW.find(
                          (x) => x.key === found.gutachterStatus
                        )?.label ?? found.gutachterStatus}
                      </span>
                    </p>
                  </div>
                  <p className='text-muted-foreground text-sm'>
                    In Bearbeitung
                  </p>
                </div>
                <div className='mt-5'>
                  <Timeline steps={gutachterTimeline} />
                </div>

                {found.gutachtenPdfUrl ? (
                  <div className='mt-5'>
                    <a
                      className='hover:bg-muted border-border/60 bg-background/80 inline-flex items-center rounded-full border px-4 py-2 text-sm shadow-sm'
                      href={found.gutachtenPdfUrl}
                      target='_blank'
                      rel='noreferrer'
                    >
                      Gutachten PDF öffnen
                    </a>
                  </div>
                ) : null}
              </div>

              <div className='bg-card/95 border-border/60 rounded-[28px] border px-5 py-6 shadow-sm'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-muted-foreground text-sm'>Track</p>
                    <h2 className='font-heading text-foreground text-xl font-semibold tracking-tight'>
                      Anwalt
                    </h2>
                    <p className='text-muted-foreground text-sm'>
                      Status:{' '}
                      <span className='text-foreground font-medium'>
                        {ANWALT_FLOW.find((x) => x.key === found.anwaltStatus)
                          ?.label ?? found.anwaltStatus}
                      </span>
                    </p>
                  </div>
                  <p className='text-muted-foreground text-sm'>
                    In Bearbeitung
                  </p>
                </div>
                <div className='mt-5'>
                  <Timeline steps={anwaltTimeline} />
                </div>
              </div>
            </div>
          </div>

          <div className='grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]'>
            <div className='space-y-6'>
              <CaseIntakeForm token={token} />
            </div>

            <div className='space-y-6'>
              <CaseCustomerUploadsMini token={token} />

              <div className='bg-card/95 border-border/60 space-y-3 rounded-2xl border p-5 shadow-sm'>
                <h3 className='font-heading text-foreground text-lg font-semibold tracking-tight'>
                  Fragen?
                </h3>
                <p className='text-muted-foreground text-sm'>
                  Antworte einfach auf die Nachricht mit deinem Link oder
                  kontaktiere uns.
                </p>
                <div className='flex flex-wrap gap-2'>
                  <button className='hover:bg-muted border-border/60 bg-background/80 rounded-full border px-4 py-2 text-sm shadow-sm'>
                    Anrufen
                  </button>
                  <button className='hover:bg-muted border-border/60 bg-background/80 rounded-full border px-4 py-2 text-sm shadow-sm'>
                    Nachricht senden
                  </button>
                  <Link
                    className='hover:bg-muted border-border/60 bg-background/80 rounded-full border px-4 py-2 text-sm shadow-sm'
                    href='/dashboard/overview'
                  >
                    Dein Partnerteam
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <p className='text-muted-foreground text-xs'>
            Hinweis: Deine Angaben werden im laufenden Fallkontext verwendet.
          </p>
        </div>
      </div>
    );
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return (
        <DatabaseUnavailableState
          title='Fallstatus temporär nicht verfügbar'
          description='Die Fallansicht konnte gerade nicht geladen werden, weil die Datenbankverbindung aktuell nicht erreichbar ist.'
          retryHref='/dashboard/overview'
          retryLabel='Zum Dashboard'
        />
      );
    }

    throw error;
  }
}
