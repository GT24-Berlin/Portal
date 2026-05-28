'use client';

type Props = {
  valueGutachter: string;
  valueAnwalt: string;
  onChangeGutachter: (v: string) => void;
  onChangeAnwalt: (v: string) => void;
};

const OPTIONS = [
  { value: 'ALL', label: 'Alle' },
  { value: 'PENDING', label: 'PENDING' },
  { value: 'ACCEPTED', label: 'ACCEPTED' },
  { value: 'RELEASED', label: 'RELEASED' },
  { value: 'EXPIRED', label: 'EXPIRED' }
];

export default function AssignmentHeaderFilters(props: Props) {
  return (
    <div className='border-border/60 bg-background/82 rounded-[24px] border p-3.5 shadow-[var(--shadow-soft)]'>
      <div className='mb-2 flex items-center justify-between gap-2 px-1'>
        <span className='text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase'>
          Statusfilter
        </span>
        <span className='text-muted-foreground text-[11px]'>G / A</span>
      </div>
      <div className='grid grid-cols-2 gap-2'>
        <select
          className='bg-background/90 border-border/60 focus-visible:ring-primary/20 w-full rounded-2xl border px-3 py-2.5 text-xs shadow-[var(--shadow-soft)] transition-colors focus-visible:ring-2 focus-visible:outline-none'
          value={props.valueGutachter}
          onChange={(e) => props.onChangeGutachter(e.target.value)}
          title='Filter Gutachter-Assignment'
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              G: {o.label}
            </option>
          ))}
        </select>

        <select
          className='bg-background/90 border-border/60 focus-visible:ring-primary/20 w-full rounded-2xl border px-3 py-2.5 text-xs shadow-[var(--shadow-soft)] transition-colors focus-visible:ring-2 focus-visible:outline-none'
          value={props.valueAnwalt}
          onChange={(e) => props.onChangeAnwalt(e.target.value)}
          title='Filter Anwalt-Assignment'
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              A: {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
