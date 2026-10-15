export type ProblemKind = 'client_only_mod' | 'missing_dependency' | 'mixin_failure' | 'duplicate_mod' | 'java_version' | 'out_of_memory' | 'port_in_use';

export interface Problem {
  kind: ProblemKind;
  evidence: string;
  mods: string[];
}

interface Signature {
  kind: ProblemKind;
  pattern: RegExp;
}

// Containers run with a TTY, so modded consoles redraw their ">" prompt with cursor codes
// around every line. Colours (SGR) go too: callers here want plain text.
export const stripConsoleCodes = (text: string): string =>
  text
    // eslint-disable-next-line no-control-regex
    .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/\x1b[=>]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .replace(/^>[. \t]*(?=\S)/gm, '');

// Startup failures that have a known fix. Matched line by line on the log tail and the
// newest crash report; the mod names come from the same line or the lines around it.
const SIGNATURES: Signature[] = [
  {
    kind: 'client_only_mod',
    pattern: /invalid dist DEDICATED_SERVER|net[/.]minecraft[/.]client[/.]|Environment type CLIENT|client-?side only|ClientModInitializer/i,
  },
  {
    kind: 'missing_dependency',
    pattern: /Missing or unsupported mandatory dependencies|requires (any version|version [^ ]+) of|Incompatible mods? (set|found)|Mod .* requires|missing dependenc|Unmet dependency/i,
  },
  {
    kind: 'mixin_failure',
    pattern: /Mixin (apply|transformation).*failed|MixinApplyError|InvalidMixinException|Critical injection failure/i,
  },
  {
    kind: 'duplicate_mod',
    pattern: /Duplicate mods? found|Found duplicate mods|DuplicateModsFoundException|duplicate mod id/i,
  },
  {
    kind: 'java_version',
    pattern: /UnsupportedClassVersionError|compiled by a more recent version of the Java|requires Java \d+|Java \d+ (or above )?is required/i,
  },
  {
    kind: 'out_of_memory',
    pattern: /OutOfMemoryError|Java heap space|GC overhead limit exceeded|exit code 137/i,
  },
  {
    kind: 'port_in_use',
    pattern: /FAILED TO BIND TO PORT|Address already in use|port is already allocated/i,
  },
];

const MOD_NAME_PATTERNS = [
  /Mod File: (?:.*[/\\])?([^/\\\s]+\.jar)/i,
  /Mod loading issue for: (\S+)/i,
  /Failed to create mod instance\. ModID: (\S+)/i,
  /ModID: ([\w-]+)/,
  /Mod '([^']+)' \(([\w-]+)\)/,
  /requires (?:any version|version \S+) of ([\w-]+)/i,
  /Install ([\w-]+), /,
  /from mod ([\w-]+)/i,
  /mods[/\\]([^/\\\s]+\.jar)/i,
  /provided by '([\w-]+)'/i,
  /mod id '?([\w-]+)'?/i,
];

const ERROR_LINE = /\b(ERROR|FATAL|SEVERE)\b|Exception|Caused by:|Error:/;
const MAX_ERROR_LINES = 30;
const CONTEXT_LINES = 3;

const modsIn = (lines: string[]): string[] => {
  const names = new Set<string>();
  for (const line of lines) {
    for (const pattern of MOD_NAME_PATTERNS) {
      const match = line.match(pattern);
      if (match) names.add(match[2] ?? match[1]);
    }
  }
  return [...names];
};

// The line's own mod names win; the lines around it only fill in when it names none.
const modsNear = (lines: string[], index: number): string[] => {
  const own = modsIn([lines[index]]);
  return own.length ? own : modsIn(lines.slice(Math.max(0, index - CONTEXT_LINES), index + CONTEXT_LINES + 1));
};

export const findProblems = (text: string): Problem[] => {
  const lines = text.split(/\r?\n/);
  const problems = new Map<ProblemKind, Problem>();

  lines.forEach((line, index) => {
    for (const { kind, pattern } of SIGNATURES) {
      if (!pattern.test(line)) continue;
      const problem = problems.get(kind) ?? { kind, evidence: line.trim().slice(0, 500), mods: [] };
      problem.mods = [...new Set([...problem.mods, ...modsNear(lines, index)])];
      problems.set(kind, problem);
    }
  });

  return [...problems.values()];
};

export const errorLines = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .filter((line) => ERROR_LINE.test(line))
    .slice(-MAX_ERROR_LINES)
    .map((line) => line.trim().slice(0, 500));
