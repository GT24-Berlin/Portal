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
    <Card className='border-border/60 bg-background/82 overflow-hidden shadow-[var(--shadow-soft)]'>
      <CardHeader className='border-border/60 bg-muted/10 border-b'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            Statusverteilung
          </div>
          <CardTitle className='font-heading text-foreground text-base font-semibold tracking-tight'>
            Assignment-Status-Verteilung
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='space-y-4'>
          {props.items.map((item) => {
            const width = `${(item.value / max) * 100}%`;

            return (
              <div key={item.status} className='space-y-2.5'>
                <div className='flex items-center justify-between gap-3 text-sm'>
                  <span className='border-border/60 bg-background/80 rounded-full border px-2.5 py-1 font-mono text-[11px] tracking-[0.08em] shadow-sm'>
                    {item.status}
                  </span>
                  <span className='text-muted-foreground border-border/60 bg-muted/20 rounded-full border px-2.5 py-1 text-xs tabular-nums shadow-sm'>
                    {item.value}
                  </span>
                </div>

                <div className='bg-muted/70 border-border/50 h-2 w-full overflow-hidden rounded-full border shadow-inner'>
                  <div
                    className={`h-full rounded-full transition-all ${statusBarClass(
                      item.status
                    )}`}
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
