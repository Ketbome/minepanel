import * as fs from 'fs-extra';
import * as os from 'node:os';
import * as path from 'node:path';
import { WorldDiscoveryService } from './world-discovery.service';

describe('WorldDiscoveryService library listing', () => {
  let tempDir: string;
  let libraryPath: string;
  let service: WorldDiscoveryService;

  const makeWorldFolder = async (relativePath: string) => {
    const full = path.join(libraryPath, relativePath);
    await fs.ensureDir(full);
    await fs.writeFile(path.join(full, 'level.dat'), 'x');
  };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'minepanel-world-library-'));
    libraryPath = path.join(tempDir, '.world', 'worlds');

    service = new WorldDiscoveryService(
      { getSettings: jest.fn() } as any,
      { get: jest.fn((key: string) => (key === 'serversDir' ? tempDir : undefined)) } as any,
    );
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('returns nothing instead of failing when the library has never been used', async () => {
    await fs.remove(libraryPath);

    await expect(service.listLibraryWorlds()).resolves.toEqual([]);
  });

  it('counts a folder holding a level.dat as one world', async () => {
    await makeWorldFolder('my-survival');

    const worlds = await service.listLibraryWorlds();

    expect(worlds).toHaveLength(1);
    expect(worlds[0]).toMatchObject({ source: 'my-survival', name: 'my-survival', type: 'directory', folder: '' });
  });

  it('counts supported archives and ignores every other file', async () => {
    await fs.ensureDir(libraryPath);
    await fs.writeFile(path.join(libraryPath, 'skyblock.zip'), 'zip');
    await fs.writeFile(path.join(libraryPath, 'notes.txt'), 'not a world');
    await fs.writeFile(path.join(libraryPath, 'pack.tar.gz'), 'tgz');

    const worlds = await service.listLibraryWorlds();

    expect(worlds.map((world) => world.name).sort()).toEqual(['pack.tar.gz', 'skyblock.zip']);
  });

  it('walks into plain folders, so imports grouped under curseforge/ still show up', async () => {
    await makeWorldFolder('curseforge/ancient-city');

    const worlds = await service.listLibraryWorlds();

    expect(worlds).toHaveLength(1);
    expect(worlds[0]).toMatchObject({ source: 'curseforge/ancient-city', name: 'ancient-city', folder: 'curseforge' });
  });

  it('stops at the world folder rather than listing what is inside it', async () => {
    await makeWorldFolder('my-survival');
    await fs.ensureDir(path.join(libraryPath, 'my-survival', 'region'));
    await fs.writeFile(path.join(libraryPath, 'my-survival', 'region', 'r.0.0.mca'), 'region');
    // An archive left inside a world is one file, not a second world to import.
    await fs.writeFile(path.join(libraryPath, 'my-survival', 'old-backup.zip'), 'zip');
    await makeWorldFolder('my-survival/DIM1');

    const worlds = await service.listLibraryWorlds();

    expect(worlds.map((world) => world.source)).toEqual(['my-survival']);
  });

  it('reports a size for archives only, since measuring a world folder means walking every region file', async () => {
    await makeWorldFolder('my-survival');
    await fs.ensureDir(libraryPath);
    await fs.writeFile(path.join(libraryPath, 'skyblock.zip'), 'twelve bytes');

    const worlds = await service.listLibraryWorlds();
    const archive = worlds.find((world) => world.type === 'archive');
    const folder = worlds.find((world) => world.type === 'directory');

    expect(archive?.sizeBytes).toBe('twelve bytes'.length);
    expect(folder?.sizeBytes).toBe(0);
  });

  it('sorts by path so the list does not reshuffle between requests', async () => {
    await makeWorldFolder('zulu');
    await makeWorldFolder('alpha');
    await makeWorldFolder('curseforge/bravo');

    const worlds = await service.listLibraryWorlds();

    expect(worlds.map((world) => world.source)).toEqual(['alpha', 'curseforge/bravo', 'zulu']);
  });
});
