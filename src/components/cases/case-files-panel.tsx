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
    <div className='border-border/60 bg-background/82 space-y-4 overflow-hidden rounded-[28px] border p-6 shadow-[var(--shadow-soft)]'>
      <div className='border-border/60 flex items-end justify-between gap-3 border-b pb-3'>
        <div className='space-y-1'>
          <h3 className='font-heading text-foreground text-lg font-semibold tracking-tight'>
            Dokumente
          </h3>
          <p className='text-muted-foreground text-xs'>
            Uploads vom Kunden & Partner (je nach Sichtbarkeit)
          </p>
        </div>
      </div>

      {props.canUpload ? (
        <div className='border-border/60 bg-background/84 space-y-4 rounded-[26px] border p-4 shadow-[var(--shadow-soft)]'>
          <div className='text-foreground text-sm font-medium'>
            Dokument hochladen
          </div>

          {error ? (
            <div className='rounded-[20px] border border-red-300/70 bg-red-50/80 px-3 py-2 text-sm text-red-900 shadow-[var(--shadow-soft)]'>
              {error}
            </div>
          ) : null}

          <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
            <div className='border-border/60 bg-background/84 space-y-1.5 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
              <label className='text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase'>
                Titel (optional)
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className='bg-background/90 border-border/60 focus-visible:ring-primary/20 w-full rounded-2xl border px-3 py-2.5 text-sm shadow-[var(--shadow-soft)] transition-colors focus-visible:ring-2 focus-visible:outline-none'
                placeholder='z.B. "Gutachten PDF"'
              />
            </div>

            <div className='border-border/60 bg-background/84 space-y-1.5 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
              <label className='text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase'>
                Sichtbarkeit
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className='bg-background/90 border-border/60 focus-visible:ring-primary/20 w-full rounded-2xl border px-3 py-2.5 text-sm shadow-[var(--shadow-soft)] transition-colors focus-visible:ring-2 focus-visible:outline-none'
              >
                <option value='CUSTOMER_AND_PARTNERS'>Kunde + Partner</option>
                <option value='PARTNERS'>Nur Partner</option>
                <option value='CUSTOMER'>Nur Kunde</option>
              </select>
            </div>

            <div className='border-border/60 bg-background/84 space-y-1.5 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
              <label className='text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase'>
                Kategorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className='bg-background/90 border-border/60 focus-visible:ring-primary/20 w-full rounded-2xl border px-3 py-2.5 text-sm shadow-[var(--shadow-soft)] transition-colors focus-visible:ring-2 focus-visible:outline-none'
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

            <div className='border-border/60 bg-background/84 space-y-1.5 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
              <label className='text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase'>
                Datei
              </label>
              <input
                type='file'
                accept='.pdf,.png,.jpg,.jpeg,.webp'
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className='bg-background/90 border-border/60 focus-visible:ring-primary/20 w-full rounded-2xl border px-3 py-2.5 text-sm shadow-[var(--shadow-soft)] transition-colors focus-visible:ring-2 focus-visible:outline-none'
              />
            </div>
          </div>

          <div className='flex justify-end'>
            <button
              type='button'
              onClick={upload}
              disabled={busy}
              className='bg-foreground text-background rounded-full px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-soft)] transition-opacity hover:opacity-90 disabled:opacity-50'
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
        <div className='text-muted-foreground border-border/60 bg-background/82 rounded-[24px] border border-dashed px-4 py-6 text-sm shadow-[var(--shadow-soft)]'>
          Noch keine Dokumente.
        </div>
      ) : (
        <div className='space-y-2'>
          {sorted.map((f) => (
            <div
              key={f.id}
              className='border-border/60 bg-background/84 hover:bg-primary/[0.02] flex items-center justify-between rounded-[24px] border px-4 py-3.5 text-sm shadow-[var(--shadow-soft)] transition-colors'
            >
              <div className='min-w-0'>
                <div className='text-foreground truncate font-medium'>
                  {f.title || f.filename}
                </div>
                <div className='text-muted-foreground text-xs leading-5'>
                  {fmtDt(f.createdAt)} · {fmtBytes(f.size)} ·{' '}
                  {String(f.uploaderType)} · {String(f.visibility)}
                </div>
              </div>

              <a
                className='hover:bg-muted border-border/60 bg-background/90 decoration-muted-foreground/40 hover:decoration-foreground/70 shrink-0 rounded-full border px-3 py-1.5 text-xs underline underline-offset-4 transition-colors'
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
