/**
 * ISO weekday: Monday = 1 ... Sunday = 7
 */
export function getWeekdayFromDate(value: Date) {
  const day = value.getDay();
  return day === 0 ? 7 : day;
}
