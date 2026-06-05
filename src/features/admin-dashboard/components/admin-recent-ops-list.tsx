import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminRecentOpRow } from '../types';

export default function AdminRecentOpsList(props: {
  items: AdminRecentOpRow[];
}) {
  return (
    <Card>
      <CardHeader
        className='border-b pb-4'
        style={{ borderColor: 'var(--lumen-hairline)' }}
      >
        <CardTitle
          className='text-foreground text-base font-semibold tracking-tight'
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Letzte Operations Events
        </CardTitle>
      </CardHeader>
      <CardContent className='pt-4'>
        {props.items.length === 0 ? (
          <div
            className='text-muted-foreground rounded-md border border-dashed px-4 py-6 text-sm'
            style={{ borderColor: 'var(--lumen-hairline)' }}
          >
            Keine operativen Events vorhanden.
          </div>
        ) : (
          <div className='space-y-2'>
            {props.items.map((item) => (
              <div
                key={item.id}
                className='rounded-md p-4 text-sm transition-colors duration-[200ms]'
                style={{
                  backgroundColor: 'var(--lumen-panel-raised)',
                  boxShadow: 'var(--lumen-rim)'
                }}
              >
                <div className='flex flex-wrap items-center gap-2'>
                  {[
                    new Date(item.createdAt).toLocaleString('de-DE'),
                    item.domain,
                    item.action,
                    item.result
                  ].map((label, i) => (
                    <span
                      key={i}
                      className='text-muted-foreground inline-flex items-center rounded-full px-2.5 py-1 text-[11px]'
                      style={{
                        fontFamily: 'var(--font-mono)',
                        backgroundColor: 'var(--lumen-panel)',
                        boxShadow: 'var(--lumen-rim)'
                      }}
                    >
                      {label}
                    </span>
                  ))}
                  {item.actorType && (
                    <span
                      className='text-muted-foreground text-xs tracking-[0.08em] uppercase'
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {item.actorType}
                    </span>
                  )}
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
                      className='text-muted-foreground hover:text-foreground inline-flex items-center rounded-md px-3 py-1.5 text-xs transition-colors duration-[420ms]'
                      style={{
                        backgroundColor: 'var(--lumen-panel)',
                        boxShadow: 'var(--lumen-rim)'
                      }}
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
