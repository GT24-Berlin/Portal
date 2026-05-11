import type { AdminKpiCard } from '../types';
import AdminKpiCardView from './admin-kpi-card';

export default function AdminKpiGrid(props: { items: AdminKpiCard[] }) {
  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
      {props.items.map((item) => (
        <AdminKpiCardView key={item.key} item={item} />
      ))}
    </div>
  );
}
