import { Problem, ProblemKind } from 'src/server-management/server-diagnostics';
import { PanelApi } from './panel-api';

// What an agent should do about each problem, in terms of the MCP tools it has.
const FIXES: Record<ProblemKind, string> = {
  client_only_mod: 'A client-only mod is installed. Find it with list_installed_mods (side "client" or "known-client") or the mods named here, remove it with remove_mods, then start again.',
  missing_dependency: 'A mod needs another mod (or another version of it). Add the dependency named here with add_mods, or set modrinthDownloadDependencies to "required" with update_server.',
  mixin_failure: 'A mod failed to patch the game, usually because it is client-only or built for another version. Remove or update the mod named here.',
  duplicate_mod: 'The same mod is installed twice. Remove one copy with remove_mods or delete_file on the older jar.',
  java_version: 'The Java version does not match the game or a mod. Change dockerImage (the itzg image tag) with update_server, e.g. "java21" for 1.20.5+ or "java17" for 1.18-1.20.4. Needs an admin token or the changeServerVersion permission.',
  out_of_memory: 'The server ran out of memory. Raise maxMemory (e.g. "6G") with update_server, or remove heavy mods.',
  port_in_use: 'The port is already in use by another server or program. Change port with update_server.',
};

const tryGet = async <T>(api: PanelApi, path: string): Promise<T | null> => {
  try {
    return (await api.request({ method: 'GET', path })) as T;
  } catch {
    return null;
  }
};

export const diagnose = async (api: PanelApi, serverId: string) => {
  const diagnosis = (await api.request({ method: 'GET', path: `/servers/${encodeURIComponent(serverId)}/diagnosis` })) as { problems: Problem[] } & Record<string, unknown>;
  return { ...diagnosis, problems: diagnosis.problems.map((problem) => ({ ...problem, fix: FIXES[problem.kind] })) };
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
