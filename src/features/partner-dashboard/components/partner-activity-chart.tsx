import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PartnerActivityDayItem } from '../types';

export default function PartnerActivityChart(props: {
  items: PartnerActivityDayItem[];
}) {
  const max = Math.max(
    ...props.items.flatMap((x) => [x.uploads, x.caseEvents]),
    1
  );

  return (
    <Card className='border-border/60 bg-background/82 overflow-hidden shadow-[var(--shadow-soft)]'>
      <CardHeader className='border-border/60 bg-muted/10 border-b'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            Operationsrhythmus
          </div>
          <CardTitle className='font-heading text-foreground text-base font-semibold tracking-tight'>
            Aktivität letzte 7 Tage
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='space-y-4'>
          {props.items.map((item) => (
            <div
              key={item.dateLabel}
              className='border-border/60 bg-background/82 space-y-3 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'
            >
              <div className='flex items-center justify-between gap-3'>
                <div className='text-foreground text-sm font-medium'>
                  {item.dateLabel}
                </div>
                <div className='text-muted-foreground text-xs tracking-[0.12em] uppercase'>
                  7 Tage
                </div>
              </div>

              <div className='space-y-1.5'>
                <div className='flex items-center justify-between text-xs'>
                  <span>Uploads</span>
                  <span className='text-muted-foreground tabular-nums'>
                    {item.uploads}
                  </span>
                </div>
                <div className='bg-muted/70 border-border/50 h-2 rounded-full border shadow-inner'>
                  <div
                    className='bg-primary/80 h-full rounded-full'
                    style={{ width: `${(item.uploads / max) * 100}%` }}
                  />
                </div>
              </div>

              <div className='space-y-1.5'>
                <div className='flex items-center justify-between text-xs'>
                  <span>Case-Events</span>
                  <span className='text-muted-foreground tabular-nums'>
                    {item.caseEvents}
                  </span>
                </div>
                <div className='bg-muted/70 border-border/50 h-2 rounded-full border shadow-inner'>
                  <div
                    className='bg-foreground/50 h-full rounded-full'
                    style={{ width: `${(item.caseEvents / max) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
