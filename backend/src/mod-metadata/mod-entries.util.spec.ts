import { findModEntryIndex, parseModEntries, parseModEntry, serializeModEntries, serializeModEntry } from './mod-entries.util';

// Mirrors frontend/src/lib/utils/mod-entries.ts. These cases exist so a drift between the
// two copies (or a regression in either one) shows up as a failing test rather than a mod
// that silently stops resolving.
describe('mod-entries.util', () => {
  describe('parseModEntry', () => {
    it('parses a bare CurseForge ref with no version', () => {
      expect(parseModEntry('jei', 'curseforge')).toEqual({ raw: 'jei', ref: 'jei', version: undefined, separator: ':', optional: false, opaque: false });
    });

    it('parses a CurseForge ref:fileId pin', () => {
      expect(parseModEntry('jei:123456', 'curseforge')).toEqual({
        raw: 'jei:123456',
        ref: 'jei',
        version: '123456',
        separator: ':',
        optional: false,
        opaque: false,
      });
    });

    it('does not treat a CurseForge slug that looks like a loader prefix as one', () => {
      expect(parseModEntry('forge:10.2.1.1005', 'curseforge')).toEqual({
        raw: 'forge:10.2.1.1005',
        ref: 'forge',
        version: '10.2.1.1005',
        separator: ':',
        optional: false,
        opaque: false,
      });
    });

    it('parses a Modrinth loader-prefixed ref:version pin', () => {
      expect(parseModEntry('fabric:sodium:abc123', 'modrinth')).toEqual({
        raw: 'fabric:sodium:abc123',
        prefix: 'fabric',
        ref: 'sodium',
        version: 'abc123',
        separator: ':',
        optional: false,
        opaque: false,
      });
    });

    it('parses the "?" optional marker on Modrinth, stripping it from ref', () => {
      expect(parseModEntry('fabric:bluemap?:abc123', 'modrinth')).toEqual({
        raw: 'fabric:bluemap?:abc123',
        prefix: 'fabric',
        ref: 'bluemap',
        version: 'abc123',
        separator: ':',
        optional: true,
        opaque: false,
      });
    });

    it('parses an unpinned optional Modrinth entry with no version', () => {
      expect(parseModEntry('bluemap?', 'modrinth')).toEqual({
        raw: 'bluemap?',
        ref: 'bluemap',
        version: undefined,
        separator: ':',
        optional: true,
        opaque: false,
      });
    });

    it('leaves a stray "?" in the ref on CurseForge, since it has no optional syntax', () => {
      expect(parseModEntry('jei?', 'curseforge')).toEqual({ raw: 'jei?', ref: 'jei?', version: undefined, separator: ':', optional: false, opaque: false });
    });

    it('parses the "@" release-type separator', () => {
      expect(parseModEntry('sodium@beta', 'modrinth')).toEqual({
        raw: 'sodium@beta',
        ref: 'sodium',
        version: 'beta',
        separator: '@',
        optional: false,
        opaque: false,
      });
    });

    it('treats a URL as opaque, passed through as-is', () => {
      const url = 'https://cdn.modrinth.com/data/AANobbMI/versions/abc/sodium.jar';
      expect(parseModEntry(url, 'modrinth')).toEqual({ raw: url, ref: url, separator: ':', optional: false, opaque: true });
    });

    it('treats an "@file" reference as opaque', () => {
      expect(parseModEntry('@mods.txt', 'modrinth')).toEqual({ raw: '@mods.txt', ref: '@mods.txt', separator: ':', optional: false, opaque: true });
    });
  });

  describe('parseModEntries', () => {
    it('splits on newlines and commas, dropping blanks', () => {
      const result = parseModEntries('jei:123,\nfabric:sodium:abc\n\n', 'modrinth');
      expect(result.map((entry) => entry.ref)).toEqual(['jei', 'sodium']);
    });
  });

  describe('serializeModEntry / serializeModEntries', () => {
    it('round-trips a loader-prefixed optional pin', () => {
      const entry = parseModEntry('fabric:bluemap?:abc123', 'modrinth');
      expect(serializeModEntry(entry)).toBe('fabric:bluemap?:abc123');
    });

    it('round-trips an opaque URL unchanged', () => {
      const url = 'https://cdn.modrinth.com/data/AANobbMI/versions/abc/sodium.jar';
      expect(serializeModEntry(parseModEntry(url, 'modrinth'))).toBe(url);
    });

    it('joins entries with newlines regardless of the original separator', () => {
      expect(serializeModEntries(parseModEntries('jei:123,fabric:sodium:abc', 'modrinth'))).toBe('jei:123\nfabric:sodium:abc');
    });
  });

  describe('findModEntryIndex', () => {
    it('matches by ref case-insensitively, ignoring the loader prefix and optional marker', () => {
      const entries = parseModEntries('fabric:bluemap?:abc123\njei:123456', 'modrinth');
      expect(findModEntryIndex(entries, ['BlueMap'])).toBe(0);
    });

    it('skips opaque entries', () => {
      const url = 'https://cdn.modrinth.com/data/AANobbMI/versions/abc/sodium.jar';
      const entries = parseModEntries(url, 'modrinth');
      expect(findModEntryIndex(entries, [url])).toBe(-1);
    });

    it('returns -1 when nothing matches', () => {
      const entries = parseModEntries('jei:123456', 'curseforge');
      expect(findModEntryIndex(entries, ['sodium'])).toBe(-1);
    });
  });
});
