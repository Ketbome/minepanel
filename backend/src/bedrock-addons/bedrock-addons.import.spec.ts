import * as fs from 'fs-extra';
import * as os from 'node:os';
import * as path from 'node:path';
import * as AdmZip from 'adm-zip';
import axios from 'axios';
import { BadRequestException, HttpStatus, NotFoundException } from '@nestjs/common';
import { BedrockAddonsService } from './bedrock-addons.service';

jest.mock('axios');

const manifest = (kind: 'resource' | 'behavior' | 'none', uuid: string, extra: Record<string, unknown> = {}) =>
  Buffer.from(
    JSON.stringify({
      format_version: 2,
      header: { name: `${kind} ${uuid}`, uuid, version: [1, 0, 0], ...extra },
      modules: kind === 'none' ? [{ type: 'weird' }] : [{ type: kind === 'resource' ? 'resources' : 'data' }],
    }),
  );

const buildZip = (entries: Record<string, Buffer>) => {
  const zip = new AdmZip();
  for (const [name, content] of Object.entries(entries)) {
    zip.addFile(name, content);
  }
  return zip.toBuffer();
};

const upload = (name: string, buffer: Buffer) => ({ originalname: name, buffer }) as Express.Multer.File;

describe('BedrockAddonsService import and sync', () => {
  let tempDir: string;
  let service: BedrockAddonsService;
  let getServerConfig: jest.Mock;
  let getCfApiKey: jest.Mock;
  const mockClient = { get: jest.fn() };

  const serverDir = () => path.join(tempDir, 'bed');
  const mcData = () => path.join(serverDir(), 'mc-data');

  beforeEach(async () => {
    jest.clearAllMocks();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'minepanel-bedrock-import-'));
    await fs.ensureDir(mcData());
    getServerConfig = jest.fn().mockResolvedValue({ id: 'bed', edition: 'BEDROCK' });
    getCfApiKey = jest.fn().mockResolvedValue('cf-key');
    (axios.create as jest.Mock).mockReturnValue(mockClient);
    (axios.isAxiosError as unknown as jest.Mock).mockImplementation((error) => !!error?.isAxiosError);

    service = new BedrockAddonsService(
      { get: jest.fn((key: string) => (key === 'serversDir' ? tempDir : undefined)) } as any,
      { getCfApiKey } as any,
      { getServerConfig } as any,
    );
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('server validation', () => {
    it('rejects invalid ids, unknown servers and non-Bedrock editions', async () => {
      await expect(service.listAddons('bad id')).rejects.toThrow(BadRequestException);

      getServerConfig.mockResolvedValueOnce(null);
      await expect(service.listAddons('bed')).rejects.toThrow(NotFoundException);

      getServerConfig.mockResolvedValueOnce({ id: 'bed', edition: 'JAVA' });
      await expect(service.listAddons('bed')).rejects.toThrow(BadRequestException);

      await expect(service.listAddons('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('importUploadedAddon', () => {
    it('requires a file and a supported extension', async () => {
      await expect(service.importUploadedAddon('bed', undefined as any)).rejects.toThrow('File is required');
      await expect(service.importUploadedAddon('bed', upload('notes.txt', Buffer.from('x')))).rejects.toThrow(/Only \.mcaddon/);
      expect(await fs.readdir(path.join(serverDir(), 'addons', 'extracted'))).toEqual([]);
    });

    it('rejects archives without a manifest and cleans up', async () => {
      const buffer = buildZip({ 'readme.txt': Buffer.from('hi') });
      await expect(service.importUploadedAddon('bed', upload('empty.zip', buffer))).rejects.toThrow(/manifest\.json/);
      expect(await fs.readdir(path.join(serverDir(), 'addons', 'extracted'))).toEqual([]);
    });

    it('imports behavior and resource packs, deduplicating by uuid', async () => {
      const buffer = buildZip({
        'bp/manifest.json': manifest('behavior', 'bp-1'),
        'bp/scripts/main.js': Buffer.from('//'),
        'rp/manifest.json': manifest('resource', 'rp-1'),
        'dup/manifest.json': manifest('resource', 'rp-1'),
        'ignored/manifest.json': manifest('none', 'x-1'),
        'broken/manifest.json': Buffer.from('{not json'),
      });

      const result = await service.importUploadedAddon('bed', upload('My Addon!.mcaddon', buffer));

      expect(result.success).toBe(true);
      expect(result.addon).toMatchObject({ name: 'behavior bp-1', source: 'upload', fileName: 'My-Addon-.mcaddon', enabled: false, downloadPath: path.join('downloads', 'My-Addon-.mcaddon') });
      expect(result.addon.packs.map((pack) => `${pack.kind}:${pack.uuid}`)).toEqual(['behavior:bp-1', 'resource:rp-1']);
      expect(await fs.pathExists(path.join(serverDir(), 'addons', 'extracted', result.addon.id, 'behavior_packs', 'bp-1', 'scripts', 'main.js'))).toBe(true);
      expect(await fs.pathExists(path.join(serverDir(), 'addons', 'extracted', result.addon.id, 'unpacked'))).toBe(false);

      const registry = await fs.readJson(path.join(serverDir(), 'addons', 'registry.json'));
      expect(registry.addons).toHaveLength(1);
    });

    it('numbers duplicate file names and expands nested archives', async () => {
      const inner = buildZip({ 'manifest.json': manifest('resource', 'rp-nested', { version: '2.1.0' }) });
      const outer = buildZip({ 'packs/inner.mcpack': inner, 'packs/broken.zip': Buffer.from('nope') });

      const first = await service.importUploadedAddon('bed', upload('bundle.mcaddon', outer));
      const second = await service.importUploadedAddon('bed', upload('bundle.mcaddon', outer));

      expect(first.addon.packs[0]).toMatchObject({ uuid: 'rp-nested', version: [2, 1, 0], kind: 'resource' });
      expect(second.addon.fileName).toBe('bundle-1.mcaddon');
    });

    it('falls back to the display name when packs carry no name', async () => {
      const buffer = buildZip({ 'bp/manifest.json': manifest('behavior', 'bp-2', { name: '   ' }) });
      const result = await service.importUploadedAddon('bed', upload('fallback.zip', buffer));
      // A blank header name falls back to the manifest directory name.
      expect(result.addon.name).toBe('bp');
    });

    it('ignores manifests with an invalid uuid or version', async () => {
      const buffer = buildZip({
        'a/manifest.json': Buffer.from(JSON.stringify({ header: { uuid: '', version: [1, 0, 0] }, modules: [{ type: 'data' }] })),
        'b/manifest.json': Buffer.from(JSON.stringify({ header: { uuid: 'b', version: [1, 0] }, modules: [{ type: 'data' }] })),
        'c/manifest.json': Buffer.from(JSON.stringify({ header: { uuid: 'c', version: 7 }, modules: [{ type: 'data' }] })),
      });
      await expect(service.importUploadedAddon('bed', upload('bad.zip', buffer))).rejects.toThrow(/manifest\.json/);
    });
  });

  describe('enable, disable and sync', () => {
    const importPacks = async (uuid: string, label = uuid) =>
      service.importUploadedAddon(
        'bed',
        upload(`${label}.zip`, buildZip({ 'bp/manifest.json': manifest('behavior', `bp-${uuid}`), 'rp/manifest.json': manifest('resource', `rp-${uuid}`) })),
      );

    it('copies enabled packs into mc-data and writes the world pack files', async () => {
      await fs.writeFile(path.join(mcData(), 'server.properties'), 'motd=x\nlevel-name=Survival World\n');
      const worldDir = path.join(mcData(), 'worlds', 'Survival World');
      await fs.ensureDir(worldDir);
      await fs.writeJson(path.join(worldDir, 'world_behavior_packs.json'), [{ pack_id: 'manual', version: [1, 0, 0] }, { bogus: true }]);
      await fs.writeFile(path.join(worldDir, 'world_resource_packs.json'), 'not json');

      const { addon } = await importPacks('one');
      const enabled = await service.setAddonEnabled('bed', addon.id, true);

      expect(enabled.levelName).toBe('Survival World');
      expect(await fs.pathExists(path.join(mcData(), 'behavior_packs', 'bp-one', 'manifest.json'))).toBe(true);
      expect(await fs.readJson(path.join(worldDir, 'world_behavior_packs.json'))).toEqual([
        { pack_id: 'bp-one', version: [1, 0, 0] },
        { pack_id: 'manual', version: [1, 0, 0] },
      ]);
      expect(await fs.readJson(path.join(worldDir, 'world_resource_packs.json'))).toEqual([{ pack_id: 'rp-one', version: [1, 0, 0] }]);

      const disabled = await service.setAddonEnabled('bed', addon.id, false);
      expect(disabled.addon.enabled).toBe(false);
      expect(await fs.pathExists(path.join(mcData(), 'behavior_packs', 'bp-one'))).toBe(false);
      expect(await fs.readJson(path.join(worldDir, 'world_behavior_packs.json'))).toEqual([{ pack_id: 'manual', version: [1, 0, 0] }]);
    });

    it('rejects unknown addons and uuid conflicts with enabled addons', async () => {
      await expect(service.setAddonEnabled('bed', 'nope', true)).rejects.toThrow(NotFoundException);

      const first = await importPacks('same', 'first');
      const second = await importPacks('same', 'second');
      await service.setAddonEnabled('bed', first.addon.id, true);
      await expect(service.setAddonEnabled('bed', second.addon.id, true)).rejects.toThrow(/UUID conflict/);
    });

    it('listAddons syncs world packs when the world files are missing', async () => {
      const { addon } = await importPacks('list');
      await service.setAddonEnabled('bed', addon.id, true);
      await fs.remove(path.join(mcData(), 'worlds', 'world', 'world_behavior_packs.json'));

      const listed = await service.listAddons('bed');

      expect(listed.levelName).toBe('world');
      expect(listed.addons[0].enabled).toBe(true);
      expect(await fs.pathExists(path.join(mcData(), 'worlds', 'world', 'world_behavior_packs.json'))).toBe(true);
    });

    it('deleteAddon rejects unknown addons', async () => {
      await expect(service.deleteAddon('bed', 'nope')).rejects.toThrow(NotFoundException);
    });

    it('treats a malformed registry as empty', async () => {
      await fs.ensureDir(path.join(serverDir(), 'addons'));
      await fs.writeFile(path.join(serverDir(), 'addons', 'registry.json'), '{broken');
      expect((await service.listAddons('bed')).addons).toEqual([]);
      await fs.writeJson(path.join(serverDir(), 'addons', 'registry.json'), { addons: 'nope' });
      expect((await service.listAddons('bed')).addons).toEqual([]);
    });
  });

  describe('level name resolution', () => {
    it('reads server.properties and falls back to the worlds folder', async () => {
      expect((await service.listAddons('bed')).levelName).toBe('world');

      await fs.ensureDir(path.join(mcData(), 'worlds', 'Only One'));
      expect((await service.listAddons('bed')).levelName).toBe('Only One');

      await fs.ensureDir(path.join(mcData(), 'worlds', 'Third'));
      expect((await service.listAddons('bed')).levelName).toBe('world');

      await fs.ensureDir(path.join(mcData(), 'worlds', 'Bedrock level'));
      expect((await service.listAddons('bed')).levelName).toBe('Bedrock level');

      await fs.writeFile(path.join(mcData(), 'server.properties'), 'gamemode=survival\n');
      expect((await service.listAddons('bed')).levelName).toBe('Bedrock level');

      await fs.writeFile(path.join(mcData(), 'server.properties'), 'level-name=   \n');
      expect((await service.listAddons('bed')).levelName).toBe('Bedrock level');

      await fs.writeFile(path.join(mcData(), 'server.properties'), 'level-name=Custom\n');
      expect((await service.listAddons('bed')).levelName).toBe('Custom');
    });
  });

  describe('CurseForge', () => {
    const gamesPage = (items: Array<{ id: number; slug?: string; name?: string }>, fill = false) => ({
      data: { data: fill ? [...items, ...Array.from({ length: 50 - items.length }, (_, i) => ({ id: 1000 + i, slug: `other-${i}` }))] : items },
    });

    it('requires a CurseForge api key', async () => {
      getCfApiKey.mockResolvedValue('');
      await expect(service.searchCurseForgeAddons(1, 'bed', {})).rejects.toThrow(/API key not configured/);
    });

    it('resolves the Bedrock game id across pages and caches it', async () => {
      mockClient.get
        .mockResolvedValueOnce(gamesPage([{ id: 1, slug: 'minecraft' }], true))
        .mockResolvedValueOnce(gamesPage([{ id: 78022, name: 'Minecraft Bedrock' }]))
        .mockResolvedValueOnce({ data: { data: [], pagination: {} } })
        .mockResolvedValueOnce({ data: { data: [], pagination: {} } });

      await service.searchCurseForgeAddons(1, 'bed', {});
      await service.searchCurseForgeAddons(1, 'bed', {});

      expect(mockClient.get).toHaveBeenCalledTimes(4);
      expect(mockClient.get).toHaveBeenNthCalledWith(3, '/mods/search', { params: expect.objectContaining({ gameId: 78022, pageSize: 12, index: 0 }) });
    });

    it('fails when the Bedrock game cannot be found', async () => {
      mockClient.get.mockResolvedValue(gamesPage([{ id: 1, slug: 'minecraft' }]));
      await expect(service.searchCurseForgeAddons(1, 'bed', {})).rejects.toThrow(/game ID/);
    });

    it('maps search results and clamps paging', async () => {
      mockClient.get.mockResolvedValueOnce(gamesPage([{ id: 5, slug: 'minecraft-bedrock' }])).mockResolvedValueOnce({
        data: {
          data: [
            { id: 10, name: 'Pack', slug: 'pack', summary: 's', logo: { thumbnailUrl: 't' }, downloadCount: 3, latestFiles: [{ id: 1, fileName: 'x.jar' }, { id: 2, fileName: 'pack.mcaddon', downloadUrl: 'u' }] },
            { id: 11, name: 'NoFiles', slug: 'nofiles', logo: { url: 'u' }, latestFiles: [{ fileName: 'x.mcpack' }] },
          ],
          pagination: { resultCount: 2, totalCount: 40 },
        },
      });

      const result = await service.searchCurseForgeAddons(1, 'bed', { q: 'pack', pageSize: 500, index: -1 });

      expect(result.data).toEqual([
        { projectId: '10', fileId: 2, name: 'Pack', slug: 'pack', summary: 's', iconUrl: 't', downloads: 3, fileName: 'pack.mcaddon', importable: true },
        { projectId: '11', fileId: undefined, name: 'NoFiles', slug: 'nofiles', summary: '', iconUrl: 'u', downloads: undefined, fileName: undefined, importable: false },
      ]);
      expect(result.pagination).toEqual({ index: 0, pageSize: 50, resultCount: 2, totalCount: 40 });
    });

    it('maps CurseForge errors', async () => {
      const axiosError = (status: number, message?: string) => Object.assign(new Error('http'), { isAxiosError: true, response: { status, data: message ? { message } : undefined } });
      mockClient.get.mockResolvedValue(gamesPage([{ id: 5, slug: 'minecraft-bedrock' }]));

      mockClient.get.mockResolvedValueOnce(gamesPage([{ id: 5, slug: 'minecraft-bedrock' }])).mockRejectedValueOnce(axiosError(403));
      await expect(service.searchCurseForgeAddons(1, 'bed', {})).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });

      mockClient.get.mockRejectedValueOnce(axiosError(429, 'slow'));
      await expect(service.searchCurseForgeAddons(1, 'bed', {})).rejects.toMatchObject({ status: 429, message: 'slow' });

      mockClient.get.mockRejectedValueOnce(new Error('boom'));
      await expect(service.searchCurseForgeAddons(1, 'bed', {})).rejects.toMatchObject({ status: HttpStatus.INTERNAL_SERVER_ERROR });
    });

    it('imports a specific file, resolving its download url when missing', async () => {
      const archive = buildZip({ 'bp/manifest.json': manifest('behavior', 'bp-cf') });
      mockClient.get
        .mockResolvedValueOnce({ data: { data: { id: 77, fileName: 'cf pack.mcaddon' } } })
        .mockResolvedValueOnce({ data: { data: 'https://cdn.example/cf.mcaddon' } });
      (axios.get as jest.Mock).mockResolvedValue({ data: archive });

      const result = await service.importCurseForgeAddon(1, 'bed', { projectId: '42', fileId: 77 }, true);

      expect(axios.get).toHaveBeenCalledWith('https://cdn.example/cf.mcaddon', expect.objectContaining({ responseType: 'arraybuffer' }));
      expect(result.addon).toMatchObject({ source: 'curseforge', providerProjectId: '42', providerFileId: 77, fileName: 'cf-pack.mcaddon' });
      const registry = await fs.readJson(path.join(serverDir(), 'addons', 'registry.json'));
      expect(registry.addons[0].enabled).toBe(true);
    });

    it('imports the latest importable file, falling back to the files listing', async () => {
      const archive = buildZip({ 'rp/manifest.json': manifest('resource', 'rp-cf') });
      mockClient.get
        .mockResolvedValueOnce({ data: { data: { latestFiles: [{ id: 1, fileName: 'src.jar', downloadUrl: 'x' }] } } })
        .mockResolvedValueOnce({ data: { data: [{ id: 2, fileName: 'latest.mcpack', downloadUrl: 'https://cdn.example/latest.mcpack' }] } });
      (axios.get as jest.Mock).mockResolvedValue({ data: archive });

      const result = await service.importCurseForgeAddon(1, 'bed', { projectId: '42' });
      expect(result.addon.providerFileId).toBe(2);
      expect(mockClient.get).toHaveBeenNthCalledWith(2, '/mods/42/files', { params: { pageSize: 50, index: 0 } });
    });

    it('uses the project latestFiles when one is importable', async () => {
      const archive = buildZip({ 'rp/manifest.json': manifest('resource', 'rp-latest') });
      mockClient.get.mockResolvedValueOnce({ data: { data: { latestFiles: [{ id: 3, fileName: 'l.mcaddon', downloadUrl: 'https://cdn.example/l.mcaddon' }] } } });
      (axios.get as jest.Mock).mockResolvedValue({ data: archive });

      const result = await service.importCurseForgeAddon(1, 'bed', { projectId: '42' });
      expect(result.addon.providerFileId).toBe(3);
    });

    it('rejects invalid project ids, missing files and files without download url', async () => {
      await expect(service.importCurseForgeAddon(1, 'bed', { projectId: 'abc' })).rejects.toThrow('Invalid projectId');

      mockClient.get.mockResolvedValueOnce({ data: { data: null } });
      await expect(service.importCurseForgeAddon(1, 'bed', { projectId: '42', fileId: 1 })).rejects.toThrow(NotFoundException);

      mockClient.get.mockResolvedValueOnce({ data: { data: { id: 1, fileName: 'f.mcaddon' } } }).mockResolvedValueOnce({ data: { data: null } });
      await expect(service.importCurseForgeAddon(1, 'bed', { projectId: '42', fileId: 1 })).rejects.toThrow(/downloadable/);

      mockClient.get.mockResolvedValueOnce({ data: { data: { latestFiles: [] } } }).mockResolvedValueOnce({ data: { data: [] } });
      await expect(service.importCurseForgeAddon(1, 'bed', { projectId: '42' })).rejects.toThrow(/No importable/);
    });
  });
});
