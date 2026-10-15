import { normalizeModRef } from 'src/modpacks/mod-jar-metadata';
import { PanelApi } from './panel-api';

// Same grammar as the Mods tab (frontend/src/lib/utils/mod-entries.ts):
// `[prefix:]ref[?][(:|@)version]`, entries separated by commas or newlines.
const MODRINTH_PREFIXES = new Set(['datapack', 'fabric', 'forge', 'neoforge', 'quilt', 'paper', 'spigot', 'bukkit', 'purpur', 'folia']);

export const splitEntries = (value?: string | null): string[] =>
  (value ?? '')
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

export const entryRef = (entry: string): string => {
  if (/^https?:\/\//i.test(entry) || entry.startsWith('@')) return entry;
  const colon = entry.indexOf(':');
  const ref = colon > 0 && MODRINTH_PREFIXES.has(entry.slice(0, colon).toLowerCase()) ? entry.slice(colon + 1) : entry;
  return ref.split(/[:@]/)[0].replace(/\?$/, '');
};

const sameMod = (a: string, b: string) => normalizeModRef(a) === normalizeModRef(b);

// "oculus-mc1.21-1.7.0.jar" -> "oculus": the name up to the first version-looking part.
const jarBase = (fileName: string) => fileName.replace(/\.jar$/i, '').split(/[-_+](?:mc|v)?\d/i)[0];

type ServerConfig = Record<string, unknown> & { serverType?: string; modrinthProjects?: string; cfFiles?: string; cfExclude?: string; envVars?: string };
type InstalledMod = { fileName: string; modId?: string; name?: string };

const config = async (api: PanelApi, serverId: string) => (await api.request({ method: 'GET', path: `/servers/${encodeURIComponent(serverId)}` })) as ServerConfig;
const update = (api: PanelApi, serverId: string, changes: Record<string, unknown>) => api.request({ method: 'PUT', path: `/servers/${encodeURIComponent(serverId)}`, body: changes });

export const addMods = async (api: PanelApi, serverId: string, source: 'modrinth' | 'curseforge', mods: string[]) => {
  const field = source === 'modrinth' ? 'modrinthProjects' : 'cfFiles';
  const entries = splitEntries((await config(api, serverId))[field]);
  const result = mods.map((mod) => {
    const index = entries.findIndex((entry) => sameMod(entryRef(entry), entryRef(mod)));
    if (index === -1) {
      entries.push(mod);
      return { mod, action: 'added' };
    }
    const action = entries[index] === mod ? 'already listed' : `replaced ${entries[index]}`;
    entries[index] = mod;
    return { mod, action };
  });

  await update(api, serverId, { [field]: entries.join('\n') });
  return { field, mods: result, next: 'Restart the server (or start it) for the change to apply, then call wait_for_server.' };
};

// A mod can come from the mod lists, from a modpack, or be a loose jar in mods/. Each needs a
// different fix, or it comes back on the next start; this applies every one that matches.
export const removeMods = async (api: PanelApi, serverId: string, mods: string[]) => {
  const id = encodeURIComponent(serverId);
  const current = await config(api, serverId);
  let installed: InstalledMod[] = [];
  try {
    installed = ((await api.request({ method: 'GET', path: `/servers/${id}/installed-mods` })) as { mods: InstalledMod[] }).mods;
  } catch {
    // Without file access the jars just can't be matched; list changes still apply.
  }

  const lists = { modrinthProjects: splitEntries(current.modrinthProjects), cfFiles: splitEntries(current.cfFiles) };
  const cfExclude = splitEntries(current.cfExclude);
  const modrinthExcludes: string[] = [];
  const changes: Record<string, string> = {};
  const report = mods.map((mod) => ({ mod, actions: [] as string[] }));

  for (const entry of report) {
    for (const field of ['modrinthProjects', 'cfFiles'] as const) {
      const kept = lists[field].filter((item) => !sameMod(entryRef(item), entry.mod));
      if (kept.length !== lists[field].length) {
        lists[field] = kept;
        changes[field] = kept.join('\n');
        entry.actions.push(`removed from ${field}`);
      }
    }
    if (entry.actions.length) continue;

    if (current.serverType === 'AUTO_CURSEFORGE' && !cfExclude.some((item) => sameMod(item, entry.mod))) {
      cfExclude.push(entry.mod);
      changes.cfExclude = cfExclude.join(',');
      entry.actions.push('added to cfExclude (modpack mod)');
    }
    if (current.serverType === 'MODRINTH') modrinthExcludes.push(entry.mod);
  }

  if (Object.keys(changes).length) await update(api, serverId, changes);

  if (modrinthExcludes.length) {
    const lines = splitLines(current.envVars);
    const index = lines.findIndex((line) => line.startsWith('MODRINTH_EXCLUDE_FILES='));
    const existing = index === -1 ? [] : splitEntries(lines[index].slice('MODRINTH_EXCLUDE_FILES='.length));
    const line = `MODRINTH_EXCLUDE_FILES=${[...existing, ...modrinthExcludes].join(',')}`;
    if (index === -1) lines.push(line);
    else lines[index] = line;
    const outcome = await update(api, serverId, { envVars: lines.join('\n') }).then(
      () => 'added to MODRINTH_EXCLUDE_FILES (modpack mod)',
      (error: Error) => `could not exclude from the modpack: ${error.message}`,
    );
    for (const entry of report) if (modrinthExcludes.includes(entry.mod)) entry.actions.push(outcome);
  }

  for (const entry of report) {
    const jar = installed.find((mod) => [mod.modId, mod.name, mod.fileName, jarBase(mod.fileName)].some((ref) => ref && sameMod(ref, entry.mod)));
    if (!jar) continue;
    entry.actions.push(
      await api.request({ method: 'DELETE', path: `/files/${id}/delete`, query: { path: `mods/${jar.fileName}` } }).then(
        () => `deleted mods/${jar.fileName}`,
        (error: Error) => `could not delete mods/${jar.fileName}: ${error.message}`,
      ),
    );
  }

  return {
    mods: report.map(({ mod, actions }) => ({ mod, actions: actions.length ? actions : ['not found in the mod lists or in mods/'] })),
    next: 'Restart the server (or start it) for the change to apply, then call wait_for_server.',
  };
};

const splitLines = (value?: string) => (value ?? '').split('\n').filter((line) => line.trim());
