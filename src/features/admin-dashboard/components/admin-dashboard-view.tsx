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
    <div className='space-y-8'>
      <div className='border-border/60 bg-background/78 space-y-4 rounded-[32px] border p-6 shadow-[var(--shadow-glass)] backdrop-blur-xl md:p-8'>
        <div className='space-y-2'>
          <p className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            Admin Dashboard
          </p>
          <h1 className='font-heading text-foreground text-3xl font-semibold tracking-tight md:text-4xl'>
            Operative Steuerzentrale
          </h1>
          <p className='text-muted-foreground max-w-3xl text-sm leading-6 md:text-[15px]'>
            Fälle, Zuweisungen, Events und aktuelle Auslastung in einer klaren
            Management-Übersicht.
          </p>
        </div>
      </div>

      <div className='border-border/60 bg-background/78 grid grid-cols-1 gap-4 rounded-[32px] border p-5 shadow-[var(--shadow-glass)] backdrop-blur-xl md:grid-cols-3 md:p-6'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            KPI Layer
          </div>
          <div className='text-foreground text-sm font-medium'>
            Kompakte Betriebskennzahlen
          </div>
        </div>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            Fokus
          </div>
          <div className='text-foreground text-sm font-medium'>
            Zuweisungen, Auslastung und offene Vorgänge
          </div>
        </div>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            Modus
          </div>
          <div className='text-foreground text-sm font-medium'>
            Operative Gesamtübersicht
          </div>
        </div>
      </div>

      <AdminKpiGrid items={data.kpis} />

      <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
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
