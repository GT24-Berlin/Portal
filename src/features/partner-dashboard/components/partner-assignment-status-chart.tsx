import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PartnerAssignmentStatusItem } from '../types';

export default function PartnerAssignmentStatusChart(props: {
  items: PartnerAssignmentStatusItem[];
}) {
  const max = Math.max(...props.items.map((x) => x.value), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Status-Verteilung</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {props.items.map((item) => {
            const width = `${(item.value / max) * 100}%`;

            return (
              <div key={item.status} className='space-y-1'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='font-mono text-xs'>{item.status}</span>
                  <span className='text-muted-foreground text-xs'>
                    {item.value}
                  </span>
                </div>

                <div className='bg-muted h-2 w-full overflow-hidden rounded-full'>
                  <div
                    className='bg-foreground h-full rounded-full'
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
