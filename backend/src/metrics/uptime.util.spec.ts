import { computeDaily, computeIncidents, computeWindows } from './uptime.util';

const NOW = Date.parse('2026-10-06T12:00:00Z');
const at = (minutesAgo: number, running: boolean) => ({ running, createdAt: new Date(NOW - minutesAgo * 60_000) });

describe('uptime.util', () => {
  it('computes windows from the observed minutes only', () => {
    const rows = [at(30, true), at(29, true), at(28, false), at(27, true), at(60 * 30, false)];
    const [day, week] = computeWindows(rows, [24, 168], NOW);
    expect(day).toEqual({ hours: 24, uptimePercent: 75, observedMinutes: 4 });
    expect(week.observedMinutes).toBe(5);
    expect(computeWindows([], [24], NOW)[0].uptimePercent).toBeNull();
  });

  it('buckets days and leaves unobserved days null', () => {
    const daily = computeDaily([at(5, true), at(4, false)], 3, NOW);
    expect(daily).toHaveLength(3);
    expect(daily[2]).toEqual({ date: '2026-10-06', uptimePercent: 50, observedMinutes: 2 });
    expect(daily[0].uptimePercent).toBeNull();
  });

  it('closes an incident when the server comes back', () => {
    const rows = [at(10, true), at(9, false), at(8, false), at(7, true), at(1, true)];
    expect(computeIncidents(rows, NOW)).toEqual([{ start: at(9, false).createdAt.toISOString(), end: at(7, true).createdAt.toISOString(), minutes: 2 }]);
  });

  it('keeps an incident open while the latest sample is down and fresh', () => {
    const [incident] = computeIncidents([at(2, false), at(1, false)], NOW);
    expect(incident).toMatchObject({ end: null, minutes: 2 });
  });

  it('ends an incident at its last down sample across a panel outage gap', () => {
    const rows = [at(100, false), at(99, false), at(10, true)];
    const [incident] = computeIncidents(rows, NOW);
    expect(incident).toEqual({ start: at(100, false).createdAt.toISOString(), end: at(99, false).createdAt.toISOString(), minutes: 2 });
    // a stale trailing down run is not "ongoing" either
    expect(computeIncidents([at(100, false)], NOW)[0].end).not.toBeNull();
  });

  it('returns the newest ten incidents newest first', () => {
    const rows = Array.from({ length: 12 }, (_, i) => [at(200 - i * 10, false), at(199 - i * 10, true)]).flat();
    const incidents = computeIncidents(rows, NOW);
    expect(incidents).toHaveLength(10);
    expect(incidents[0].start > incidents[1].start).toBe(true);
  });
});
