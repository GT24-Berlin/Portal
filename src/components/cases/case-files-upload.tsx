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
    <div className='bg-background space-y-2 rounded-md border p-3'>
      <div className='grid grid-cols-1 gap-2 md:grid-cols-3'>
        <input
          className='bg-background w-full rounded-md border px-3 py-2 text-sm'
          placeholder='Titel (optional), z.B. Gutachten PDF'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={saving || disabled}
        />

        <select
          className='bg-background w-full rounded-md border px-3 py-2 text-sm'
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
          className='bg-background w-full rounded-md border px-3 py-2 text-sm'
          type='file'
          accept='.pdf,.png,.jpg,.jpeg,.webp'
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={saving || disabled}
        />
      </div>

      <div className='flex items-center justify-between gap-3'>
        <div className='text-muted-foreground text-xs'>
          Erlaubt: PDF/JPG/PNG/WEBP
          {file ? ` · gewählt: ${file.name}` : ''}
        </div>

        <button
          type='button'
          onClick={submit}
          disabled={saving || disabled}
          className='bg-foreground text-background rounded-md px-3 py-2 text-sm hover:opacity-90 disabled:opacity-50'
        >
          {saving ? 'Lade hoch…' : 'Upload'}
        </button>
      </div>

      {msg ? <div className='text-muted-foreground text-xs'>{msg}</div> : null}
    </div>
  );
}
