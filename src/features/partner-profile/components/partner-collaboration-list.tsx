import Link from 'next/link';
import type { PartnerCollaborationData } from '../types';

function fmtDate(value: Date) {
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === 'ACCEPTED') {
    return 'border-green-200 bg-green-50 text-green-700';
  }

  if (status === 'PENDING') {
    return 'border-yellow-200 bg-yellow-50 text-yellow-700';
  }

  if (status === 'RELEASED' || status === 'EXPIRED') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  return 'border-muted bg-muted text-foreground';
}

export default function PartnerCollaborationList(props: {
  data: PartnerCollaborationData;
}) {
  const { data } = props;

  return (
    <div className='border-border/60 bg-card/95 space-y-4 overflow-hidden rounded-2xl border p-6 shadow-sm'>
      <div className='border-border/60 flex flex-wrap items-start justify-between gap-3 border-b pb-4'>
        <div>
          <div className='font-heading text-foreground text-sm font-medium tracking-tight'>
            Fallpartner
          </div>
          <div className='text-muted-foreground text-xs'>
            Übersicht über die Gegenpartei in deinen aktuell zugeordneten Fällen
          </div>
        </div>

        <div className='text-muted-foreground text-xs tracking-[0.14em] uppercase'>
          Fälle: <span className='font-mono'>{data.items.length}</span>
        </div>
      </div>

      {data.items.length === 0 ? (
        <div className='text-muted-foreground border-border/60 bg-muted/10 rounded-2xl border border-dashed p-4 text-sm shadow-sm'>
          Aktuell sind keine Fallpartner-Daten verfügbar.
        </div>
      ) : (
        <div className='overflow-x-auto'>
          <div className='min-w-[1080px]'>
            <div className='text-muted-foreground bg-muted/10 border-border/60 grid grid-cols-8 gap-3 border-b px-4 py-3 text-xs font-medium tracking-[0.14em] uppercase'>
              <div>Case</div>
              <div>Gegenpart-Rolle</div>
              <div>Gegenpart</div>
              <div>Eigener Status</div>
              <div>Gutachter</div>
              <div>Anwalt</div>
              <div>Updated</div>
              <div className='text-right'>Aktion</div>
            </div>

            <div className='divide-y'>
              {data.items.map((item) => (
                <div
                  key={item.caseId}
                  className='hover:bg-muted/20 grid grid-cols-8 gap-3 px-4 py-4 text-sm transition-colors'
                >
                  <div className='min-w-0'>
                    <div className='text-foreground font-mono text-sm font-medium'>
                      {item.caseNumber ?? '—'}
                    </div>
                    <div className='text-muted-foreground mt-1 truncate text-xs'>
                      {item.customerName ?? 'Kunde unbekannt'}
                    </div>
                  </div>

                  <div className='text-muted-foreground text-xs font-medium tracking-[0.12em] whitespace-nowrap uppercase'>
                    {item.counterpartRole}
                  </div>

                  <div className='min-w-0 space-y-1 text-xs'>
                    <div className='text-foreground truncate font-medium'>
                      {item.counterpartName ?? '—'}
                    </div>
                    <div className='text-muted-foreground truncate'>
                      {item.counterpartEmail ?? '—'}
                    </div>
                  </div>

                  <div className='text-xs'>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm ${statusClass(
                        item.ownAssignmentStatus || ''
                      )}`}
                    >
                      {item.ownAssignmentStatus || '—'}
                    </span>
                  </div>

                  <div className='min-w-0 text-xs'>
                    <span className='text-foreground block truncate'>
                      {item.gutachterStatus || '—'}
                    </span>
                  </div>

                  <div className='min-w-0 text-xs'>
                    <span className='text-foreground block truncate'>
                      {item.anwaltStatus || '—'}
                    </span>
                  </div>

                  <div className='text-muted-foreground text-xs'>
                    {fmtDate(item.updatedAt)}
                  </div>

                  <div className='flex justify-end text-xs'>
                    <Link
                      href={`/dashboard/cases/${item.caseId}`}
                      className='border-border/60 bg-background/80 decoration-muted-foreground/40 hover:bg-muted hover:decoration-foreground/70 rounded-full border px-3 py-1.5 underline underline-offset-4 shadow-sm transition-colors'
                    >
                      Fall öffnen
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
