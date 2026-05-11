import type { CustomerJourneyData } from '../types';

export default function CustomerJourneyCard(props: {
  data: CustomerJourneyData;
}) {
  const { data } = props;

  return (
    <section className='rounded-[30px] border border-black/5 bg-white p-6 shadow-sm md:p-8'>
      <div className='space-y-8'>
        <div className='flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between'>
          <div className='max-w-3xl'>
            <div className='text-[11px] font-semibold tracking-[0.18em] text-neutral-500 uppercase'>
              Fortschritt
            </div>

            <h2 className='mt-3 text-2xl font-semibold tracking-tight text-neutral-950 md:text-4xl'>
              {data.currentLabel}
            </h2>

            <p className='mt-3 max-w-2xl text-sm leading-6 text-neutral-600 md:text-[15px]'>
              {data.summary}
            </p>
          </div>

          <div className='w-full max-w-xs shrink-0'>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-neutral-500'>Bearbeitungsstand</span>
              <span className='font-semibold text-neutral-950'>
                {data.progressPercent}%
              </span>
            </div>

            <div className='mt-3 h-2.5 overflow-hidden rounded-full bg-neutral-200'>
              <div
                className='h-full rounded-full bg-neutral-950 transition-all duration-500'
                style={{ width: `${data.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className='grid gap-3 md:grid-cols-3'>
          <div className='rounded-2xl bg-neutral-50 p-4'>
            <div className='text-[11px] font-semibold tracking-[0.14em] text-neutral-500 uppercase'>
              Kurzstatus
            </div>
            <div className='mt-2 text-sm font-semibold text-neutral-950'>
              {data.shortStatus}
            </div>
          </div>

          <div className='rounded-2xl bg-neutral-50 p-4'>
            <div className='text-[11px] font-semibold tracking-[0.14em] text-neutral-500 uppercase'>
              Als Nächstes
            </div>
            <div className='mt-2 text-sm font-semibold text-neutral-950'>
              {data.nextStepHint}
            </div>
          </div>

          <div className='rounded-2xl bg-neutral-50 p-4'>
            <div className='text-[11px] font-semibold tracking-[0.14em] text-neutral-500 uppercase'>
              Für dich wichtig
            </div>
            <div className='mt-2 text-sm font-semibold text-neutral-950'>
              {data.customerAction ??
                'Aktuell ist keine weitere Aktion erforderlich.'}
            </div>
          </div>
        </div>

        <div className='space-y-4'>
          <div className='text-[11px] font-semibold tracking-[0.14em] text-neutral-500 uppercase'>
            Customer Journey
          </div>

          <div className='flex flex-wrap gap-3'>
            {data.steps.map((step, index) => (
              <div
                key={step.key}
                className={`min-w-[220px] flex-1 rounded-3xl border p-4 transition-colors ${
                  step.active
                    ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm'
                    : step.done
                      ? 'border-neutral-200 bg-neutral-50 text-neutral-900'
                      : 'border-neutral-200 bg-white text-neutral-400'
                }`}
              >
                <div className='flex items-start gap-3'>
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      step.active
                        ? 'bg-white text-neutral-950'
                        : step.done
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-200 text-neutral-500'
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
                          ? 'text-white/70'
                          : step.done
                            ? 'text-neutral-500'
                            : 'text-neutral-400'
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
