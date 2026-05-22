'use client';

import { useState } from 'react';

export default function CaseFilesUploader({ token }: { token: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    if (!file) {
      setErr('Bitte eine Datei auswählen.');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (label.trim()) fd.append('label', label.trim());

      const res = await fetch(`/api/case/${token}/files/upload`, {
        method: 'POST',
        body: fd
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setErr(data?.error ? String(data.error) : 'Upload fehlgeschlagen.');
        return;
      }

      setMsg('Upload erfolgreich.');
      setFile(null);
      setLabel('');
      // wichtig: Seite neu laden, damit Liste aktualisiert
      window.location.reload();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='bg-card/95 border-border/60 space-y-3 rounded-2xl border p-4 shadow-sm'>
      <div className='text-sm font-medium'>Datei hochladen</div>

      {msg ? (
        <div className='rounded-2xl border border-green-300/70 bg-green-50/70 px-3 py-2 text-sm text-green-800'>
          {msg}
        </div>
      ) : null}

      {err ? (
        <div className='rounded-2xl border border-red-300/70 bg-red-50/70 px-3 py-2 text-sm text-red-800'>
          {err}
        </div>
      ) : null}

      <form onSubmit={onUpload} className='space-y-3'>
        <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
          <div className='space-y-1'>
            <label className='text-muted-foreground text-xs'>
              Label (optional)
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder='z.B. Fahrzeugschein'
              className='bg-background/80 border-border/60 focus-visible:ring-primary/20 w-full rounded-xl border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none'
            />
          </div>

          <div className='space-y-1'>
            <label className='text-muted-foreground text-xs'>Datei *</label>
            <input
              type='file'
              accept='.pdf,.png,.jpg,.jpeg,.webp'
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className='bg-background/80 border-border/60 focus-visible:ring-primary/20 w-full rounded-xl border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none'
            />
          </div>
        </div>

        <button
          type='submit'
          disabled={loading}
          className='bg-primary text-primary-foreground inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60'
        >
          {loading ? 'Lade hoch…' : 'Hochladen'}
        </button>
      </form>

      <div className='text-muted-foreground text-xs'>
        Erlaubt: PDF, PNG, JPG, WEBP.
      </div>
    </div>
  );
}
