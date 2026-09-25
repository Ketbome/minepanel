export interface SparkStats {
  tps: number;
  msptMedian: number | null;
  msptP95: number | null;
}

export function parseNeoForgeStats(output: string): { tps: number; msptMean: number } | null {
  const text = output.replace(/§[0-9a-fk-orx]/gi, '');
  // Read the overall server row, never a dimension's faster tick loop.
  const current = text.match(/Overall:\s*([\d.,]+)\s*TPS\s*\(([\d.,]+)\s*ms\/tick\)/i);
  const legacy = text.match(/Overall:\s*Mean tick time:\s*([\d.,]+)\s*ms\.?\s*Mean TPS:\s*([\d.,]+)/i);
  if (!current && !legacy) return null;
  const tps = Number((current ? current[1] : legacy![2]).replace(',', '.'));
  const msptMean = Number((current ? current[2] : legacy![1]).replace(',', '.'));
  return Number.isFinite(tps) && Number.isFinite(msptMean) ? { tps, msptMean } : null;
}

// spark tps: 5s/10s/1m/5m/15m TPS, followed by 10s/1m tick durations.
// Match the headings as well as the values: unknown output is never healthy data.
export function parseSparkStats(output: string): SparkStats | null {
  // Strip console color sequences before matching numeric fields.
  // eslint-disable-next-line no-control-regex
  const text = output.replace(/§[0-9a-fk-orx]/gi, '').replace(/\u001b\[[0-9;]*m/g, '');
  const tpsMatch = text.match(/TPS from last 5s, 10s, 1m, 5m, 15m:\s*([*\d.,\s]+)/i);
  if (!tpsMatch) return null;
  const values = tpsMatch[1].trim().split(/\s*,\s*/).map((value) => /^\*?\d+(?:\.\d+)?$/.test(value) ? Number(value.replace(/^\*/, '')) : NaN);
  if (values.length !== 5 || values.some((value) => !Number.isFinite(value) || value < 0)) return null;

  const durations = text.match(/Tick durations \(min\/med\/95%ile\/max ms\) from last 10s, 1m:\s*([\d.]+)\s*\/\s*([\d.]+)\s*\/\s*([\d.]+)\s*\/\s*([\d.]+)/i);
  const median = durations ? Number(durations[2]) : null;
  const p95 = durations ? Number(durations[3]) : null;
  return {
    tps: values[2],
    msptMedian: median !== null && Number.isFinite(median) ? median : null,
    msptP95: p95 !== null && Number.isFinite(p95) ? p95 : null,
  };
}
