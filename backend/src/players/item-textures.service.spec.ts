import AdmZip from 'adm-zip';
import axios from 'axios';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ItemTexturesService } from './item-textures.service';

jest.mock('axios');
const mockedGet = axios.get as jest.Mock;

describe('ItemTexturesService', () => {
  let root: string;
  let service: ItemTexturesService;
  const jar = () => {
    const zip = new AdmZip();
    zip.addFile('assets/minecraft/textures/item/diamond_sword.png', Buffer.from('sword'));
    zip.addFile('assets/minecraft/textures/block/grass_block_side.png', Buffer.from('grass'));
    zip.addFile('assets/minecraft/textures/item/compass_00.png', Buffer.from('compass'));
    zip.addFile('assets/minecraft/textures/block/../../evil.png', Buffer.from('evil'));
    zip.addFile('assets/minecraft/models/item/diamond_sword.json', Buffer.from('{}'));
    return zip.toBuffer();
  };
  const mojang = (version = '1.21.1', clientUrl = 'https://piston-data.mojang.com/client.jar') => {
    mockedGet.mockImplementation(async (url: string) => {
      if (url.endsWith('version_manifest_v2.json')) return { data: { versions: [{ id: version, url: 'https://piston-meta.mojang.com/v/1.21.1.json' }] } };
      if (url.endsWith('1.21.1.json')) return { data: { downloads: { client: { url: clientUrl } } } };
      return { data: jar() };
    });
  };
  const settle = async (version: string) => (service as any).pending.get(version);

  beforeEach(async () => {
    jest.clearAllMocks();
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'minepanel-textures-'));
    service = new ItemTexturesService({ getOrThrow: () => path.join(root, 'minepanel.db') } as any);
  });
  afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });

  it('downloads the client jar once and resolves item and block textures', async () => {
    mojang();
    service.ensure('1.21.1');
    service.ensure('1.21.1');
    await settle('1.21.1');
    expect(mockedGet).toHaveBeenCalledTimes(3);
    expect(await fs.readFile((await service.resolve('1.21.1', 'diamond_sword'))!, 'utf8')).toBe('sword');
    expect(await service.resolve('1.21.1', 'grass_block')).toMatch(/block\/grass_block_side\.png$/);
    expect(await service.resolve('1.21.1', 'compass')).toMatch(/item\/compass_00\.png$/);
    expect(await service.resolve('1.21.1', 'chest')).toBeNull();
    await expect(fs.stat(path.join(root, 'textures', 'evil.png'))).rejects.toThrow();

    // A cached version is not downloaded again, even by a fresh service.
    service = new ItemTexturesService({ getOrThrow: () => path.join(root, 'minepanel.db') } as any);
    service.ensure('1.21.1');
    await settle('1.21.1');
    expect(mockedGet).toHaveBeenCalledTimes(3);
  });

  it('rejects unsafe input and non-Mojang downloads, and allows a retry after failure', async () => {
    service.ensure('../../etc');
    expect(mockedGet).not.toHaveBeenCalled();
    expect(await service.resolve('../x', 'stone')).toBeNull();
    expect(await service.resolve('1.21.1', '../stone')).toBeNull();

    mojang('1.21.1', 'https://evil.example/client.jar');
    service.ensure('1.21.1');
    await settle('1.21.1');
    expect((service as any).pending.has('1.21.1')).toBe(false);

    mojang('other');
    service.ensure('1.21.1');
    await settle('1.21.1');
    mockedGet.mockResolvedValue({ data: { versions: [{ id: '1.21.1', url: 'https://piston-meta.mojang.com/v/1.21.1.json' }], downloads: {} } });
    service.ensure('1.21.1');
    await settle('1.21.1');
    expect(await service.resolve('1.21.1', 'diamond_sword')).toBeNull();
  });
});
