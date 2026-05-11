import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminRecentOpRow } from '../types';

export default function AdminRecentOpsList(props: {
  items: AdminRecentOpRow[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Letzte Operations Events</CardTitle>
      </CardHeader>
      <CardContent>
        {props.items.length === 0 ? (
          <div className='text-muted-foreground text-sm'>
            Keine operativen Events vorhanden.
          </div>
        ) : (
          <div className='space-y-3'>
            {props.items.map((item) => (
              <div key={item.id} className='rounded-md border p-3 text-sm'>
                <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
                  <span className='font-mono text-xs'>
                    {new Date(item.createdAt).toLocaleString('de-DE')}
                  </span>
                  <span className='font-mono text-xs'>{item.domain}</span>
                  <span className='font-mono text-xs'>{item.action}</span>
                  <span className='font-mono text-xs'>{item.result}</span>
                  <span className='text-muted-foreground text-xs'>
                    {item.actorType ?? '—'}
                  </span>
                </div>

                {item.message ? (
                  <div className='mt-2'>{item.message}</div>
                ) : null}

                {item.caseId ? (
                  <div className='mt-2'>
                    <Link
                      href={`/dashboard/cases/${item.caseId}`}
                      className='text-xs underline underline-offset-4'
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
