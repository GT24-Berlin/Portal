'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Role = 'GUTACHTER' | 'ANWALT' | 'ADMIN' | '';

const GUTACHTER_STATUSES = [
  'EINGEGANGEN',
  'DATEN_UNVOLLSTAENDIG',
  'GUTACHTER_KONTAKTIERT',
  'TERMIN_GEPLANT',
  'GUTACHTEN_IN_BEARBEITUNG',
  'GUTACHTEN_ERSTELLT',
  'ABGESCHLOSSEN'
] as const;

const ANWALT_STATUSES = [
  'FALL_EINGEGANGEN',
  'FALL_IN_PRUEFUNG',
  'RUECKFRAGEN_IN_KLAERUNG',
  'FALL_BERICHT_ERSTELLT',
  'FALL_ABGESCHLOSSEN'
] as const;

export default function CaseStatusEditor(props: {
  caseId: string;
  gutachterStatus: string;
  anwaltStatus: string;
  role: Role;
}) {
  const router = useRouter();
  const role = props.role;

  const isAdmin = role === 'ADMIN';
  const canEditGutachter = isAdmin || role === 'GUTACHTER';
  const canEditAnwalt = isAdmin || role === 'ANWALT';

  const [gutachter, setGutachter] = useState(props.gutachterStatus);
  const [anwalt, setAnwalt] = useState(props.anwaltStatus);
  const [saving, setSaving] = useState<'GUTACHTER' | 'ANWALT' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showNothing = !canEditGutachter && !canEditAnwalt;

  async function save(which: 'GUTACHTER' | 'ANWALT') {
    setError(null);
    setSaving(which);

    // Wichtig: Payload pro Lane bauen (verhindert Cross-Updates)
    const payload =
      which === 'GUTACHTER'
        ? { gutachterStatus: gutachter }
        : { anwaltStatus: anwalt };

    try {
      const res = await fetch(`/api/cases/${props.caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Save failed (${res.status})`);
      }

      // Server Components neu fetchen → Case Tracker bleibt konsistent
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Unbekannter Fehler');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className='border-border/60 bg-background/82 space-y-5 rounded-[32px] border p-6 shadow-[var(--shadow-glass)] backdrop-blur-xl'>
      <div className='border-border/60 space-y-1.5 border-b pb-4'>
        <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
          Actions
        </div>
        <div className='font-heading text-foreground text-xl font-semibold tracking-tight'>
          Status ändern
        </div>
        <div className='text-muted-foreground text-sm leading-6'>
          Die beiden Lanes bleiben getrennt und werden gezielt gepflegt.
        </div>
      </div>

      {showNothing ? (
        <div className='border-border/60 bg-background/78 rounded-[24px] border px-4 py-3 text-sm shadow-[var(--shadow-soft)]'>
          <span className='text-muted-foreground'>
            Keine Rolle gesetzt oder keine Berechtigung. (role:{' '}
            <span className='font-mono'>{role || 'UNSET'}</span>)
          </span>
        </div>
      ) : null}

      {canEditGutachter ? (
        <div className='grid gap-3 md:grid-cols-[1fr_auto] md:items-end'>
          <div className='border-border/60 bg-background/84 space-y-2 rounded-[28px] border p-4 shadow-[var(--shadow-soft)]'>
            <div className='flex items-center justify-between gap-2'>
              <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                Gutachter
              </div>
              <div className='text-muted-foreground text-[11px]'>
                Lane-Status
              </div>
            </div>
            <select
              className='bg-background/90 border-border/60 focus-visible:ring-primary/20 w-full rounded-2xl border px-3 py-2.5 text-sm shadow-[var(--shadow-soft)]'
              value={gutachter}
              onChange={(e) => setGutachter(e.target.value)}
            >
              {GUTACHTER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <button
            className='bg-foreground text-background rounded-full px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-soft)] transition-opacity hover:opacity-90 disabled:opacity-60'
            onClick={() => save('GUTACHTER')}
            disabled={saving !== null}
          >
            {saving === 'GUTACHTER' ? 'Speichert...' : 'Gutachter speichern'}
          </button>
        </div>
      ) : null}

      {canEditAnwalt ? (
        <div className='grid gap-3 md:grid-cols-[1fr_auto] md:items-end'>
          <div className='border-border/60 bg-background/84 space-y-2 rounded-[28px] border p-4 shadow-[var(--shadow-soft)]'>
            <div className='flex items-center justify-between gap-2'>
              <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                Anwalt
              </div>
              <div className='text-muted-foreground text-[11px]'>
                Lane-Status
              </div>
            </div>
            <select
              className='bg-background/90 border-border/60 focus-visible:ring-primary/20 w-full rounded-2xl border px-3 py-2.5 text-sm shadow-[var(--shadow-soft)]'
              value={anwalt}
              onChange={(e) => setAnwalt(e.target.value)}
            >
              {ANWALT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <button
            className='bg-foreground text-background rounded-full px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-soft)] transition-opacity hover:opacity-90 disabled:opacity-60'
            onClick={() => save('ANWALT')}
            disabled={saving !== null}
          >
            {saving === 'ANWALT' ? 'Speichert...' : 'Anwalt speichern'}
          </button>
        </div>
      ) : null}

      {error ? (
        <div className='border-border/60 rounded-[24px] border bg-red-50/80 px-4 py-3 text-sm text-red-900 shadow-[var(--shadow-soft)]'>
          {error}
        </div>
      ) : null}
    </div>
  );
}
