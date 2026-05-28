'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AssignmentHeaderFilters from './assignment-header-filters';

type UserRow = {
  id: string;
  role: 'ADMIN' | 'GUTACHTER' | 'ANWALT' | '';
  name?: string | null;
  email?: string | null;
};

type UsersApiResponse =
  | { ok: true; users: UserRow[] }
  | { ok: false; error: string };

export default function AdminCasesTable(props: { cases: any[] }) {
  const router = useRouter();

  // Header filter (Status)
  const [gutachterFilter, setGutachterFilter] = useState<string>('ALL');
  const [anwaltFilter, setAnwaltFilter] = useState<string>('ALL');
  const [opsFilter, setOpsFilter] = useState<string>('ALL');

  // Users
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Assignment UI state (pro Case)
  const [pickGutachter, setPickGutachter] = useState<Record<string, string>>(
    {}
  );
  const [pickAnwalt, setPickAnwalt] = useState<Record<string, string>>({});
  const [forceReassign, setForceReassign] = useState<boolean>(false);

  const [busyCaseId, setBusyCaseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Labels (Status) - identisch zu vorher
  const labelGutachter = (s: string) => {
    const map: Record<string, string> = {
      EINGEGANGEN: 'Eingegangen',
      DATEN_UNVOLLSTAENDIG: 'Daten unvollständig',
      GUTACHTER_KONTAKTIERT: 'Gutachter kontaktiert',
      TERMIN_GEPLANT: 'Termin geplant',
      GUTACHTEN_IN_BEARBEITUNG: 'Gutachten in Bearbeitung',
      GUTACHTEN_ERSTELLT: 'Gutachten erstellt',
      ABGESCHLOSSEN: 'Abgeschlossen'
    };
    return map[s] ?? s;
  };

  const labelAnwalt = (s: string) => {
    const map: Record<string, string> = {
      FALL_EINGEGANGEN: 'Fall eingegangen',
      FALL_IN_PRUEFUNG: 'Fall in Prüfung',
      RUECKFRAGEN_IN_KLAERUNG: 'Rückfragen in Klärung',
      FALL_BERICHT_ERSTELLT: 'Fall Bericht erstellt',
      FALL_ABGESCHLOSSEN: 'Fall inkl. Einschätzung abgeschlossen'
    };
    return map[s] ?? s;
  };

  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);

  const fmtDt = (d?: Date | null) =>
    d
      ? new Intl.DateTimeFormat('de-DE', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }).format(new Date(d))
      : '—';

  // 1) Users laden
  useEffect(() => {
    let alive = true;

    async function loadUsers() {
      setUsersLoading(true);
      setUsersError(null);
      try {
        const res = await fetch('/api/admin/users', {
          cache: 'no-store',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (res.status === 401) {
          if (!alive) return;
          setUsersError('Unauthorized (401) – bitte neu einloggen.');
          setUsers([]);
          return;
        }

        const data = (await res
          .json()
          .catch(() => null)) as UsersApiResponse | null;

        if (!alive) return;

        if (!res.ok || !data || (data as any).ok !== true) {
          setUsersError(
            (data as any)?.error ||
              `Konnte User-Liste nicht laden (${res.status})`
          );
          setUsers([]);
          return;
        }

        setUsers((data as any).users ?? []);
      } catch (e: any) {
        if (!alive) return;
        setUsersError(e?.message ?? 'Fehler beim Laden der User-Liste');
        setUsers([]);
      } finally {
        if (!alive) return;
        setUsersLoading(false);
      }
    }

    loadUsers();
    return () => {
      alive = false;
    };
  }, []);

  const gutachterUsers = useMemo(
    () => users.filter((u) => u.role === 'GUTACHTER'),
    [users]
  );
  const anwaltUsers = useMemo(
    () => users.filter((u) => u.role === 'ANWALT'),
    [users]
  );

  // Filter Cases nach Assignment-Status (Header Filter)
  const filtered = useMemo(() => {
    return props.cases.filter((c) => {
      const assignments = c.assignments ?? [];
      const g = assignments.find((a: any) => a.role === 'GUTACHTER') ?? null;
      const a = assignments.find((a: any) => a.role === 'ANWALT') ?? null;

      const gOk =
        gutachterFilter === 'ALL'
          ? true
          : (g?.status ?? '') === gutachterFilter;

      const aOk =
        anwaltFilter === 'ALL' ? true : (a?.status ?? '') === anwaltFilter;

      const hasProblem =
        assignments.some(
          (x: any) => x.status === 'EXPIRED' || x.status === 'RELEASED'
        ) ?? false;

      const hasPending =
        assignments.some((x: any) => x.status === 'PENDING') ?? false;

      const opsOk =
        opsFilter === 'ALL'
          ? true
          : opsFilter === 'NO_GUTACHTER'
            ? !g
            : opsFilter === 'NO_ANWALT'
              ? !a
              : opsFilter === 'PENDING'
                ? hasPending
                : opsFilter === 'PROBLEM'
                  ? hasProblem
                  : true;

      return gOk && aOk && opsOk;
    });
  }, [props.cases, gutachterFilter, anwaltFilter, opsFilter]);

  async function assign(caseId: string, role: 'GUTACHTER' | 'ANWALT') {
    setError(null);
    setBusyCaseId(caseId);
    try {
      const assignee =
        role === 'GUTACHTER' ? pickGutachter[caseId] : pickAnwalt[caseId];

      if (!assignee) {
        throw new Error(
          role === 'GUTACHTER'
            ? 'Bitte einen Gutachter auswählen.'
            : 'Bitte einen Anwalt auswählen.'
        );
      }

      const res = await fetch(`/api/cases/${caseId}/assign`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          assigneeClerkUserId: assignee,
          force: Boolean(forceReassign)
          // expiresInHours: optional – wenn du es später als UI willst, hier ergänzen
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Assign failed (${res.status})`);
      }

      // wichtig: aktualisiert die Server-Komponente / Cases-Liste
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Unbekannter Fehler');
    } finally {
      setBusyCaseId(null);
    }
  }

  return (
    <div className='border-border/60 bg-background/82 overflow-hidden rounded-[28px] border shadow-[var(--shadow-soft)]'>
      {/* Header */}
      <div className='from-muted/16 to-muted/6 border-border/60 grid grid-cols-8 items-center gap-3 border-b bg-gradient-to-b px-4 py-4 text-sm font-medium md:px-6'>
        <div className='text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase'>
          Case
        </div>
        <div className='text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase'>
          Kunde
        </div>
        <div className='text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase'>
          Gutachter
        </div>
        <div className='text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase'>
          Anwalt
        </div>

        <div className='col-span-2 space-y-2'>
          <div className='flex items-center justify-between gap-2'>
            <span className='text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase'>
              Assignments
            </span>
            <label className='text-muted-foreground flex items-center gap-2 text-xs font-normal'>
              <input
                type='checkbox'
                className='h-4 w-4'
                checked={forceReassign}
                onChange={(e) => setForceReassign(e.target.checked)}
              />
              Force
            </label>
          </div>

          <AssignmentHeaderFilters
            valueGutachter={gutachterFilter}
            valueAnwalt={anwaltFilter}
            onChangeGutachter={setGutachterFilter}
            onChangeAnwalt={setAnwaltFilter}
          />
          <select
            className='bg-background/90 border-border/60 focus-visible:ring-primary/20 w-full rounded-2xl border px-3 py-2 text-xs shadow-[var(--shadow-soft)] transition-colors focus-visible:ring-2 focus-visible:outline-none'
            value={opsFilter}
            onChange={(e) => setOpsFilter(e.target.value)}
            title='Operativer Schnellfilter'
          >
            <option value='ALL'>Ops: Alle</option>
            <option value='NO_GUTACHTER'>Ops: ohne Gutachter</option>
            <option value='NO_ANWALT'>Ops: ohne Anwalt</option>
            <option value='PENDING'>Ops: mit PENDING</option>
            <option value='PROBLEM'>Ops: EXPIRED/RELEASED</option>
          </select>
        </div>

        <div className='text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase'>
          Updated
        </div>
        <div className='text-muted-foreground text-right text-xs font-semibold tracking-[0.14em] uppercase'>
          Kunden-Link
        </div>
      </div>

      {/* Errors */}
      {error ? (
        <div className='border-border/60 border-b bg-red-50/70 px-4 py-3 text-sm text-red-800 md:px-6'>
          {error}
        </div>
      ) : null}

      {/* Users status */}
      {usersLoading ? (
        <div className='text-muted-foreground border-border/60 bg-background/78 border-b px-4 py-3 text-sm md:px-6'>
          Lade User-Liste…
        </div>
      ) : usersError ? (
        <div className='border-border/60 border-b bg-red-50/70 px-4 py-3 text-sm text-red-800 md:px-6'>
          {usersError}
        </div>
      ) : null}

      {/* Body */}
      {filtered.length === 0 ? (
        <div className='text-muted-foreground bg-background/78 px-4 py-6 text-sm md:px-6'>
          Keine Cases passend zum Filter.
        </div>
      ) : (
        filtered.map((c: any) => {
          const gAssign =
            c.assignments?.find((x: any) => x.role === 'GUTACHTER') ?? null;
          const aAssign =
            c.assignments?.find((x: any) => x.role === 'ANWALT') ?? null;

          const isBusy = busyCaseId === c.id;

          return (
            <div
              key={c.id}
              className='border-border/60 bg-background/84 hover:bg-primary/[0.02] mx-4 mb-3 grid grid-cols-8 gap-3 rounded-[24px] border px-4 py-4 text-sm shadow-[var(--shadow-soft)] transition-colors last:mb-4 md:mx-6'
            >
              {/* Case */}
              <div className='text-foreground font-mono text-sm font-semibold'>
                <Link
                  className='border-border/60 bg-background/90 decoration-muted-foreground/40 hover:bg-muted/50 hover:decoration-foreground/70 inline-flex rounded-full border px-3 py-1.5 underline underline-offset-4 shadow-[var(--shadow-soft)] transition-colors hover:opacity-90'
                  href={`/dashboard/cases/${c.id}`}
                >
                  {c.caseNumber ?? '—'}
                </Link>
              </div>

              {/* Kunde */}
              <div className='text-foreground min-w-0 truncate text-sm font-semibold'>
                {[c.customer?.firstName, c.customer?.lastName]
                  .filter(Boolean)
                  .join(' ')
                  .trim() || '—'}
              </div>

              {/* Status Gutachter/Anwalt */}
              <div className='flex items-start'>
                <span className='border-border/60 bg-background/90 text-foreground inline-flex rounded-full border px-3 py-1.5 text-sm shadow-[var(--shadow-soft)]'>
                  {labelGutachter(String(c.gutachterStatus))}
                </span>
              </div>
              <div className='flex items-start'>
                <span className='border-border/60 bg-background/90 text-foreground inline-flex rounded-full border px-3 py-1.5 text-sm shadow-[var(--shadow-soft)]'>
                  {labelAnwalt(String(c.anwaltStatus))}
                </span>
              </div>

              {/* Assignment G */}
              <div className='border-border/60 bg-background/78 space-y-2 rounded-[24px] border p-3 shadow-[var(--shadow-soft)]'>
                <div className='text-muted-foreground text-xs leading-5'>
                  {gAssign
                    ? `${gAssign.status} · ${fmtDt(gAssign.assignedAt)}`
                    : '—'}
                </div>

                <select
                  className='bg-background/85 border-border/60 focus-visible:ring-primary/20 w-full rounded-2xl border px-3 py-2 text-xs shadow-[var(--shadow-soft)] transition-colors focus-visible:ring-2 focus-visible:outline-none'
                  value={pickGutachter[c.id] ?? ''}
                  onChange={(e) =>
                    setPickGutachter((prev) => ({
                      ...prev,
                      [c.id]: e.target.value
                    }))
                  }
                  disabled={usersLoading || !!usersError || isBusy}
                >
                  <option value=''>Gutachter wählen…</option>
                  {gutachterUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {(u.name || u.email || u.id).slice(0, 60)}
                    </option>
                  ))}
                </select>

                <button
                  className='hover:bg-muted/50 border-border/60 bg-background/90 w-full rounded-2xl border px-3 py-2 text-xs shadow-[var(--shadow-soft)] transition-colors disabled:opacity-60'
                  onClick={() => assign(c.id, 'GUTACHTER')}
                  disabled={usersLoading || !!usersError || isBusy}
                  title={
                    forceReassign ? 'Force = ersetzt aktive Zuweisung' : ''
                  }
                >
                  {isBusy ? '…' : 'Zuweisen G'}
                </button>
              </div>

              {/* Assignment A */}
              <div className='border-border/60 bg-background/78 space-y-2 rounded-[24px] border p-3 shadow-[var(--shadow-soft)]'>
                <div className='text-muted-foreground text-xs leading-5'>
                  {aAssign
                    ? `${aAssign.status} · ${fmtDt(aAssign.assignedAt)}`
                    : '—'}
                </div>

                <select
                  className='bg-background/85 border-border/60 focus-visible:ring-primary/20 w-full rounded-2xl border px-3 py-2 text-xs shadow-[var(--shadow-soft)] transition-colors focus-visible:ring-2 focus-visible:outline-none'
                  value={pickAnwalt[c.id] ?? ''}
                  onChange={(e) =>
                    setPickAnwalt((prev) => ({
                      ...prev,
                      [c.id]: e.target.value
                    }))
                  }
                  disabled={usersLoading || !!usersError || isBusy}
                >
                  <option value=''>Anwalt wählen…</option>
                  {anwaltUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {(u.name || u.email || u.id).slice(0, 60)}
                    </option>
                  ))}
                </select>

                <button
                  className='hover:bg-muted/50 border-border/60 bg-background/90 w-full rounded-2xl border px-3 py-2 text-xs shadow-[var(--shadow-soft)] transition-colors disabled:opacity-60'
                  onClick={() => assign(c.id, 'ANWALT')}
                  disabled={usersLoading || !!usersError || isBusy}
                  title={
                    forceReassign ? 'Force = ersetzt aktive Zuweisung' : ''
                  }
                >
                  {isBusy ? '…' : 'Zuweisen A'}
                </button>
              </div>

              {/* Updated */}
              <div className='text-muted-foreground flex items-start text-sm'>
                <span className='border-border/60 bg-background/90 inline-flex rounded-full border px-3 py-1.5 shadow-[var(--shadow-soft)]'>
                  {fmtDate(new Date(c.updatedAt))}
                </span>
              </div>

              {/* Customer link */}
              <div className='text-right'>
                <Link
                  className='border-border/60 bg-background/90 decoration-muted-foreground/40 hover:bg-muted/50 hover:decoration-foreground/70 inline-flex items-center rounded-full border px-3 py-1.5 text-sm underline underline-offset-4 shadow-[var(--shadow-soft)] transition-colors hover:opacity-90'
                  href={`/case/${c.token}`}
                  target='_blank'
                >
                  öffnen
                </Link>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
