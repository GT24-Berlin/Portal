import AdminKpiGrid from './admin-kpi-grid';
import AdminRecentOpsList from './admin-recent-ops-list';
import AdminOpsTable from './admin-ops-table';
import AdminAssignmentStatusChart from './admin-assignment-status-chart';
import AdminActivityChart from './admin-activity-chart';
import type { AdminDashboardData } from '../types';

export default function AdminDashboardView(props: {
  data: AdminDashboardData;
}) {
  const { data } = props;

  return (
    <div className='space-y-6'>
      <AdminKpiGrid items={data.kpis} />

      <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
        <AdminAssignmentStatusChart items={data.assignmentStatus} />
        <AdminActivityChart items={data.activityLast7d} />
      </div>

      <AdminOpsTable
        withoutGutachter={data.withoutGutachter}
        withoutAnwalt={data.withoutAnwalt}
        pendingCases={data.pendingCases}
      />

      <AdminRecentOpsList items={data.recentOps} />
    </div>
  );
}
