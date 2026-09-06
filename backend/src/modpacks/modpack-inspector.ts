import * as AdmZip from 'adm-zip';

export type ModpackLoader = 'FORGE' | 'NEOFORGE' | 'FABRIC' | 'QUILT';

/**
 * How the archive has to be handed to the itzg image:
 * - `curseforge-client`: CurseForge client pack (manifest.json) -> AUTO_CURSEFORGE + CF_MODPACK_ZIP
 * - `modrinth`: Modrinth pack (modrinth.index.json) -> MODRINTH + MODRINTH_MODPACK
 * - `server-pack`: ready-to-run server pack -> CURSEFORGE + CF_SERVER_MOD
 * - `generic`: mods/configs with no loader of its own -> loader TYPE + GENERIC_PACK
 */
export type ModpackKind = 'curseforge-client' | 'modrinth' | 'server-pack' | 'generic';

export interface ModpackInspection {
  kind: ModpackKind;
  name?: string;
  minecraftVersion?: string;
  loader?: ModpackLoader;
  loaderVersion?: string;
  hasStartScript: boolean;
  hasMods: boolean;
  // The archive declares no loader, so one has to be picked by hand.
  needsLoader: boolean;
}

const LOADER_BY_PREFIX: Record<string, ModpackLoader> = {
  forge: 'FORGE',
  neoforge: 'NEOFORGE',
  fabric: 'FABRIC',
  quilt: 'QUILT',
};

const START_SCRIPTS = ['run.sh', 'run.bat', 'start.sh', 'startserver.sh', 'serverstart.sh', 'launchserver.sh'];

const MINECRAFT_VERSION = /\b(1\.\d{1,2}(?:\.\d{1,2})?)\b/;

const MODS_DIR = /(^|\/)mods\//i;

// Entries can sit under a single wrapper directory, so paths are compared on
// their last one or two segments instead of on the raw entry name.
const tail = (entryName: string, segments: number): string => {
  const parts = entryName.split('/').filter(Boolean);
  return parts.slice(-segments).join('/').toLowerCase();
};

const isNear = (entryName: string, fileName: string): boolean => {
  const parts = entryName.split('/').filter(Boolean);
  return parts.length <= 2 && parts[parts.length - 1]?.toLowerCase() === fileName;
};

const parseModLoaderId = (id: string): { loader?: ModpackLoader; loaderVersion?: string } => {
  const match = /^([a-z]+)-(.+)$/i.exec(id.trim());
  if (!match) return {};

  const loader = LOADER_BY_PREFIX[match[1].toLowerCase()];
  if (!loader) return {};

  return { loader, loaderVersion: match[2] };
};

// Installer jars are named `<loader>-<mc>-<loader version>-installer.jar` for Forge
// and `<loader>-<loader version>-installer.jar` for NeoForge, so the Minecraft
// version is only taken when the name actually carries one.
const parseInstallerJar = (fileName: string): Partial<ModpackInspection> | null => {
  const match = /^(forge|neoforge|fabric|quilt)-(.+?)(?:-installer)?\.jar$/i.exec(fileName);
  if (!match) return null;

  const loader = LOADER_BY_PREFIX[match[1].toLowerCase()];
  const rest = match[2];
  const versionMatch = MINECRAFT_VERSION.exec(rest);

  if (versionMatch && rest.startsWith(versionMatch[1])) {
    return {
      loader,
      minecraftVersion: versionMatch[1],
      loaderVersion: rest.slice(versionMatch[1].length + 1) || undefined,
    };
  }

  return { loader, loaderVersion: rest };
};

const readJsonEntry = (zip: AdmZip, entry: AdmZip.IZipEntry): Record<string, unknown> | null => {
  try {
    return JSON.parse(zip.readAsText(entry)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const inspectCurseForgeManifest = (manifest: Record<string, unknown>): Partial<ModpackInspection> => {
  const minecraft = manifest.minecraft as { version?: string; modLoaders?: Array<{ id?: string; primary?: boolean }> } | undefined;
  const loaders = minecraft?.modLoaders ?? [];
  const primary = loaders.find((entry) => entry.primary) ?? loaders[0];

  return {
    name: typeof manifest.name === 'string' ? manifest.name : undefined,
    minecraftVersion: minecraft?.version,
    ...(primary?.id ? parseModLoaderId(primary.id) : {}),
  };
};

const inspectModrinthIndex = (index: Record<string, unknown>): Partial<ModpackInspection> => {
  const dependencies = (index.dependencies ?? {}) as Record<string, string>;
  const loaderKey = Object.keys(dependencies).find((key) => key.endsWith('-loader'));

  return {
    name: typeof index.name === 'string' ? index.name : undefined,
    minecraftVersion: dependencies.minecraft,
    ...(loaderKey ? { loader: LOADER_BY_PREFIX[loaderKey.replace('-loader', '')], loaderVersion: dependencies[loaderKey] } : {}),
  };
};

/**
 * Reads a modpack archive to tell which install method the itzg image needs and
 * which loader/Minecraft version it declares. Never throws: an archive that
 * cannot be parsed is reported as a `generic` pack that needs a loader.
 */
export const inspectModpackArchive = (source: string | Buffer): ModpackInspection => {
  const fallback: ModpackInspection = { kind: 'generic', hasStartScript: false, hasMods: false, needsLoader: true };

  let entries: AdmZip.IZipEntry[];
  let zip: AdmZip;
  try {
    zip = new AdmZip(source);
    entries = zip.getEntries();
  } catch {
    return fallback;
  }

  let details: Partial<ModpackInspection> = {};
  let kind: ModpackKind | undefined;
  let hasStartScript = false;
  let hasMods = false;

  for (const entry of entries) {
    const name = entry.entryName;

    if (!entry.isDirectory && isNear(name, 'manifest.json')) {
      const manifest = readJsonEntry(zip, entry);
      // `manifest.json` is also a common name inside resource packs, so the
      // CurseForge shape has to be confirmed before trusting it.
      if (manifest?.minecraft) {
        kind = 'curseforge-client';
        details = { ...details, ...inspectCurseForgeManifest(manifest) };
      }
      continue;
    }

    if (!entry.isDirectory && isNear(name, 'modrinth.index.json')) {
      const index = readJsonEntry(zip, entry);
      if (index) {
        kind = 'modrinth';
        details = { ...details, ...inspectModrinthIndex(index) };
      }
      continue;
    }

    if (!entry.isDirectory && START_SCRIPTS.includes(tail(name, 1))) {
      hasStartScript = true;
      continue;
    }

    if (MODS_DIR.test(name)) {
      hasMods = true;
    }

    if (!entry.isDirectory && name.toLowerCase().endsWith('.jar')) {
      const installer = parseInstallerJar(tail(name, 1));
      if (installer) details = { ...installer, ...details };
    }
  }

  return {
    kind: kind ?? (hasStartScript || details.loader ? 'server-pack' : 'generic'),
    hasStartScript,
    hasMods,
    needsLoader: !details.loader,
    ...details,
  };
};
