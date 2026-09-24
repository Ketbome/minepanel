import { parseNeoForgeStats, parseSparkStats } from './tick-stats';

// Console text layout emitted by spark HealthModule (used on NeoForge/ATM10).
export const SPARK_OUTPUT = `> TPS from last 5s, 10s, 1m, 5m, 15m:
    *20.0, 19.8, 18.6, 19.1, 19.5
> Tick durations (min/med/95%ile/max ms) from last 10s, 1m:
    10.2/35.4/78.6/120.0; 11.0/36.2/80.1/145.0
> CPU usage from last 10s, 1m, 15m:
    10%, 15%, 20% (system)`;

describe('parseSparkStats', () => {
  it('reads 1m TPS and 10s median/P95, not the minimum or the CPU numbers', () => {
    expect(parseSparkStats(SPARK_OUTPUT)).toEqual({ tps: 18.6, msptMedian: 35.4, msptP95: 78.6 });
  });
  it('accepts Minecraft formatting, ANSI colors and flattened RCON output', () => {
    expect(parseSparkStats(SPARK_OUTPUT.replace('18.6', '\x1b[32m§a18.6§r\x1b[0m').replace(/\n/g, ' '))?.tps).toBe(18.6);
  });
  it('retains TPS when a platform cannot report tick durations', () => {
    expect(parseSparkStats(SPARK_OUTPUT.split('> Tick')[0])).toEqual({ tps: 18.6, msptMedian: null, msptP95: null });
  });
  it.each(['', 'Unknown or incomplete command', 'TPS: 20', 'TPS from last 5s, 10s, 1m, 5m, 15m: 20, 20', 'TPS from last 5s, 10s, 1m, 5m, 15m: 20, NaN, 20, 20, 20', 'TPS from last 5s, 10s, 1m, 5m, 15m: 20, , 20, 20, 20'])('rejects unknown or incomplete output: %s', (output) => {
    expect(parseSparkStats(output)).toBeNull();
  });
});

describe('parseNeoForgeStats', () => {
  it('selects overall rather than dimension data', () => {
    expect(parseNeoForgeStats('Overworld: 20.000 TPS (1.000 ms/tick) Overall: 16.000 TPS (62.500 ms/tick)')).toEqual({ tps: 16, msptMean: 62.5 });
  });
  it('supports older NeoForge output and decimal commas', () => {
    expect(parseNeoForgeStats('Overall: Mean tick time: 62,500 ms. Mean TPS: 16,000')).toEqual({ tps: 16, msptMean: 62.5 });
  });
  it.each(['Unknown command', 'Overworld: 20 TPS (1 ms/tick)', 'Overall: 1..2 TPS (1 ms/tick)', 'Overall: -1 TPS (1 ms/tick)'])('rejects invalid output: %s', (value) => {
    expect(parseNeoForgeStats(value)).toBeNull();
  });
});
