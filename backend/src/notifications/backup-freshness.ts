// Accept only the interval format supported by the backup sidecar. Unknown
// schedules cannot prove that a backup is overdue.
export function backupDuration(value: string, allowZero = false): number | null {
  let total = 0;
  for (const token of value.trim().split(/\s+/)) {
    const match = /^(\d+(?:\.\d+)?)([smhd]?)$/.exec(token);
    if (!match) return null;
    total += Number(match[1]) * ({ s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] || 's']);
  }
  return (total > 0 || (allowZero && total === 0)) && Number.isFinite(total) && total <= 365 * 86_400_000 ? total : null;
}
