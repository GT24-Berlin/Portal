import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminActivityDayItem } from '../types';

export default function AdminActivityChart(props: {
  items: AdminActivityDayItem[];
}) {
  const max = Math.max(
    ...props.items.flatMap((x) => [
      x.uploads,
      x.otpIssues,
      x.operationalEvents
    ]),
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
                  <span>OTP-Probleme</span>
                  <span className='text-muted-foreground'>
                    {item.otpIssues}
                  </span>
                </div>
                <div className='bg-muted h-2 rounded-full'>
                  <div
                    className='bg-foreground h-full rounded-full opacity-70'
                    style={{ width: `${(item.otpIssues / max) * 100}%` }}
                  />
                </div>
              </div>

              <div className='space-y-1'>
                <div className='flex items-center justify-between text-xs'>
                  <span>Ops Events</span>
                  <span className='text-muted-foreground'>
                    {item.operationalEvents}
                  </span>
                </div>
                <div className='bg-muted h-2 rounded-full'>
                  <div
                    className='bg-foreground h-full rounded-full opacity-40'
                    style={{
                      width: `${(item.operationalEvents / max) * 100}%`
                    }}
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
