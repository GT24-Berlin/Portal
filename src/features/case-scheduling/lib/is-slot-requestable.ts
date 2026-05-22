import { SCHEDULING_MIN_LEAD_HOURS } from './scheduling-config';

export function isSlotRequestable(
  startAt: Date,
  now: Date = new Date()
): boolean {
  const minStart = now.getTime() + SCHEDULING_MIN_LEAD_HOURS * 60 * 60 * 1000;
  return startAt.getTime() >= minStart;
}
