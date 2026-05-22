'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PartnerCaseRow } from '../types';

type TabKey = 'PENDING' | 'ACCEPTED';

function fmtDate(value: Date) {
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export default function PartnerCasesTable(props: {
  pendingCases: PartnerCaseRow[];
  acceptedCases: PartnerCaseRow[];
}) {
  const [tab, setTab] = useState<TabKey>('PENDING');

  const current = useMemo(() => {
    if (tab === 'PENDING') {
      return {
        title: 'Neue Zuweisungen',
        emptyText: 'Aktuell liegen keine neuen Zuweisungen vor.',
        items: props.pendingCases
      };
    }

    return {
      title: 'Aktive Fälle',
      emptyText: 'Aktuell liegen keine aktiven Fälle vor.',
      items: props.acceptedCases
    };
  }, [tab, props.pendingCases, props.acceptedCases]);

  return (
    <Card className='border-border/60 bg-card/95 overflow-hidden shadow-sm'>
      <CardHeader className='border-border/60 bg-muted/15 space-y-3 border-b'>
        <CardTitle className='font-heading text-foreground text-base tracking-tight'>
          {current.title}
        </CardTitle>

        <div className='flex flex-wrap gap-2'>
          <button
            type='button'
            className={`border-border/60 rounded-full border px-3 py-1.5 text-xs shadow-sm transition-colors ${
              tab === 'PENDING' ? 'bg-muted' : 'bg-background/80'
            }`}
            onClick={() => setTab('PENDING')}
          >
            Neue Zuweisungen
          </button>

          <button
            type='button'
            className={`border-border/60 rounded-full border px-3 py-1.5 text-xs shadow-sm transition-colors ${
              tab === 'ACCEPTED' ? 'bg-muted' : 'bg-background/80'
            }`}
            onClick={() => setTab('ACCEPTED')}
          >
            Aktive Fälle
          </button>
        </div>
      </CardHeader>

      <CardContent>
        {current.items.length === 0 ? (
          <div className='text-muted-foreground border-border/60 bg-muted/10 rounded-2xl border border-dashed px-4 py-6 text-sm shadow-sm'>
            {current.emptyText}
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <div className='min-w-[860px]'>
              <div className='text-muted-foreground bg-muted/10 border-border/60 grid grid-cols-7 gap-3 border-b px-4 py-3 text-xs font-medium tracking-[0.14em] uppercase'>
                <div>Case</div>
                <div>Kunde</div>
                <div>Assignment</div>
                <div>Gutachter</div>
                <div>Anwalt</div>
                <div>Updated</div>
                <div className='text-right'>Aktionen</div>
              </div>

              <div className='divide-y'>
                {current.items.map((item) => (
                  <div
                    key={item.caseId}
                    className='hover:bg-muted/20 grid grid-cols-7 gap-3 px-4 py-4 text-sm transition-colors'
                  >
                    <div className='text-foreground font-mono text-sm font-medium'>
                      {item.caseNumber ?? '—'}
                    </div>

                    <div className='text-foreground truncate text-sm font-medium'>
                      {item.customerName ?? '—'}
                    </div>

                    <div className='text-xs'>
                      <div className='text-foreground font-mono'>
                        {item.assignmentStatus}
                      </div>
                      <div className='text-muted-foreground'>
                        {item.assignmentRole}
                      </div>
                    </div>

                    <div className='text-foreground text-sm'>
                      {item.gutachterStatus || '—'}
                    </div>

                    <div className='text-foreground text-sm'>
                      {item.anwaltStatus || '—'}
                    </div>

                    <div className='text-muted-foreground text-xs'>
                      {fmtDate(item.updatedAt)}
                    </div>

                    <div className='flex justify-end gap-3 text-xs'>
                      <Link
                        href={`/dashboard/cases/${item.caseId}`}
                        className='border-border/60 bg-background/80 decoration-muted-foreground/40 hover:bg-muted hover:decoration-foreground/70 rounded-full border px-3 py-1.5 underline underline-offset-4 transition-colors'
                      >
                        Fall öffnen
                      </Link>
                      <Link
                        href={`/case/${item.token}`}
                        target='_blank'
                        className='border-border/60 bg-background/80 decoration-muted-foreground/40 hover:bg-muted hover:decoration-foreground/70 rounded-full border px-3 py-1.5 underline underline-offset-4 transition-colors'
                      >
                        Kunden-Link
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
