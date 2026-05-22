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
      <div className='text-muted-foreground rounded-lg border p-4 text-sm'>
        Dies sind interne Verfügbarkeiten für das MVP. Eine externe
        Kalender-Synchronisation folgt in einem späteren Schritt.
      </div>

      <div className='rounded-xl border bg-white p-6 shadow-sm'>
        <div className='mb-4'>
          <div className='text-lg font-semibold'>Verfügbarkeit anlegen</div>
          <div className='text-muted-foreground text-sm'>
            Pflegt interne Slot-Vorlagen für Telefon- und Vor-Ort-Termine.
          </div>
        </div>

        {error ? (
          <div className='mb-4 text-sm text-red-500'>{error}</div>
        ) : null}
        {success ? (
          <div className='mb-4 text-sm text-green-600'>{success}</div>
        ) : null}

        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          <div className='space-y-1'>
            <label className='text-xs font-medium'>Rolle</label>
            <select
              className='bg-background w-full rounded-md border px-3 py-2 text-sm'
              value={form.role}
              onChange={(e) =>
                update('role', e.target.value as CaseSchedulingRole)
              }
            >
              <option value='GUTACHTER'>Gutachter</option>
              <option value='ANWALT'>Anwalt</option>
            </select>
          </div>

          <div className='space-y-1'>
            <label className='text-xs font-medium'>Terminart</label>
            <select
              className='bg-background w-full rounded-md border px-3 py-2 text-sm'
              value={form.appointmentType}
              onChange={(e) =>
                update('appointmentType', e.target.value as CaseSchedulingType)
              }
            >
              <option value='PHONE'>Telefon</option>
              <option value='IN_PERSON'>Persönlich</option>
            </select>
          </div>

          <div className='space-y-1'>
            <label className='text-xs font-medium'>Dauer</label>
            <select
              className='bg-background w-full rounded-md border px-3 py-2 text-sm'
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

          <div className='space-y-1'>
            <label className='text-xs font-medium'>Wochentag</label>
            <select
              className='bg-background w-full rounded-md border px-3 py-2 text-sm'
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

          <div className='space-y-1'>
            <label className='text-xs font-medium'>Startzeit</label>
            <input
              type='time'
              className='bg-background w-full rounded-md border px-3 py-2 text-sm'
              value={form.startTime}
              onChange={(e) => update('startTime', e.target.value)}
            />
          </div>

          <div className='space-y-1'>
            <label className='text-xs font-medium'>Endzeit</label>
            <input
              type='time'
              className='bg-background w-full rounded-md border px-3 py-2 text-sm'
              value={form.endTime}
              onChange={(e) => update('endTime', e.target.value)}
            />
          </div>

          <div className='space-y-1'>
            <label className='text-xs font-medium'>Puffer in Minuten</label>
            <input
              inputMode='numeric'
              className='bg-background w-full rounded-md border px-3 py-2 text-sm'
              value={form.bufferMinutes}
              onChange={(e) => update('bufferMinutes', e.target.value)}
            />
          </div>

          <div className='space-y-1'>
            <label className='text-xs font-medium'>Aktiv</label>
            <select
              className='bg-background w-full rounded-md border px-3 py-2 text-sm'
              value={form.isActive ? 'yes' : 'no'}
              onChange={(e) => update('isActive', e.target.value === 'yes')}
            >
              <option value='yes'>Ja</option>
              <option value='no'>Nein</option>
            </select>
          </div>
        </div>

        <div className='mt-4 flex flex-wrap items-center gap-3'>
          <button
            type='button'
            onClick={saveSlot}
            disabled={saving}
            className='bg-foreground text-background rounded-md px-3 py-2 text-sm disabled:opacity-60'
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
              className='rounded-md border px-3 py-2 text-sm'
            >
              Bearbeitung abbrechen
            </button>
          ) : null}
        </div>
      </div>

      <div className='rounded-xl border bg-white p-6 shadow-sm'>
        <div className='mb-4 flex items-center justify-between gap-3'>
          <div>
            <div className='text-lg font-semibold'>Vorhandene Slots</div>
            <div className='text-muted-foreground text-sm'>
              {slots.length} Slot{slots.length === 1 ? '' : 's'} gespeichert
            </div>
          </div>
        </div>

        {loading ? (
          <div className='text-muted-foreground text-sm'>Lade Slots…</div>
        ) : slots.length === 0 ? (
          <div className='text-muted-foreground rounded-md border p-4 text-sm'>
            Noch keine Verfügbarkeits-Slots angelegt.
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[980px] border-separate border-spacing-0'>
              <thead>
                <tr className='text-muted-foreground text-left text-xs tracking-wide uppercase'>
                  <th className='border-b px-3 py-2'>Rolle</th>
                  <th className='border-b px-3 py-2'>Terminart</th>
                  <th className='border-b px-3 py-2'>Dauer</th>
                  <th className='border-b px-3 py-2'>Wochentag</th>
                  <th className='border-b px-3 py-2'>Zeitfenster</th>
                  <th className='border-b px-3 py-2'>Puffer</th>
                  <th className='border-b px-3 py-2'>Status</th>
                  <th className='border-b px-3 py-2 text-right'>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot.id} className='align-top text-sm'>
                    <td className='border-b px-3 py-3 font-medium'>
                      {slot.role === 'GUTACHTER' ? 'Gutachter' : 'Anwalt'}
                    </td>
                    <td className='border-b px-3 py-3'>
                      {appointmentTypeLabel(slot.appointmentType)}
                    </td>
                    <td className='border-b px-3 py-3'>
                      {slot.duration === 'MINUTES_15'
                        ? '15 Minuten'
                        : '30 Minuten'}
                    </td>
                    <td className='border-b px-3 py-3'>
                      {weekdayLabel(slot.weekday)}
                    </td>
                    <td className='border-b px-3 py-3 font-mono'>
                      {slot.startTime} – {slot.endTime}
                    </td>
                    <td className='border-b px-3 py-3'>
                      {slot.bufferMinutes} Min
                    </td>
                    <td className='border-b px-3 py-3'>
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${
                          slot.isActive
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : 'border-neutral-200 bg-neutral-50 text-neutral-600'
                        }`}
                      >
                        {slot.isActive ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td className='border-b px-3 py-3'>
                      <div className='flex justify-end gap-2'>
                        <button
                          type='button'
                          className='rounded-md border px-3 py-1.5 text-xs'
                          onClick={() => editSlot(slot)}
                          disabled={saving}
                        >
                          Bearbeiten
                        </button>
                        <button
                          type='button'
                          className='rounded-md border px-3 py-1.5 text-xs'
                          onClick={() => toggleSlot(slot)}
                          disabled={saving}
                        >
                          {slot.isActive ? 'Deaktivieren' : 'Aktivieren'}
                        </button>
                        <button
                          type='button'
                          className='rounded-md border px-3 py-1.5 text-xs text-red-600'
                          onClick={() => deleteSlot(slot)}
                          disabled={saving}
                        >
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
