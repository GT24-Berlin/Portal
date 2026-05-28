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
    <details className='border-border/60 bg-background/82 overflow-hidden rounded-[28px] border p-6 shadow-sm'>
      <summary className='border-border/60 flex cursor-pointer list-none items-center justify-between gap-4 border-b pb-4'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            Audit Trail
          </div>
          <h2 className='font-heading text-foreground text-lg font-semibold tracking-tight'>
            Operations Log
          </h2>
          <p className='text-muted-foreground text-sm'>
            {items.length} Eintrag{items.length === 1 ? '' : 'e'}
          </p>
        </div>

        <span className='border-border/60 bg-background/85 text-foreground rounded-full border px-3 py-1.5 text-xs shadow-sm'>
          Aufklappen
        </span>
      </summary>

      <div className='mt-5 space-y-3'>
        {items.length === 0 ? (
          <div className='border-border/60 bg-background/82 text-muted-foreground rounded-[24px] border border-dashed p-4 text-sm shadow-sm'>
            Noch keine Einträge vorhanden.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className='border-border/60 bg-background/84 hover:bg-muted/20 rounded-[24px] border p-4 shadow-sm transition-colors'
            >
              <div className='text-muted-foreground flex flex-wrap items-center gap-2 text-xs'>
                <span className='border-border/60 bg-background/90 rounded-full border px-2.5 py-1 font-mono shadow-sm'>
                  {fmtDate(item.createdAt)}
                </span>
                <span className='border-border/60 bg-background/90 rounded-full border px-2.5 py-1 font-mono shadow-sm'>
                  {item.domain}
                </span>
                <span className='border-border/60 bg-background/90 rounded-full border px-2.5 py-1 font-mono shadow-sm'>
                  {item.action}
                </span>
                <span className='border-border/60 bg-background/90 rounded-full border px-2.5 py-1 font-mono shadow-sm'>
                  {item.result}
                </span>
              </div>

              <div className='text-foreground mt-3 text-sm font-medium'>
                {item.message}
              </div>

              <div className='text-muted-foreground mt-2 text-xs'>
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
