import Link from 'next/link';
import PageContainer from '@/components/layout/page-container';
import { prisma } from '@/lib/prisma';
import { requireRole, isAdmin, isPartner, type Role } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import AdminCasesTable from '@/components/cases/admin-cases-table';

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
  const sp = (await searchParams) ?? {};
  const view = String(sp.view ?? '').toLowerCase(); // "accepted" | "pending" | ""
  const guard = await requireRole();
  if (!guard.ok) redirect('/auth/sign-in');

  const userId = guard.userId!;
  const role = guard.role as Role;

  let adminCases: any[] = [];
  let pendingCases: any[] = [];
  let activeCases: any[] = [];

  if (isAdmin(role)) {
    adminCases = await prisma.case.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        lead: true,
        partner: true,
        assignments: {
          where: { active: true },
          orderBy: { assignedAt: 'desc' },
          select: {
            id: true,
            role: true,
            status: true,
            assigneeClerkUserId: true,
            assignedAt: true,
            expiresAt: true
          }
        }
      },
      take: 50
    });
  } else if (isPartner(role)) {
    const wantAccepted = view === 'accepted';
    const wantPending = view === 'pending';

    const statuses = wantAccepted
      ? ['ACCEPTED']
      : wantPending
        ? ['PENDING']
        : ['PENDING', 'ACCEPTED'];

    const partnerCases = await prisma.case.findMany({
      where: {
        assignments: {
          some: {
            active: true,
            status: { in: statuses as any },
            assigneeClerkUserId: userId,
            role: role as any
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      include: { lead: true, partner: true, assignments: true },
      take: 50
    });

    pendingCases = wantAccepted
      ? []
      : partnerCases.filter((c: any) =>
          c.assignments?.some(
            (a: any) =>
              a.active &&
              a.role === role &&
              a.assigneeClerkUserId === userId &&
              a.status === 'PENDING'
          )
        );

    activeCases = wantPending
      ? []
      : partnerCases.filter((c: any) =>
          c.assignments?.some(
            (a: any) =>
              a.active &&
              a.role === role &&
              a.assigneeClerkUserId === userId &&
              a.status === 'ACCEPTED'
          )
        );
  }

  return (
    <PageContainer
      pageTitle='Cases'
      pageDescription='Fälle – Status & Fortschritt'
    >
      {isAdmin(role) ? (
        <AdminCasesTable cases={adminCases as any} />
      ) : (
        <div className='space-y-6'>
          {/* Pending */}
          <div className='rounded-lg border'>
            <div className='grid grid-cols-6 gap-2 border-b p-3 text-sm font-medium'>
              <div>Case</div>
              <div>Lead</div>
              <div>Gutachter</div>
              <div>Anwalt</div>
              <div>Updated</div>
              <div className='text-right'>Kunden-Link</div>
            </div>

            {pendingCases.length === 0 ? (
              <div className='text-muted-foreground p-6 text-sm'>
                Keine neuen Zuweisungen.
              </div>
            ) : (
              pendingCases.map((c) => (
                <div key={c.id} className='grid grid-cols-6 gap-2 p-3 text-sm'>
                  <div className='font-mono'>
                    <Link
                      className='underline underline-offset-4 hover:opacity-80'
                      href={`/dashboard/cases/${c.id}`}
                    >
                      {c.caseNumber ?? c.id.slice(0, 8)}
                    </Link>
                  </div>
                  <div className='font-mono'>
                    {c.lead?.externalId ?? c.lead?.id?.slice(0, 8) ?? '—'}
                  </div>
                  <div>{labelGutachter(String(c.gutachterStatus))}</div>
                  <div>{labelAnwalt(String(c.anwaltStatus))}</div>
                  <div>{fmt(new Date(c.updatedAt))}</div>
                  <div className='text-right'>
                    <Link
                      className='text-sm underline underline-offset-4 hover:opacity-80'
                      href={`/case/${c.token}`}
                      target='_blank'
                    >
                      öffnen
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Accepted */}
          <div className='rounded-lg border'>
            <div className='grid grid-cols-6 gap-2 border-b p-3 text-sm font-medium'>
              <div>Case</div>
              <div>Lead</div>
              <div>Gutachter</div>
              <div>Anwalt</div>
              <div>Updated</div>
              <div className='text-right'>Kunden-Link</div>
            </div>

            {activeCases.length === 0 ? (
              <div className='text-muted-foreground p-6 text-sm'>
                Keine aktiven Fälle.
              </div>
            ) : (
              activeCases.map((c) => (
                <div key={c.id} className='grid grid-cols-6 gap-2 p-3 text-sm'>
                  <div className='font-mono'>
                    <Link
                      className='underline underline-offset-4 hover:opacity-80'
                      href={`/dashboard/cases/${c.id}`}
                    >
                      {c.caseNumber ?? c.id.slice(0, 8)}
                    </Link>
                  </div>
                  <div className='font-mono'>
                    {c.lead?.externalId ?? c.lead?.id?.slice(0, 8) ?? '—'}
                  </div>
                  <div>{labelGutachter(String(c.gutachterStatus))}</div>
                  <div>{labelAnwalt(String(c.anwaltStatus))}</div>
                  <div>{fmt(new Date(c.updatedAt))}</div>
                  <div className='text-right'>
                    <Link
                      className='text-sm underline underline-offset-4 hover:opacity-80'
                      href={`/case/${c.token}`}
                      target='_blank'
                    >
                      öffnen
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
