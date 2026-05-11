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
    <Card>
      <CardHeader className='space-y-3'>
        <CardTitle className='text-base'>{current.title}</CardTitle>

        <div className='flex flex-wrap gap-2'>
          <button
            type='button'
            className={`rounded-md border px-3 py-1.5 text-xs ${
              tab === 'PENDING' ? 'bg-muted' : ''
            }`}
            onClick={() => setTab('PENDING')}
          >
            Neue Zuweisungen
          </button>

          <button
            type='button'
            className={`rounded-md border px-3 py-1.5 text-xs ${
              tab === 'ACCEPTED' ? 'bg-muted' : ''
            }`}
            onClick={() => setTab('ACCEPTED')}
          >
            Aktive Fälle
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
            <div className='min-w-[860px]'>
              <div className='text-muted-foreground grid grid-cols-7 gap-3 border-b pb-2 text-xs font-medium'>
                <div>Case</div>
                <div>Lead</div>
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
                    className='grid grid-cols-7 gap-3 py-3 text-sm'
                  >
                    <div className='font-mono'>
                      {item.caseNumber ?? item.caseId.slice(0, 8)}
                    </div>

                    <div className='text-muted-foreground text-xs'>
                      {item.leadExternalId ?? '—'}
                    </div>

                    <div className='text-xs'>
                      <div className='font-mono'>{item.assignmentStatus}</div>
                      <div className='text-muted-foreground'>
                        {item.assignmentRole}
                      </div>
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
                        Fall öffnen
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
