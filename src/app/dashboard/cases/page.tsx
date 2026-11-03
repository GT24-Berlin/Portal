import Link from 'next/link';
import PageContainer from '@/components/layout/page-container';
import { prisma } from '@/lib/prisma';
import { requireIdentity, getActiveMemberships } from '@/lib/policy';
import { redirect } from 'next/navigation';
import AdminCasesTable from '@/components/cases/admin-cases-table';
import DatabaseUnavailableState from '@/components/system/database-unavailable';
import { isDatabaseUnavailableError } from '@/lib/database-error';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fälle'
};

export const runtime = 'nodejs';

const fmt = (d: Date) =>
  new Intl.DateTimeFormat('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);

const labelGutachter = (s: string) => {
  const map: Record<string, string> = {
    EINGEGANGEN: 'Eingegangen',
    DATEN_UNVOLLSTAENDIG: 'Daten unvollständig',
    GUTACHTER_KONTAKTIERT: 'Gutachter kontaktiert',
    TERMIN_GEPLANT: 'Termin geplant',
    GUTACHTEN_IN_BEARBEITUNG: 'Gutachten in Bearbeitung',
    GUTACHTEN_ERSTELLT: 'Gutachten erstellt',
    ABGESCHLOSSEN: 'Abgeschlossen'
  };
  return map[s] ?? s;
};

const labelAnwalt = (s: string) => {
  const map: Record<string, string> = {
    FALL_EINGEGANGEN: 'Fall eingegangen',
    FALL_IN_PRUEFUNG: 'Fall in Prüfung',
    RUECKFRAGEN_IN_KLAERUNG: 'Rückfragen in Klärung',
    FALL_BERICHT_ERSTELLT: 'Fall Bericht erstellt',
    FALL_ABGESCHLOSSEN: 'Fall inkl. Einschätzung abgeschlossen'
  };
  return map[s] ?? s;
};

export default async function CasesPage({
  searchParams
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  try {
    const sp = (await searchParams) ?? {};
    const view = String(sp.view ?? '').toLowerCase(); // "accepted" | "pending" | ""

    // DB-backed identity — no Clerk metadata fallback
    const identity = await requireIdentity();
    if (!identity.ok) redirect('/auth/sign-in');

    const clerkUserId = identity.clerkUserId;
    const memberships = await getActiveMemberships(clerkUserId);
    if (memberships.length === 0) redirect('/auth/sign-in');

    const isInternalUser = memberships.some(
      (m) =>
        m.organization.type === 'INTERNAL' &&
        (m.role === 'ADMIN' || m.role === 'OWNER')
    );

    let adminCases: any[] = [];
    let pendingCases: any[] = [];
    let activeCases: any[] = [];

    if (isInternalUser) {
      // Tenant-scoped: only cases where this INTERNAL org has OWNER CaseOrganization
      const internalOrgIds = memberships
        .filter((m) => m.organization.type === 'INTERNAL')
        .map((m) => m.organizationId);

      adminCases = await prisma.case.findMany({
        where: {
          caseOrganizations: {
            some: { organizationId: { in: internalOrgIds }, role: 'OWNER' }
          }
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          lead: true,
          partner: true,
          assignments: {
            where: { activeKey: 'ACTIVE' },
            orderBy: { assignedAt: 'desc' },
            select: {
              id: true,
              role: true,
              status: true,
              active: true,
              activeKey: true,
              assigneeClerkUserId: true,
              assignedAt: true,
              expiresAt: true
            }
          }
        },
        take: 50
      });
    } else {
      // Partner: cases where this user's org has ASSIGNED CaseOrganization
      // and the user has an active assignment on the case
      const partnerOrgIds = memberships
        .filter((m) => m.organization.type !== 'INTERNAL')
        .map((m) => m.organizationId);

      const wantAccepted = view === 'accepted';
      const wantPending = view === 'pending';

      const statuses = wantAccepted
        ? ['ACCEPTED']
        : wantPending
          ? ['PENDING']
          : ['PENDING', 'ACCEPTED'];

      const partnerCases = await prisma.case.findMany({
        where: {
          caseOrganizations: {
            some: { organizationId: { in: partnerOrgIds }, role: 'ASSIGNED' }
          },
          assignments: {
            some: {
              assigneeClerkUserId: clerkUserId,
              activeKey: 'ACTIVE',
              active: true,
              status: { in: statuses as any }
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          lead: true,
          partner: true,
          assignments: true
        },
        take: 50
      });

      pendingCases = wantAccepted
        ? []
        : partnerCases.filter((c: any) =>
            c.assignments?.some(
              (a: any) =>
                a.active &&
                a.activeKey === 'ACTIVE' &&
                a.assigneeClerkUserId === clerkUserId &&
                a.status === 'PENDING'
            )
          );

      activeCases = wantPending
        ? []
        : partnerCases.filter((c: any) =>
            c.assignments?.some(
              (a: any) =>
                a.active &&
                a.activeKey === 'ACTIVE' &&
                a.assigneeClerkUserId === clerkUserId &&
                a.status === 'ACCEPTED'
            )
          );
    }

    return (
      <PageContainer
        pageTitle='Cases'
        pageDescription='Fälle – Status & Fortschritt'
      >
        {isInternalUser ? (
          <AdminCasesTable cases={adminCases as any} />
        ) : (
          <div className='space-y-6'>
            {/* Pending */}
            <section className='border-border/60 bg-background/82 overflow-hidden rounded-[28px] border shadow-[var(--shadow-soft)]'>
              <div className='border-border/60 bg-muted/10 flex flex-wrap items-end justify-between gap-3 border-b px-4 py-4 md:px-6'>
                <div className='space-y-1'>
                  <div className='font-heading text-foreground text-base font-semibold tracking-tight'>
                    Neue Zuweisungen
                  </div>
                  <div className='text-muted-foreground text-xs'>
                    Erst annehmen, dann bearbeiten.
                  </div>
                </div>
                <div className='text-muted-foreground text-xs'>
                  {pendingCases.length} offen
                </div>
              </div>

              {pendingCases.length === 0 ? (
                <div className='text-muted-foreground bg-background/78 px-4 py-6 text-sm md:px-6'>
                  Keine neuen Zuweisungen.
                </div>
              ) : (
                <div className='space-y-2 px-4 py-4 md:px-6'>
                  <div className='text-muted-foreground grid grid-cols-6 gap-3 px-1 text-[11px] font-semibold tracking-[0.14em] uppercase'>
                    <div>Case</div>
                    <div>Kunde</div>
                    <div>Gutachter</div>
                    <div>Anwalt</div>
                    <div>Updated</div>
                    <div className='text-right'>Kunden-Link</div>
                  </div>

                  {pendingCases.map((c) => (
                    <div
                      key={c.id}
                      className='border-border/60 bg-background/84 hover:bg-primary/[0.02] grid grid-cols-6 gap-3 rounded-[24px] border px-4 py-4 text-sm shadow-[var(--shadow-soft)] transition-colors'
                    >
                      <div className='font-mono'>
                        <Link
                          className='border-border/60 bg-background/90 decoration-muted-foreground/40 hover:bg-muted/50 hover:decoration-foreground/70 inline-flex rounded-full border px-3 py-1.5 underline underline-offset-4 shadow-[var(--shadow-soft)] transition-colors hover:opacity-90'
                          href={`/dashboard/cases/${c.id}`}
                        >
                          {c.caseNumber ?? '—'}
                        </Link>
                      </div>
                      <div className='truncate text-sm font-medium'>
                        {[c.customer?.firstName, c.customer?.lastName]
                          .filter(Boolean)
                          .join(' ')
                          .trim() || '—'}
                      </div>
                      <div className='text-sm'>
                        {labelGutachter(String(c.gutachterStatus))}
                      </div>
                      <div className='text-sm'>
                        {labelAnwalt(String(c.anwaltStatus))}
                      </div>
                      <div className='text-muted-foreground text-sm'>
                        {fmt(new Date(c.updatedAt))}
                      </div>
                      <div className='text-right'>
                        <Link
                          className='border-border/60 bg-background/90 decoration-muted-foreground/40 hover:bg-muted/50 hover:decoration-foreground/70 inline-flex rounded-full border px-3 py-1.5 text-sm underline underline-offset-4 shadow-[var(--shadow-soft)] transition-colors hover:opacity-90'
                          href={`/case/${c.token}`}
                          target='_blank'
                        >
                          öffnen
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Accepted */}
            <section className='border-border/60 bg-background/82 overflow-hidden rounded-[28px] border shadow-[var(--shadow-soft)]'>
              <div className='border-border/60 bg-muted/10 flex flex-wrap items-end justify-between gap-3 border-b px-4 py-4 md:px-6'>
                <div className='space-y-1'>
                  <div className='font-heading text-foreground text-base font-semibold tracking-tight'>
                    Aktive Fälle
                  </div>
                  <div className='text-muted-foreground text-xs'>
                    Bereits angenommene Zuständigkeiten.
                  </div>
                </div>
                <div className='text-muted-foreground text-xs'>
                  {activeCases.length} aktiv
                </div>
              </div>

              {activeCases.length === 0 ? (
                <div className='text-muted-foreground bg-background/78 px-4 py-6 text-sm md:px-6'>
                  Keine aktiven Fälle.
                </div>
              ) : (
                <div className='space-y-2 px-4 py-4 md:px-6'>
                  <div className='text-muted-foreground grid grid-cols-6 gap-3 px-1 text-[11px] font-semibold tracking-[0.14em] uppercase'>
                    <div>Case</div>
                    <div>Kunde</div>
                    <div>Gutachter</div>
                    <div>Anwalt</div>
                    <div>Updated</div>
                    <div className='text-right'>Kunden-Link</div>
                  </div>

                  {activeCases.map((c) => (
                    <div
                      key={c.id}
                      className='border-border/60 bg-background/84 hover:bg-primary/[0.02] grid grid-cols-6 gap-3 rounded-[24px] border px-4 py-4 text-sm shadow-[var(--shadow-soft)] transition-colors'
                    >
                      <div className='font-mono'>
                        <Link
                          className='border-border/60 bg-background/90 decoration-muted-foreground/40 hover:bg-muted/50 hover:decoration-foreground/70 inline-flex rounded-full border px-3 py-1.5 underline underline-offset-4 shadow-[var(--shadow-soft)] transition-colors hover:opacity-90'
                          href={`/dashboard/cases/${c.id}`}
                        >
                          {c.caseNumber ?? '—'}
                        </Link>
                      </div>
                      <div className='truncate text-sm font-medium'>
                        {[c.customer?.firstName, c.customer?.lastName]
                          .filter(Boolean)
                          .join(' ')
                          .trim() || '—'}
                      </div>
                      <div className='text-sm'>
                        {labelGutachter(String(c.gutachterStatus))}
                      </div>
                      <div className='text-sm'>
                        {labelAnwalt(String(c.anwaltStatus))}
                      </div>
                      <div className='text-muted-foreground text-sm'>
                        {fmt(new Date(c.updatedAt))}
                      </div>
                      <div className='text-right'>
                        <Link
                          className='border-border/60 bg-background/90 decoration-muted-foreground/40 hover:bg-muted/50 hover:decoration-foreground/70 inline-flex rounded-full border px-3 py-1.5 text-sm underline underline-offset-4 shadow-[var(--shadow-soft)] transition-colors hover:opacity-90'
                          href={`/case/${c.token}`}
                          target='_blank'
                        >
                          öffnen
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </PageContainer>
    );
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return (
        <DatabaseUnavailableState
          title='Cases temporär nicht verfügbar'
          description='Die Cases-Übersicht konnte gerade nicht geladen werden, weil die Datenbankverbindung aktuell nicht erreichbar ist.'
          retryHref='/dashboard/cases'
          retryLabel='Nochmal laden'
        />
      );
    }

    throw error;
  }
}
