import { compileTickPattern, parseNeoForgeStats, parseSparkStats, parseTabTpsStats, parseTickOutput } from './tick-stats';

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

// Real /tickinfo reply, flattened onto one line as RCON delivers it.
export const TABTPS_OUTPUT = '[TabTPS] Server Tick InformationTPS: 20.00 (5s), 19.50 (1m), 20.00 (5m), 20.00 (15m)MSPT - Average, Minimum, Maximum ├─ 5s - 0.09, 0.04, 0.44 ├─ 10s - 0.09, 0.04, 0.44 └─ 60s - 0.20, 0.04, 38.49CPU: 0.84%, 1.33% (sys., proc.)RAM: 746M/1200M (max. 7168M)[|||||||]';

describe('parseTabTpsStats', () => {
  it('reads 1m TPS and the 60s average MSPT from flattened output', () => {
    expect(parseTabTpsStats(TABTPS_OUTPUT)).toEqual({ tps: 19.5, msptMean: 0.2 });
  });
  it('falls back to the 10s row and tolerates missing MSPT', () => {
    expect(parseTabTpsStats(TABTPS_OUTPUT.replace(/└─ 60s.*?CPU/, 'CPU'))?.msptMean).toBe(0.09);
    expect(parseTabTpsStats('TPS: 20.00 (5s), 18.00 (1m), 20 (5m)')).toEqual({ tps: 18, msptMean: null });
  });
  it.each(['', 'Unknown command', 'TPS: 20.00 (5s), abc (1m)', 'Overall: 16 TPS (62.5 ms/tick)'])('rejects %s', (output) => {
    expect(parseTabTpsStats(output)).toBeNull();
  });
});

describe('compileTickPattern', () => {
  it('needs a capture group and a sane length', () => {
    expect(compileTickPattern('tps=([\\d.]+)')).toBeInstanceOf(RegExp);
    expect(compileTickPattern('tps=[\\d.]+')).toBeNull();
    expect(compileTickPattern('(')).toBeNull();
    expect(compileTickPattern('')).toBeNull();
    expect(compileTickPattern(`(${'a'.repeat(200)})`)).toBeNull();
  });
});

describe('parseTickOutput', () => {
  it('auto-detects each built-in format', () => {
    expect(parseTickOutput(TABTPS_OUTPUT)).toMatchObject({ source: 'tabtps', tps: 19.5, msptMean: 0.2, msptMedian: null });
    expect(parseTickOutput('Overall: 16 TPS (62.5 ms/tick)')).toMatchObject({ source: 'neoforge', tps: 16, msptMean: 62.5 });
    expect(parseTickOutput(SPARK_OUTPUT)).toMatchObject({ source: 'spark', tps: 18.6, msptMedian: 35.4, msptP95: 78.6, msptMean: null });
  });
  it('lets explicit patterns win and labels the source custom', () => {
    expect(parseTickOutput('ticks: 19,5 / 51 ms', { tps: 'ticks: ([\\d.,]+)', mspt: '/ ([\\d.]+) ms' })).toEqual({ source: 'custom', tps: 19.5, msptMean: 51, msptMedian: null, msptP95: null });
    expect(parseTickOutput('ticks: 20', { tps: 'ticks: ([\\d.]+)' })).toMatchObject({ source: 'custom', tps: 20, msptMean: null });
  });
  it('never guesses when a pattern is invalid or does not match', () => {
    expect(parseTickOutput(TABTPS_OUTPUT, { tps: 'nomatch ([\\d.]+)' })).toBeNull();
    expect(parseTickOutput(TABTPS_OUTPUT, { tps: '(' })).toBeNull();
    expect(parseTickOutput('anything')).toBeNull();
  });
  it('only reads the first 4 KB of output', () => {
    expect(parseTickOutput(`${' '.repeat(5000)}${TABTPS_OUTPUT}`)).toBeNull();
  });
});
