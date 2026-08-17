import type { ModProvider } from "@/services/mods/mods-browser.service";

// itzg accepts a prefix so a project can target something other than the server
// TYPE. Whitelisted because "fabric:fabric-api" (prefix + slug) and
// "fabric-api:beta" (slug + release type) are otherwise indistinguishable.
// CurseForge has no prefix syntax — there "jei:10.2.1.1005" is slug + file id,
// so a mod whose slug happens to be "forge" must not be read as a prefix.
const MODRINTH_PREFIXES = ["datapack", "fabric", "forge", "neoforge", "quilt", "paper", "spigot", "bukkit", "purpur", "folia"];

export interface ModEntry {
  raw: string;
  prefix?: string;
  ref: string;
  version?: string;
  separator: ":" | "@";
  // itzg's "?" marker: the server logs a warning and keeps starting when no
  // compatible version exists, and the mod is left out of the version
  // calculation done by VERSION_FROM_MODRINTH_PROJECTS. Modrinth only.
  optional: boolean;
  // URLs and "@file" references are passed through to itzg as-is, so they get
  // no version control in the UI.
  opaque: boolean;
}

export const parseModEntry = (raw: string, provider: ModProvider): ModEntry => {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  if (lower.startsWith("http://") || lower.startsWith("https://") || trimmed.startsWith("@")) {
    return { raw: trimmed, ref: trimmed, separator: ":", optional: false, opaque: true };
  }

  let prefix: string | undefined;
  let rest = trimmed;
  const matched = provider === "modrinth" ? MODRINTH_PREFIXES.find((candidate) => lower.startsWith(`${candidate}:`)) : undefined;
  if (matched) {
    prefix = trimmed.slice(0, matched.length);
    rest = trimmed.slice(matched.length + 1);
  }

  const colon = rest.indexOf(":");
  const at = rest.indexOf("@");
  const positions = [colon, at].filter((index) => index > 0);
  const cut = positions.length > 0 ? Math.min(...positions) : -1;

  const head = cut === -1 ? rest : rest.slice(0, cut);
  // CURSEFORGE_FILES has no optional syntax, so a "?" there is a typo rather
  // than a marker. Leaving it in the ref keeps the entry unresolvable, which is
  // the honest signal.
  const optional = provider === "modrinth" && head.endsWith("?");

  return {
    raw: trimmed,
    prefix,
    ref: optional ? head.slice(0, -1) : head,
    version: cut === -1 ? undefined : rest.slice(cut + 1) || undefined,
    separator: cut !== -1 && rest[cut] === "@" ? "@" : ":",
    optional,
    opaque: false,
  };
};

export const parseModEntries = (value: string, provider: ModProvider): ModEntry[] =>
  value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => parseModEntry(entry, provider));

export const serializeModEntry = (entry: ModEntry): string => {
  if (entry.opaque) return entry.raw;
  const prefix = entry.prefix ? `${entry.prefix}:` : "";
  const optional = entry.optional ? "?" : "";
  const version = entry.version ? `${entry.separator}${entry.version}` : "";
  return `${prefix}${entry.ref}${optional}${version}`;
};

export const serializeModEntries = (entries: ModEntry[]): string =>
  entries.map(serializeModEntry).join("\n");

export const findModEntryIndex = (entries: ModEntry[], refs: string[]): number => {
  const wanted = refs.filter(Boolean).map((ref) => ref.toLowerCase());
  return entries.findIndex((entry) => !entry.opaque && wanted.includes(entry.ref.toLowerCase()));
};
