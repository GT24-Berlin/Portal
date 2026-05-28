'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  caseId: string;
  disabled?: boolean;
};

type Visibility = 'CUSTOMER' | 'PARTNERS' | 'CUSTOMER_AND_PARTNERS';

export default function CaseFilesUpload({ caseId, disabled }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<Visibility>(
    'CUSTOMER_AND_PARTNERS'
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setMsg(null);

    if (disabled) return;
    if (!file) {
      setMsg('Bitte Datei auswählen.');
      return;
    }

    setSaving(true);
    try {
      const form = new FormData();
      form.set('file', file);
      if (title.trim()) form.set('title', title.trim());
      form.set('visibility', visibility);

      const res = await fetch(`/api/cases/${caseId}/files/upload`, {
        method: 'POST',
        body: form
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setMsg(data?.error ? String(data.error) : 'Upload fehlgeschlagen.');
        return;
      }

      setMsg('Upload erfolgreich.');
      setFile(null);
      setTitle('');

      // Liste neu laden
      router.refresh();
    } catch (e: any) {
      setMsg(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className='border-border/60 bg-background/84 space-y-4 rounded-[28px] border p-4 shadow-[var(--shadow-soft)]'>
      <div className='space-y-1'>
        <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
          Upload
        </div>
        <div className='text-foreground text-sm font-medium'>
          Datei zum Fall hinzufügen
        </div>
      </div>

      <div className='grid grid-cols-1 gap-2.5 md:grid-cols-3'>
        <input
          className='bg-background/90 border-border/60 focus-visible:ring-primary/20 w-full rounded-2xl border px-3 py-2.5 text-sm shadow-[var(--shadow-soft)]'
          placeholder='Titel (optional), z.B. Gutachten PDF'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={saving || disabled}
        />

        <select
          className='bg-background/90 border-border/60 focus-visible:ring-primary/20 w-full rounded-2xl border px-3 py-2.5 text-sm shadow-[var(--shadow-soft)]'
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as Visibility)}
          disabled={saving || disabled}
          title='Sichtbarkeit'
        >
          <option value='CUSTOMER_AND_PARTNERS'>Kunde + Partner</option>
          <option value='PARTNERS'>Nur Partner</option>
          <option value='CUSTOMER'>Nur Kunde</option>
        </select>

        <input
          className='bg-background/90 border-border/60 focus-visible:ring-primary/20 w-full rounded-2xl border px-3 py-2.5 text-sm shadow-[var(--shadow-soft)]'
          type='file'
          accept='.pdf,.png,.jpg,.jpeg,.webp'
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={saving || disabled}
        />
      </div>

      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='text-muted-foreground text-xs leading-5'>
          Erlaubt: PDF/JPG/PNG/WEBP
          {file ? ` · gewählt: ${file.name}` : ''}
        </div>

        <button
          type='button'
          onClick={submit}
          disabled={saving || disabled}
          className='bg-foreground text-background rounded-full px-3.5 py-2.5 text-sm font-medium shadow-[var(--shadow-soft)] transition-opacity hover:opacity-90 disabled:opacity-50'
        >
          {saving ? 'Lade hoch…' : 'Upload'}
        </button>
      </div>

      {msg ? (
        <div className='border-border/60 bg-background/78 rounded-[20px] border px-3 py-2 text-xs shadow-[var(--shadow-soft)]'>
          {msg}
        </div>
      ) : null}
    </div>
  );
}
