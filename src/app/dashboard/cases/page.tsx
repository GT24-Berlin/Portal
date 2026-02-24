import Link from 'next/link';
import PageContainer from '@/components/layout/page-container';
import { prisma } from '@/lib/prisma';

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

export default async function CasesPage() {
  const cases = await prisma.case.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { lead: true, partner: true },
    take: 50
  });

  return (
    <PageContainer
      pageTitle='Cases'
      pageDescription='Fälle aus Leads – Status & Fortschritt'
    >
      <div className='rounded-lg border'>
        <div className='grid grid-cols-6 gap-2 border-b p-3 text-sm font-medium'>
          <div>Case</div>
          <div>Lead</div>
          <div>Gutachter</div>
          <div>Anwalt</div>
          <div>Updated</div>
          <div className='text-right'>Kunden-Link</div>
        </div>

        {cases.length === 0 ? (
          <div className='text-muted-foreground p-6 text-sm'>
            Noch keine Cases in der Datenbank.
          </div>
        ) : (
          cases.map((c) => (
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

              <div>{fmt(c.updatedAt)}</div>

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
    </PageContainer>
  );
}
