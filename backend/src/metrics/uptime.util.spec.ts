import { computeDaily, computeIncidents, computeWindows } from './uptime.util';

const NOW = Date.parse('2026-10-06T12:00:00Z');
const ago = (minutes: number) => new Date(NOW - minutes * 60_000);
// An interval as the sampler writes it: the first sample covers the minute before it.
const span = (fromMinutesAgo: number, toMinutesAgo: number, running: boolean) => ({ running, startedAt: ago(fromMinutesAgo), endedAt: ago(toMinutesAgo) });

describe('uptime.util', () => {
  it('computes windows from the observed time only', () => {
    const spans = [span(60 * 30 + 1, 60 * 30, false), span(31, 28, true), span(28, 27, false)];
    const [day, week] = computeWindows(spans, [24, 168], NOW);
    expect(day).toEqual({ hours: 24, uptimePercent: 75, observedMinutes: 4 });
    expect(week.observedMinutes).toBe(5);
    expect(computeWindows([], [24], NOW)[0].uptimePercent).toBeNull();
  });

  it('clips an interval to the window it crosses', () => {
    const [hour] = computeWindows([span(120, 0, true)], [1], NOW);
    expect(hour).toEqual({ hours: 1, uptimePercent: 100, observedMinutes: 60 });
  });

  it('buckets UTC days, splits intervals across midnight and leaves unobserved days null', () => {
    const daily = computeDaily([span(12 * 60 + 30, 12 * 60 - 30, true), span(6, 4, false)], 3, NOW);
    expect(daily.map((d) => d.date)).toEqual(['2026-10-04', '2026-10-05', '2026-10-06']);
    expect(daily[0].uptimePercent).toBeNull();
    expect(daily[1]).toEqual({ date: '2026-10-05', uptimePercent: 100, observedMinutes: 30 });
    expect(daily[2]).toEqual({ date: '2026-10-06', uptimePercent: 93.8, observedMinutes: 32 });
  });

  it('closes an incident when the server comes back', () => {
    const spans = [span(11, 10, true), span(10, 8, false), span(8, 1, true)];
    expect(computeIncidents(spans, NOW)).toEqual([{ start: ago(10).toISOString(), end: ago(8).toISOString(), minutes: 2 }]);
  });

  it('keeps an incident open while the latest interval is down and fresh', () => {
    const [incident] = computeIncidents([span(3, 1, false)], NOW);
    expect(incident).toMatchObject({ end: null, minutes: 2 });
  });

  it('ends an incident at its last down sample across a panel outage gap', () => {
    const spans = [span(101, 99, false), span(11, 10, true)];
    expect(computeIncidents(spans, NOW)).toEqual([{ start: ago(101).toISOString(), end: ago(99).toISOString(), minutes: 2 }]);
    // a stale trailing down interval is not "ongoing" either
    expect(computeIncidents([span(101, 100, false)], NOW)[0].end).not.toBeNull();
  });

  it('returns the newest ten incidents newest first', () => {
    const spans = Array.from({ length: 12 }, (_, i) => [span(201 - i * 10, 200 - i * 10, false), span(200 - i * 10, 199 - i * 10, true)]).flat();
    const incidents = computeIncidents(spans, NOW);
    expect(incidents).toHaveLength(10);
    expect(incidents[0].start > incidents[1].start).toBe(true);
  });
});
