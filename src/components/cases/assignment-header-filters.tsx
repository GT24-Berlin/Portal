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
    <div className='grid grid-cols-2 gap-2'>
      <select
        className='bg-background w-full rounded-md border px-2 py-1 text-xs'
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
        className='bg-background w-full rounded-md border px-2 py-1 text-xs'
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
  );
}
