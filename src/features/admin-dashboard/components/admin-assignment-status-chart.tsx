import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminAssignmentStatusItem } from '../types';

function statusBarClass(status: string) {
  if (status === 'ACCEPTED') return 'bg-primary/85';
  if (status === 'PENDING') return 'bg-amber-400/80';
  if (status === 'RELEASED') return 'bg-emerald-400/80';
  if (status === 'EXPIRED') return 'bg-destructive/75';
  return 'bg-foreground/70';
}

export default function AdminAssignmentStatusChart(props: {
  items: AdminAssignmentStatusItem[];
}) {
  const max = Math.max(...props.items.map((x) => x.value), 1);

  return (
    <Card>
      <CardHeader
        className='border-b pb-4'
        style={{ borderColor: 'var(--lumen-hairline)' }}
      >
        <div className='space-y-1'>
          <div
            className='text-muted-foreground text-[10px] font-medium tracking-[0.08em] uppercase'
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Statusverteilung
          </div>
          <CardTitle
            className='text-foreground text-base font-semibold tracking-tight'
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Assignment-Status-Verteilung
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className='space-y-4 pt-4'>
        <div className='space-y-4'>
          {props.items.map((item) => {
            const width = `${(item.value / max) * 100}%`;

            return (
              <div key={item.status} className='space-y-2'>
                <div className='flex items-center justify-between gap-3'>
                  <span
                    className='text-muted-foreground inline-flex items-center rounded-full px-2.5 py-1 text-[11px]'
                    style={{
                      fontFamily: 'var(--font-mono)',
                      backgroundColor: 'var(--lumen-panel-raised)',
                      boxShadow: 'var(--lumen-rim)'
                    }}
                  >
                    {item.status}
                  </span>
                  <span
                    className='text-muted-foreground text-xs tabular-nums'
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {item.value}
                  </span>
                </div>

                <div
                  className='h-1.5 w-full overflow-hidden rounded-full'
                  style={{
                    backgroundColor: 'var(--lumen-panel-raised)',
                    boxShadow: 'var(--lumen-rim)'
                  }}
                >
                  <div
                    className={`h-full rounded-full transition-all ${statusBarClass(item.status)}`}
                    style={{ width }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
