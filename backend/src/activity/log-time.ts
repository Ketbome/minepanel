const DAY_MS = 24 * 60 * 60 * 1000;
// Clock skew allowed between the server's clock and ours before a time is read as yesterday
const FUTURE_TOLERANCE_MS = 60_000;

// Offset of `tz` from UTC at `date`, in ms. An unknown zone counts as UTC.
export function tzOffsetMs(date: Date, tz: string): number {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(date);
  } catch {
    return 0;
  }
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// Wall-clock `YYYY-MM-DD` + `HH:MM:SS` in `tz` to a UTC instant.
export function zonedToUtc(day: string, time: string, tz: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  const [hour, minute, second] = time.split(':').map(Number);
  const guess = Date.UTC(year, month - 1, date, hour, minute, second);
  return new Date(guess - tzOffsetMs(new Date(guess), tz));
}

export function localDay(date: Date, tz: string): string {
  return new Date(date.getTime() + tzOffsetMs(date, tz)).toISOString().slice(0, 10);
}

export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

// Log lines only carry a time of day. A live line is the latest moment with that clock time
// that is not in the future.
export function resolveLiveTime(time: string, now: Date, tz: string): Date {
  const today = zonedToUtc(localDay(now, tz), time, tz);
  return today.getTime() > now.getTime() + FUTURE_TOLERANCE_MS ? new Date(today.getTime() - DAY_MS) : today;
}

// Lines written after `after` (the last read before a rotation): the first moment with that
// clock time from then on.
export function resolveTimeAfter(time: string, after: Date, tz: string): Date {
  const sameDay = zonedToUtc(localDay(after, tz), time, tz);
  return sameDay.getTime() < after.getTime() - FUTURE_TOLERANCE_MS ? new Date(sameDay.getTime() + DAY_MS) : sameDay;
}
