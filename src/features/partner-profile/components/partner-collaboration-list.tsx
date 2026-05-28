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
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (status === 'PENDING') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (status === 'RELEASED' || status === 'EXPIRED') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  return 'border-border/60 bg-background/80 text-foreground';
}

export default function PartnerCollaborationList(props: {
  data: PartnerCollaborationData;
}) {
  const { data } = props;

  return (
    <section className='border-border/60 bg-background/82 overflow-hidden rounded-[32px] border shadow-[var(--shadow-soft)]'>
      <div className='border-border/60 bg-muted/10 flex flex-wrap items-end justify-between gap-4 border-b px-6 py-5'>
        <div className='space-y-2'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            Fallpartner
          </div>
          <div className='font-heading text-foreground text-lg font-semibold tracking-tight'>
            Gegenparteien in deinen zugeordneten Fällen
          </div>
          <div className='text-muted-foreground text-sm leading-6'>
            Ruhig komponierte Übersicht für die aktuelle Partnerzuordnung.
          </div>
        </div>

        <div className='border-border/60 bg-background/82 rounded-full border px-3.5 py-2 text-xs font-medium shadow-[var(--shadow-soft)]'>
          Fälle: <span className='font-mono'>{data.items.length}</span>
        </div>
      </div>

      <div className='p-6'>
        {data.items.length === 0 ? (
          <div className='border-border/60 bg-background/84 rounded-[24px] border border-dashed px-4 py-5 text-sm shadow-[var(--shadow-soft)]'>
            <div className='text-foreground text-sm font-medium'>
              Aktuell sind keine Fallpartner-Daten verfügbar.
            </div>
            <div className='text-muted-foreground mt-1 text-sm'>
              Sobald eine Gegenpartei zugeordnet ist, erscheint sie hier in der
              neuen Partner-Surface.
            </div>
          </div>
        ) : (
          <div className='space-y-3'>
            {data.items.map((item) => (
              <article
                key={item.caseId}
                className='border-border/60 bg-background/84 hover:bg-primary/[0.02] rounded-[28px] border p-4 shadow-[var(--shadow-soft)] transition-colors'
              >
                <div className='flex flex-wrap items-start justify-between gap-4'>
                  <div className='space-y-2'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <div className='text-foreground font-mono text-sm font-semibold'>
                        {item.caseNumber ?? '—'}
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                          item.ownAssignmentStatus || ''
                        )}`}
                      >
                        {item.ownAssignmentStatus || '—'}
                      </span>
                    </div>
                    <div className='text-muted-foreground text-sm'>
                      {item.customerName ?? 'Kunde unbekannt'}
                    </div>
                  </div>

                  <div className='text-muted-foreground text-xs'>
                    Updated: {fmtDate(item.updatedAt)}
                  </div>
                </div>

                <div className='mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
                  <div className='border-border/60 bg-background/90 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
                    <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                      Gegenpart-Rolle
                    </div>
                    <div className='text-foreground mt-1 text-sm font-medium'>
                      {item.counterpartRole}
                    </div>
                  </div>

                  <div className='border-border/60 bg-background/90 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
                    <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                      Gegenpart
                    </div>
                    <div className='text-foreground mt-1 truncate text-sm font-medium'>
                      {item.counterpartName ?? '—'}
                    </div>
                    <div className='text-muted-foreground mt-1 truncate text-sm'>
                      {item.counterpartEmail ?? '—'}
                    </div>
                  </div>

                  <div className='border-border/60 bg-background/90 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
                    <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                      Gutachter / Anwalt
                    </div>
                    <div className='text-foreground mt-1 space-y-1 text-sm'>
                      <div>{item.gutachterStatus || '—'}</div>
                      <div>{item.anwaltStatus || '—'}</div>
                    </div>
                  </div>

                  <div className='border-border/60 bg-background/90 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
                    <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                      Aktion
                    </div>
                    <div className='mt-3 flex justify-start xl:justify-end'>
                      <Link
                        href={`/dashboard/cases/${item.caseId}`}
                        className='border-border/60 bg-background/80 hover:bg-background/95 inline-flex rounded-full border px-3.5 py-2 text-xs font-medium shadow-[var(--shadow-soft)] transition-colors'
                      >
                        Fall öffnen
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
