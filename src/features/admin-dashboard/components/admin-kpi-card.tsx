import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { AdminKpiCard } from '../types';

export default function AdminKpiCardView(props: { item: AdminKpiCard }) {
  const { item } = props;

  return (
    <Card>
      <CardHeader className='pb-2'>
        {/* Lumen label-sm eyebrow */}
        <div
          className='text-muted-foreground text-[10px] font-medium tracking-[0.08em] uppercase'
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {item.label}
        </div>
      </CardHeader>
      <CardContent className='space-y-1 pt-0'>
        {/* Value in mono font — data unchanged */}
        <div
          className='text-foreground text-[2rem] leading-none font-bold tracking-[-0.02em] tabular-nums md:text-[2.25rem]'
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {item.value}
        </div>
        {item.hint ? (
          <p className='text-muted-foreground text-xs leading-5'>{item.hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
