'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type Role = 'GUTACHTER' | 'ANWALT';

type Row = {
  id: string;
  caseId: string;
  role: Role;
  status: 'PENDING' | 'ACCEPTED' | 'RELEASED' | 'EXPIRED';
  active: boolean;
  assignedAt: string | Date;
  expiresAt: string | Date;
  acceptedAt?: string | Date | null;
  case: {
    id: string;
    caseNumber?: string | null;
    token: string;
    gutachterStatus: string;
    anwaltStatus: string;
    lead?: { id: string; externalId?: string | null } | null;
  };
};

function fmt(dt: Date) {
  return new Intl.DateTimeFormat('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dt);
}

function msLeft(expiresAt: Date) {
  return expiresAt.getTime() - Date.now();
}

export default function InboxList(props: { role: Role; rows: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => {
    // Optional: Sortierung PENDING zuerst
    return [...props.rows].sort((a, b) => {
      const ap = a.status === 'PENDING' ? 0 : 1;
      const bp = b.status === 'PENDING' ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return (
        new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
      );
    });
  }, [props.rows]);

  async function accept(caseId: string) {
    setError(null);
    setBusy(caseId);
    try {
      const res = await fetch(`/api/cases/${caseId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: props.role })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.error || `Accept failed (${res.status})`);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Unbekannter Fehler');
    } finally {
      setBusy(null);
    }
  }

  async function release(caseId: string) {
    setError(null);
    setBusy(caseId);
    try {
      const res = await fetch(`/api/cases/${caseId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: props.role })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.error || `Release failed (${res.status})`);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Unbekannter Fehler');
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className='text-muted-foreground text-sm'>
        Keine zugewiesenen Cases.
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      {error ? <div className='text-sm text-red-500'>{error}</div> : null}

      {rows.map((r) => {
        const expiresAt = new Date(r.expiresAt);
        const left = msLeft(expiresAt);
        const expired = r.status === 'PENDING' && left <= 0;

        const title = r.case.caseNumber ?? r.case.id.slice(0, 8);
        const leadLabel =
          r.case.lead?.externalId ?? r.case.lead?.id?.slice(0, 8) ?? '—';

        const laneStatus =
          props.role === 'GUTACHTER'
            ? r.case.gutachterStatus
            : r.case.anwaltStatus;

        return (
          <div key={r.id} className='rounded-lg border p-4'>
            <div className='flex flex-col gap-2 md:flex-row md:items-start md:justify-between'>
              <div className='space-y-1'>
                <div className='text-sm font-medium'>
                  <Link
                    className='underline underline-offset-4'
                    href={`/dashboard/cases/${r.caseId}`}
                  >
                    Case {title}
                  </Link>
                  <span className='text-muted-foreground ml-2 text-xs'>
                    Lead: {leadLabel}
                  </span>
                </div>

                <div className='text-muted-foreground text-xs'>
                  Status: <span className='font-mono'>{r.status}</span> · Lane:{' '}
                  <span className='font-mono'>{props.role}</span>
                </div>

                <div className='text-muted-foreground text-xs'>
                  Dein Fortschritt:{' '}
                  <span className='font-mono'>{laneStatus}</span>
                </div>

                <div className='text-muted-foreground text-xs'>
                  Zugewiesen: {fmt(new Date(r.assignedAt))} · Ablauf:{' '}
                  {fmt(expiresAt)}
                  {r.status === 'PENDING' ? (
                    <span className='ml-2 font-mono'>
                      {expired
                        ? ' (abgelaufen)'
                        : ` (${Math.ceil(left / (60 * 60 * 1000))}h übrig)`}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className='flex gap-2 md:justify-end'>
                <button
                  className='rounded-md border px-3 py-2 text-sm disabled:opacity-60'
                  onClick={() => release(r.caseId)}
                  disabled={
                    (busy !== null && busy !== r.caseId) ||
                    expired ||
                    r.status === 'EXPIRED'
                  }
                >
                  {busy === r.caseId ? '…' : 'Freigeben'}
                </button>

                {r.status === 'ACCEPTED' ? (
                  <Link
                    className='bg-foreground text-background rounded-md px-3 py-2 text-sm hover:opacity-90'
                    href={`/dashboard/cases/${r.caseId}`}
                  >
                    Öffnen
                  </Link>
                ) : (
                  <button
                    className='bg-foreground text-background rounded-md px-3 py-2 text-sm disabled:opacity-60'
                    onClick={() => accept(r.caseId)}
                    disabled={
                      (busy !== null && busy !== r.caseId) ||
                      r.status !== 'PENDING' ||
                      expired
                    }
                    title={expired ? 'Assignment ist abgelaufen' : ''}
                  >
                    {busy === r.caseId ? '…' : 'Annehmen'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
