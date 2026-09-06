import * as AdmZip from 'adm-zip';
import { KNOWN_CLIENT_ONLY_MODS } from './client-only-mods';

export type ModLoader = 'FORGE' | 'NEOFORGE' | 'FABRIC' | 'QUILT';

/**
 * - `client` / `server` / `both`: the jar says so itself (Fabric and Quilt only)
 * - `known-client`: the jar says nothing, but the mod is on the known client list
 * - `unknown`: nothing to go on. Forge and NeoForge put the side in
 *   `@Mod(dist = ...)`, which is bytecode, not metadata, so most Forge mods land here.
 */
export type ModSide = 'client' | 'server' | 'both' | 'known-client' | 'unknown';

export interface ModJarInfo {
  // Path inside the modpack archive, which is also what identifies it for removal.
  entry: string;
  fileName: string;
  size: number;
  modId?: string;
  name?: string;
  loader?: ModLoader;
  side: ModSide;
}

// Loader suffixes are part of the CurseForge slug but never of the mod id.
const LOADER_SUFFIX = /-(forge|neoforge|fabric|quilt)$/;

export const normalizeModRef = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\.jar$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(LOADER_SUFFIX, '');

// A jar is named "<mod>-<mc version>-<mod version>.jar" often enough that the
// part before the first version-looking segment is a usable reference.
const refsFromFileName = (fileName: string): string[] => {
  const base = fileName.replace(/\.jar$/i, '');
  const upToVersion = base.split(/[-_]v?\d/)[0];
  return [normalizeModRef(base), normalizeModRef(upToVersion)].filter(Boolean);
};

// The vendored slugs keep their loader suffix ("blur-forge") while mod ids never
// have one, so both sides go through the same normalisation before comparing.
const KNOWN_REFS = new Set([...KNOWN_CLIENT_ONLY_MODS].map(normalizeModRef));

const isKnownClientMod = (info: Pick<ModJarInfo, 'modId' | 'name' | 'fileName'>): boolean =>
  [info.modId, info.name, ...refsFromFileName(info.fileName)]
    .filter((value): value is string => Boolean(value))
    .map(normalizeModRef)
    .some((ref) => KNOWN_REFS.has(ref));

const sideFromEnvironment = (environment: unknown): ModSide => {
  const values = (Array.isArray(environment) ? environment : [environment]).filter((value) => typeof value === 'string');
  if (values.length === 0 || values.includes('*')) return 'both';
  if (values.includes('client') && values.includes('server')) return 'both';
  if (values.includes('client')) return 'client';
  if (values.includes('server')) return 'server';
  return 'both';
};

const readJson = (zip: AdmZip, entryName: string): Record<string, unknown> | null => {
  const entry = zip.getEntry(entryName);
  if (!entry) return null;

  try {
    return JSON.parse(zip.readAsText(entry)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

// Only two scalar strings are needed out of the TOML, so the whole file is not
// worth a parser dependency. Both are quoted values in the first [[mods]] block.
const readTomlField = (toml: string, field: string): string | undefined =>
  new RegExp(`^\\s*${field}\\s*=\\s*"([^"]*)"`, 'm').exec(toml)?.[1];

const readForgeMetadata = (zip: AdmZip): Partial<ModJarInfo> | null => {
  const entry = zip.getEntry('META-INF/neoforge.mods.toml') ?? zip.getEntry('META-INF/mods.toml');
  if (!entry) return null;

  const toml = zip.readAsText(entry);
  return {
    loader: entry.entryName.includes('neoforge') ? 'NEOFORGE' : 'FORGE',
    modId: readTomlField(toml, 'modId'),
    name: readTomlField(toml, 'displayName'),
    // Neither loader declares a side in its metadata.
    side: 'unknown',
  };
};

const readFabricMetadata = (zip: AdmZip): Partial<ModJarInfo> | null => {
  const manifest = readJson(zip, 'fabric.mod.json');
  if (!manifest) return null;

  return {
    loader: 'FABRIC',
    modId: typeof manifest.id === 'string' ? manifest.id : undefined,
    name: typeof manifest.name === 'string' ? manifest.name : undefined,
    side: sideFromEnvironment(manifest.environment),
  };
};

const readQuiltMetadata = (zip: AdmZip): Partial<ModJarInfo> | null => {
  const manifest = readJson(zip, 'quilt.mod.json');
  if (!manifest) return null;

  const loader = manifest.quilt_loader as { id?: string; metadata?: { name?: string } } | undefined;
  const minecraft = manifest.minecraft as { environment?: unknown } | undefined;

  return {
    loader: 'QUILT',
    modId: loader?.id,
    name: loader?.metadata?.name,
    side: sideFromEnvironment(minecraft?.environment),
  };
};

/**
 * Reads one mod jar. Never throws: a jar that cannot be opened is still listed,
 * with an `unknown` side, so it shows up in the review instead of vanishing.
 */
export const readModJar = (buffer: Buffer, entry: string, size: number): ModJarInfo => {
  const fileName = entry.split('/').pop() ?? entry;
  const base: ModJarInfo = { entry, fileName, size, side: 'unknown' };

  let metadata: Partial<ModJarInfo> | null;
  try {
    const zip = new AdmZip(buffer);
    metadata = readFabricMetadata(zip) ?? readQuiltMetadata(zip) ?? readForgeMetadata(zip);
  } catch {
    metadata = null;
  }

  const info: ModJarInfo = { ...base, ...metadata };

  // The curated list only fills the gap the metadata leaves; a jar that declares
  // its own side is believed over a slug match.
  if (info.side === 'unknown' && isKnownClientMod(info)) {
    return { ...info, side: 'known-client' };
  }

  return info;
};
