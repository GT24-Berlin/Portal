import PartnerActivityChart from './partner-activity-chart';
import PartnerAssignmentStatusChart from './partner-assignment-status-chart';
import PartnerCasesTable from './partner-cases-table';
import PartnerKpiGrid from './partner-kpi-grid';
import type { PartnerDashboardData } from '../types';

export default function PartnerDashboardView(props: {
  data: PartnerDashboardData;
}) {
  const { data } = props;

  return (
    <div className='space-y-6'>
      <PartnerKpiGrid items={data.kpis} />

      <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
        <PartnerActivityChart items={data.activityLast7d} />
        <PartnerAssignmentStatusChart items={data.assignmentStatus} />
      </div>

      <PartnerCasesTable
        pendingCases={data.pendingCases}
        acceptedCases={data.acceptedCases}
      />
    </div>
  );
}
