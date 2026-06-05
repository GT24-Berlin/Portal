import type { CustomerJourneyData } from '../types';

export default function CustomerJourneyCard(props: {
  data: CustomerJourneyData;
}) {
  const { data } = props;

  return (
    <section
      className='lumen-card-horizon overflow-hidden rounded-lg p-6 md:p-8'
      style={{
        backgroundColor: 'var(--lumen-panel)',
        backgroundImage: 'var(--lumen-surface-panel)',
        boxShadow: 'var(--lumen-rim), var(--lumen-shadow-card)'
      }}
    >
      <div className='space-y-8'>
        <div className='grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.7fr)]'>
          {/* Current step */}
          <div
            className='rounded-md p-5 md:p-6'
            style={{
              backgroundColor: 'var(--lumen-panel-raised)',
              boxShadow: 'var(--lumen-rim)'
            }}
          >
            <div
              className='text-muted-foreground text-[10px] font-medium tracking-[0.08em] uppercase'
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Fortschritt
            </div>
            <h2
              className='text-foreground mt-3 text-[2rem] font-bold tracking-[-0.02em] md:text-[2.9rem]'
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {data.currentLabel}
            </h2>
            <p className='text-muted-foreground mt-3 max-w-2xl text-[14px] leading-6 md:text-[15px]'>
              {data.summary}
            </p>
          </div>

          {/* Progress */}
          <div
            className='rounded-md p-5'
            style={{
              backgroundColor: 'var(--lumen-panel-raised)',
              boxShadow: 'var(--lumen-rim)'
            }}
          >
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground'>Bearbeitungsstand</span>
              <span
                className='text-lg font-bold tabular-nums'
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--lumen-glow)'
                }}
              >
                {data.progressPercent}%
              </span>
            </div>

            {/* Lumen progress bar */}
            <div
              className='mt-4 h-1.5 overflow-hidden rounded-full'
              style={{
                backgroundColor: 'var(--lumen-panel)',
                boxShadow: 'var(--lumen-rim)'
              }}
            >
              <div
                className='h-full rounded-full transition-all duration-500'
                style={{
                  width: `${data.progressPercent}%`,
                  background: 'var(--lumen-glow)',
                  boxShadow: '0 0 8px rgba(207,216,230,0.4)'
                }}
              />
            </div>

            <div className='text-muted-foreground mt-4 grid gap-2 text-xs'>
              <div
                className='rounded-md px-3 py-2'
                style={{
                  backgroundColor: 'var(--lumen-panel)',
                  boxShadow: 'var(--lumen-rim)'
                }}
              >
                Aktueller Schritt: {data.currentLabel}
              </div>
              <div
                className='rounded-md px-3 py-2'
                style={{
                  backgroundColor: 'var(--lumen-panel)',
                  boxShadow: 'var(--lumen-rim)'
                }}
              >
                Nächster Schritt: {data.nextLabel ?? 'Keiner offen'}
              </div>
            </div>
          </div>
        </div>

        {/* Status chips */}
        <div className='grid gap-3 md:grid-cols-3'>
          {[
            { label: 'Kurzstatus', value: data.shortStatus },
            { label: 'Als Nächstes', value: data.nextStepHint },
            {
              label: 'Für dich wichtig',
              value:
                data.customerAction ??
                'Aktuell ist keine weitere Aktion erforderlich.'
            }
          ].map(({ label, value }) => (
            <div
              key={label}
              className='lumen-card-horizon space-y-2 rounded-md p-4'
              style={{
                backgroundColor: 'var(--lumen-panel-raised)',
                boxShadow: 'var(--lumen-rim)'
              }}
            >
              <div
                className='text-muted-foreground text-[10px] font-medium tracking-[0.08em] uppercase'
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {label}
              </div>
              <div className='text-foreground text-sm font-semibold'>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Steps */}
        {data.steps && data.steps.length > 0 && (
          <div className='grid gap-2 sm:grid-cols-2 md:grid-cols-3'>
            {data.steps.map((step, i) => (
              <div
                key={i}
                className='relative overflow-hidden rounded-md p-4'
                style={
                  step.active
                    ? {
                        background: 'var(--lumen-surface)',
                        boxShadow: 'var(--lumen-rim-strong)'
                      }
                    : {
                        backgroundColor: 'var(--lumen-panel-raised)',
                        boxShadow: 'var(--lumen-rim)',
                        opacity: step.done ? 0.55 : 1
                      }
                }
              >
                <div
                  className='text-[10px] font-medium tracking-[0.08em] uppercase'
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--lumen-muted)'
                  }}
                >
                  Schritt {i + 1}
                </div>
                <div className='text-foreground mt-1 text-sm font-semibold'>
                  {step.label}
                </div>
                {step.active && (
                  <>
                    <div
                      className='mt-1'
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        color: 'var(--lumen-glow)'
                      }}
                    >
                      ● Aktueller Schritt
                    </div>
                    <div
                      className='absolute bottom-0 left-[15%] h-px w-[70%]'
                      style={{
                        background: 'var(--lumen-horizon-glow)',
                        opacity: 1
                      }}
                    />
                  </>
                )}
                {step.done && !step.active && (
                  <div
                    className='mt-1'
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: 'var(--lumen-muted)'
                    }}
                  >
                    ✓ Abgeschlossen
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
