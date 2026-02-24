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
    <div className='space-y-4 rounded-lg border p-4'>
      <div className='text-sm font-medium'>Status ändern</div>

      {showNothing ? (
        <div className='text-muted-foreground text-sm'>
          Keine Rolle gesetzt oder keine Berechtigung. (role:{' '}
          <span className='font-mono'>{role || 'UNSET'}</span>)
        </div>
      ) : null}

      {canEditGutachter ? (
        <div className='grid gap-2 md:grid-cols-[1fr_auto] md:items-end'>
          <div>
            <div className='text-muted-foreground mb-1 text-xs'>Gutachter</div>
            <select
              className='bg-background w-full rounded-md border px-3 py-2 text-sm'
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
            className='bg-foreground text-background rounded-md px-4 py-2 text-sm disabled:opacity-60'
            onClick={() => save('GUTACHTER')}
            disabled={saving !== null}
          >
            {saving === 'GUTACHTER' ? 'Speichert...' : 'Gutachter speichern'}
          </button>
        </div>
      ) : null}

      {canEditAnwalt ? (
        <div className='grid gap-2 md:grid-cols-[1fr_auto] md:items-end'>
          <div>
            <div className='text-muted-foreground mb-1 text-xs'>Anwalt</div>
            <select
              className='bg-background w-full rounded-md border px-3 py-2 text-sm'
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
            className='bg-foreground text-background rounded-md px-4 py-2 text-sm disabled:opacity-60'
            onClick={() => save('ANWALT')}
            disabled={saving !== null}
          >
            {saving === 'ANWALT' ? 'Speichert...' : 'Anwalt speichern'}
          </button>
        </div>
      ) : null}

      {error ? <div className='text-sm text-red-500'>{error}</div> : null}
    </div>
  );
}
