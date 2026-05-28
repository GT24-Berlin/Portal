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
    customer?: { firstName: string | null; lastName: string | null } | null;
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
      <div className='text-muted-foreground border-border/60 bg-muted/10 rounded-[24px] border border-dashed px-4 py-6 text-sm shadow-[var(--shadow-soft)]'>
        Keine zugewiesenen Cases.
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {error ? (
        <div className='border-border/60 rounded-[20px] border bg-red-50/70 px-4 py-3 text-sm text-red-800 shadow-[var(--shadow-soft)]'>
          {error}
        </div>
      ) : null}

      {rows.map((r) => {
        const expiresAt = new Date(r.expiresAt);
        const left = msLeft(expiresAt);
        const expired = r.status === 'PENDING' && left <= 0;

        const title = r.case.caseNumber ?? '—';
        const customerLabel =
          [r.case.customer?.firstName, r.case.customer?.lastName]
            .filter(Boolean)
            .join(' ')
            .trim() || '—';

        const laneStatus =
          props.role === 'GUTACHTER'
            ? r.case.gutachterStatus
            : r.case.anwaltStatus;

        return (
          <div
            key={r.id}
            className='border-border/60 bg-background/84 hover:bg-primary/[0.02] rounded-[26px] border p-4 shadow-[var(--shadow-soft)] transition-colors'
          >
            <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
              <div className='space-y-2'>
                <div className='flex flex-wrap items-center gap-2'>
                  <Link
                    className='border-border/60 bg-background/90 decoration-muted-foreground/40 hover:bg-muted/50 hover:decoration-foreground/70 inline-flex rounded-full border px-3 py-1.5 font-mono text-sm font-semibold underline underline-offset-4 transition-colors'
                    href={`/dashboard/cases/${r.caseId}`}
                  >
                    Case {title}
                  </Link>
                  <span className='text-muted-foreground text-xs'>
                    Kunde: {customerLabel}
                  </span>
                </div>

                <div className='flex flex-wrap gap-2 text-xs'>
                  <span className='text-muted-foreground inline-flex items-center gap-2'>
                    Status
                    <span className='border-border/60 bg-background/90 text-foreground inline-flex rounded-full border px-2.5 py-1 font-mono text-[11px] tracking-[0.08em] shadow-[var(--shadow-soft)]'>
                      {r.status}
                    </span>
                  </span>
                  <span className='text-muted-foreground inline-flex items-center gap-2'>
                    Lane
                    <span className='border-border/60 bg-background/90 text-foreground inline-flex rounded-full border px-2.5 py-1 font-mono text-[11px] tracking-[0.08em] shadow-[var(--shadow-soft)]'>
                      {props.role}
                    </span>
                  </span>
                </div>

                <div className='text-muted-foreground text-xs'>
                  Dein Fortschritt:{' '}
                  <span className='text-foreground font-mono'>
                    {laneStatus}
                  </span>
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

              <div className='flex flex-wrap gap-2 md:justify-end'>
                <button
                  className='border-border/60 bg-background/85 hover:bg-muted/50 rounded-full border px-3 py-2.5 text-sm shadow-[var(--shadow-soft)] transition-colors disabled:opacity-60'
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
                    className='bg-foreground text-background rounded-full px-3 py-2.5 text-sm shadow-[var(--shadow-soft)] transition-opacity hover:opacity-90'
                    href={`/dashboard/cases/${r.caseId}`}
                  >
                    Öffnen
                  </Link>
                ) : (
                  <button
                    className='bg-foreground text-background rounded-full px-3 py-2.5 text-sm shadow-[var(--shadow-soft)] transition-opacity disabled:opacity-60'
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
