'use client';

import { useEffect, useMemo, useState } from 'react';

import type {
  PartnerAvailabilitySlotRow,
  CaseSchedulingRole,
  CaseSchedulingDuration,
  CaseSchedulingType
} from '../types';

type FormState = {
  role: CaseSchedulingRole;
  appointmentType: CaseSchedulingType;
  duration: CaseSchedulingDuration;
  weekday: string;
  startTime: string;
  endTime: string;
  bufferMinutes: string;
  isActive: boolean;
};

const WEEKDAY_OPTIONS = [
  { value: '1', label: 'Montag' },
  { value: '2', label: 'Dienstag' },
  { value: '3', label: 'Mittwoch' },
  { value: '4', label: 'Donnerstag' },
  { value: '5', label: 'Freitag' },
  { value: '6', label: 'Samstag' },
  { value: '7', label: 'Sonntag' }
] as const;

function weekdayLabel(value: number) {
  return (
    WEEKDAY_OPTIONS.find((item) => Number(item.value) === value)?.label ?? '—'
  );
}

function appointmentTypeLabel(value: CaseSchedulingType) {
  return value === 'PHONE' ? 'Telefon' : 'Persönlich';
}

function emptyForm(defaultRole: CaseSchedulingRole): FormState {
  return {
    role: defaultRole,
    appointmentType: 'PHONE',
    duration: 15,
    weekday: '1',
    startTime: '09:00',
    endTime: '12:00',
    bufferMinutes: '15',
    isActive: true
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
    isActive: slot.isActive
  };
}

const shellClass =
  'border-border/60 bg-background/82 overflow-hidden rounded-[32px] border shadow-[var(--shadow-soft)]';

const fieldClass =
  'bg-background/90 border-border/60 focus-visible:ring-primary/20 w-full rounded-[24px] border px-4 py-3 text-sm shadow-[var(--shadow-soft)] transition-colors focus-visible:ring-2 focus-visible:outline-none';

