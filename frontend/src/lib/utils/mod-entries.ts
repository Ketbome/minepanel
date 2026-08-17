export interface ModEntry {
  raw: string;
  prefix?: string;
  ref: string;
  version?: string;
  separator: ":" | "@";
  // URLs and "@file" references are passed through to itzg as-is, so they get
  // no version control in the UI.
  opaque: boolean;
}

export const parseModEntry = (raw: string): ModEntry => {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  if (lower.startsWith("http://") || lower.startsWith("https://") || trimmed.startsWith("@")) {
    return { raw: trimmed, ref: trimmed, separator: ":", opaque: true };
  }

  let prefix: string | undefined;
  let rest = trimmed;
  if (lower.startsWith("datapack:")) {
    prefix = "datapack";
    rest = trimmed.slice("datapack:".length);
  }

  const colon = rest.indexOf(":");
  const at = rest.indexOf("@");
  const positions = [colon, at].filter((index) => index > 0);

  if (positions.length === 0) {
    return { raw: trimmed, prefix, ref: rest, separator: ":", opaque: false };
  }

  const cut = Math.min(...positions);
  return {
    raw: trimmed,
    prefix,
    ref: rest.slice(0, cut),
    version: rest.slice(cut + 1) || undefined,
    separator: rest[cut] === "@" ? "@" : ":",
    opaque: false,
  };
};

export const parseModEntries = (value: string): ModEntry[] =>
  value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(parseModEntry);

export const serializeModEntry = (entry: ModEntry): string => {
  if (entry.opaque) return entry.raw;
  const prefix = entry.prefix ? `${entry.prefix}:` : "";
  const version = entry.version ? `${entry.separator}${entry.version}` : "";
  return `${prefix}${entry.ref}${version}`;
};

export const serializeModEntries = (entries: ModEntry[]): string =>
  entries.map(serializeModEntry).join("\n");

export const findModEntryIndex = (entries: ModEntry[], refs: string[]): number => {
  const wanted = refs.filter(Boolean).map((ref) => ref.toLowerCase());
  return entries.findIndex((entry) => !entry.opaque && wanted.includes(entry.ref.toLowerCase()));
};
