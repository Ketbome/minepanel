// BlasterDaster's speedrun, the time on the leaderboard to beat
export const BLASTER_MS = 12 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');

// mm:ss.t, the way speedrun timers read
export function formatRun(ms: number) {
  return `${pad(Math.floor(ms / 60_000))}:${pad(Math.floor(ms / 1000) % 60)}.${Math.floor(ms / 100) % 10}`;
}
