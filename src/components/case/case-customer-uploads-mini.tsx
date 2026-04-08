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
    <div className='bg-card space-y-3 rounded-xl border p-6'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h3 className='text-lg font-semibold'>Deine Uploads</h3>
          <p className='text-muted-foreground text-xs'>
            Hier siehst du nur Dateien, die du selbst hochgeladen hast.
          </p>
        </div>

        <div className='flex gap-2'>
          <button
            type='button'
            onClick={load}
            className='hover:bg-muted rounded-md border px-3 py-2 text-sm'
            disabled={loading}
          >
            Aktualisieren
          </button>
          <Link
            href={`/case/${token}/documents`}
            className='bg-foreground text-background rounded-md px-3 py-2 text-sm hover:opacity-90'
          >
            Zu Dokumente
          </Link>
        </div>
      </div>

      {error ? (
        <div className='rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800'>
          Laden fehlgeschlagen: {error}
        </div>
      ) : null}

      {loading ? (
        <div className='text-muted-foreground text-sm'>Lade…</div>
      ) : customerUploads.length === 0 ? (
        <div className='text-muted-foreground text-sm'>
          Du hast noch keine Dateien hochgeladen.
        </div>
      ) : (
        <div className='space-y-2'>
          {customerUploads.map((f) => (
            <div
              key={f.id}
              className='flex items-center justify-between rounded-md border px-3 py-2 text-sm'
            >
              <div className='min-w-0'>
                <div className='truncate font-medium'>
                  {f.title ? f.title : f.filename}
                </div>
                <div className='text-muted-foreground text-xs'>
                  {fmtDt(f.createdAt)} · {fmtBytes(f.size)}
                </div>
              </div>

              <a
                className='hover:bg-muted shrink-0 rounded-md border px-3 py-1 text-xs'
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
