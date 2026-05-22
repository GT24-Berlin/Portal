export const SCHEDULING_MIN_LEAD_HOURS = 48;
export const SCHEDULING_PARTNER_RESPONSE_HOURS = 24;
export const SCHEDULING_DEFAULT_BUFFER_MINUTES = 15;
export const SCHEDULING_ALLOWED_DURATIONS = [15, 30] as const;

export type SchedulingAllowedDuration =
  (typeof SCHEDULING_ALLOWED_DURATIONS)[number];
