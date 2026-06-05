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
      {/* ── Horizon Panel — signature hero element ── */}
      <div className='lumen-horizon-panel flex flex-wrap items-center justify-between gap-4 p-6 md:p-8'>
        <div className='space-y-2'>
          <p
            className='text-muted-foreground text-[10px] font-medium tracking-[0.08em] uppercase'
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Admin Dashboard
          </p>
          <h1
            className='text-foreground text-3xl font-bold tracking-[-0.02em] md:text-4xl'
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Operative Steuerzentrale
          </h1>
          <p className='text-muted-foreground max-w-3xl text-sm leading-6 md:text-[15px]'>
            Fälle, Zuweisungen, Events und aktuelle Auslastung in einer klaren
            Management-Übersicht.
          </p>
        </div>
        {/* Live status dot */}
        <div
          className='text-muted-foreground flex items-center gap-2 text-xs'
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <div
            className='h-2 w-2 rounded-full'
            style={{
              backgroundColor: 'var(--lumen-glow)',
              boxShadow: '0 0 10px rgba(207,216,230,0.6)'
            }}
          />
          SYSTEM ONLINE
        </div>
      </div>

      {/* ── KPI meta panel ── */}
      <div
        className='lumen-card-horizon grid grid-cols-1 gap-4 rounded-lg p-5 md:grid-cols-3 md:p-6'
        style={{
          backgroundColor: 'var(--lumen-panel)',
          backgroundImage: 'var(--lumen-surface-panel)',
          boxShadow: 'var(--lumen-rim), var(--lumen-shadow-card)'
        }}
      >
        <div className='space-y-1'>
          <div
            className='text-muted-foreground text-[10px] font-medium tracking-[0.08em] uppercase'
            style={{ fontFamily: 'var(--font-display)' }}
          >
            KPI Layer
          </div>
          <div className='text-foreground text-sm font-medium'>
            Kompakte Betriebskennzahlen
          </div>
        </div>
        <div className='space-y-1'>
          <div
            className='text-muted-foreground text-[10px] font-medium tracking-[0.08em] uppercase'
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Fokus
          </div>
          <div className='text-foreground text-sm font-medium'>
            Zuweisungen, Auslastung und offene Vorgänge
          </div>
        </div>
        <div className='space-y-1'>
          <div
            className='text-muted-foreground text-[10px] font-medium tracking-[0.08em] uppercase'
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Modus
          </div>
          <div className='text-foreground text-sm font-medium'>
            Operative Gesamtübersicht
          </div>
        </div>
      </div>

      {/* ── KPI Grid — data unchanged ── */}
      <AdminKpiGrid items={data.kpis} />

      {/* ── Charts — data unchanged ── */}
      <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
        <AdminAssignmentStatusChart items={data.assignmentStatus} />
        <AdminActivityChart items={data.activityLast7d} />
      </div>

      {/* ── Ops Table — data unchanged ── */}
      <AdminOpsTable
        withoutGutachter={data.withoutGutachter}
        withoutAnwalt={data.withoutAnwalt}
        pendingCases={data.pendingCases}
      />

      {/* ── Recent Ops — data unchanged ── */}
      <AdminRecentOpsList items={data.recentOps} />
    </div>
  );
}
