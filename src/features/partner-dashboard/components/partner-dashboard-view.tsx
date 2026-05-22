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
    <div className='space-y-8'>
      <div className='bg-card/95 border-border/60 space-y-4 rounded-[28px] border p-6 shadow-sm md:p-8'>
        <div className='space-y-2'>
          <p className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            Partner Dashboard
          </p>
          <h1 className='font-heading text-foreground text-3xl font-semibold tracking-tight md:text-4xl'>
            Operativer Überblick
          </h1>
          <p className='text-muted-foreground max-w-3xl text-sm leading-6 md:text-[15px]'>
            Die wichtigsten Kennzahlen, Bearbeitungsstände und aktiven Fälle
            kompakt zusammengeführt.
          </p>
        </div>
      </div>

      <div className='border-border/60 bg-card/95 grid grid-cols-1 gap-4 rounded-[28px] border p-5 shadow-sm md:grid-cols-3 md:p-6'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            KPI Layer
          </div>
          <div className='text-foreground text-sm font-medium'>
            Kompakte Partner-Kennzahlen
          </div>
        </div>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            Fokus
          </div>
          <div className='text-foreground text-sm font-medium'>
            Offene Zuweisungen und Bearbeitungsstände
          </div>
        </div>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            Modus
          </div>
          <div className='text-foreground text-sm font-medium'>
            Operativer Fallüberblick
          </div>
        </div>
      </div>

      <PartnerKpiGrid items={data.kpis} />

      <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
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
