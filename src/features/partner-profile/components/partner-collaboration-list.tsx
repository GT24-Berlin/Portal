import Link from 'next/link';
import type { PartnerCollaborationData } from '../types';

function fmtDate(value: Date) {
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === 'ACCEPTED') {
    return 'border-green-200 bg-green-50 text-green-700';
  }

  if (status === 'PENDING') {
    return 'border-yellow-200 bg-yellow-50 text-yellow-700';
  }

  if (status === 'RELEASED' || status === 'EXPIRED') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  return 'border-muted bg-muted text-foreground';
}

export default function PartnerCollaborationList(props: {
  data: PartnerCollaborationData;
}) {
  const { data } = props;

  return (
    <div className='space-y-4 rounded-lg border p-6'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <div className='text-sm font-medium'>Fallpartner</div>
          <div className='text-muted-foreground text-xs'>
            Übersicht über die Gegenpartei in deinen aktuell zugeordneten Fällen
          </div>
        </div>

        <div className='text-muted-foreground text-xs'>
          Fälle: <span className='font-mono'>{data.items.length}</span>
        </div>
      </div>

      {data.items.length === 0 ? (
        <div className='text-muted-foreground rounded-md border p-4 text-sm'>
          Aktuell sind keine Fallpartner-Daten verfügbar.
        </div>
      ) : (
        <div className='overflow-x-auto'>
          <div className='min-w-[1080px]'>
            <div className='text-muted-foreground grid grid-cols-8 gap-3 border-b pb-2 text-xs font-medium'>
              <div>Case</div>
              <div>Gegenpart-Rolle</div>
              <div>Gegenpart</div>
              <div>Eigener Status</div>
              <div>Gutachter</div>
              <div>Anwalt</div>
              <div>Updated</div>
              <div className='text-right'>Aktion</div>
            </div>

            <div className='divide-y'>
              {data.items.map((item) => (
                <div
                  key={item.caseId}
                  className='grid grid-cols-8 gap-3 py-3 text-sm'
                >
                  <div className='min-w-0'>
                    <div className='font-mono'>
                      {item.caseNumber ?? item.caseId.slice(0, 8)}
                    </div>
                    <div className='text-muted-foreground mt-1 text-xs'>
                      {item.caseId.slice(0, 12)}
                    </div>
                  </div>

                  <div className='text-xs font-medium'>
                    {item.counterpartRole}
                  </div>

                  <div className='min-w-0 space-y-1 text-xs'>
                    <div className='truncate font-medium'>
                      {item.counterpartName ??
                        item.counterpartClerkUserId ??
                        '—'}
                    </div>
                    <div className='text-muted-foreground truncate'>
                      {item.counterpartEmail ?? '—'}
                    </div>
                    <div className='text-muted-foreground truncate font-mono'>
                      {item.counterpartClerkUserId ?? '—'}
                    </div>
                  </div>

                  <div className='text-xs'>
                    <span
                      className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${statusClass(
                        item.ownAssignmentStatus || ''
                      )}`}
                    >
                      {item.ownAssignmentStatus || '—'}
                    </span>
                  </div>

                  <div className='text-xs'>{item.gutachterStatus || '—'}</div>

                  <div className='text-xs'>{item.anwaltStatus || '—'}</div>

                  <div className='text-muted-foreground text-xs'>
                    {fmtDate(item.updatedAt)}
                  </div>

                  <div className='flex justify-end text-xs'>
                    <Link
                      href={`/dashboard/cases/${item.caseId}`}
                      className='underline underline-offset-4'
                    >
                      Fall öffnen
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
