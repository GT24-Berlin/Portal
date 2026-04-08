'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type FileRow = {
  id: string;
  createdAt: string;
  title: string | null;
  filename: string;
  mimeType: string | null;
  size: number | null;
  uploaderType: string;
  visibility: string;
};

function fmtBytes(n?: number | null) {
  if (!n || n <= 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDt(iso: string) {
  try {
    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function CaseFilesPanel(props: {
  caseId: string;
  files: FileRow[];
  canUpload: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<
    'CUSTOMER_AND_PARTNERS' | 'PARTNERS' | 'CUSTOMER'
  >('CUSTOMER_AND_PARTNERS');
  const [category, setCategory] = useState('OTHER');

  const sorted = useMemo(() => props.files ?? [], [props.files]);

  async function upload() {
    setError(null);
    if (!props.canUpload) return;
    if (!file) {
      setError('Bitte eine Datei auswählen.');
      return;
    }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (title.trim()) fd.append('title', title.trim());
      fd.append('visibility', visibility);
      fd.append('category', category);

      const res = await fetch(`/api/cases/${props.caseId}/files/upload`, {
        method: 'POST',
        body: fd
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(String(data?.error ?? 'Upload fehlgeschlagen'));
        return;
      }

      // Reset
      setFile(null);
      setTitle('');

      // Refresh server data
      router.refresh();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className='bg-card space-y-4 rounded-xl border p-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='text-lg font-semibold'>Dokumente</h3>
          <p className='text-muted-foreground text-xs'>
            Uploads vom Kunden & Partner (je nach Sichtbarkeit)
          </p>
        </div>
      </div>

      {props.canUpload ? (
        <div className='space-y-3 rounded-lg border p-4'>
          <div className='text-sm font-medium'>Dokument hochladen</div>

          {error ? (
            <div className='rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800'>
              {error}
            </div>
          ) : null}

          <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
            <div className='space-y-1'>
              <label className='text-muted-foreground text-xs'>
                Titel (optional)
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                placeholder='z.B. "Gutachten PDF"'
              />
            </div>

            <div className='space-y-1'>
              <label className='text-muted-foreground text-xs'>
                Sichtbarkeit
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className='bg-background w-full rounded-md border px-3 py-2 text-sm'
              >
                <option value='CUSTOMER_AND_PARTNERS'>Kunde + Partner</option>
                <option value='PARTNERS'>Nur Partner</option>
                <option value='CUSTOMER'>Nur Kunde</option>
              </select>
            </div>

            <div className='space-y-1'>
              <label className='text-muted-foreground text-xs'>Kategorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className='bg-background w-full rounded-md border px-3 py-2 text-sm'
              >
                <option value='OTHER'>Other</option>
                <option value='GUTACHTEN'>Gutachten</option>
                <option value='REPORT'>Report</option>
                <option value='PHOTO'>Photo</option>
                <option value='REGISTRATION_DOC'>Fahrzeugschein</option>
                <option value='INSURANCE_DOC'>Versicherung</option>
              </select>
              <div className='text-muted-foreground text-[11px]'>
                Falls dein Enum weniger Werte hat: stell einfach auf OTHER.
              </div>
            </div>

            <div className='space-y-1'>
              <label className='text-muted-foreground text-xs'>Datei</label>
              <input
                type='file'
                accept='.pdf,.png,.jpg,.jpeg,.webp'
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className='bg-background w-full rounded-md border px-3 py-2 text-sm'
              />
            </div>
          </div>

          <div className='flex justify-end'>
            <button
              type='button'
              onClick={upload}
              disabled={busy}
              className='bg-foreground text-background rounded-md px-3 py-2 text-sm hover:opacity-90 disabled:opacity-50'
            >
              {busy ? 'Upload...' : 'Upload'}
            </button>
          </div>
        </div>
      ) : (
        <div className='text-muted-foreground text-xs'>
          Upload ist nur möglich, wenn du als Partner den Fall angenommen hast
          (ACCEPTED) oder Admin bist.
        </div>
      )}

      {/* Files list */}
      {sorted.length === 0 ? (
        <div className='text-muted-foreground text-sm'>
          Noch keine Dokumente.
        </div>
      ) : (
        <div className='space-y-2'>
          {sorted.map((f) => (
            <div
              key={f.id}
              className='flex items-center justify-between rounded-md border px-3 py-2 text-sm'
            >
              <div className='min-w-0'>
                <div className='truncate font-medium'>
                  {f.title || f.filename}
                </div>
                <div className='text-muted-foreground text-xs'>
                  {fmtDt(f.createdAt)} · {fmtBytes(f.size)} ·{' '}
                  {String(f.uploaderType)} · {String(f.visibility)}
                </div>
              </div>

              <a
                className='hover:bg-muted shrink-0 rounded-md border px-3 py-1 text-xs'
                href={`/api/cases/${props.caseId}/files/${f.id}/download`}
                target='_blank'
                rel='noreferrer'
              >
                Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
