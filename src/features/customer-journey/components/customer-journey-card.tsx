import type { CustomerJourneyData } from '../types';

export default function CustomerJourneyCard(props: {
  data: CustomerJourneyData;
}) {
  const { data } = props;

  return (
    <section className='border-border/60 bg-background/78 overflow-hidden rounded-[32px] border p-6 shadow-[var(--shadow-glass)] backdrop-blur-xl md:p-8'>
      <div className='space-y-9'>
        <div className='grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.7fr)]'>
          <div className='border-border/60 bg-background/82 rounded-[28px] border p-5 shadow-sm md:p-6'>
            <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.2em] uppercase'>
              Fortschritt
            </div>

            <h2 className='font-heading text-foreground mt-3 text-[2rem] font-semibold tracking-tight md:text-[2.9rem]'>
              {data.currentLabel}
            </h2>

            <p className='text-muted-foreground mt-3 max-w-2xl text-[14px] leading-6 md:text-[15px]'>
              {data.summary}
            </p>
          </div>

          <div className='border-border/60 bg-background/82 rounded-[28px] border p-5 shadow-sm'>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground'>Bearbeitungsstand</span>
              <span className='font-heading text-foreground text-lg font-semibold tabular-nums'>
                {data.progressPercent}%
              </span>
            </div>

            <div className='bg-muted/70 mt-4 h-2.5 overflow-hidden rounded-full shadow-inner'>
              <div
                className='bg-primary h-full rounded-full transition-all duration-500'
                style={{ width: `${data.progressPercent}%` }}
              />
            </div>

            <div className='text-muted-foreground mt-4 grid gap-2 text-xs'>
              <div className='border-border/60 bg-background/82 rounded-2xl border px-3 py-2 shadow-sm'>
                Aktueller Schritt: {data.currentLabel}
              </div>
              <div className='border-border/60 bg-background/82 rounded-2xl border px-3 py-2 shadow-sm'>
                Nächster Schritt: {data.nextLabel ?? 'Keiner offen'}
              </div>
            </div>
          </div>
        </div>

        <div className='grid gap-3 md:grid-cols-3'>
          <div className='border-border/60 bg-background/82 rounded-[24px] border p-4 shadow-sm'>
            <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase'>
              Kurzstatus
            </div>
            <div className='text-foreground mt-2 text-sm font-semibold'>
              {data.shortStatus}
            </div>
          </div>

          <div className='border-border/60 bg-background/82 rounded-[24px] border p-4 shadow-sm'>
            <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase'>
              Als Nächstes
            </div>
            <div className='text-foreground mt-2 text-sm font-semibold'>
              {data.nextStepHint}
            </div>
          </div>

          <div className='border-border/60 bg-background/82 rounded-[24px] border p-4 shadow-sm'>
            <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase'>
              Für dich wichtig
            </div>
            <div className='text-foreground mt-2 text-sm font-semibold'>
              {data.customerAction ??
                'Aktuell ist keine weitere Aktion erforderlich.'}
            </div>
          </div>
        </div>

        <div className='space-y-4'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase'>
            Fallfortschritt
          </div>

          <div className='grid gap-4 xl:grid-cols-3'>
            {data.steps.map((step, index) => (
              <div
                key={step.key}
                className={`rounded-[28px] border p-4 shadow-sm transition-colors ${
                  step.active
                    ? 'border-foreground bg-foreground text-background'
                    : step.done
                      ? 'border-border/60 bg-muted/10 text-foreground'
                      : 'border-border/60 bg-background text-muted-foreground'
                }`}
              >
                <div className='flex items-start gap-3'>
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      step.active
                        ? 'bg-background text-foreground'
                        : step.done
                          ? 'bg-foreground text-background'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index + 1}
                  </div>

                  <div className='space-y-1'>
                    <div className='text-sm leading-5 font-medium'>
                      {step.label}
                    </div>
                    <div
                      className={`text-xs ${
                        step.active
                          ? 'text-background/70'
                          : step.done
                            ? 'text-muted-foreground'
                            : 'text-muted-foreground/70'
                      }`}
                    >
                      {step.active
                        ? 'Aktueller Schritt'
                        : step.done
                          ? 'Abgeschlossen'
                          : 'Ausstehend'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
