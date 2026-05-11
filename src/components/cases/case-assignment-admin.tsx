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
    <div className='space-y-4 rounded-lg border p-4'>
      <div className='text-sm font-medium'>Case zuweisen (ADMIN)</div>

      <div className='grid gap-3 md:grid-cols-3'>
        <div>
          <div className='text-muted-foreground mb-1 text-xs'>
            Frist (Stunden)
          </div>
          <input
            className='bg-background w-full rounded-md border px-3 py-2 text-sm'
            type='number'
            min={1}
            max={168}
            value={expiresInHours}
            onChange={(e) => setExpiresInHours(Number(e.target.value))}
          />
        </div>

        <label className='flex items-end gap-2 text-sm'>
          <input
            type='checkbox'
            checked={force}
            onChange={(e) => setForce(e.target.checked)}
          />
          force (aktive Zuweisung ersetzen)
        </label>

        <button
          className='rounded-md border px-3 py-2 text-sm hover:opacity-80'
          onClick={() => {
            loadUsers();
            loadAssignments();
          }}
          disabled={loadingUsers || loadingAssignments}
        >
          Refresh
        </button>
      </div>

      <div className='grid gap-2 md:grid-cols-[1fr_auto] md:items-end'>
        <div>
          <div className='text-muted-foreground mb-1 text-xs'>
            Gutachter auswählen
          </div>
          <select
            className='bg-background w-full rounded-md border px-3 py-2 text-sm'
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
          className='bg-foreground text-background rounded-md px-4 py-2 text-sm disabled:opacity-60'
          onClick={() => assign('GUTACHTER', selectedGutachter)}
          disabled={!selectedGutachter || saving !== null}
        >
          {saving === 'GUTACHTER' ? 'Zuweisen...' : 'Gutachter zuweisen'}
        </button>
      </div>

      <div className='grid gap-2 md:grid-cols-[1fr_auto] md:items-end'>
        <div>
          <div className='text-muted-foreground mb-1 text-xs'>
            Anwalt auswählen
          </div>
          <select
            className='bg-background w-full rounded-md border px-3 py-2 text-sm'
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
          className='bg-foreground text-background rounded-md px-4 py-2 text-sm disabled:opacity-60'
          onClick={() => assign('ANWALT', selectedAnwalt)}
          disabled={!selectedAnwalt || saving !== null}
        >
          {saving === 'ANWALT' ? 'Zuweisen...' : 'Anwalt zuweisen'}
        </button>
      </div>

      <div className='space-y-2 rounded-md border p-3 text-sm'>
        <div className='font-medium'>Aktuelle Zuweisungen (Preview)</div>

        <div className='grid gap-2 md:grid-cols-2'>
          <div className='rounded-md border p-3'>
            <div className='text-muted-foreground mb-1 text-xs'>Gutachter</div>
            {loadingAssignments ? (
              <div className='text-muted-foreground'>lädt…</div>
            ) : currentGutachter ? (
              <div className='space-y-1'>
                <div className='text-xs font-medium'>
                  {currentGutachterUser?.name || 'Unbekannter User'}
                </div>

                <div className='text-muted-foreground text-xs'>
                  {currentGutachterUser?.email || '—'}
                </div>

                <div className='text-muted-foreground text-xs'>
                  id:{' '}
                  <span className='font-mono'>
                    {currentGutachter.assigneeClerkUserId}
                  </span>
                </div>

                <div className='text-xs'>
                  status:{' '}
                  <span className='font-mono'>{currentGutachter.status}</span>
                </div>

                <div className='text-xs'>
                  expires: {fmtDateTime(currentGutachter.expiresAt)}
                </div>

                <div className='text-xs'>
                  accepted: {fmtDateTime(currentGutachter.acceptedAt)}
                </div>

                <div className='text-xs'>
                  released: {fmtDateTime(currentGutachter.releasedAt)}
                </div>
              </div>
            ) : (
              <div className='text-muted-foreground'>— keine —</div>
            )}
          </div>

          <div className='rounded-md border p-3'>
            <div className='text-muted-foreground mb-1 text-xs'>Anwalt</div>
            {loadingAssignments ? (
              <div className='text-muted-foreground'>lädt…</div>
            ) : currentAnwalt ? (
              <div className='space-y-1'>
                <div className='text-xs font-medium'>
                  {currentAnwaltUser?.name || 'Unbekannter User'}
                </div>

                <div className='text-muted-foreground text-xs'>
                  {currentAnwaltUser?.email || '—'}
                </div>

                <div className='text-muted-foreground text-xs'>
                  id:{' '}
                  <span className='font-mono'>
                    {currentAnwalt.assigneeClerkUserId}
                  </span>
                </div>

                <div className='text-xs'>
                  status:{' '}
                  <span className='font-mono'>{currentAnwalt.status}</span>
                </div>

                <div className='text-xs'>
                  expires: {fmtDateTime(currentAnwalt.expiresAt)}
                </div>

                <div className='text-xs'>
                  accepted: {fmtDateTime(currentAnwalt.acceptedAt)}
                </div>

                <div className='text-xs'>
                  released: {fmtDateTime(currentAnwalt.releasedAt)}
                </div>
              </div>
            ) : (
              <div className='text-muted-foreground'>— keine —</div>
            )}
          </div>
        </div>
      </div>

      <div className='space-y-2 rounded-md border p-3 text-sm'>
        <div className='font-medium'>Letzte Zuweisungen</div>
        <div className='text-muted-foreground text-xs'>
          Verlauf der letzten Assignment-Einträge dieses Falls
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
                <div key={a.id} className='rounded-md border p-3'>
                  <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
                    <span className='font-mono text-xs'>{a.role}</span>
                    <span className='font-mono text-xs'>{a.status}</span>
                    <span className='text-muted-foreground text-xs'>
                      {user?.name || 'Unbekannter User'}
                    </span>
                    <span className='text-muted-foreground text-xs'>
                      {user?.email || '—'}
                    </span>
                  </div>

                  <div className='text-muted-foreground mt-2 space-y-1 text-xs'>
                    <div>
                      id:{' '}
                      <span className='font-mono'>{a.assigneeClerkUserId}</span>
                    </div>
                    <div>assigned: {fmtDateTime(a.assignedAt)}</div>
                    <div>expires: {fmtDateTime(a.expiresAt)}</div>
                    <div>accepted: {fmtDateTime(a.acceptedAt)}</div>
                    <div>released: {fmtDateTime(a.releasedAt)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {loadingUsers || loadingAssignments ? (
        <div className='text-muted-foreground text-xs'>lädt Daten…</div>
      ) : null}

      {error ? <div className='text-sm text-red-500'>{error}</div> : null}
    </div>
  );
}
