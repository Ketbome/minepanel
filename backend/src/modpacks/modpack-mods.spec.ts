import * as AdmZip from 'adm-zip';
import * as fs from 'fs-extra';
import * as os from 'node:os';
import * as path from 'node:path';
import { copyArchiveWithout, scanModpackMods } from './modpack-mods';
import { normalizeModRef, readModJar } from './mod-jar-metadata';

const jar = (files: Record<string, string>): Buffer => {
  const zip = new AdmZip();
  for (const [name, content] of Object.entries(files)) zip.addFile(name, Buffer.from(content));
  return zip.toBuffer();
};

const packOf = (mods: Record<string, Buffer>): Buffer => {
  const zip = new AdmZip();
  for (const [name, content] of Object.entries(mods)) zip.addFile(name, content);
  return zip.toBuffer();
};

const fabricJar = (id: string, environment?: unknown) =>
  jar({ 'fabric.mod.json': JSON.stringify({ id, name: id, ...(environment === undefined ? {} : { environment }) }) });

describe('readModJar', () => {
  it('believes the side a Fabric jar declares', () => {
    expect(readModJar(fabricJar('sodium', 'client'), 'mods/sodium.jar', 10)).toMatchObject({
      loader: 'FABRIC',
      modId: 'sodium',
      side: 'client',
    });

    expect(readModJar(fabricJar('carpet', 'server'), 'mods/carpet.jar', 10)).toMatchObject({ side: 'server' });
    expect(readModJar(fabricJar('jei', '*'), 'mods/jei.jar', 10)).toMatchObject({ side: 'both' });
    expect(readModJar(fabricJar('jei'), 'mods/jei.jar', 10)).toMatchObject({ side: 'both' });
    expect(readModJar(fabricJar('jei', ['client', 'server']), 'mods/jei.jar', 10)).toMatchObject({ side: 'both' });
  });

  it('reads Quilt metadata', () => {
    const buffer = jar({
      'quilt.mod.json': JSON.stringify({
        quilt_loader: { id: 'modmenu', metadata: { name: 'Mod Menu' } },
        minecraft: { environment: 'client' },
      }),
    });

    expect(readModJar(buffer, 'mods/modmenu.jar', 10)).toMatchObject({ loader: 'QUILT', modId: 'modmenu', name: 'Mod Menu', side: 'client' });
  });

  it('reads the id out of Forge and NeoForge toml but leaves the side unknown', () => {
    const forge = jar({ 'META-INF/mods.toml': '[[mods]]\nmodId = "tconstruct"\ndisplayName = "Tinkers Construct"\n' });
    expect(readModJar(forge, 'mods/tconstruct.jar', 10)).toMatchObject({ loader: 'FORGE', modId: 'tconstruct', name: 'Tinkers Construct', side: 'unknown' });

    const neoforge = jar({ 'META-INF/neoforge.mods.toml': '[[mods]]\nmodId = "tensura"\n' });
    expect(readModJar(neoforge, 'mods/tensura.jar', 10)).toMatchObject({ loader: 'NEOFORGE', modId: 'tensura', side: 'unknown' });
  });

  it('falls back to the known client list only where the metadata says nothing', () => {
    const known = jar({ 'META-INF/mods.toml': '[[mods]]\nmodId = "appleskin"\n' });
    expect(readModJar(known, 'mods/appleskin-1.20.1-2.5.1.jar', 10)).toMatchObject({ side: 'known-client' });

    // The slug carries a loader suffix the mod id never has.
    const suffixed = jar({ 'META-INF/mods.toml': '[[mods]]\nmodId = "blur"\n' });
    expect(readModJar(suffixed, 'mods/blur.jar', 10)).toMatchObject({ side: 'known-client' });

    // A jar that declares "both" is believed over a slug match.
    expect(readModJar(fabricJar('appleskin', '*'), 'mods/appleskin.jar', 10)).toMatchObject({ side: 'both' });
  });

  it('matches the list from the file name when there is no metadata at all', () => {
    expect(readModJar(jar({ 'nothing.txt': 'x' }), 'mods/betterf3-1.20.1-7.0.1.jar', 10)).toMatchObject({ side: 'known-client' });
    expect(readModJar(Buffer.from('not a zip'), 'mods/whatever.jar', 10)).toMatchObject({ side: 'unknown', fileName: 'whatever.jar' });
  });

  it('normalises references the way the slugs are written', () => {
    expect(normalizeModRef('Better F3.jar')).toBe('better-f3');
    expect(normalizeModRef('blur-forge')).toBe('blur');
    expect(normalizeModRef('__weird__')).toBe('weird');
  });
});

describe('scanModpackMods', () => {
  it('finds jars at the root and under a wrapper, and ignores everything else', () => {
    const pack = packOf({
      'overrides/mods/sodium.jar': fabricJar('sodium', 'client'),
      'overrides/mods/carpet.jar': fabricJar('carpet', 'server'),
      'overrides/config/sodium.json': Buffer.from('{}'),
      'manifest.json': Buffer.from('{}'),
    });

    const { mods, truncated } = scanModpackMods(pack);

    expect(truncated).toBe(false);
    expect(mods.map((mod) => mod.fileName)).toEqual(['carpet.jar', 'sodium.jar']);
    expect(mods.find((mod) => mod.modId === 'sodium')?.side).toBe('client');
  });

  it('scans an unreadable archive as empty', () => {
    expect(scanModpackMods(Buffer.from('not a zip'))).toEqual({ mods: [], truncated: false });
  });
});

describe('copyArchiveWithout', () => {
  it('drops the given entries and keeps the rest', () => {
    const pack = packOf({
      'mods/sodium.jar': fabricJar('sodium', 'client'),
      'mods/carpet.jar': fabricJar('carpet', 'server'),
      'config/keep.txt': Buffer.from('keep'),
    });

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'minepanel-strip-'));
    const tmp = path.join(dir, 'pack.zip');
    fs.writeFileSync(tmp, pack);

    const stripped = new AdmZip(copyArchiveWithout(tmp, new Set(['mods/sodium.jar'])));
    expect(stripped.getEntries().map((entry) => entry.entryName).sort()).toEqual(['config/keep.txt', 'mods/carpet.jar']);
    fs.removeSync(dir);
  });
});
