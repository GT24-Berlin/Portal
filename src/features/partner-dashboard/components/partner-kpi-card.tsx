import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PartnerKpiCard } from '../types';

export default function PartnerKpiCardView(props: { item: PartnerKpiCard }) {
  const { item } = props;

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm font-medium'>{item.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-semibold tabular-nums'>{item.value}</div>
        {item.hint ? (
          <p className='text-muted-foreground mt-1 text-xs'>{item.hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
