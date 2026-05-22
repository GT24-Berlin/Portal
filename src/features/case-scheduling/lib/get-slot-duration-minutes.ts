import { CaseAppointmentDuration } from '@prisma/client';

export function getSlotDurationMinutes(duration: CaseAppointmentDuration) {
  switch (duration) {
    case CaseAppointmentDuration.MINUTES_15:
      return 15;
    case CaseAppointmentDuration.MINUTES_30:
      return 30;
    default:
      return null;
  }
}
