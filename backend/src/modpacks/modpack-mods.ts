import * as AdmZip from 'adm-zip';
import { ModJarInfo, readModJar } from './mod-jar-metadata';

export interface ModpackModScan {
  mods: ModJarInfo[];
  // True when the archive holds more jars than the scan is willing to read.
  truncated: boolean;
}

// A pack with more mods than this is well past the point where reading every jar
// is worth the wait, and the review list stops being reviewable anyway.
const MAX_SCANNED_MODS = 600;

const MODS_ENTRY = /(^|\/)mods\/[^/]+\.jar$/i;

/**
 * Reads every mod jar under the archive's `mods/` folder (at the root or under a
 * wrapper such as `overrides/`) and reports what each one declares about the side
 * it runs on. Never throws: an unreadable archive scans as empty.
 */
export const scanModpackMods = (source: string | Buffer): ModpackModScan => {
  let entries: AdmZip.IZipEntry[];
  let zip: AdmZip;
  try {
    zip = new AdmZip(source);
    entries = zip.getEntries();
  } catch {
    return { mods: [], truncated: false };
  }

  const jars = entries.filter((entry) => !entry.isDirectory && MODS_ENTRY.test(entry.entryName));
  const scanned = jars.slice(0, MAX_SCANNED_MODS);

  const mods = scanned.map((entry) => {
    try {
      return readModJar(zip.readFile(entry) ?? Buffer.alloc(0), entry.entryName, entry.header.size);
    } catch {
      return { entry: entry.entryName, fileName: entry.entryName.split('/').pop() ?? entry.entryName, size: entry.header.size, side: 'unknown' as const };
    }
  });

  mods.sort((a, b) => a.fileName.localeCompare(b.fileName));
  return { mods, truncated: jars.length > scanned.length };
};

/**
 * Writes a copy of the archive without the given entries. The original is left
 * alone: a wrong guess about a mod's side must not cost the upload.
 */
export const copyArchiveWithout = (source: string, removed: Set<string>): Buffer => {
  const zip = new AdmZip(source);
  const copy = new AdmZip();

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory || removed.has(entry.entryName)) continue;
    copy.addFile(entry.entryName, zip.readFile(entry) ?? Buffer.alloc(0));
  }

  return copy.toBuffer();
};
