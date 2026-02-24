import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type TimelineStep = { label: string; done: boolean; date?: string };

const GUTACHTER_FLOW = [
  { key: 'EINGEGANGEN', label: 'Eingegangen' },
  { key: 'DATEN_UNVOLLSTAENDIG', label: 'Daten unvollständig' },
  { key: 'GUTACHTER_KONTAKTIERT', label: 'Gutachter kontaktiert' },
  { key: 'TERMIN_GEPLANT', label: 'Termin geplant' },
  { key: 'GUTACHTEN_IN_BEARBEITUNG', label: 'Gutachten in Bearbeitung' },
  { key: 'GUTACHTEN_ERSTELLT', label: 'Gutachten erstellt' },
  { key: 'ABGESCHLOSSEN', label: 'Abgeschlossen' }
] as const;

const ANWALT_FLOW = [
  { key: 'FALL_EINGEGANGEN', label: 'Fall eingegangen' },
  { key: 'FALL_IN_PRUEFUNG', label: 'Fall in Prüfung' },
  { key: 'RUECKFRAGEN_IN_KLAERUNG', label: 'Rückfragen in Klärung' },
  { key: 'FALL_BERICHT_ERSTELLT', label: 'Fall Bericht erstellt' },
  { key: 'FALL_ABGESCHLOSSEN', label: 'Fall inkl. Einschätzung abgeschlossen' }
] as const;

function fmt(dt?: Date | null) {
  if (!dt) return '';
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dt);
}

