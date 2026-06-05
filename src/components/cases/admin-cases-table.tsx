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
    <div
      className='lumen-card-horizon overflow-hidden rounded-lg'
      style={{
        backgroundColor: 'var(--lumen-panel)',
        backgroundImage: 'var(--lumen-surface-panel)',
        boxShadow: 'var(--lumen-rim), var(--lumen-shadow-card)'
      }}
    >
      {/* ── Sticky filter header ── */}
      <div
        className='border-b px-6 py-5'
        style={{
          backgroundColor: 'var(--lumen-panel-raised)',
          borderColor: 'var(--lumen-hairline)'
        }}
      >
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <div
              className='text-muted-foreground mb-1 text-[10px] font-medium tracking-[0.08em] uppercase'
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Case-Übersicht
            </div>
            <div className='text-foreground text-sm font-semibold'>
              {filtered.length} {filtered.length === 1 ? 'Fall' : 'Fälle'}{' '}
              angezeigt
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-3'>
            <AssignmentHeaderFilters
              valueGutachter={gutachterFilter}
              valueAnwalt={anwaltFilter}
              onChangeGutachter={setGutachterFilter}
              onChangeAnwalt={setAnwaltFilter}
            />
            <select
              className='rounded-md border-0 px-3 py-2 text-xs transition-[box-shadow] duration-[420ms] outline-none'
              style={{
                backgroundColor: 'var(--lumen-panel)',
                boxShadow: 'var(--lumen-rim)',
                color: 'var(--lumen-foreground)'
              }}
              value={opsFilter}
              onChange={(e) => setOpsFilter(e.target.value)}
            >
              <option value='ALL'>Ops: Alle</option>
              <option value='NO_GUTACHTER'>Ops: ohne Gutachter</option>
              <option value='NO_ANWALT'>Ops: ohne Anwalt</option>
              <option value='PENDING'>Ops: mit PENDING</option>
              <option value='PROBLEM'>Ops: EXPIRED/RELEASED</option>
            </select>
            <label
              className='text-muted-foreground flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs select-none'
              style={{
                backgroundColor: 'var(--lumen-panel)',
                boxShadow: 'var(--lumen-rim)'
              }}
            >
              <input
                type='checkbox'
                className='h-3.5 w-3.5 accent-[var(--lumen-glow)]'
                checked={forceReassign}
                onChange={(e) => setForceReassign(e.target.checked)}
              />
              <span style={{ fontFamily: 'var(--font-display)' }}>
                Force-Zuweisung
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* ── Column labels — desktop only ── */}
      <div
        className='hidden grid-cols-[1fr_1fr_1fr_1fr_1.4fr_1.4fr_auto_auto] gap-0 border-b px-6 py-3 md:grid'
        style={{ borderColor: 'var(--lumen-hairline)' }}
      >
        {[
          'Case',
          'Kunde',
          'Gutachter-Status',
          'Anwalt-Status',
          'Gutachter zuweisen',
          'Anwalt zuweisen',
          'Updated',
          ''
        ].map((label) => (
          <div
            key={label}
            className='text-muted-foreground pr-4 text-[10px] font-medium tracking-[0.08em] uppercase'
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* ── Status messages ── */}
      {error && (
        <div
          className='border-b px-6 py-3 text-sm'
          style={{
            borderColor: 'var(--lumen-hairline)',
            color: 'var(--color-destructive)',
            backgroundColor: 'rgba(255,138,138,0.06)'
          }}
        >
          {error}
        </div>
      )}
      {usersLoading && (
        <div
          className='text-muted-foreground border-b px-6 py-3 text-sm'
          style={{ borderColor: 'var(--lumen-hairline)' }}
        >
          Lade User-Liste…
        </div>
      )}
      {usersError && (
        <div
          className='border-b px-6 py-3 text-sm'
          style={{
            borderColor: 'var(--lumen-hairline)',
            color: 'var(--color-destructive)',
            backgroundColor: 'rgba(255,138,138,0.06)'
          }}
        >
          {usersError}
        </div>
      )}

      {/* ── Empty state ── */}
      {filtered.length === 0 ? (
        <div className='text-muted-foreground px-6 py-12 text-center text-sm'>
          Keine Cases passend zum Filter.
        </div>
      ) : (
        <div className='space-y-3 p-4 md:p-6'>
          {filtered.map((c: any) => {
            const gAssign =
              c.assignments?.find((x: any) => x.role === 'GUTACHTER') ?? null;
            const aAssign =
              c.assignments?.find((x: any) => x.role === 'ANWALT') ?? null;
            const isBusy = busyCaseId === c.id;

            return (
              <div
                key={c.id}
                className='overflow-hidden rounded-md'
                style={{
                  backgroundColor: 'var(--lumen-panel-raised)',
                  boxShadow: 'var(--lumen-rim)'
                }}
              >
                {/* Row: main info — responsive */}
                <div className='hidden grid-cols-[1fr_1fr_1fr_1fr_1.4fr_1.4fr_auto_auto] items-start gap-0 px-5 py-5 md:grid'>
                  {/* Case number */}
                  <div className='pr-4'>
                    <Link
                      href={`/dashboard/cases/${c.id}`}
                      className='text-foreground inline-flex items-center rounded-md px-2.5 py-1 text-sm font-semibold transition-colors duration-[420ms] hover:text-[var(--lumen-glow)]'
                      style={{
                        fontFamily: 'var(--font-mono)',
                        backgroundColor: 'var(--lumen-panel)',
                        boxShadow: 'var(--lumen-rim)'
                      }}
                    >
                      {c.caseNumber ?? '—'}
                    </Link>
                  </div>

                  {/* Kunde */}
                  <div className='flex items-center pt-1 pr-4'>
                    <span className='text-foreground truncate text-sm font-medium'>
                      {[c.customer?.firstName, c.customer?.lastName]
                        .filter(Boolean)
                        .join(' ')
                        .trim() || '—'}
                    </span>
                  </div>

                  {/* Gutachter Status */}
                  <div className='pt-1 pr-4'>
                    <span className='text-foreground/80 text-xs leading-5'>
                      {labelGutachter(String(c.gutachterStatus))}
                    </span>
                  </div>

                  {/* Anwalt Status */}
                  <div className='pt-1 pr-4'>
                    <span className='text-foreground/80 text-xs leading-5'>
                      {labelAnwalt(String(c.anwaltStatus))}
                    </span>
                  </div>

                  {/* Assignment Gutachter */}
                  <div className='space-y-2 pr-4'>
                    {gAssign && (
                      <div
                        className='mb-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px]'
                        style={{
                          fontFamily: 'var(--font-mono)',
                          backgroundColor: 'var(--lumen-panel)',
                          boxShadow: 'var(--lumen-rim)',
                          color: 'var(--lumen-muted)'
                        }}
                      >
                        {gAssign.status} · {fmtDt(gAssign.assignedAt)}
                      </div>
                    )}
                    <select
                      className='w-full rounded-md border-0 px-2.5 py-1.5 text-xs outline-none'
                      style={{
                        backgroundColor: 'var(--lumen-panel)',
                        boxShadow: 'var(--lumen-rim)',
                        color: 'var(--lumen-foreground)'
                      }}
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
                          {(u.name || u.email || u.id).slice(0, 50)}
                        </option>
                      ))}
                    </select>
                    <button
                      className='lumen-horizon text-foreground/75 hover:text-foreground w-full rounded-md px-3 py-1.5 text-xs font-medium transition-[color,box-shadow,transform] duration-[420ms] disabled:cursor-not-allowed disabled:opacity-50'
                      style={{
                        background: 'var(--lumen-surface)',
                        boxShadow: 'var(--lumen-rim)'
                      }}
                      onClick={() => assign(c.id, 'GUTACHTER')}
                      disabled={usersLoading || !!usersError || isBusy}
                      title={
                        forceReassign ? 'Force = ersetzt aktive Zuweisung' : ''
                      }
                    >
                      {isBusy ? '…' : 'Gutachter zuweisen'}
                    </button>
                  </div>

                  {/* Assignment Anwalt */}
                  <div className='space-y-2 pr-4'>
                    {aAssign && (
                      <div
                        className='mb-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px]'
                        style={{
                          fontFamily: 'var(--font-mono)',
                          backgroundColor: 'var(--lumen-panel)',
                          boxShadow: 'var(--lumen-rim)',
                          color: 'var(--lumen-muted)'
                        }}
                      >
                        {aAssign.status} · {fmtDt(aAssign.assignedAt)}
                      </div>
                    )}
                    <select
                      className='w-full rounded-md border-0 px-2.5 py-1.5 text-xs outline-none'
                      style={{
                        backgroundColor: 'var(--lumen-panel)',
                        boxShadow: 'var(--lumen-rim)',
                        color: 'var(--lumen-foreground)'
                      }}
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
                          {(u.name || u.email || u.id).slice(0, 50)}
                        </option>
                      ))}
                    </select>
                    <button
                      className='lumen-horizon text-foreground/75 hover:text-foreground w-full rounded-md px-3 py-1.5 text-xs font-medium transition-[color,box-shadow,transform] duration-[420ms] disabled:cursor-not-allowed disabled:opacity-50'
                      style={{
                        background: 'var(--lumen-surface)',
                        boxShadow: 'var(--lumen-rim)'
                      }}
                      onClick={() => assign(c.id, 'ANWALT')}
                      disabled={usersLoading || !!usersError || isBusy}
                      title={
                        forceReassign ? 'Force = ersetzt aktive Zuweisung' : ''
                      }
                    >
                      {isBusy ? '…' : 'Anwalt zuweisen'}
                    </button>
                  </div>

                  {/* Updated */}
                  <div className='px-4 pt-1 text-right'>
                    <span
                      className='text-muted-foreground text-[11px] whitespace-nowrap'
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {fmtDate(new Date(c.updatedAt))}
                    </span>
                  </div>

                  {/* Customer link */}
                  <div className='pt-0.5 pl-2'>
                    <Link
                      className='lumen-horizon text-foreground/75 hover:text-foreground inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-[color,box-shadow,transform] duration-[420ms]'
                      style={{
                        background: 'var(--lumen-surface)',
                        boxShadow: 'var(--lumen-rim)'
                      }}
                      href={`/case/${c.token}`}
                      target='_blank'
                    >
                      öffnen ↗
                    </Link>
                  </div>
                </div>

                {/* ── Mobile card layout ── */}
                <div className='space-y-4 p-4 md:hidden'>
                  {/* Header row */}
                  <div className='flex items-center justify-between gap-3'>
                    <Link
                      href={`/dashboard/cases/${c.id}`}
                      className='text-foreground inline-flex items-center rounded-md px-2.5 py-1 text-sm font-semibold'
                      style={{
                        fontFamily: 'var(--font-mono)',
                        backgroundColor: 'var(--lumen-panel)',
                        boxShadow: 'var(--lumen-rim)'
                      }}
                    >
                      {c.caseNumber ?? '—'}
                    </Link>
                    <span className='text-foreground truncate text-sm font-medium'>
                      {[c.customer?.firstName, c.customer?.lastName]
                        .filter(Boolean)
                        .join(' ')
                        .trim() || '—'}
                    </span>
                    <Link
                      className='lumen-horizon text-foreground/75 inline-flex shrink-0 items-center rounded-md px-3 py-1.5 text-xs font-medium'
                      style={{
                        background: 'var(--lumen-surface)',
                        boxShadow: 'var(--lumen-rim)'
                      }}
                      href={`/case/${c.token}`}
                      target='_blank'
                    >
                      öffnen ↗
                    </Link>
                  </div>

                  {/* Status row */}
                  <div className='grid grid-cols-2 gap-2'>
                    <div
                      className='space-y-1 rounded-md p-3'
                      style={{
                        backgroundColor: 'var(--lumen-panel)',
                        boxShadow: 'var(--lumen-rim)'
                      }}
                    >
                      <div
                        className='text-muted-foreground text-[10px] tracking-[0.08em] uppercase'
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        Gutachter
                      </div>
                      <div className='text-foreground/80 text-xs'>
                        {labelGutachter(String(c.gutachterStatus))}
                      </div>
                    </div>
                    <div
                      className='space-y-1 rounded-md p-3'
                      style={{
                        backgroundColor: 'var(--lumen-panel)',
                        boxShadow: 'var(--lumen-rim)'
                      }}
                    >
                      <div
                        className='text-muted-foreground text-[10px] tracking-[0.08em] uppercase'
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        Anwalt
                      </div>
                      <div className='text-foreground/80 text-xs'>
                        {labelAnwalt(String(c.anwaltStatus))}
                      </div>
                    </div>
                  </div>

                  {/* Assignment rows */}
                  <div className='grid grid-cols-2 gap-3'>
                    {/* Gutachter */}
                    <div className='space-y-2'>
                      {gAssign && (
                        <div
                          className='text-muted-foreground inline-flex rounded-full px-2 py-0.5 text-[10px]'
                          style={{
                            fontFamily: 'var(--font-mono)',
                            backgroundColor: 'var(--lumen-panel)',
                            boxShadow: 'var(--lumen-rim)'
                          }}
                        >
                          {gAssign.status} · {fmtDt(gAssign.assignedAt)}
                        </div>
                      )}
                      <select
                        className='w-full rounded-md border-0 px-2.5 py-2 text-xs outline-none'
                        style={{
                          backgroundColor: 'var(--lumen-panel)',
                          boxShadow: 'var(--lumen-rim)',
                          color: 'var(--lumen-foreground)'
                        }}
                        value={pickGutachter[c.id] ?? ''}
                        onChange={(e) =>
                          setPickGutachter((prev) => ({
                            ...prev,
                            [c.id]: e.target.value
                          }))
                        }
                        disabled={usersLoading || !!usersError || isBusy}
                      >
                        <option value=''>Gutachter…</option>
                        {gutachterUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {(u.name || u.email || u.id).slice(0, 30)}
                          </option>
                        ))}
                      </select>
                      <button
                        className='lumen-horizon text-foreground/75 w-full rounded-md px-2 py-1.5 text-xs font-medium disabled:opacity-50'
                        style={{
                          background: 'var(--lumen-surface)',
                          boxShadow: 'var(--lumen-rim)'
                        }}
                        onClick={() => assign(c.id, 'GUTACHTER')}
                        disabled={usersLoading || !!usersError || isBusy}
                      >
                        {isBusy ? '…' : 'Zuweisen'}
                      </button>
                    </div>

                    {/* Anwalt */}
                    <div className='space-y-2'>
                      {aAssign && (
                        <div
                          className='text-muted-foreground inline-flex rounded-full px-2 py-0.5 text-[10px]'
                          style={{
                            fontFamily: 'var(--font-mono)',
                            backgroundColor: 'var(--lumen-panel)',
                            boxShadow: 'var(--lumen-rim)'
                          }}
                        >
                          {aAssign.status} · {fmtDt(aAssign.assignedAt)}
                        </div>
                      )}
                      <select
                        className='w-full rounded-md border-0 px-2.5 py-2 text-xs outline-none'
                        style={{
                          backgroundColor: 'var(--lumen-panel)',
                          boxShadow: 'var(--lumen-rim)',
                          color: 'var(--lumen-foreground)'
                        }}
                        value={pickAnwalt[c.id] ?? ''}
                        onChange={(e) =>
                          setPickAnwalt((prev) => ({
                            ...prev,
                            [c.id]: e.target.value
                          }))
                        }
                        disabled={usersLoading || !!usersError || isBusy}
                      >
                        <option value=''>Anwalt…</option>
                        {anwaltUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {(u.name || u.email || u.id).slice(0, 30)}
                          </option>
                        ))}
                      </select>
                      <button
                        className='lumen-horizon text-foreground/75 w-full rounded-md px-2 py-1.5 text-xs font-medium disabled:opacity-50'
                        style={{
                          background: 'var(--lumen-surface)',
                          boxShadow: 'var(--lumen-rim)'
                        }}
                        onClick={() => assign(c.id, 'ANWALT')}
                        disabled={usersLoading || !!usersError || isBusy}
                      >
                        {isBusy ? '…' : 'Zuweisen'}
                      </button>
                    </div>
                  </div>

                  {/* Updated */}
                  <div className='text-right'>
                    <span
                      className='text-muted-foreground text-[11px]'
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      Aktualisiert: {fmtDate(new Date(c.updatedAt))}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
