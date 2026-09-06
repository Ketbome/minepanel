import * as AdmZip from 'adm-zip';
import { inspectModpackArchive } from './modpack-inspector';

const zipOf = (entries: Record<string, string>): Buffer => {
  const zip = new AdmZip();
  for (const [name, content] of Object.entries(entries)) {
    zip.addFile(name, Buffer.from(content));
  }
  return zip.toBuffer();
};

describe('inspectModpackArchive', () => {
  it('reads loader and Minecraft version from a CurseForge client pack', () => {
    const buffer = zipOf({
      'manifest.json': JSON.stringify({
        name: 'Tensura Evolutions',
        minecraft: { version: '1.21.1', modLoaders: [{ id: 'neoforge-21.1.72', primary: true }] },
      }),
      'overrides/mods/tensura.jar': 'x',
    });

    expect(inspectModpackArchive(buffer)).toMatchObject({
      kind: 'curseforge-client',
      name: 'Tensura Evolutions',
      minecraftVersion: '1.21.1',
      loader: 'NEOFORGE',
      loaderVersion: '21.1.72',
      hasMods: true,
      needsLoader: false,
    });
  });

  it('reads a Modrinth index', () => {
    const buffer = zipOf({
      'modrinth.index.json': JSON.stringify({
        name: 'Fabulously Optimized',
        dependencies: { minecraft: '1.20.1', 'fabric-loader': '0.15.7' },
      }),
    });

    expect(inspectModpackArchive(buffer)).toMatchObject({
      kind: 'modrinth',
      minecraftVersion: '1.20.1',
      loader: 'FABRIC',
      loaderVersion: '0.15.7',
      needsLoader: false,
    });
  });

  it('detects a server pack from its installer jar and start script', () => {
    const buffer = zipOf({
      'forge-1.20.1-47.2.0-installer.jar': 'x',
      'run.sh': '#!/bin/sh',
      'mods/jei.jar': 'x',
    });

    expect(inspectModpackArchive(buffer)).toMatchObject({
      kind: 'server-pack',
      minecraftVersion: '1.20.1',
      loader: 'FORGE',
      loaderVersion: '47.2.0',
      hasStartScript: true,
      hasMods: true,
      needsLoader: false,
    });
  });

  it('treats a jar without a Minecraft version as loader-only', () => {
    const buffer = zipOf({ 'neoforge-21.1.72-installer.jar': 'x' });

    expect(inspectModpackArchive(buffer)).toEqual({
      kind: 'server-pack',
      loader: 'NEOFORGE',
      loaderVersion: '21.1.72',
      hasStartScript: false,
      hasMods: false,
      needsLoader: false,
    });
  });

  it('reports a mods-only archive as generic and needing a loader', () => {
    const buffer = zipOf({ 'mods/jei.jar': 'x', 'config/jei.toml': 'x' });

    expect(inspectModpackArchive(buffer)).toEqual({
      kind: 'generic',
      hasStartScript: false,
      hasMods: true,
      needsLoader: true,
    });
  });

  it('ignores a manifest.json that is not a CurseForge one', () => {
    const buffer = zipOf({ 'manifest.json': JSON.stringify({ header: { name: 'A resource pack' } }) });

    expect(inspectModpackArchive(buffer)).toMatchObject({ kind: 'generic', needsLoader: true });
  });

  it('survives unreadable archives and unparseable json', () => {
    expect(inspectModpackArchive(Buffer.from('not a zip'))).toEqual({
      kind: 'generic',
      hasStartScript: false,
      hasMods: false,
      needsLoader: true,
    });

    expect(inspectModpackArchive(zipOf({ 'manifest.json': '{ broken' }))).toMatchObject({ kind: 'generic' });
    expect(inspectModpackArchive(zipOf({ 'modrinth.index.json': '{ broken' }))).toMatchObject({ kind: 'generic' });
  });

  it('looks through a single wrapper directory', () => {
    const buffer = zipOf({
      'ATM9/manifest.json': JSON.stringify({ minecraft: { version: '1.20.1', modLoaders: [{ id: 'forge-47.2.0' }] } }),
    });

    expect(inspectModpackArchive(buffer)).toMatchObject({ kind: 'curseforge-client', loader: 'FORGE' });
  });

  it('ignores modloader ids it does not know', () => {
    const buffer = zipOf({
      'manifest.json': JSON.stringify({ minecraft: { version: '1.20.1', modLoaders: [{ id: 'rift-1.0.0' }, { id: 'nodash' }] } }),
    });

    expect(inspectModpackArchive(buffer)).toMatchObject({ kind: 'curseforge-client', needsLoader: true });
  });
});
