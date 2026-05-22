'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type CaseFileRow = {
  id: string;
  createdAt: string;
  uploaderType: 'CUSTOMER' | 'PARTNER' | 'ADMIN';
  title: string | null;
  filename: string;
  mimeType: string | null;
  size: number | null;
  visibility: string;
};

function fmtBytes(n?: number | null) {
  if (!n || n <= 0) return '—';
  const kb = n / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function fmtDt(iso: string) {
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(iso));
}

export default function CaseCustomerUploadsMini({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<CaseFileRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/case/${token}/files`, {
        cache: 'no-store'
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setError(String(data?.error ?? 'load_failed'));
        setFiles([]);
        return;
      }

      setFiles(Array.isArray(data.files) ? data.files : []);
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const customerUploads = useMemo(
    () => files.filter((f) => f.uploaderType === 'CUSTOMER'),
    [files]
  );

  return (
    <div className='bg-card/95 border-border/60 space-y-3 overflow-hidden rounded-2xl border p-6 shadow-sm'>
      <div className='border-border/60 flex items-center justify-between gap-3 border-b pb-3'>
        <div>
          <h3 className='font-heading text-foreground text-lg font-semibold tracking-tight'>
            Deine Uploads
          </h3>
          <p className='text-muted-foreground text-xs'>
            Hier siehst du nur Dateien, die du selbst hochgeladen hast.
          </p>
        </div>

        <div className='flex gap-2'>
          <button
            type='button'
            onClick={load}
            className='hover:bg-muted border-border/60 bg-background/80 rounded-full border px-3 py-2 text-sm shadow-sm transition-colors'
            disabled={loading}
          >
            Aktualisieren
          </button>
          <Link
            href={`/case/${token}/documents`}
            className='bg-foreground text-background rounded-full px-3 py-2 text-sm shadow-sm hover:opacity-90'
          >
            Zu den Dokumenten
          </Link>
        </div>
      </div>

      {error ? (
        <div className='rounded-2xl border border-red-300/70 bg-red-50/70 px-3 py-2 text-sm text-red-800'>
          Laden fehlgeschlagen: {error}
        </div>
      ) : null}

      {loading ? (
        <div className='text-muted-foreground text-sm'>Lade…</div>
      ) : customerUploads.length === 0 ? (
        <div className='text-muted-foreground border-border/60 bg-muted/10 rounded-2xl border border-dashed px-4 py-6 text-sm'>
          Du hast noch keine Dateien hochgeladen.
        </div>
      ) : (
        <div className='space-y-2'>
          {customerUploads.map((f) => (
            <div
              key={f.id}
              className='border-border/60 bg-background/80 hover:bg-muted/20 flex items-center justify-between rounded-2xl border px-4 py-3 text-sm shadow-sm transition-colors'
            >
              <div className='min-w-0'>
                <div className='text-foreground truncate font-medium'>
                  {f.title ? f.title : f.filename}
                </div>
                <div className='text-muted-foreground text-xs leading-5'>
                  {fmtDt(f.createdAt)} · {fmtBytes(f.size)}
                </div>
              </div>

              <a
                className='hover:bg-muted border-border/60 bg-background/90 decoration-muted-foreground/40 hover:decoration-foreground/70 shrink-0 rounded-full border px-3 py-1.5 text-xs underline underline-offset-4 transition-colors'
                href={`/api/case/${token}/files/${f.id}/download`}
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
