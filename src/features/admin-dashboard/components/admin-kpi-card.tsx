import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminKpiCard } from '../types';

export default function AdminKpiCardView(props: { item: AdminKpiCard }) {
  const { item } = props;

  return (
    <Card className='border-border/60 bg-background/82 overflow-hidden shadow-[var(--shadow-soft)]'>
      <CardHeader className='border-border/50 bg-muted/10 border-b pb-3'>
        <div className='from-primary/30 via-primary/10 mb-2 h-1.5 w-16 rounded-full bg-gradient-to-r to-transparent' />
        <CardTitle className='text-foreground text-sm font-semibold tracking-tight'>
          {item.label}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-1.5 pt-4'>
        <div className='font-heading text-foreground text-[2rem] font-semibold tracking-tight tabular-nums md:text-[2.25rem]'>
          {item.value}
        </div>
        {item.hint ? (
          <p className='text-muted-foreground text-xs leading-5'>{item.hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
