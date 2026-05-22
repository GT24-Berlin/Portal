import {
  CaseAppointmentDuration,
  CaseAppointmentRequestStatus,
  CaseAppointmentRole,
  CaseAppointmentType
} from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { addMinutes } from '../lib/add-minutes';
import { getSlotDurationMinutes } from '../lib/get-slot-duration-minutes';
import { getWeekdayFromDate } from '../lib/get-weekday-from-date';
import { isSlotRequestable } from '../lib/is-slot-requestable';
import {
  SCHEDULING_ALLOWED_DURATIONS,
  SCHEDULING_DEFAULT_BUFFER_MINUTES
} from '../lib/scheduling-config';
import type { AvailableAppointmentSlot } from '../types';

type QueryInput = {
  partnerId: string;
  role: CaseAppointmentRole;
  appointmentType?: CaseAppointmentType | null;
  duration?: CaseAppointmentDuration | null;
  excludeRequestId?: string | null;
  windowStart?: Date;
  windowEnd?: Date;
  days?: number;
  now?: Date;
};

type SlotTemplate = {
  role: CaseAppointmentRole;
  appointmentType: CaseAppointmentType;
  duration: CaseAppointmentDuration;
  weekday: number;
  startTime: string;
  endTime: string;
  bufferMinutes: number;
};

type BlockedRequest = {
  requestedStartAt: Date;
  requestedEndAt: Date;
  status: CaseAppointmentRequestStatus;
};

function parseTimeToMinutes(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? '').trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23) return null;
  if (minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function startOfLocalDay(value: Date) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function nextLocalDay(value: Date) {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate() + 1,
    0,
    0,
    0,
    0
  );
}

function combineDateAndMinutes(day: Date, minutes: number) {
  return addMinutes(startOfLocalDay(day), minutes);
}

function overlapsWithBuffer(
  slotStartAt: Date,
  slotEndAt: Date,
  request: BlockedRequest,
  bufferMinutes: number
) {
  const blockedStart = addMinutes(request.requestedStartAt, -bufferMinutes);
  const blockedEnd = addMinutes(request.requestedEndAt, bufferMinutes);

  return slotStartAt < blockedEnd && slotEndAt > blockedStart;
}

function normalizeWindow(input: QueryInput) {
  const now = input.now ?? new Date();
  const minLeadStart = addMinutes(now, 48 * 60);
  const baseStart = input.windowStart ?? now;
  const effectiveWindowStart =
    baseStart.getTime() > minLeadStart.getTime() ? baseStart : minLeadStart;

  const requestedDays =
    typeof input.days === 'number' && Number.isFinite(input.days)
      ? input.days
      : 14;
  const safeDays =
    requestedDays >= 1 && requestedDays <= 30 ? requestedDays : 14;

  const effectiveWindowEnd =
    input.windowEnd ?? addMinutes(baseStart, safeDays * 24 * 60);

  return { now, effectiveWindowStart, effectiveWindowEnd, safeDays };
}

export async function getAvailableAppointmentSlots(input: QueryInput) {
  const { now, effectiveWindowStart, effectiveWindowEnd } =
    normalizeWindow(input);

  if (effectiveWindowEnd.getTime() <= effectiveWindowStart.getTime()) {
    return [];
  }

  const [availabilitySlots, blockedRequests] = await Promise.all([
    prisma.partnerAvailabilitySlot.findMany({
      where: {
        partnerId: input.partnerId,
        role: input.role,
        isActive: true,
        ...(input.appointmentType
          ? { appointmentType: input.appointmentType }
          : {}),
        ...(input.duration ? { duration: input.duration } : {})
      },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }]
    }),
    prisma.caseAppointmentRequest.findMany({
      where: {
        partnerId: input.partnerId,
        ...(input.excludeRequestId
          ? { id: { not: input.excludeRequestId } }
          : {}),
        role: input.role,
        status: {
          in: [
            CaseAppointmentRequestStatus.REQUESTED,
            CaseAppointmentRequestStatus.CONFIRMED,
            CaseAppointmentRequestStatus.ALTERNATIVE_PROPOSED
          ]
        }
      },
      select: {
        requestedStartAt: true,
        requestedEndAt: true,
        status: true
      }
    })
  ]);

  const slots: AvailableAppointmentSlot[] = [];
  const windowStart = startOfLocalDay(effectiveWindowStart);
  const windowEnd = effectiveWindowEnd;

  for (
    let dayCursor = windowStart;
    dayCursor.getTime() <= windowEnd.getTime();
    dayCursor = nextLocalDay(dayCursor)
  ) {
    const isoWeekday = getWeekdayFromDate(dayCursor);

    const templatesForDay = availabilitySlots.filter((slot) => {
      if (slot.weekday !== isoWeekday) return false;
      if (
        input.appointmentType &&
        slot.appointmentType !== input.appointmentType
      )
        return false;
      if (input.duration && slot.duration !== input.duration) return false;
      if (
        !SCHEDULING_ALLOWED_DURATIONS.includes(
          getSlotDurationMinutes(slot.duration) as 15 | 30
        )
      )
        return false;
      return true;
    }) as SlotTemplate[];

    for (const template of templatesForDay) {
      const durationMinutes = getSlotDurationMinutes(template.duration);
      if (!durationMinutes) continue;

      const bufferMinutes =
        Number.isFinite(template.bufferMinutes) && template.bufferMinutes >= 0
          ? template.bufferMinutes
          : SCHEDULING_DEFAULT_BUFFER_MINUTES;

      const startMinutes = parseTimeToMinutes(template.startTime);
      const endMinutes = parseTimeToMinutes(template.endTime);
      if (startMinutes === null || endMinutes === null) continue;
      if (endMinutes <= startMinutes) continue;

      const stepMinutes = durationMinutes + bufferMinutes;
      const availabilityStartAt = combineDateAndMinutes(
        dayCursor,
        startMinutes
      );
      const availabilityEndAt = combineDateAndMinutes(dayCursor, endMinutes);

      for (
        let candidateStartAt = availabilityStartAt;
        candidateStartAt.getTime() < availabilityEndAt.getTime();
        candidateStartAt = addMinutes(candidateStartAt, stepMinutes)
      ) {
        const candidateEndAt = addMinutes(candidateStartAt, durationMinutes);
        if (candidateEndAt.getTime() > availabilityEndAt.getTime()) break;
        if (candidateStartAt.getTime() < effectiveWindowStart.getTime())
          continue;
        if (candidateStartAt.getTime() >= windowEnd.getTime()) continue;
        if (!isSlotRequestable(candidateStartAt, now)) continue;

        const hasConflict = blockedRequests.some((request) =>
          overlapsWithBuffer(
            candidateStartAt,
            candidateEndAt,
            request,
            bufferMinutes
          )
        );

        if (hasConflict) continue;

        slots.push({
          partnerId: input.partnerId,
          role: input.role as CaseAppointmentRole,
          appointmentType: template.appointmentType,
          duration: template.duration,
          startAt: candidateStartAt.toISOString(),
          endAt: candidateEndAt.toISOString(),
          bufferMinutes
        });
      }
    }
  }

  slots.sort((a, b) => a.startAt.localeCompare(b.startAt));
  return slots;
}