function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className='space-y-3'>
      {steps.map((step, idx) => (
        <li key={idx} className='flex items-start gap-3'>
          <div
            className={`mt-1 h-3 w-3 rounded-full border ${
              step.done ? 'bg-foreground' : 'bg-background'
            }`}
          />
          <div className='flex-1'>
            <div className='flex items-center justify-between gap-3'>
              <p
                className={step.done ? 'font-medium' : 'text-muted-foreground'}
              >
                {step.label}
              </p>
              <p className='text-muted-foreground text-sm'>{step.date ?? ''}</p>
            </div>
            {idx < steps.length - 1 && (
              <div className='bg-border mt-3 ml-[5px] h-6 w-px' />
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function buildTimeline(
  flow: readonly { key: string; label: string }[],
  currentKey: string,
  events: { lane: 'GUTACHTER' | 'ANWALT'; status: string; occurredAt: Date }[],
  lane: 'GUTACHTER' | 'ANWALT'
): TimelineStep[] {
  const idxCurrent = Math.max(
    0,
    flow.findIndex((s) => s.key === currentKey)
  );

  const eventMap = new Map<string, Date>();
  for (const e of events) {
    if (e.lane !== lane) continue;
    if (!eventMap.has(e.status)) eventMap.set(e.status, e.occurredAt);
  }

  return flow.map((s, idx) => ({
    label: s.label,
    done: idx <= idxCurrent,
    date: fmt(eventMap.get(s.key) ?? null)
  }));
}

export default async function CaseTokenPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  // ✅ Next 16: params ist Promise → MUSS awaited werden
  const { token } = await params;

  if (!token) notFound();

  const found = await prisma.case.findUnique({
    where: { token },
    include: {
      events: {
        orderBy: { occurredAt: 'asc' }
      }
    }
  });

  if (!found) notFound();

  const events = (found.events ?? []).map((e) => ({
    lane: e.lane as 'GUTACHTER' | 'ANWALT',
    status: e.status,
    occurredAt: e.occurredAt
  }));

  const gutachterTimeline = buildTimeline(
    GUTACHTER_FLOW,
    found.gutachterStatus,
    events,
    'GUTACHTER'
  );

  const anwaltTimeline = buildTimeline(
    ANWALT_FLOW,
    found.anwaltStatus,
    events,
    'ANWALT'
  );

  const lastEvent = found.events?.length
    ? found.events[found.events.length - 1]
    : null;

  return (
    <div className='bg-background text-foreground h-[100dvh] overflow-y-auto'>
      <div className='mx-auto max-w-5xl space-y-6 px-4 py-10 pb-24'>
        <div className='space-y-1'>
          <p className='text-muted-foreground text-sm'>
            Gutachtery24 · Case Tracker
          </p>
          <h1 className='text-3xl font-semibold'>Dein Fallstatus</h1>
          <p className='text-muted-foreground'>
            Case ID: {found.caseNumber ?? found.id} · Token: {found.token}
          </p>
        </div>

        <div className='bg-card flex flex-col gap-2 rounded-xl border px-5 py-5 md:flex-row md:items-center md:justify-between'>
          <div>
            <p className='text-muted-foreground text-sm'>Letztes Update</p>
            <p className='font-medium'>
              {fmt(lastEvent?.occurredAt ?? found.updatedAt)}
            </p>
          </div>
          <div className='text-muted-foreground text-sm'>
            Gutachter:{' '}
            <span className='text-foreground'>
              {GUTACHTER_FLOW.find((x) => x.key === found.gutachterStatus)
                ?.label ?? found.gutachterStatus}
            </span>
            {' · '}
            Anwalt:{' '}
            <span className='text-foreground'>
              {ANWALT_FLOW.find((x) => x.key === found.anwaltStatus)?.label ??
                found.anwaltStatus}
            </span>
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-2'>
          <div className='bg-card rounded-xl border px-5 py-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-muted-foreground text-sm'>Track</p>
                <h2 className='text-xl font-semibold'>Gutachter</h2>
                <p className='text-muted-foreground text-sm'>
                  Status:{' '}
                  <span className='text-foreground font-medium'>
                    {GUTACHTER_FLOW.find((x) => x.key === found.gutachterStatus)
                      ?.label ?? found.gutachterStatus}
                  </span>
                </p>
              </div>
              <p className='text-muted-foreground text-sm'>In Bearbeitung</p>
            </div>
            <div className='mt-5'>
              <Timeline steps={gutachterTimeline} />
            </div>

            {found.gutachtenPdfUrl ? (
              <div className='mt-5'>
                <a
                  className='hover:bg-muted inline-flex items-center rounded-lg border px-4 py-2 text-sm'
                  href={found.gutachtenPdfUrl}
                  target='_blank'
                  rel='noreferrer'
                >
                  Gutachten PDF öffnen
                </a>
              </div>
            ) : null}
          </div>

          <div className='bg-card rounded-xl border p-5'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-muted-foreground text-sm'>Track</p>
                <h2 className='text-xl font-semibold'>Anwalt</h2>
                <p className='text-muted-foreground text-sm'>
                  Status:{' '}
                  <span className='text-foreground font-medium'>
                    {ANWALT_FLOW.find((x) => x.key === found.anwaltStatus)
                      ?.label ?? found.anwaltStatus}
                  </span>
                </p>
              </div>
              <p className='text-muted-foreground text-sm'>In Bearbeitung</p>
            </div>
            <div className='mt-5'>
              <Timeline steps={anwaltTimeline} />
            </div>
          </div>
        </div>

        <div className='bg-card space-y-3 rounded-xl border px-5 py-6'>
          <h3 className='text-lg font-semibold'>Unfallhergang</h3>
          <p className='text-muted-foreground text-sm'>
            Bitte beschreibe kurz, was passiert ist. (MVP: noch ohne
            Speicherung)
          </p>
          <textarea
            className='bg-background focus:ring-ring min-h-[140px] w-full rounded-lg border p-3 text-sm outline-none focus:ring-2'
            placeholder='z.B. Auffahrunfall an Ampel, Gegner von hinten, … (Ort, Datum, Beteiligte)'
          />
          <div className='flex justify-end gap-2'>
            <button className='hover:bg-muted rounded-lg border px-4 py-2 text-sm'>
              Entwurf löschen
            </button>
            <button className='bg-foreground text-background rounded-lg px-4 py-2 text-sm hover:opacity-90'>
              Speichern (Demo)
            </button>
          </div>
        </div>

        <div className='bg-card space-y-3 rounded-xl border p-5'>
          <h3 className='text-lg font-semibold'>
            Bilder &amp; Dokumente hochladen
          </h3>
          <p className='text-muted-foreground text-sm'>
            Lade Fotos vom Schaden, Kennzeichen, Fahrzeugschein oder
            Polizeiakten hoch. (MVP: noch ohne Upload)
          </p>
          <div className='text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm'>
            Drag &amp; Drop Dateien hierher oder
            <div className='mt-3'>
              <button className='hover:bg-muted rounded-lg border px-4 py-2 text-sm'>
                Datei auswählen (Demo)
              </button>
            </div>
            <p className='mt-2 text-xs'>
              Unterstützt: JPG, PNG, PDF · Max. 10 Dateien
            </p>
          </div>
        </div>

        <div className='bg-card space-y-3 rounded-xl border p-5'>
          <h3 className='text-lg font-semibold'>Fragen?</h3>
          <p className='text-muted-foreground text-sm'>
            Antworte einfach auf die Nachricht mit deinem Link oder kontaktiere
            uns.
          </p>
          <div className='flex flex-wrap gap-2'>
            <button className='hover:bg-muted rounded-lg border px-4 py-2 text-sm'>
              Anrufen
            </button>
            <button className='hover:bg-muted rounded-lg border px-4 py-2 text-sm'>
              WhatsApp (später)
            </button>
            <Link
              className='hover:bg-muted rounded-lg border px-4 py-2 text-sm'
              href='/dashboard/overview'
            >
              Partner-Portal
            </Link>
          </div>
        </div>

        <p className='text-muted-foreground text-xs'>
          Hinweis: MVP-Demo — Änderungen werden noch nicht gespeichert.
        </p>
      </div>
    </div>
  );
}
