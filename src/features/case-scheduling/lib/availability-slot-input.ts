import {
  CaseAppointmentDuration,
  CaseAppointmentRole,
  CaseAppointmentType
} from '@prisma/client';

export function parseSlotRole(value: unknown) {
  const raw = String(value ?? '')
    .trim()
    .toUpperCase();
  if (raw === 'GUTACHTER') return CaseAppointmentRole.GUTACHTER;
  if (raw === 'ANWALT') return CaseAppointmentRole.ANWALT;
  return null;
}

export function parseSlotType(value: unknown) {
  const raw = String(value ?? '')
    .trim()
    .toUpperCase();
  if (raw === 'PHONE') return CaseAppointmentType.PHONE;
  if (raw === 'IN_PERSON') return CaseAppointmentType.IN_PERSON;
  return null;
}

export function parseSlotDuration(value: unknown) {
  const raw = String(value ?? '')
    .trim()
    .toUpperCase();
  if (raw === '15' || raw === 'MINUTES_15') {
    return CaseAppointmentDuration.MINUTES_15;
  }
  if (raw === '30' || raw === 'MINUTES_30') {
    return CaseAppointmentDuration.MINUTES_30;
  }
  return null;
}

export function parseSlotWeekday(value: unknown) {
  const raw = Number(String(value ?? '').trim());
  if (!Number.isInteger(raw) || raw < 1 || raw > 7) return null;
  return raw;
}

export function parseSlotTime(value: unknown) {
  const raw = String(value ?? '').trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23) return null;
  if (minutes < 0 || minutes > 59) return null;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function parseSlotBufferMinutes(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  const raw = Number(value);
  if (!Number.isInteger(raw) || raw < 0 || raw > 180) return null;
  return raw;
}

export function parseNullableBoolean(value: unknown) {
  if (value === true || value === false) return value;
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!raw) return null;
  if (['true', '1', 'yes', 'ja'].includes(raw)) return true;
  if (['false', '0', 'no', 'nein'].includes(raw)) return false;
  return null;
}

export function isValidSlotRange(startTime: string, endTime: string) {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  const startTotal = startHours * 60 + startMinutes;
  const endTotal = endHours * 60 + endMinutes;

  return (
    Number.isFinite(startTotal) &&
    Number.isFinite(endTotal) &&
    endTotal > startTotal
  );
}
