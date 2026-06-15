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
      {/* Horizon Panel */}
      <div className='lumen-horizon-panel flex flex-wrap items-center justify-between gap-4 p-4 md:p-8'>
        <div className='min-w-0 flex-1 space-y-2'>
          <p
            className='text-muted-foreground text-[10px] font-medium tracking-[0.08em] uppercase'
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Partner Dashboard
          </p>
          <h1
            className='text-foreground text-3xl font-bold tracking-[-0.02em] md:text-4xl'
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Operativer Überblick
          </h1>
          <p className='text-muted-foreground max-w-3xl text-sm leading-6 md:text-[15px]'>
            Die wichtigsten Kennzahlen, Bearbeitungsstände und aktiven Fälle
            kompakt zusammengeführt.
          </p>
        </div>
        <div
          className='text-muted-foreground hidden shrink-0 items-center gap-2 text-xs sm:flex'
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

      {/* Meta panel */}
      <div
        className='lumen-card-horizon grid grid-cols-1 gap-4 rounded-lg p-5 md:grid-cols-3 md:p-6'
        style={{
          backgroundColor: 'var(--lumen-panel)',
          backgroundImage: 'var(--lumen-surface-panel)',
          boxShadow: 'var(--lumen-rim), var(--lumen-shadow-card)'
        }}
      >
        {[
          { label: 'KPI Layer', value: 'Kompakte Partner-Kennzahlen' },
          {
            label: 'Fokus',
            value: 'Offene Zuweisungen und Bearbeitungsstände'
          },
          { label: 'Modus', value: 'Operativer Fallüberblick' }
        ].map(({ label, value }) => (
          <div key={label} className='space-y-1'>
            <div
              className='text-muted-foreground text-[10px] font-medium tracking-[0.08em] uppercase'
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {label}
            </div>
            <div className='text-foreground text-sm font-medium'>{value}</div>
          </div>
        ))}
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
