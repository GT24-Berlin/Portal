type OperationLogItem = {
  id: string;
  createdAt: Date | string;
  domain: string;
  action: string;
  result: string;
  actorType: string | null;
  actorId: string | null;
  message: string | null;
};

function fmtDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function CaseOperationsLogAccordion(props: {
  items: OperationLogItem[];
}) {
  const { items } = props;

  return (
    <details className='rounded-2xl border bg-white p-6 shadow-sm'>
      <summary className='flex cursor-pointer list-none items-center justify-between gap-4'>
        <div>
          <h2 className='text-lg font-semibold'>Operations Log</h2>
          <p className='text-sm text-neutral-600'>
            {items.length} Eintrag{items.length === 1 ? '' : 'e'}
          </p>
        </div>

        <span className='rounded-md border px-3 py-1.5 text-xs text-neutral-700'>
          Aufklappen
        </span>
      </summary>

      <div className='mt-5 space-y-3'>
        {items.length === 0 ? (
          <div className='rounded-xl border p-4 text-sm text-neutral-600'>
            Noch keine Einträge vorhanden.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className='rounded-xl border border-black/5 bg-neutral-50 p-4'
            >
              <div className='flex flex-wrap items-center gap-2 text-xs text-neutral-500'>
                <span>{fmtDate(item.createdAt)}</span>
                <span>·</span>
                <span>{item.domain}</span>
                <span>·</span>
                <span>{item.action}</span>
                <span>·</span>
                <span>{item.result}</span>
              </div>

              <div className='mt-2 text-sm font-medium text-neutral-900'>
                {item.message}
              </div>

              <div className='mt-1 text-xs text-neutral-500'>
                {item.actorType}
                {item.actorId ? ` · ${item.actorId}` : ''}
              </div>
            </div>
          ))
        )}
      </div>
    </details>
  );
}
