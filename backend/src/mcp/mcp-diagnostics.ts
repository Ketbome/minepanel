import { PanelApi } from './panel-api';

export type ProblemKind = 'client_only_mod' | 'missing_dependency' | 'mixin_failure' | 'duplicate_mod' | 'java_version' | 'out_of_memory' | 'port_in_use';

export interface Problem {
  kind: ProblemKind;
  fix: string;
  evidence: string;
  mods: string[];
}

interface Signature {
  kind: ProblemKind;
  pattern: RegExp;
  fix: string;
}

// Startup failures that have a known fix. Matched line by line on the log tail and the
// newest crash report; the mod names come from the same line or the lines around it.
const SIGNATURES: Signature[] = [
  {
    kind: 'client_only_mod',
    pattern: /invalid dist DEDICATED_SERVER|net[/.]minecraft[/.]client[/.]|Environment type CLIENT|client-?side only|ClientModInitializer/i,
    fix: 'A client-only mod is installed. Find it with list_installed_mods (side "client" or "known-client") or the mods named here, remove it with remove_mods, then start again.',
  },
  {
    kind: 'missing_dependency',
    pattern: /Missing or unsupported mandatory dependencies|requires (any version|version [^ ]+) of|Incompatible mods? (set|found)|Mod .* requires|missing dependenc|Unmet dependency/i,
    fix: 'A mod needs another mod (or another version of it). Add the dependency with add_mods, or set modrinthDownloadDependencies to "required" with update_server.',
  },
  {
    kind: 'mixin_failure',
    pattern: /Mixin (apply|transformation).*failed|MixinApplyError|InvalidMixinException|Critical injection failure/i,
    fix: 'A mod failed to patch the game, usually because it is client-only or built for another version. Remove or update the mod named here.',
  },
  {
    kind: 'duplicate_mod',
    pattern: /Duplicate mods? found|Found duplicate mods|DuplicateModsFoundException|duplicate mod id/i,
    fix: 'The same mod is installed twice. Remove one copy with remove_mods or delete_file on the older jar.',
  },
  {
    kind: 'java_version',
    pattern: /UnsupportedClassVersionError|compiled by a more recent version of the Java|requires Java \d+|Java \d+ (or above )?is required/i,
    fix: 'The Java version does not match the game or a mod. Change dockerImage (the itzg image tag) with update_server, e.g. "java21" for 1.20.5+ or "java17" for 1.18-1.20.4. Only admins can change it.',
  },
  {
    kind: 'out_of_memory',
    pattern: /OutOfMemoryError|Java heap space|GC overhead limit exceeded|exit code 137/i,
    fix: 'The server ran out of memory. Raise maxMemory (e.g. "6G") with update_server, or remove heavy mods.',
  },
  {
    kind: 'port_in_use',
    pattern: /FAILED TO BIND TO PORT|Address already in use|port is already allocated/i,
    fix: 'The port is already in use by another server or program. Change port with update_server.',
  },
];

const MOD_NAME_PATTERNS = [
  /Mod File: (?:.*[/\\])?([^/\\\s]+\.jar)/i,
  /Mod loading issue for: (\S+)/i,
  /Failed to create mod instance\. ModID: (\S+)/i,
  /ModID: ([\w-]+)/,
  /Mod '([^']+)' \(([\w-]+)\)/,
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
    for (const { kind, pattern, fix } of SIGNATURES) {
      if (!pattern.test(line)) continue;
      const problem = problems.get(kind) ?? { kind, fix, evidence: line.trim().slice(0, 500), mods: [] };
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

const tryGet = async <T>(api: PanelApi, path: string, query?: Record<string, unknown>): Promise<T | null> => {
  try {
    return (await api.request({ method: 'GET', path, query })) as T;
  } catch {
    return null;
  }
};

const latestCrashReport = async (api: PanelApi, serverId: string) => {
  const files = await tryGet<Array<{ name: string; modified?: string; isDirectory?: boolean }>>(api, `/files/${encodeURIComponent(serverId)}/list`, { path: 'crash-reports' });
  const newest = (files ?? []).filter((file) => !file.isDirectory && file.name.endsWith('.txt')).sort((a, b) => String(b.modified ?? b.name).localeCompare(String(a.modified ?? a.name)))[0];
  if (!newest) return null;

  const file = await tryGet<{ content: string }>(api, `/files/${encodeURIComponent(serverId)}/read`, { path: `crash-reports/${newest.name}` });
  return file ? { file: newest.name, modified: newest.modified ?? null, content: file.content } : null;
};

export const diagnose = async (api: PanelApi, serverId: string) => {
  const id = encodeURIComponent(serverId);
  const [status, logs, crash] = await Promise.all([
    tryGet<{ status: string }>(api, `/servers/${id}/status`),
    tryGet<{ logs?: string }>(api, `/servers/${id}/logs`, { lines: 400 }),
    latestCrashReport(api, serverId),
  ]);
  const logText = logs?.logs ?? '';
  const crashText = crash?.content ?? '';

  return {
    status: status?.status ?? 'unknown',
    problems: findProblems(`${logText}\n${crashText}`),
    errorLines: errorLines(logText),
    crashReport: crash ? { file: crash.file, modified: crash.modified, excerpt: crashText.slice(0, 4000) } : null,
    logTail: logText.split(/\r?\n/).slice(-40).join('\n'),
  };
};

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const waitForServer = async (api: PanelApi, serverId: string, timeoutMs: number, pollMs = 5000) => {
  const id = encodeURIComponent(serverId);
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const stats = await tryGet<{ status: string; gameReachable?: boolean; playersOnline?: number | null; version?: string | null }>(api, `/servers/${id}/runtime-stats`);
    if (stats?.status === 'running' && stats.gameReachable) {
      return { state: 'ready', status: stats.status, version: stats.version ?? null, playersOnline: stats.playersOnline ?? null };
    }
    // Start returns once the container is up, so a stopped container here exited on its own.
    if (stats?.status === 'stopped' || stats?.status === 'not_found') {
      return { state: 'stopped', ...(await diagnose(api, serverId)) };
    }
    if (Date.now() + pollMs > deadline) {
      return { state: 'still_starting', hint: 'Not reachable yet. Call wait_for_server again; modded servers can take several minutes the first time.', ...(await diagnose(api, serverId)) };
    }
    await sleep(pollMs);
  }
};
