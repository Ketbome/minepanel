export function parseCpuPercent(value: string): number | null {
  if (!value || value === 'N/A') {
    return null;
  }
  const parsed = Number.parseFloat(value.replace('%', '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseMemoryToMb(value: string): number | null {
  if (!value || value === 'N/A') {
    return null;
  }

  const match = value.trim().match(/^([\d.]+)\s*([a-zA-Z]+)$/);
  if (!match) {
    return null;
  }

  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount)) {
    return null;
  }

  const unit = match[2].toLowerCase();
  const toMb: Record<string, number> = {
    b: 1 / (1024 * 1024),
    kb: 1 / 1024,
    kib: 1 / 1024,
    mb: 1,
    mib: 1,
    gb: 1024,
    gib: 1024,
    tb: 1024 * 1024,
    tib: 1024 * 1024,
  };

  const factor = toMb[unit];
  if (factor === undefined) {
    return null;
  }

  return Math.round(amount * factor * 100) / 100;
}
