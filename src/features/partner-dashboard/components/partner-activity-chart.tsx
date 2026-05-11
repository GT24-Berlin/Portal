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
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Aktivität letzte 7 Tage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {props.items.map((item) => (
            <div key={item.dateLabel} className='space-y-2'>
              <div className='text-xs font-medium'>{item.dateLabel}</div>

              <div className='space-y-1'>
                <div className='flex items-center justify-between text-xs'>
                  <span>Uploads</span>
                  <span className='text-muted-foreground'>{item.uploads}</span>
                </div>
                <div className='bg-muted h-2 rounded-full'>
                  <div
                    className='bg-foreground h-full rounded-full'
                    style={{ width: `${(item.uploads / max) * 100}%` }}
                  />
                </div>
              </div>

              <div className='space-y-1'>
                <div className='flex items-center justify-between text-xs'>
                  <span>Case-Events</span>
                  <span className='text-muted-foreground'>
                    {item.caseEvents}
                  </span>
                </div>
                <div className='bg-muted h-2 rounded-full'>
                  <div
                    className='bg-foreground h-full rounded-full opacity-60'
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
