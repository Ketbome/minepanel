import { ServerResourceInfo, ServerRuntimeStats } from "@/services/docker/fetchs";

function parsePercentage(value: string): number | null {
  const match = value.match(/[\d.]+/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCpuLimit(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseMemorySize(value: string): number | null {
  const match = value.match(/([\d.]+)\s*([KMGT]?i?B?)/i);
  if (!match) return null;

  const amount = Number.parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const multipliers: Record<string, number> = {
    "": 1,
    B: 1,
    K: 1024,
    KB: 1024,
    KIB: 1024,
    M: 1024 ** 2,
    MB: 1024 ** 2,
    MIB: 1024 ** 2,
    G: 1024 ** 3,
    GB: 1024 ** 3,
    GIB: 1024 ** 3,
    T: 1024 ** 4,
    TB: 1024 ** 4,
    TIB: 1024 ** 4,
  };
  const multiplier = multipliers[unit];
  return Number.isFinite(amount) && multiplier ? amount * multiplier : null;
}

// CPU usage is reported relative to the host, the limit is a core count:
// cpuLimit=2 means 200% of a single core is the ceiling.
export function getCpuPercent(stats: ServerResourceInfo): number | null {
  const usage = parsePercentage(stats.cpuUsage);
  const limit = parseCpuLimit(stats.cpuLimit);
  if (usage === null || limit === null) return null;
  return Math.max(0, (usage / (limit * 100)) * 100);
}

export function getMemoryPercent(stats: ServerResourceInfo): number | null {
  const usage = parseMemorySize(stats.memoryUsage);
  const limit = parseMemorySize(stats.memoryConfigLimit);
  if (usage === null || limit === null || limit <= 0) return null;
  return Math.max(0, (usage / limit) * 100);
}

export function getUsageColor(percent: number): string {
  if (percent >= 90) return "#f05a5a";
  if (percent >= 70) return "#f5c542";
  return "#9dff3f";
}

// A failed probe is not an empty server: never render an unknown count as 0.
export function formatPlayers(stats: ServerRuntimeStats | null): string {
  if (!stats) return "—";
  if (stats.playersOnline === null) {
    return stats.playersMax === null ? "—" : `— / ${stats.playersMax}`;
  }
  return stats.playersMax === null ? String(stats.playersOnline) : `${stats.playersOnline} / ${stats.playersMax}`;
}

export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}%`;
}
