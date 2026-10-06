export interface UptimeRow {
  running: boolean;
  createdAt: Date;
}

export interface UptimeWindow {
  hours: number;
  // null when no sample falls in the window.
  uptimePercent: number | null;
  observedMinutes: number;
}

export interface Incident {
  start: string;
  // null while the server is still down.
  end: string | null;
  minutes: number;
}

export interface UptimeDay {
  date: string;
  uptimePercent: number | null;
  observedMinutes: number;
}

const MINUTE_MS = 60_000;
// The sampler ticks every minute; a longer hole means the panel was off, which is unknown, not down.
const MAX_GAP_MS = 3 * MINUTE_MS;
const MAX_INCIDENTS = 10;

const percent = (running: number, observed: number) => (observed ? Math.round((running / observed) * 1000) / 10 : null);

export function computeWindows(rows: UptimeRow[], hoursList: number[], now: number): UptimeWindow[] {
  return hoursList.map((hours) => {
    const since = now - hours * 60 * MINUTE_MS;
    const inside = rows.filter((row) => row.createdAt.getTime() >= since);
    return { hours, uptimePercent: percent(inside.filter((row) => row.running).length, inside.length), observedMinutes: inside.length };
  });
}

// ponytail: UTC days, not the viewer's timezone. Good enough for a 30-bar trend.
export function computeDaily(rows: UptimeRow[], days: number, now: number): UptimeDay[] {
  const buckets = new Map<string, { running: number; observed: number }>();
  for (let i = days - 1; i >= 0; i--) buckets.set(new Date(now - i * 24 * 60 * MINUTE_MS).toISOString().slice(0, 10), { running: 0, observed: 0 });
  for (const row of rows) {
    const bucket = buckets.get(row.createdAt.toISOString().slice(0, 10));
    if (!bucket) continue;
    bucket.observed++;
    if (row.running) bucket.running++;
  }
  return [...buckets].map(([date, { running, observed }]) => ({ date, uptimePercent: percent(running, observed), observedMinutes: observed }));
}

// Rows must be ordered oldest first. Newest incident first in the result.
export function computeIncidents(rows: UptimeRow[], now: number): Incident[] {
  const incidents: Incident[] = [];
  let open: { start: Date; last: Date; minutes: number } | null = null;

  const close = (end: Date | null) => {
    if (open) incidents.push({ start: open.start.toISOString(), end: end?.toISOString() ?? null, minutes: open.minutes });
    open = null;
  };

  let previous: Date | null = null;
  for (const row of rows) {
    if (open && previous && row.createdAt.getTime() - previous.getTime() > MAX_GAP_MS) close(open.last);
    if (!row.running) {
      if (open) {
        open.last = row.createdAt;
        open.minutes++;
      } else {
        open = { start: row.createdAt, last: row.createdAt, minutes: 1 };
      }
    } else {
      close(row.createdAt);
    }
    previous = row.createdAt;
  }
  // Still down only if the panel saw it recently; otherwise the outage ended in an unknown gap.
  if (open) close(previous && now - previous.getTime() <= MAX_GAP_MS ? null : (open as { last: Date }).last);

  return incidents.reverse().slice(0, MAX_INCIDENTS);
}
