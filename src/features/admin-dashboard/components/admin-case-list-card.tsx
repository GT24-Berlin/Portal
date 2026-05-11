import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminOpsCaseRow } from '../types';

function fmtDate(value: Date) {
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export default function AdminCaseListCard(props: {
  title: string;
  emptyText: string;
  items: AdminOpsCaseRow[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>{props.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {props.items.length === 0 ? (
          <div className='text-muted-foreground text-sm'>{props.emptyText}</div>
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
                {props.items.map((item) => (
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
