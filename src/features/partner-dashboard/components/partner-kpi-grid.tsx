import type { PartnerKpiCard } from '../types';
import PartnerKpiCardView from './partner-kpi-card';

export default function PartnerKpiGrid(props: { items: PartnerKpiCard[] }) {
  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
      {props.items.map((item) => (
        <PartnerKpiCardView key={item.key} item={item} />
      ))}
    </div>
  );
}
