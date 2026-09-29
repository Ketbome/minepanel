import * as vm from 'node:vm';

export type TickSource = 'neoforge' | 'spark' | 'tabtps' | 'custom';

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

// TabTPS /tickinfo: "TPS: 20.00 (5s), 20.00 (1m), ..." and "MSPT - Average, Minimum, Maximum"
// rows per window ("60s - 0.20, 0.04, 38.49"). RCON can flatten the reply onto one line, so match
// on the labels, never on line breaks. Only the average MSPT is kept: it has no median or p95.
export function parseTabTpsStats(output: string): { tps: number; msptMean: number | null } | null {
  const text = stripFormatting(output);
  const tpsMatch = text.match(/TPS:\s*[\d.,]+\s*\(5s\),\s*([\d.,]+)\s*\(1m\)/i);
  if (!tpsMatch) return null;
  const tps = toNumber(tpsMatch[1]);
  if (tps === null) return null;
  const mspt = text.match(/\b60s\s*-\s*([\d.,]+)\s*,/i) ?? text.match(/\b10s\s*-\s*([\d.,]+)\s*,/i);
  return { tps, msptMean: mspt ? toNumber(mspt[1]) : null };
}

export const MAX_TICK_PATTERN_LENGTH = 200;
const MAX_TICK_OUTPUT_LENGTH = 4096;

// A pattern is only usable if it compiles and has a capture group to read the number from.
export function compileTickPattern(pattern: string): RegExp | null {
  if (!pattern || pattern.length > MAX_TICK_PATTERN_LENGTH) return null;
  try {
    const regex = new RegExp(pattern, 'i');
    return new RegExp(`${regex.source}|`).exec('')!.length > 1 ? regex : null;
  } catch {
    return null;
  }
}

// Patterns are operator-written and run on the panel's single event loop every poll, so a
// backtracking one (`(a+)+$`) would freeze the whole API. Every match runs in a vm context with a
// hard timeout instead: unlike a shape heuristic it holds for any pattern.
export const TICK_PATTERN_TIMEOUT_MS = 50;

export class TickPatternTimeoutError extends Error {
  constructor() {
    super('Pattern took too long to match');
  }
}

const matchContext = vm.createContext({});

function matchWithTimeout(regex: RegExp, text: string): RegExpExecArray | null {
  matchContext.regex = regex;
  matchContext.text = text;
  try {
    return vm.runInContext('regex.exec(text)', matchContext, { timeout: TICK_PATTERN_TIMEOUT_MS }) as RegExpExecArray | null;
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') throw new TickPatternTimeoutError();
    throw error;
  }
}

// Inputs that make classic catastrophic patterns blow up, tried when a pattern is saved or tested.
// Best effort: the match timeout above is the actual guarantee.
const PROBE_INPUTS = ['a'.repeat(64) + '!', '0'.repeat(64) + 'x', ' '.repeat(64) + '!'];

export function isTickPatternSlow(pattern: string): boolean {
  const regex = compileTickPattern(pattern);
  if (!regex) return false;
  try {
    for (const input of PROBE_INPUTS) matchWithTimeout(regex, input);
    return false;
  } catch (error) {
    if (error instanceof TickPatternTimeoutError) return true;
    throw error;
  }
}

export interface CustomTickPatterns {
  tps?: string;
  mspt?: string;
}

export interface ParsedTick {
  source: TickSource;
  tps: number;
  msptMean: number | null;
  msptMedian: number | null;
  msptP95: number | null;
}

// Reads the output of an operator-chosen command. Explicit patterns win; otherwise the built-in
// parsers are tried in turn. Unrecognised output is null, never a guess. A pattern that exceeds
// the match timeout throws TickPatternTimeoutError.
export function parseTickOutput(output: string, patterns: CustomTickPatterns = {}): ParsedTick | null {
  const text = stripFormatting(output).slice(0, MAX_TICK_OUTPUT_LENGTH);
  if (patterns.tps) {
    const tpsRegex = compileTickPattern(patterns.tps);
    const tps = tpsRegex ? toNumber(matchWithTimeout(tpsRegex, text)?.[1]) : null;
    if (tps === null) return null;
    const msptRegex = patterns.mspt ? compileTickPattern(patterns.mspt) : null;
    const msptMean = msptRegex ? toNumber(matchWithTimeout(msptRegex, text)?.[1]) : null;
    return { source: 'custom', tps, msptMean, msptMedian: null, msptP95: null };
  }
  const tabtps = parseTabTpsStats(text);
  if (tabtps) return { source: 'tabtps', tps: tabtps.tps, msptMean: tabtps.msptMean, msptMedian: null, msptP95: null };
  const neoforge = parseNeoForgeStats(text);
  if (neoforge) return { source: 'neoforge', ...neoforge, msptMedian: null, msptP95: null };
  const spark = parseSparkStats(text);
  if (spark) return { source: 'spark', tps: spark.tps, msptMean: null, msptMedian: spark.msptMedian, msptP95: spark.msptP95 };
  return null;
}

function stripFormatting(output: string): string {
  // eslint-disable-next-line no-control-regex
  return output.replace(/§[0-9a-fk-orx]/gi, '').replace(/\u001b\[[0-9;]*m/g, '');
}

function toNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
