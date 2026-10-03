import { backupDuration } from './backup-freshness';

describe('backup schedule durations', () => {
  it.each([['24h', 86_400_000], ['1h 30m', 5_400_000], ['0.5h', 1_800_000], ['30', 30_000]])('accepts %s', (input, expected) => expect(backupDuration(input)).toBe(expected));
  it.each(['', 'cron', '-1h', '0', '999999d'])('does not guess a schedule for %s', (input) => expect(backupDuration(input)).toBeNull());
  it('allows zero initial delay but not a zero repeat interval', () => expect(backupDuration('0', true)).toBe(0));
});
