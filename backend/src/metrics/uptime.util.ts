export interface UptimeSpan {
  running: boolean;
  startedAt: Date;
  endedAt: Date;
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
const DAY_MS = 24 * 60 * MINUTE_MS;
// The sampler ticks every minute; a longer hole means the panel was off, which is unknown, not down.
export const MAX_GAP_MS = 3 * MINUTE_MS;
const MAX_INCIDENTS = 10;

const percent = (running: number, observed: number) => (observed ? Math.round((running / observed) * 1000) / 10 : null);
const overlap = (span: UptimeSpan, from: number, to: number) => Math.max(0, Math.min(span.endedAt.getTime(), to) - Math.max(span.startedAt.getTime(), from));

function measure(spans: UptimeSpan[], from: number, to: number) {
  let running = 0;
  let observed = 0;
  for (const span of spans) {
    const ms = overlap(span, from, to);
    observed += ms;
    if (span.running) running += ms;
  }
  return { uptimePercent: percent(running, observed), observedMinutes: Math.round(observed / MINUTE_MS) };
}

export function computeWindows(spans: UptimeSpan[], hoursList: number[], now: number): UptimeWindow[] {
  return hoursList.map((hours) => ({ hours, ...measure(spans, now - hours * 60 * MINUTE_MS, now) }));
}

// ponytail: UTC days, not the viewer's timezone. Good enough for a 30-bar trend.
export function computeDaily(spans: UptimeSpan[], days: number, now: number): UptimeDay[] {
  const today = Math.floor(now / DAY_MS) * DAY_MS;
  return Array.from({ length: days }, (_, i) => {
    const from = today - (days - 1 - i) * DAY_MS;
    return { date: new Date(from).toISOString().slice(0, 10), ...measure(spans, from, from + DAY_MS) };
  });
}

// Spans must be ordered oldest first. Newest incident first in the result.
export function computeIncidents(spans: UptimeSpan[], now: number): Incident[] {
  const last = spans[spans.length - 1];
  return spans
    .filter((span) => !span.running)
    .map((span) => {
      // Still down only if it is the latest span and the panel saw it recently; otherwise it
      // ended when the server came back, or in an unknown gap.
      const ongoing = span === last && now - span.endedAt.getTime() <= MAX_GAP_MS;
      return {
        start: span.startedAt.toISOString(),
        end: ongoing ? null : span.endedAt.toISOString(),
        minutes: Math.max(1, Math.round((span.endedAt.getTime() - span.startedAt.getTime()) / MINUTE_MS)),
      };
    })
    .reverse()
    .slice(0, MAX_INCIDENTS);
}
