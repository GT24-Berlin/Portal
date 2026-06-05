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
    <Card className='overflow-hidden'>
      <CardHeader
        className='space-y-3 border-b pb-4'
        style={{ borderColor: 'var(--lumen-hairline)' }}
      >
        <CardTitle
          className='text-foreground text-base font-semibold tracking-tight'
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {current.title}
        </CardTitle>

        {/* Lumen tabs */}
        <div
          className='inline-flex gap-0.5 rounded-md p-1'
          style={{
            backgroundColor: 'var(--lumen-panel-raised)',
            boxShadow: 'var(--lumen-rim)'
          }}
        >
          {(
            [
              { key: 'WITHOUT_GUTACHTER', label: 'Ohne Gutachter' },
              { key: 'WITHOUT_ANWALT', label: 'Ohne Anwalt' },
              { key: 'PENDING', label: 'Mit PENDING' }
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type='button'
              onClick={() => setTab(key)}
              className='relative overflow-hidden rounded-[5px] px-3 py-1.5 text-xs font-medium transition-[color,background,box-shadow] duration-[420ms]'
              style={
                tab === key
                  ? {
                      background: 'var(--lumen-surface)',
                      boxShadow: 'var(--lumen-rim)',
                      color: 'var(--lumen-foreground)'
                    }
                  : { color: 'var(--lumen-muted)' }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className='pt-4'>
        {current.items.length === 0 ? (
          <div
            className='text-muted-foreground rounded-md border border-dashed px-4 py-6 text-sm'
            style={{ borderColor: 'var(--lumen-hairline)' }}
          >
            {current.emptyText}
          </div>
        ) : (
          <>
            {/* ── Mobile card view ── */}
            <div className='space-y-2 pb-2 md:hidden'>
              {current.items.map((item) => (
                <div
                  key={item.caseId}
                  className='space-y-3 rounded-md p-4'
                  style={{
                    backgroundColor: 'var(--lumen-panel-raised)',
                    boxShadow: 'var(--lumen-rim)'
                  }}
                >
                  <div className='flex items-center justify-between gap-2'>
                    <span
                      className='text-foreground text-sm font-semibold'
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {item.caseNumber ?? '—'}
                    </span>
                    <span className='text-foreground max-w-[140px] truncate text-sm'>
                      {item.customerName ?? '—'}
                    </span>
                  </div>
                  <div className='grid grid-cols-2 gap-2'>
                    <div
                      className='space-y-1 rounded-md p-2.5'
                      style={{
                        backgroundColor: 'var(--lumen-panel)',
                        boxShadow: 'var(--lumen-rim)'
                      }}
                    >
                      <div
                        className='text-muted-foreground text-[10px] tracking-[0.08em] uppercase'
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        Gutachter
                      </div>
                      <div className='text-foreground/80 text-xs leading-4'>
                        {item.gutachterStatus || '—'}
                      </div>
                    </div>
                    <div
                      className='space-y-1 rounded-md p-2.5'
                      style={{
                        backgroundColor: 'var(--lumen-panel)',
                        boxShadow: 'var(--lumen-rim)'
                      }}
                    >
                      <div
                        className='text-muted-foreground text-[10px] tracking-[0.08em] uppercase'
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        Anwalt
                      </div>
                      <div className='text-foreground/80 text-xs leading-4'>
                        {item.anwaltStatus || '—'}
                      </div>
                    </div>
                  </div>
                  <div className='flex items-center justify-between gap-2'>
                    <span
                      className='text-muted-foreground text-[11px]'
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {fmtDate(item.updatedAt)}
                    </span>
                    <div className='flex gap-2'>
                      <Link
                        href={`/dashboard/cases/${item.caseId}`}
                        className='text-muted-foreground hover:text-foreground inline-flex items-center rounded-md px-2.5 py-1 text-xs transition-colors'
                        style={{
                          backgroundColor: 'var(--lumen-panel)',
                          boxShadow: 'var(--lumen-rim)'
                        }}
                      >
                        Admin ↗
                      </Link>
                      <Link
                        href={`/case/${item.token}`}
                        target='_blank'
                        className='text-muted-foreground hover:text-foreground inline-flex items-center rounded-md px-2.5 py-1 text-xs transition-colors'
                        style={{
                          backgroundColor: 'var(--lumen-panel)',
                          boxShadow: 'var(--lumen-rim)'
                        }}
                      >
                        Kunde ↗
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Desktop table view ── */}
            <div
              className='hidden w-full overflow-x-auto md:block'
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className='min-w-[760px]'>
                <div
                  className='text-muted-foreground grid grid-cols-6 gap-3 border-b px-4 py-3 text-xs font-medium tracking-[0.08em] uppercase'
                  style={{
                    borderColor: 'var(--lumen-hairline)',
                    backgroundColor: 'var(--lumen-panel-raised)',
                    fontFamily: 'var(--font-display)'
                  }}
                >
                  <div>Case</div>
                  <div>Kunde</div>
                  <div>Gutachter</div>
                  <div>Anwalt</div>
                  <div>Updated</div>
                  <div className='text-right'>Aktionen</div>
                </div>

                <div
                  className='divide-y'
                  style={{ borderColor: 'rgba(47,52,65,0.5)' }}
                >
                  {current.items.map((item) => (
                    <div
                      key={item.caseId}
                      className='grid grid-cols-6 gap-3 px-4 py-4 text-sm transition-colors duration-[200ms]'
                      style={{ ['--tw-bg-opacity' as string]: '1' }}
                      onMouseEnter={(e) =>
                        ((
                          e.currentTarget as HTMLElement
                        ).style.backgroundColor = 'var(--lumen-panel-raised)')
                      }
                      onMouseLeave={(e) =>
                        ((
                          e.currentTarget as HTMLElement
                        ).style.backgroundColor = '')
                      }
                    >
                      <div
                        className='text-foreground text-sm font-medium'
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {item.caseNumber ?? '—'}
                      </div>
                      <div className='text-foreground truncate text-sm font-medium'>
                        {item.customerName ?? '—'}
                      </div>
                      <div className='text-foreground text-sm'>
                        {item.gutachterStatus || '—'}
                      </div>
                      <div className='text-foreground text-sm'>
                        {item.anwaltStatus || '—'}
                      </div>
                      <div
                        className='text-muted-foreground text-xs'
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {fmtDate(item.updatedAt)}
                      </div>
                      <div className='flex justify-end gap-2 text-xs'>
                        <Link
                          href={`/dashboard/cases/${item.caseId}`}
                          className='text-muted-foreground hover:text-foreground inline-flex items-center rounded-md px-2.5 py-1 transition-colors duration-[420ms]'
                          style={{
                            backgroundColor: 'var(--lumen-panel-raised)',
                            boxShadow: 'var(--lumen-rim)'
                          }}
                        >
                          Admin-Fall
                        </Link>
                        <Link
                          href={`/case/${item.token}`}
                          target='_blank'
                          className='text-muted-foreground hover:text-foreground inline-flex items-center rounded-md px-2.5 py-1 transition-colors duration-[420ms]'
                          style={{
                            backgroundColor: 'var(--lumen-panel-raised)',
                            boxShadow: 'var(--lumen-rim)'
                          }}
                        >
                          Kunden-Link
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
