import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminRecentOpRow } from '../types';

export default function AdminRecentOpsList(props: {
  items: AdminRecentOpRow[];
}) {
  return (
    <Card className='border-border/60 bg-card/95 overflow-hidden shadow-sm'>
      <CardHeader className='border-border/60 bg-muted/15 border-b'>
        <CardTitle className='font-heading text-foreground text-base tracking-tight'>
          Letzte Operations Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        {props.items.length === 0 ? (
          <div className='text-muted-foreground border-border/60 bg-muted/10 rounded-2xl border border-dashed px-4 py-6 text-sm'>
            Keine operativen Events vorhanden.
          </div>
        ) : (
          <div className='space-y-3'>
            {props.items.map((item) => (
              <div
                key={item.id}
                className='border-border/60 bg-background/80 hover:bg-muted/20 rounded-2xl border p-4 text-sm shadow-sm transition-colors'
              >
                <div className='flex flex-wrap items-center gap-x-2 gap-y-2'>
                  <span className='border-border/60 bg-background/80 rounded-full border px-2.5 py-1 font-mono text-[11px] tracking-[0.08em] shadow-sm'>
                    {new Date(item.createdAt).toLocaleString('de-DE')}
                  </span>
                  <span className='border-border/60 bg-background/80 rounded-full border px-2.5 py-1 font-mono text-[11px] tracking-[0.08em] shadow-sm'>
                    {item.domain}
                  </span>
                  <span className='border-border/60 bg-background/80 rounded-full border px-2.5 py-1 font-mono text-[11px] tracking-[0.08em] shadow-sm'>
                    {item.action}
                  </span>
                  <span className='border-border/60 bg-background/80 rounded-full border px-2.5 py-1 font-mono text-[11px] tracking-[0.08em] shadow-sm'>
                    {item.result}
                  </span>
                  <span className='text-muted-foreground text-xs tracking-[0.12em] uppercase'>
                    {item.actorType ?? '—'}
                  </span>
                </div>

                {item.message ? (
                  <div className='text-foreground mt-3 text-sm leading-6'>
                    {item.message}
                  </div>
                ) : null}

                {item.caseId ? (
                  <div className='mt-3'>
                    <Link
                      href={`/dashboard/cases/${item.caseId}`}
                      className='border-border/60 bg-background/80 decoration-muted-foreground/40 hover:bg-muted hover:decoration-foreground/70 inline-flex rounded-full border px-3 py-1.5 text-xs underline underline-offset-4 transition-colors'
                    >
                      Fall öffnen
                    </Link>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
