import { addDays, localDay, resolveLiveTime, resolveTimeAfter, tzOffsetMs, zonedToUtc } from './log-time';

describe('log-time', () => {
  it('computes zone offsets and treats unknown zones as UTC', () => {
    expect(tzOffsetMs(new Date('2026-01-15T12:00:00Z'), 'America/Santiago')).toBe(-3 * 3600_000);
    expect(tzOffsetMs(new Date('2026-07-15T12:00:00Z'), 'America/Santiago')).toBe(-4 * 3600_000);
    expect(tzOffsetMs(new Date('2026-07-15T12:00:00Z'), 'Not/AZone')).toBe(0);
  });

  it('converts wall-clock time to UTC', () => {
    expect(zonedToUtc('2026-07-15', '20:30:00', 'America/Santiago').toISOString()).toBe('2026-07-16T00:30:00.000Z');
    expect(zonedToUtc('2026-07-15', '20:30:00', 'UTC').toISOString()).toBe('2026-07-15T20:30:00.000Z');
  });

  it('works out local days', () => {
    expect(localDay(new Date('2026-07-16T02:00:00Z'), 'America/Santiago')).toBe('2026-07-15');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('places a live line today, or yesterday when today would be in the future', () => {
    const now = new Date('2026-07-15T00:05:00Z');
    expect(resolveLiveTime('00:04:30', now, 'UTC').toISOString()).toBe('2026-07-15T00:04:30.000Z');
    expect(resolveLiveTime('23:59:50', now, 'UTC').toISOString()).toBe('2026-07-14T23:59:50.000Z');
  });

  it('places a line after a reference, rolling over midnight', () => {
    const after = new Date('2026-07-14T23:59:00Z');
    expect(resolveTimeAfter('23:59:30', after, 'UTC').toISOString()).toBe('2026-07-14T23:59:30.000Z');
    expect(resolveTimeAfter('00:00:10', after, 'UTC').toISOString()).toBe('2026-07-15T00:00:10.000Z');
  });
});
