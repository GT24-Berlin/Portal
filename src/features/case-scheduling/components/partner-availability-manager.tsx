'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  CaseSchedulingDuration,
  CaseSchedulingRole,
  CaseSchedulingType,
  PartnerAvailabilitySlotRow
} from '../types';

// ─── Calendar helpers ─────────────────────────────────────────────────────────

/** ISO weekday: 1 = Monday … 7 = Sunday */
function isoWeekday(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstIsoWeekdayOfMonth(year: number, month: number): number {
  return isoWeekday(new Date(year, month, 1));
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;

const WEEKDAY_FULL = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
  'Sonntag'
] as const;

const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember'
] as const;

// ─── Form state ───────────────────────────────────────────────────────────────

type FormState = {
  role: CaseSchedulingRole;
  appointmentType: CaseSchedulingType;
  duration: CaseSchedulingDuration;
  weekday: string;
  startTime: string;
  endTime: string;
  bufferMinutes: string;
  isActive: boolean;
  recurring: boolean; // true = jede Woche, false = nur dieses eine Datum
};

function emptyForm(
  defaultRole: CaseSchedulingRole,
  weekday?: number
): FormState {
  return {
    role: defaultRole,
    appointmentType: 'PHONE',
    duration: 15,
    weekday: String(weekday ?? 1),
    startTime: '09:00',
    endTime: '12:00',
    bufferMinutes: '15',
    isActive: true,
    recurring: true
  };
}

function rowToForm(slot: PartnerAvailabilitySlotRow): FormState {
  return {
    role: slot.role,
    appointmentType: slot.appointmentType,
    duration: slot.duration === 'MINUTES_30' ? 30 : 15,
    weekday: String(slot.weekday),
    startTime: slot.startTime,
    endTime: slot.endTime,
    bufferMinutes: String(slot.bufferMinutes),
    isActive: slot.isActive,
    recurring: slot.specificDate == null
  };
}

// ─── Label helpers ────────────────────────────────────────────────────────────

function appointmentTypeLabel(value: CaseSchedulingType): string {
  return value === 'PHONE' ? 'Telefon' : 'Persönlich';
}