export default function PartnerAvailabilityManager(props: {
  defaultRole: CaseSchedulingRole;
}) {
  const { defaultRole } = props;
  const [slots, setSlots] = useState<PartnerAvailabilitySlotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultRole));

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);

  async function loadSlots() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/case-scheduling/availability-slots', {
        cache: 'no-store',
        credentials: 'include'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Load failed (${res.status})`);
      }

      setSlots((data.slots ?? []) as PartnerAvailabilitySlotRow[]);
    } catch (e: any) {
      setError(e?.message ?? 'Fehler beim Laden der Slots');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSlots();
  }, []);

  useEffect(() => {
    setForm((prev) =>
      prev.role === defaultRole ? prev : { ...prev, role: defaultRole }
    );
  }, [defaultRole]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value
    }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm(defaultRole));
  }

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
        isActive: form.isActive
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
        throw new Error(data?.error || `Save failed (${res.status})`);
      }

      setSuccess(editingId ? 'Slot aktualisiert.' : 'Slot angelegt.');
      resetForm();
      await loadSlots();
    } catch (e: any) {
      setError(e?.message ?? 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }

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
        throw new Error(data?.error || `Update failed (${res.status})`);
      }

      setSuccess(slot.isActive ? 'Slot deaktiviert.' : 'Slot aktiviert.');
      await loadSlots();
    } catch (e: any) {
      setError(e?.message ?? 'Fehler beim Umschalten');
    } finally {
      setSaving(false);
    }
  }

  async function deleteSlot(slot: PartnerAvailabilitySlotRow) {
    if (!window.confirm('Diesen Slot wirklich löschen?')) {
      return;
    }

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
        throw new Error(data?.error || `Delete failed (${res.status})`);
      }

      setSuccess('Slot gelöscht.');
      await loadSlots();
    } catch (e: any) {
      setError(e?.message ?? 'Fehler beim Löschen');
    } finally {
      setSaving(false);
    }
  }

  function editSlot(slot: PartnerAvailabilitySlotRow) {
    setEditingId(slot.id);
    setForm(rowToForm(slot));
    setSuccess(null);
    setError(null);
  }

  return (
    <div className='space-y-6'>
      <div className='border-border/60 bg-background/78 rounded-[32px] border p-6 shadow-[var(--shadow-glass)] backdrop-blur-xl md:p-8'>
        <div className='space-y-2'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            Verfügbarkeiten
          </div>
          <div className='font-heading text-foreground text-lg font-semibold tracking-tight'>
            Slot-Vorlagen für Partner-Termine
          </div>
          <div className='text-muted-foreground text-sm leading-6'>
            Die Oberfläche bleibt ruhig und produktisiert, während du interne
            Telefon- und Vor-Ort-Zeiten pflegst.
          </div>
        </div>
      </div>

      <div className='grid gap-6 xl:grid-cols-[1.05fr_0.95fr]'>
        <section className={`${shellClass} space-y-6 p-6 md:p-8`}>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='space-y-1'>
              <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                Verfügbarkeit anlegen
              </div>
              <div className='font-heading text-foreground text-xl font-semibold tracking-tight'>
                Interne Slot-Vorlage
              </div>
              <div className='text-muted-foreground text-sm leading-6'>
                Pflegt interne Slot-Vorlagen für Telefon- und Vor-Ort-Termine.
              </div>
            </div>

            <div className='border-border/60 bg-background/82 rounded-full border px-3.5 py-2 text-xs font-medium shadow-[var(--shadow-soft)]'>
              {isEditing ? 'Bearbeitungsmodus' : 'Neuer Slot'}
            </div>
          </div>

          {error ? (
            <div className='rounded-[24px] border border-rose-200/70 bg-rose-50/80 px-4 py-3 text-sm text-rose-900 shadow-[var(--shadow-soft)]'>
              {error}
            </div>
          ) : null}
          {success ? (
            <div className='rounded-[24px] border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900 shadow-[var(--shadow-soft)]'>
              {success}
            </div>
          ) : null}

          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            <div className='space-y-2'>
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

            <div className='space-y-2'>
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

            <div className='space-y-2'>
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

            <div className='space-y-2'>
              <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                Wochentag
              </label>
              <select
                className={fieldClass}
                value={form.weekday}
                onChange={(e) => update('weekday', e.target.value)}
              >
                {WEEKDAY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className='space-y-2'>
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

            <div className='space-y-2'>
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

            <div className='space-y-2'>
              <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                Puffer in Minuten
              </label>
              <input
                inputMode='numeric'
                className={fieldClass}
                value={form.bufferMinutes}
                onChange={(e) => update('bufferMinutes', e.target.value)}
              />
            </div>

            <div className='space-y-2'>
              <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                Aktiv
              </label>
              <select
                className={fieldClass}
                value={form.isActive ? 'yes' : 'no'}
                onChange={(e) => update('isActive', e.target.value === 'yes')}
              >
                <option value='yes'>Ja</option>
                <option value='no'>Nein</option>
              </select>
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-3'>
            <button
              type='button'
              onClick={saveSlot}
              disabled={saving}
              className='bg-foreground text-background rounded-full px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-soft)] disabled:opacity-60'
            >
              {saving
                ? 'Speichere…'
                : isEditing
                  ? 'Slot aktualisieren'
                  : 'Slot anlegen'}
            </button>

            {isEditing ? (
              <button
                type='button'
                onClick={resetForm}
                className='border-border/60 bg-background/80 hover:bg-background/95 rounded-full border px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-soft)] transition-colors'
              >
                Bearbeitung abbrechen
              </button>
            ) : null}
          </div>
        </section>

        <section className={`${shellClass} space-y-5 p-6 md:p-8`}>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='space-y-1'>
              <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                Vorhandene Slots
              </div>
              <div className='font-heading text-foreground text-xl font-semibold tracking-tight'>
                {slots.length} Slot{slots.length === 1 ? '' : 's'} gespeichert
              </div>
              <div className='text-muted-foreground text-sm leading-6'>
                Die Liste ist bewusst ruhig gestaltet und vermeidet
                Tabellen-Feeling.
              </div>
            </div>
          </div>

          {loading ? (
            <div className='space-y-3'>
              <div className='border-border/60 bg-background/84 h-28 animate-pulse rounded-[24px] border shadow-[var(--shadow-soft)]' />
              <div className='border-border/60 bg-background/84 h-28 animate-pulse rounded-[24px] border shadow-[var(--shadow-soft)]' />
            </div>
          ) : slots.length === 0 ? (
            <div className='border-border/60 bg-background/84 rounded-[24px] border border-dashed px-4 py-5 text-sm shadow-[var(--shadow-soft)]'>
              <div className='text-foreground text-sm font-medium'>
                Noch keine Verfügbarkeits-Slots angelegt.
              </div>
              <div className='text-muted-foreground mt-1 text-sm'>
                Sobald du oben einen Slot speicherst, erscheint er hier in der
                neuen Partner-Surface.
              </div>
            </div>
          ) : (
            <div className='space-y-3'>
              {slots.map((slot) => (
                <article
                  key={slot.id}
                  className='border-border/60 bg-background/84 rounded-[28px] border p-4 shadow-[var(--shadow-soft)]'
                >
                  <div className='flex flex-wrap items-start justify-between gap-4'>
                    <div className='space-y-2'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <div className='font-heading text-foreground text-base font-semibold tracking-tight'>
                          {slot.role === 'GUTACHTER' ? 'Gutachter' : 'Anwalt'}
                        </div>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                            slot.isActive
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-border/60 bg-background/80 text-muted-foreground'
                          }`}
                        >
                          {slot.isActive ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </div>
                      <div className='text-muted-foreground text-sm'>
                        {appointmentTypeLabel(slot.appointmentType)} ·{' '}
                        {slot.duration === 'MINUTES_15'
                          ? '15 Minuten'
                          : '30 Minuten'}{' '}
                        · {weekdayLabel(slot.weekday)}
                      </div>
                    </div>

                    <div className='border-border/60 bg-background/90 rounded-full border px-3.5 py-2 text-xs font-medium shadow-[var(--shadow-soft)]'>
                      {slot.startTime} – {slot.endTime}
                    </div>
                  </div>

                  <div className='mt-4 grid gap-3 sm:grid-cols-3'>
                    <div className='border-border/60 bg-background/90 rounded-[22px] border px-4 py-3 shadow-[var(--shadow-soft)]'>
                      <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                        Dauer
                      </div>
                      <div className='text-foreground mt-1 text-sm font-medium'>
                        {slot.duration === 'MINUTES_15'
                          ? '15 Minuten'
                          : '30 Minuten'}
                      </div>
                    </div>

                    <div className='border-border/60 bg-background/90 rounded-[22px] border px-4 py-3 shadow-[var(--shadow-soft)]'>
                      <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                        Wochentag
                      </div>
                      <div className='text-foreground mt-1 text-sm font-medium'>
                        {weekdayLabel(slot.weekday)}
                      </div>
                    </div>

                    <div className='border-border/60 bg-background/90 rounded-[22px] border px-4 py-3 shadow-[var(--shadow-soft)]'>
                      <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                        Puffer
                      </div>
                      <div className='text-foreground mt-1 text-sm font-medium'>
                        {slot.bufferMinutes} Min
                      </div>
                    </div>
                  </div>

                  <div className='mt-4 flex flex-wrap justify-end gap-2'>
                    <button
                      type='button'
                      className='border-border/60 bg-background/80 hover:bg-background/95 rounded-full border px-3.5 py-2 text-xs font-medium shadow-[var(--shadow-soft)] transition-colors'
                      onClick={() => editSlot(slot)}
                      disabled={saving}
                    >
                      Bearbeiten
                    </button>
                    <button
                      type='button'
                      className='border-border/60 bg-background/80 hover:bg-background/95 rounded-full border px-3.5 py-2 text-xs font-medium shadow-[var(--shadow-soft)] transition-colors'
                      onClick={() => toggleSlot(slot)}
                      disabled={saving}
                    >
                      {slot.isActive ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                    <button
                      type='button'
                      className='border-border/60 bg-background/80 hover:bg-background/95 rounded-full border px-3.5 py-2 text-xs font-medium text-rose-700 shadow-[var(--shadow-soft)] transition-colors'
                      onClick={() => deleteSlot(slot)}
                      disabled={saving}
                    >
                      Löschen
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
