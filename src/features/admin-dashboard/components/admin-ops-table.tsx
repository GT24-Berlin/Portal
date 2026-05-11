'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminOpsCaseRow } from '../types';

type TabKey = 'WITHOUT_GUTACHTER' | 'WITHOUT_ANWALT' | 'PENDING';

function fmtDate(value: Date) {
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export default function AdminOpsTable(props: {
  withoutGutachter: AdminOpsCaseRow[];
  withoutAnwalt: AdminOpsCaseRow[];
  pendingCases: AdminOpsCaseRow[];
}) {
  const [tab, setTab] = useState<TabKey>('WITHOUT_GUTACHTER');

  const current = useMemo(() => {
    if (tab === 'WITHOUT_GUTACHTER') {
      return {
        title: 'Fälle ohne Gutachter',
        emptyText: 'Aktuell haben alle relevanten Fälle einen Gutachter.',
        items: props.withoutGutachter
      };
    }

    if (tab === 'WITHOUT_ANWALT') {
      return {
        title: 'Fälle ohne Anwalt',
        emptyText: 'Aktuell haben alle relevanten Fälle einen Anwalt.',
        items: props.withoutAnwalt
      };
    }

    return {
      title: 'Fälle mit PENDING',
      emptyText: 'Aktuell gibt es keine PENDING Assignments.',
      items: props.pendingCases
    };
  }, [tab, props.withoutGutachter, props.withoutAnwalt, props.pendingCases]);

  return (
    <Card>
      <CardHeader className='space-y-3'>
        <CardTitle className='text-base'>{current.title}</CardTitle>

        <div className='flex flex-wrap gap-2'>
          <button
            type='button'
            className={`rounded-md border px-3 py-1.5 text-xs ${
              tab === 'WITHOUT_GUTACHTER' ? 'bg-muted' : ''
            }`}
            onClick={() => setTab('WITHOUT_GUTACHTER')}
          >
            Ohne Gutachter
          </button>

          <button
            type='button'
            className={`rounded-md border px-3 py-1.5 text-xs ${
              tab === 'WITHOUT_ANWALT' ? 'bg-muted' : ''
            }`}
            onClick={() => setTab('WITHOUT_ANWALT')}
          >
            Ohne Anwalt
          </button>

          <button
            type='button'
            className={`rounded-md border px-3 py-1.5 text-xs ${
              tab === 'PENDING' ? 'bg-muted' : ''
            }`}
            onClick={() => setTab('PENDING')}
          >
            Mit PENDING
          </button>
        </div>
      </CardHeader>

      <CardContent>
        {current.items.length === 0 ? (
          <div className='text-muted-foreground text-sm'>
            {current.emptyText}
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <div className='min-w-[760px]'>
              <div className='text-muted-foreground grid grid-cols-6 gap-3 border-b pb-2 text-xs font-medium'>
                <div>Case</div>
                <div>Lead</div>
                <div>Gutachter</div>
                <div>Anwalt</div>
                <div>Updated</div>
                <div className='text-right'>Aktionen</div>
              </div>

              <div className='divide-y'>
                {current.items.map((item) => (
                  <div
                    key={item.caseId}
                    className='grid grid-cols-6 gap-3 py-3 text-sm'
                  >
                    <div className='font-mono'>
                      {item.caseNumber ?? item.caseId.slice(0, 8)}
                    </div>

                    <div className='text-muted-foreground text-xs'>
                      {item.leadExternalId ?? '—'}
                    </div>

                    <div className='text-xs'>{item.gutachterStatus || '—'}</div>

                    <div className='text-xs'>{item.anwaltStatus || '—'}</div>

                    <div className='text-muted-foreground text-xs'>
                      {fmtDate(item.updatedAt)}
                    </div>

                    <div className='flex justify-end gap-3 text-xs'>
                      <Link
                        href={`/dashboard/cases/${item.caseId}`}
                        className='underline underline-offset-4'
                      >
                        Admin-Fall
                      </Link>
                      <Link
                        href={`/case/${item.token}`}
                        target='_blank'
                        className='underline underline-offset-4'
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
