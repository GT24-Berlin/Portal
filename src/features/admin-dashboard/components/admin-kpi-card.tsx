import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminKpiCard } from '../types';

export default function AdminKpiCardView(props: { item: AdminKpiCard }) {
  const { item } = props;

  return (
    <Card className='border-border/60 bg-card/95 overflow-hidden shadow-sm'>
      <CardHeader className='border-border/50 bg-muted/10 border-b pb-3'>
        <div className='from-primary/35 via-primary/15 mb-2 h-1.5 w-16 rounded-full bg-gradient-to-r to-transparent' />
        <CardTitle className='text-foreground text-sm font-medium tracking-tight'>
          {item.label}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-1.5 pt-4'>
        <div className='font-heading text-foreground text-3xl font-semibold tracking-tight tabular-nums'>
          {item.value}
        </div>
        {item.hint ? (
          <p className='text-muted-foreground text-xs leading-5'>{item.hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
