'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Role = 'GUTACHTER' | 'ANWALT';

type ClerkUser = {
  id: string;
  role: string;
  name: string;
  email: string | null;
};

type AssignmentRow = {
  id: string;
  role: Role;
  status: 'PENDING' | 'ACCEPTED' | 'RELEASED' | 'EXPIRED';
  active: boolean;
  assigneeClerkUserId: string;
  assignedAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  releasedAt: string | null;
};

type AssignmentsResponse = {
  ok: boolean;
  current: { GUTACHTER: AssignmentRow | null; ANWALT: AssignmentRow | null };
  assignments: AssignmentRow[];
};

export default function CaseAssignmentAdmin(props: { caseId: string }) {
  const router = useRouter();

  const [users, setUsers] = useState<ClerkUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [assignments, setAssignments] = useState<AssignmentsResponse | null>(
    null
  );
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  const [selectedGutachter, setSelectedGutachter] = useState<string>('');
  const [selectedAnwalt, setSelectedAnwalt] = useState<string>('');

  const [expiresInHours, setExpiresInHours] = useState<number>(24);
  const [force, setForce] = useState<boolean>(false);

  const [saving, setSaving] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  const gutachterUsers = useMemo(
    () => users.filter((u) => u.role === 'GUTACHTER'),
    [users]
  );
  const anwaltUsers = useMemo(
    () => users.filter((u) => u.role === 'ANWALT'),
    [users]
  );

  async function loadUsers() {
    setLoadingUsers(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users?limit=200`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Users fetch failed (${res.status})`);
      }
      setUsers(data.users ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Fehler beim Laden der User');
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadAssignments() {
    setLoadingAssignments(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${props.caseId}/assignments`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.error || `Assignments fetch failed (${res.status})`
        );
      }
      setAssignments(data);
    } catch (e: any) {
      setError(e?.message ?? 'Fehler beim Laden der Assignments');
    } finally {
      setLoadingAssignments(false);
    }
  }

  useEffect(() => {
    loadUsers();
    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.caseId]);

  async function assign(role: Role, assigneeClerkUserId: string) {
    setError(null);
    setSaving(role);
    try {
      const res = await fetch(`/api/cases/${props.caseId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          assigneeClerkUserId,
          expiresInHours,
          force
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || `Assign failed (${res.status})`);
      }

      await loadAssignments();
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Unbekannter Fehler');
    } finally {
      setSaving(null);
    }
  }

  const currentGutachter = assignments?.current?.GUTACHTER ?? null;
  const currentAnwalt = assignments?.current?.ANWALT ?? null;

  const currentGutachterUser = currentGutachter
    ? (users.find((u) => u.id === currentGutachter.assigneeClerkUserId) ?? null)
    : null;

  const currentAnwaltUser = currentAnwalt
    ? (users.find((u) => u.id === currentAnwalt.assigneeClerkUserId) ?? null)
    : null;

  const getUserById = (id: string) => users.find((u) => u.id === id) ?? null;

  const recentAssignments = [...(assignments?.assignments ?? [])].sort(
    (a, b) =>
      new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
  );

  const fmtDateTime = (value?: string | null) =>
    value ? new Date(value).toLocaleString('de-DE') : '—';

  return (
    <div className='border-border/60 bg-background/82 space-y-6 rounded-[32px] border p-6 shadow-[var(--shadow-glass)] backdrop-blur-xl'>
      <div className='border-border/60 space-y-1.5 border-b pb-4'>
        <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
          Administration
        </div>
        <div className='font-heading text-foreground text-xl font-semibold tracking-tight'>
          Case zuweisen
        </div>
        <div className='text-muted-foreground text-sm leading-6'>
          Gutachter- und Anwalt-Zuweisungen werden getrennt gepflegt.
        </div>
      </div>

      <div className='grid gap-3 md:grid-cols-3'>
        <div className='border-border/60 bg-background/84 space-y-1.5 rounded-[28px] border p-4 shadow-[var(--shadow-soft)]'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
            Frist (Stunden)
          </div>
          <input
            className='bg-background/90 border-border/60 focus-visible:ring-primary/20 w-full rounded-2xl border px-3 py-2.5 text-sm shadow-[var(--shadow-soft)]'
            type='number'
            min={1}
            max={168}
            value={expiresInHours}
            onChange={(e) => setExpiresInHours(Number(e.target.value))}
          />
        </div>

        <label className='border-border/60 bg-background/84 flex items-end gap-2 rounded-[28px] border p-4 text-sm shadow-[var(--shadow-soft)]'>
          <input
            type='checkbox'
            checked={force}
            onChange={(e) => setForce(e.target.checked)}
          />
          <span className='text-muted-foreground'>
            force (aktive Zuweisung ersetzen)
          </span>
        </label>

        <button
          className='border-border/60 bg-background/85 hover:bg-muted/50 rounded-full border px-3 py-2.5 text-sm shadow-[var(--shadow-soft)] transition-colors disabled:opacity-60'
          onClick={() => {
            loadUsers();
            loadAssignments();
          }}
          disabled={loadingUsers || loadingAssignments}
        >
          Refresh
        </button>
      </div>

      <div className='grid gap-3 md:grid-cols-[1fr_auto] md:items-end'>
        <div className='border-border/60 bg-background/84 space-y-2 rounded-[28px] border p-4 shadow-[var(--shadow-soft)]'>
          <div className='flex items-center justify-between gap-2'>
            <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
              Gutachter auswählen
            </div>
            <div className='text-muted-foreground text-[11px]'>Assignment</div>
          </div>
          <select
            className='bg-background/90 border-border/60 focus-visible:ring-primary/20 w-full rounded-2xl border px-3 py-2.5 text-sm shadow-[var(--shadow-soft)]'
            value={selectedGutachter}
            onChange={(e) => setSelectedGutachter(e.target.value)}
            disabled={loadingUsers}
          >
            <option value=''>— auswählen —</option>
            {gutachterUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} {u.email ? `(${u.email})` : ''}
              </option>
            ))}
          </select>
        </div>
        <button
          className='bg-foreground text-background rounded-full px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-soft)] transition-opacity hover:opacity-90 disabled:opacity-60'
          onClick={() => assign('GUTACHTER', selectedGutachter)}
          disabled={!selectedGutachter || saving !== null}
        >
          {saving === 'GUTACHTER' ? 'Zuweisen...' : 'Gutachter zuweisen'}
        </button>
      </div>

      <div className='grid gap-3 md:grid-cols-[1fr_auto] md:items-end'>
        <div className='border-border/60 bg-background/84 space-y-2 rounded-[28px] border p-4 shadow-[var(--shadow-soft)]'>
          <div className='flex items-center justify-between gap-2'>
            <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
              Anwalt auswählen
            </div>
            <div className='text-muted-foreground text-[11px]'>Assignment</div>
          </div>
          <select
            className='bg-background/90 border-border/60 focus-visible:ring-primary/20 w-full rounded-2xl border px-3 py-2.5 text-sm shadow-[var(--shadow-soft)]'
            value={selectedAnwalt}
            onChange={(e) => setSelectedAnwalt(e.target.value)}
            disabled={loadingUsers}
          >
            <option value=''>— auswählen —</option>
            {anwaltUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} {u.email ? `(${u.email})` : ''}
              </option>
            ))}
          </select>
        </div>
        <button
          className='bg-foreground text-background rounded-full px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-soft)] transition-opacity hover:opacity-90 disabled:opacity-60'
          onClick={() => assign('ANWALT', selectedAnwalt)}
          disabled={!selectedAnwalt || saving !== null}
        >
          {saving === 'ANWALT' ? 'Zuweisen...' : 'Anwalt zuweisen'}
        </button>
      </div>

      <div className='border-border/60 bg-background/82 space-y-4 rounded-[32px] border p-4 shadow-[var(--shadow-soft)]'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase'>
            Status
          </div>
          <div className='font-heading text-foreground text-lg font-semibold tracking-tight'>
            Aktuelle Zuweisungen
          </div>
          <div className='text-muted-foreground text-xs'>
            Übersicht der aktiven Assignment-Zustände für diesen Fall.
          </div>
        </div>

        <div className='grid gap-3 md:grid-cols-2'>
          <div className='border-border/60 bg-background/84 rounded-[28px] border p-4 shadow-[var(--shadow-soft)]'>
            <div className='text-muted-foreground mb-1 text-[11px] font-semibold tracking-[0.14em] uppercase'>
              Gutachter
            </div>
            {loadingAssignments ? (
              <div className='text-muted-foreground text-sm'>lädt…</div>
            ) : currentGutachter ? (
              <div className='space-y-1.5'>
                <div className='text-foreground text-sm font-medium'>
                  {currentGutachterUser?.name || 'Unbekannter User'}
                </div>

                <div className='text-muted-foreground text-xs'>
                  {currentGutachterUser?.email || '—'}
                </div>
                <div className='text-muted-foreground flex flex-wrap gap-2 text-xs'>
                  <span className='border-border/60 bg-background/90 rounded-full border px-2.5 py-1 font-mono shadow-[var(--shadow-soft)]'>
                    {currentGutachter.status}
                  </span>
                  <span className='border-border/60 bg-background/90 rounded-full border px-2.5 py-1 shadow-[var(--shadow-soft)]'>
                    {fmtDateTime(currentGutachter.expiresAt)}
                  </span>
                </div>
              </div>
            ) : (
              <div className='text-muted-foreground text-sm'>— keine —</div>
            )}
          </div>

          <div className='border-border/60 bg-background/84 rounded-[28px] border p-4 shadow-[var(--shadow-soft)]'>
            <div className='text-muted-foreground mb-1 text-[11px] font-semibold tracking-[0.14em] uppercase'>
              Anwalt
            </div>
            {loadingAssignments ? (
              <div className='text-muted-foreground text-sm'>lädt…</div>
            ) : currentAnwalt ? (
              <div className='space-y-1.5'>
                <div className='text-foreground text-sm font-medium'>
                  {currentAnwaltUser?.name || 'Unbekannter User'}
                </div>

                <div className='text-muted-foreground text-xs'>
                  {currentAnwaltUser?.email || '—'}
                </div>
                <div className='text-muted-foreground flex flex-wrap gap-2 text-xs'>
                  <span className='border-border/60 bg-background/90 rounded-full border px-2.5 py-1 shadow-[var(--shadow-soft)]'>
                    {currentAnwalt.status}
                  </span>
                  <span className='border-border/60 bg-background/90 rounded-full border px-2.5 py-1 shadow-[var(--shadow-soft)]'>
                    {fmtDateTime(currentAnwalt.expiresAt)}
                  </span>
                </div>
              </div>
            ) : (
              <div className='text-muted-foreground text-sm'>— keine —</div>
            )}
          </div>
        </div>
      </div>

      <div className='border-border/60 bg-background/82 space-y-4 rounded-[32px] border p-4 shadow-[var(--shadow-soft)]'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase'>
            Historie
          </div>
          <div className='font-heading text-foreground text-lg font-semibold tracking-tight'>
            Letzte Zuweisungen
          </div>
          <div className='text-muted-foreground text-xs'>
            Verlauf der letzten Assignment-Einträge dieses Falls
          </div>
        </div>

        {loadingAssignments ? (
          <div className='text-muted-foreground text-sm'>lädt…</div>
        ) : recentAssignments.length === 0 ? (
          <div className='text-muted-foreground text-sm'>
            Noch keine Assignment-Historie.
          </div>
        ) : (
          <div className='space-y-2'>
            {recentAssignments.map((a) => {
              const user = getUserById(a.assigneeClerkUserId);

              return (
                <div
                  key={a.id}
                  className='border-border/60 bg-background/84 rounded-[28px] border p-4 shadow-[var(--shadow-soft)]'
                >
                  <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
                    <span className='border-border/60 bg-background/90 rounded-full border px-2.5 py-1 font-mono text-[11px] shadow-[var(--shadow-soft)]'>
                      {a.role}
                    </span>
                    <span className='border-border/60 bg-background/90 rounded-full border px-2.5 py-1 font-mono text-[11px] shadow-[var(--shadow-soft)]'>
                      {a.status}
                    </span>
                    <span className='text-muted-foreground text-xs'>
                      {user?.name || 'Unbekannter User'}
                    </span>
                    <span className='text-muted-foreground text-xs'>
                      {user?.email || '—'}
                    </span>
                  </div>

                  <div className='text-muted-foreground mt-2 flex flex-wrap gap-2 text-xs'>
                    <span className='border-border/60 bg-background/90 rounded-full border px-2.5 py-1 shadow-[var(--shadow-soft)]'>
                      assigned {fmtDateTime(a.assignedAt)}
                    </span>
                    <span className='border-border/60 bg-background/90 rounded-full border px-2.5 py-1 shadow-[var(--shadow-soft)]'>
                      expires {fmtDateTime(a.expiresAt)}
                    </span>
                    <span className='border-border/60 bg-background/90 rounded-full border px-2.5 py-1 shadow-[var(--shadow-soft)]'>
                      accepted {fmtDateTime(a.acceptedAt)}
                    </span>
                    <span className='border-border/60 bg-background/90 rounded-full border px-2.5 py-1 shadow-[var(--shadow-soft)]'>
                      released {fmtDateTime(a.releasedAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {loadingUsers || loadingAssignments ? (
        <div className='text-muted-foreground text-xs'>Lädt Daten…</div>
      ) : null}

      {error ? (
        <div className='border-border/60 rounded-[24px] border bg-red-50/80 px-4 py-3 text-sm text-red-900 shadow-[var(--shadow-soft)]'>
          {error}
        </div>
      ) : null}
    </div>
  );
}