function durationLabel(value: PartnerAvailabilitySlotRow['duration']): string {
  return value === 'MINUTES_30' ? '30 Min' : '15 Min';
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const shellClass =
  'border-border/60 bg-background/82 overflow-hidden rounded-[32px] border shadow-[var(--shadow-soft)]';

const fieldClass =
  'bg-background/90 border-border/60 focus-visible:ring-primary/20 w-full rounded-[24px] border px-4 py-3 text-sm shadow-[var(--shadow-soft)] transition-colors focus-visible:ring-2 focus-visible:outline-none';

// ─── Component ────────────────────────────────────────────────────────────────

export default function PartnerAvailabilityManager(props: {
  defaultRole: CaseSchedulingRole;
}) {
  const { defaultRole } = props;

  // ── Data state ──────────────────────────────────────────────────────────────
  const [slots, setSlots] = useState<PartnerAvailabilitySlotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Calendar state ──────────────────────────────────────────────────────────
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultRole));

  const isEditing = Boolean(editingId);

  // ── API: load ────────────────────────────────────────────────────────────────

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/case-scheduling/availability-slots', {
        cache: 'no-store',
        credentials: 'include'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `Load failed (${res.status})`);
      }
      setSlots((data.slots ?? []) as PartnerAvailabilitySlotRow[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Laden der Slots');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // Keep form role in sync with defaultRole prop
  useEffect(() => {
    setForm((prev) =>
      prev.role === defaultRole ? prev : { ...prev, role: defaultRole }
    );
  }, [defaultRole]);

  // ── Form helpers ─────────────────────────────────────────────────────────────

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm(weekday?: number) {
    setEditingId(null);
    setShowForm(false);
    setForm(emptyForm(defaultRole, weekday));
    setError(null);
    setSuccess(null);
  }

  // ── API: save ────────────────────────────────────────────────────────────────

  async function saveSlot() {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const payload = {
        role: form.role,
        appointmentType: form.appointmentType,
        duration: form.duration,
        weekday: Number(form.weekday),
        startTime: form.startTime,
        endTime: form.endTime,
        bufferMinutes: Number(form.bufferMinutes || '15'),
        isActive: form.isActive,
        // One-time slot: send the specific date; recurring: send null
        specificDate:
          !form.recurring && selectedDay ? selectedDay.toISOString() : null
      };
      const res = await fetch(
        editingId
          ? `/api/case-scheduling/availability-slots/${editingId}`
          : '/api/case-scheduling/availability-slots',
        {
          method: editingId ? 'PATCH' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `Save failed (${res.status})`);
      }
      setSuccess(editingId ? 'Slot aktualisiert.' : 'Slot angelegt.');
      resetForm(selectedDay ? isoWeekday(selectedDay) : undefined);
      await loadSlots();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }

  // ── API: toggle ──────────────────────────────────────────────────────────────

  async function toggleSlot(slot: PartnerAvailabilitySlotRow) {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await fetch(
        `/api/case-scheduling/availability-slots/${slot.id}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !slot.isActive })
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `Update failed (${res.status})`);
      }
      setSuccess(slot.isActive ? 'Slot deaktiviert.' : 'Slot aktiviert.');
      await loadSlots();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Umschalten');
    } finally {
      setSaving(false);
    }
  }

  // ── API: delete ──────────────────────────────────────────────────────────────

  async function deleteSlot(slot: PartnerAvailabilitySlotRow) {
    if (!window.confirm('Diesen Slot wirklich löschen?')) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await fetch(
        `/api/case-scheduling/availability-slots/${slot.id}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `Delete failed (${res.status})`);
      }
      setSuccess('Slot gelöscht.');
      await loadSlots();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Löschen');
    } finally {
      setSaving(false);
    }
  }

  // ── Edit handler ─────────────────────────────────────────────────────────────

  function startEdit(slot: PartnerAvailabilitySlotRow) {
    setEditingId(slot.id);
    setForm(rowToForm(slot));
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }

  // ── Derived calendar data ────────────────────────────────────────────────────

  // Helper: produce a stable date key "YYYY-M-D" (no zero-padding needed for Set lookup)
  function dateKey(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  // Recurring slots: weekdays that have at least one active slot
  const activeWeekdays = useMemo(() => {
    const set = new Set<number>();
    slots.forEach((s) => {
      if (s.isActive && s.specificDate == null) set.add(s.weekday);
    });
    return set;
  }, [slots]);

  // Recurring slots: weekdays that have any slot (active or inactive)
  const allWeekdaysWithSlots = useMemo(() => {
    const set = new Set<number>();
    slots.forEach((s) => {
      if (s.specificDate == null) set.add(s.weekday);
    });
    return set;
  }, [slots]);

  // One-time slots: specific dates that have an active slot
  const activeSpecificDates = useMemo(() => {
    const set = new Set<string>();
    slots.forEach((s) => {
      if (s.isActive && s.specificDate != null) {
        set.add(dateKey(new Date(s.specificDate)));
      }
    });
    return set;
  }, [slots]);

  // One-time slots: specific dates that have any slot
  const allSpecificDates = useMemo(() => {
    const set = new Set<string>();
    slots.forEach((s) => {
      if (s.specificDate != null) {
        set.add(dateKey(new Date(s.specificDate)));
      }
    });
    return set;
  }, [slots]);

  const slotsForSelectedDay = useMemo(() => {
    if (!selectedDay) return [];
    const wd = isoWeekday(selectedDay);
    const dk = dateKey(selectedDay);
    return slots.filter((s) => {
      // One-time slots: match exact date
      if (s.specificDate != null) {
        return dateKey(new Date(s.specificDate)) === dk;
      }
      // Recurring slots: match weekday
      return s.weekday === wd;
    });
  }, [slots, selectedDay]);

  // Build flat array of Date | null for the calendar grid (null = empty leading cell)
  const calendarDays = useMemo((): Array<Date | null> => {
    const totalDays = daysInMonth(viewYear, viewMonth);
    const firstWd = firstIsoWeekdayOfMonth(viewYear, viewMonth);
    const emptyCells = firstWd - 1; // Mo=0, Di=1, …, So=6
    return [
      ...new Array<null>(emptyCells).fill(null),
      ...Array.from(
        { length: totalDays },
        (_, i) => new Date(viewYear, viewMonth, i + 1)
      )
    ];
  }, [viewYear, viewMonth]);

  // ── Calendar navigation ──────────────────────────────────────────────────────

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleDayClick(day: Date) {
    const wd = isoWeekday(day);
    setSelectedDay(day);
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm(defaultRole, wd));
    setError(null);
    setSuccess(null);
  }

  // ── Selected day weekday index (0-based for WEEKDAY_FULL array) ──────────────
  const selectedWd = selectedDay ? isoWeekday(selectedDay) : null; // 1-7
  const selectedWdLabel =
    selectedWd !== null ? WEEKDAY_FULL[selectedWd - 1] : '';

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className='space-y-6'>
      {/* Page header */}
      <div className='border-border/60 bg-background/78 rounded-[32px] border p-6 shadow-[var(--shadow-glass)] backdrop-blur-xl md:p-8'>
        <div className='space-y-2'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            Verfügbarkeiten
          </div>
          <div className='font-heading text-foreground text-lg font-semibold tracking-tight'>
            Kalenderbasierte Slot-Verwaltung
          </div>
          <div className='text-muted-foreground text-sm leading-6'>
            Klicke auf einen Tag im Kalender, um die Verfügbarkeits-Slots für
            diesen Wochentag einzusehen und zu bearbeiten.
          </div>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div className='rounded-[24px] border border-rose-200/70 bg-rose-50/80 px-4 py-3 text-sm text-rose-900 shadow-[var(--shadow-soft)]'>
          {error}
        </div>
      )}
      {success && (
        <div className='rounded-[24px] border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900 shadow-[var(--shadow-soft)]'>
          {success}
        </div>
      )}

      {/* Two-column layout: calendar | day panel */}
      <div className='grid gap-6 xl:grid-cols-[1.15fr_0.85fr]'>
        {/* ── Left: Monthly calendar ──────────────────────────────────────────── */}
        <section className={`${shellClass} p-6 md:p-8`}>
          {/* Month navigation */}
          <div className='mb-6 flex items-center justify-between gap-3'>
            <button
              type='button'
              onClick={prevMonth}
              aria-label='Vorheriger Monat'
              className='border-border/60 bg-background/80 hover:bg-background/95 rounded-full border p-2.5 shadow-[var(--shadow-soft)] transition-colors'
            >
              <svg
                className='h-4 w-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
                aria-hidden='true'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={1.75}
                  d='M15 19l-7-7 7-7'
                />
              </svg>
            </button>

            <div className='font-heading text-foreground text-lg font-semibold tracking-tight'>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>

            <button
              type='button'
              onClick={nextMonth}
              aria-label='Nächster Monat'
              className='border-border/60 bg-background/80 hover:bg-background/95 rounded-full border p-2.5 shadow-[var(--shadow-soft)] transition-colors'
            >
              <svg
                className='h-4 w-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
                aria-hidden='true'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={1.75}
                  d='M9 5l7 7-7 7'
                />
              </svg>
            </button>
          </div>

          {/* Weekday column headers */}
          <div className='mb-2 grid grid-cols-7 gap-1'>
            {WEEKDAY_SHORT.map((label) => (
              <div
                key={label}
                className='text-muted-foreground py-1 text-center text-[11px] font-semibold tracking-[0.14em] uppercase'
              >
                {label}
              </div>
            ))}
          </div>

          {/* Day grid */}
          {loading ? (
            <div className='grid grid-cols-7 gap-1'>
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className='border-border/60 bg-background/60 h-12 animate-pulse rounded-[14px] border'
                />
              ))}
            </div>
          ) : (
            <div className='grid grid-cols-7 gap-1'>
              {calendarDays.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} aria-hidden='true' />;
                }

                const wd = isoWeekday(day);
                const dk = dateKey(day);
                const hasSlots =
                  allWeekdaysWithSlots.has(wd) || allSpecificDates.has(dk);
                const hasActiveSlots =
                  activeWeekdays.has(wd) || activeSpecificDates.has(dk);
                const isSelected = selectedDay
                  ? isSameDay(day, selectedDay)
                  : false;
                const isCurrentDay = isSameDay(day, today);

                let cellClass =
                  'border-border/50 bg-background/70 text-foreground hover:border-foreground/20 hover:bg-background/90';

                if (isSelected) {
                  cellClass =
                    'border-foreground/25 bg-foreground text-background shadow-[var(--shadow-soft)]';
                } else if (isCurrentDay) {
                  cellClass =
                    'border-primary/50 bg-primary/10 text-foreground font-semibold shadow-[var(--shadow-soft)]';
                }

                return (
                  <button
                    key={day.toISOString()}
                    type='button'
                    onClick={() => handleDayClick(day)}
                    aria-label={day.toLocaleDateString('de-DE', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })}
                    aria-pressed={isSelected}
                    className={`relative flex flex-col items-center justify-center gap-1 rounded-[14px] border py-2.5 text-sm transition-all ${cellClass}`}
                  >
                    <span className='text-[13px] leading-none'>
                      {day.getDate()}
                    </span>

                    {/* Slot indicator dot */}
                    {hasSlots && (
                      <span
                        className={`h-1 w-1 rounded-full ${
                          isSelected
                            ? 'bg-background/50'
                            : hasActiveSlots
                              ? 'bg-emerald-500'
                              : 'bg-muted-foreground/35'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className='border-border/60 bg-background/60 mt-5 flex flex-wrap items-center gap-5 rounded-[20px] border px-4 py-3 shadow-[var(--shadow-soft)]'>
            <div className='flex items-center gap-2'>
              <span className='h-2 w-2 rounded-full bg-emerald-500' />
              <span className='text-muted-foreground text-xs'>
                Aktive Slots
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <span className='bg-muted-foreground/35 h-2 w-2 rounded-full' />
              <span className='text-muted-foreground text-xs'>
                Inaktive Slots
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <span className='border-primary/50 bg-primary/10 inline-flex h-5 w-6 items-center justify-center rounded-[6px] border text-[10px] font-semibold'>
                {today.getDate()}
              </span>
              <span className='text-muted-foreground text-xs'>Heute</span>
            </div>
          </div>
        </section>

        {/* ── Right: Day detail panel ─────────────────────────────────────────── */}
        <section className={`${shellClass} p-6 md:p-8`}>
          {/* Empty state — no day selected */}
          {!selectedDay ? (
            <div className='flex h-full min-h-[320px] flex-col items-center justify-center gap-4 py-12 text-center'>
              <div className='border-border/60 bg-background/82 rounded-full border p-5 shadow-[var(--shadow-soft)]'>
                <svg
                  className='text-muted-foreground h-6 w-6'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                  aria-hidden='true'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={1.5}
                    d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                  />
                </svg>
              </div>
              <div className='space-y-1.5'>
                <div className='font-heading text-foreground text-base font-semibold tracking-tight'>
                  Tag auswählen
                </div>
                <div className='text-muted-foreground max-w-[220px] text-sm leading-6'>
                  Klicke auf einen Tag im Kalender, um die Slots für diesen
                  Wochentag zu verwalten.
                </div>
              </div>
            </div>
          ) : (
            <div className='space-y-5'>
              {/* Day header */}
              <div className='flex items-start justify-between gap-3'>
                <div className='space-y-1'>
                  <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                    Wochentag
                  </div>
                  <div className='font-heading text-foreground text-xl font-semibold tracking-tight'>
                    {selectedWdLabel}
                  </div>
                  <div className='text-muted-foreground text-sm'>
                    {selectedDay.toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                    {' · '}
                    <span className='text-muted-foreground'>
                      Gilt für jeden {selectedWdLabel}
                    </span>
                  </div>
                </div>
                <div className='border-border/60 bg-background/82 shrink-0 rounded-full border px-3.5 py-2 text-xs font-medium shadow-[var(--shadow-soft)]'>
                  {slotsForSelectedDay.length} Slot
                  {slotsForSelectedDay.length === 1 ? '' : 's'}
                </div>
              </div>

              {/* Existing slots for this weekday */}
              {slotsForSelectedDay.length === 0 && !showForm ? (
                <div className='border-border/60 bg-background/84 rounded-[24px] border border-dashed px-4 py-5 shadow-[var(--shadow-soft)]'>
                  <div className='text-foreground text-sm font-medium'>
                    Keine Slots für {selectedWdLabel}
                  </div>
                  <div className='text-muted-foreground mt-1 text-sm leading-6'>
                    Füge unten einen neuen Slot für diesen Wochentag hinzu.
                  </div>
                </div>
              ) : (
                <div className='space-y-3'>
                  {slotsForSelectedDay.map((slot) => (
                    <article
                      key={slot.id}
                      className='border-border/60 bg-background/84 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'
                    >
                      <div className='flex flex-wrap items-start justify-between gap-3'>
                        <div className='space-y-1.5'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <span className='font-heading text-foreground text-sm font-semibold tracking-tight'>
                              {slot.role === 'GUTACHTER'
                                ? 'Gutachter'
                                : 'Anwalt'}
                            </span>
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                                slot.isActive
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-border/60 bg-background/80 text-muted-foreground'
                              }`}
                            >
                              {slot.isActive ? 'Aktiv' : 'Inaktiv'}
                            </span>
                            <span className='border-border/60 bg-background/80 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium'>
                              {appointmentTypeLabel(slot.appointmentType)}
                            </span>
                          </div>
                          <div className='text-muted-foreground text-xs'>
                            {durationLabel(slot.duration)} · Puffer{' '}
                            {slot.bufferMinutes} Min
                          </div>
                          <div className='text-muted-foreground text-xs'>
                            {slot.specificDate != null
                              ? `Einmalig · ${new Date(slot.specificDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}`
                              : `Wiederkehrend · jeden ${WEEKDAY_FULL[slot.weekday - 1]}`}
                          </div>
                        </div>
                        <div className='border-border/60 bg-background/90 rounded-full border px-3 py-1.5 text-xs font-medium shadow-[var(--shadow-soft)]'>
                          {slot.startTime} – {slot.endTime}
                        </div>
                      </div>

                      <div className='mt-3 flex flex-wrap justify-end gap-2'>
                        <button
                          type='button'
                          disabled={saving}
                          onClick={() => startEdit(slot)}
                          className='border-border/60 bg-background/80 hover:bg-background/95 rounded-full border px-3 py-1.5 text-xs font-medium shadow-[var(--shadow-soft)] transition-colors disabled:opacity-50'
                        >
                          Bearbeiten
                        </button>
                        <button
                          type='button'
                          disabled={saving}
                          onClick={() => toggleSlot(slot)}
                          className='border-border/60 bg-background/80 hover:bg-background/95 rounded-full border px-3 py-1.5 text-xs font-medium shadow-[var(--shadow-soft)] transition-colors disabled:opacity-50'
                        >
                          {slot.isActive ? 'Deaktivieren' : 'Aktivieren'}
                        </button>
                        <button
                          type='button'
                          disabled={saving}
                          onClick={() => deleteSlot(slot)}
                          className='border-border/60 bg-background/80 hover:bg-background/95 rounded-full border px-3 py-1.5 text-xs font-medium text-rose-700 shadow-[var(--shadow-soft)] transition-colors disabled:opacity-50'
                        >
                          Löschen
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {/* Add slot button */}
              {!showForm && (
                <button
                  type='button'
                  onClick={() => {
                    setShowForm(true);
                    setEditingId(null);
                    setForm(
                      emptyForm(
                        defaultRole,
                        selectedDay ? isoWeekday(selectedDay) : 1
                      )
                    );
                  }}
                  className='border-border/60 bg-background/80 hover:bg-background/95 w-full rounded-[24px] border border-dashed px-4 py-3 text-sm font-medium shadow-[var(--shadow-soft)] transition-colors'
                >
                  + Neuen Slot für {selectedWdLabel} hinzufügen
                </button>
              )}

              {/* Inline slot form */}
              {showForm && (
                <div className='border-border/60 bg-background/84 space-y-4 rounded-[24px] border p-5 shadow-[var(--shadow-soft)]'>
                  {/* Form header */}
                  <div className='flex items-center justify-between gap-3'>
                    <div className='font-heading text-foreground text-sm font-semibold tracking-tight'>
                      {isEditing
                        ? 'Slot bearbeiten'
                        : `Neuer Slot · ${selectedWdLabel}`}
                    </div>
                    <button
                      type='button'
                      onClick={() =>
                        resetForm(
                          selectedDay ? isoWeekday(selectedDay) : undefined
                        )
                      }
                      className='text-muted-foreground hover:text-foreground text-xs transition-colors'
                    >
                      Abbrechen
                    </button>
                  </div>

                  {/* Form fields */}
                  <div className='grid gap-3 sm:grid-cols-2'>
                    <div className='space-y-1.5'>
                      <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                        Rolle
                      </label>
                      <select
                        className={fieldClass}
                        value={form.role}
                        onChange={(e) =>
                          update('role', e.target.value as CaseSchedulingRole)
                        }
                      >
                        <option value='GUTACHTER'>Gutachter</option>
                        <option value='ANWALT'>Anwalt</option>
                      </select>
                    </div>

                    <div className='space-y-1.5'>
                      <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                        Terminart
                      </label>
                      <select
                        className={fieldClass}
                        value={form.appointmentType}
                        onChange={(e) =>
                          update(
                            'appointmentType',
                            e.target.value as CaseSchedulingType
                          )
                        }
                      >
                        <option value='PHONE'>Telefon</option>
                        <option value='IN_PERSON'>Persönlich</option>
                      </select>
                    </div>

                    <div className='space-y-1.5'>
                      <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                        Dauer
                      </label>
                      <select
                        className={fieldClass}
                        value={form.duration}
                        onChange={(e) =>
                          update(
                            'duration',
                            Number(e.target.value) as CaseSchedulingDuration
                          )
                        }
                      >
                        <option value={15}>15 Minuten</option>
                        <option value={30}>30 Minuten</option>
                      </select>
                    </div>

                    <div className='space-y-1.5'>
                      <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                        Puffer (Min)
                      </label>
                      <input
                        inputMode='numeric'
                        className={fieldClass}
                        value={form.bufferMinutes}
                        onChange={(e) =>
                          update('bufferMinutes', e.target.value)
                        }
                      />
                    </div>

                    <div className='space-y-1.5'>
                      <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                        Startzeit
                      </label>
                      <input
                        type='time'
                        className={fieldClass}
                        value={form.startTime}
                        onChange={(e) => update('startTime', e.target.value)}
                      />
                    </div>

                    <div className='space-y-1.5'>
                      <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                        Endzeit
                      </label>
                      <input
                        type='time'
                        className={fieldClass}
                        value={form.endTime}
                        onChange={(e) => update('endTime', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Recurrence toggle */}
                  <div className='space-y-2'>
                    <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                      Gilt für
                    </div>
                    <div className='grid grid-cols-2 gap-2'>
                      {/* Wiederkehrend */}
                      <button
                        type='button'
                        onClick={() => update('recurring', true)}
                        className={`flex items-center gap-2.5 rounded-[20px] border px-4 py-3 text-left text-sm transition-all ${
                          form.recurring
                            ? 'border-foreground/25 bg-foreground text-background shadow-[var(--shadow-soft)]'
                            : 'border-border/60 bg-background/80 text-foreground hover:bg-background/95'
                        }`}
                      >
                        <svg
                          className='h-3.5 w-3.5 shrink-0'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                          aria-hidden='true'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={1.75}
                            d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                          />
                        </svg>
                        <div>
                          <div className='text-xs font-semibold'>
                            Wiederkehrend
                          </div>
                          <div
                            className={`text-[11px] ${form.recurring ? 'text-background/70' : 'text-muted-foreground'}`}
                          >
                            Jeden {selectedWdLabel}
                          </div>
                        </div>
                      </button>

                      {/* Einmalig */}
                      <button
                        type='button'
                        onClick={() => update('recurring', false)}
                        className={`flex items-center gap-2.5 rounded-[20px] border px-4 py-3 text-left text-sm transition-all ${
                          !form.recurring
                            ? 'border-foreground/25 bg-foreground text-background shadow-[var(--shadow-soft)]'
                            : 'border-border/60 bg-background/80 text-foreground hover:bg-background/95'
                        }`}
                      >
                        <svg
                          className='h-3.5 w-3.5 shrink-0'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                          aria-hidden='true'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={1.75}
                            d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                          />
                        </svg>
                        <div>
                          <div className='text-xs font-semibold'>Einmalig</div>
                          <div
                            className={`text-[11px] ${!form.recurring ? 'text-background/70' : 'text-muted-foreground'}`}
                          >
                            {selectedDay
                              ? selectedDay.toLocaleDateString('de-DE', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : 'Nur diesen Tag'}
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className='flex flex-wrap gap-2'>
                    <button
                      type='button'
                      onClick={saveSlot}
                      disabled={saving}
                      className='bg-foreground text-background rounded-full px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-soft)] transition-opacity hover:opacity-90 disabled:opacity-60'
                    >
                      {saving
                        ? 'Speichere…'
                        : isEditing
                          ? 'Slot aktualisieren'
                          : 'Slot anlegen'}
                    </button>
                    <button
                      type='button'
                      onClick={() =>
                        resetForm(
                          selectedDay ? isoWeekday(selectedDay) : undefined
                        )
                      }
                      className='border-border/60 bg-background/80 hover:bg-background/95 rounded-full border px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-soft)] transition-colors'
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
