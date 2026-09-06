import * as fs from 'fs-extra';
import * as os from 'node:os';
import * as path from 'node:path';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as AdmZip from 'adm-zip';
import { ModpacksService } from './modpacks.service';

describe('ModpacksService', () => {
  let tempDir: string;
  let service: ModpacksService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'minepanel-modpacks-'));
    await fs.ensureDir(path.join(tempDir, 'srv'));
    await fs.writeFile(path.join(tempDir, 'srv', 'docker-compose.yml'), 'services: {}');
    service = new ModpacksService({ get: () => tempDir } as any);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('rejects invalid ids and folders that are not servers', async () => {
    await expect(service.list('../x')).rejects.toThrow(BadRequestException);
    await fs.ensureDir(path.join(tempDir, '_root'));
    await expect(service.list('_root')).rejects.toThrow(NotFoundException);
  });

  it('saves, lists and removes modpack files', async () => {
    const saved = await service.save('srv', { originalname: '../All The Mods (9).zip', buffer: Buffer.from('zip') } as Express.Multer.File);
    expect(saved).toMatchObject({ name: 'All The Mods (9).zip', size: 3, containerPath: '/modpacks/All The Mods (9).zip' });
    await fs.writeFile(path.join(tempDir, 'srv', 'modpacks', 'notes.txt'), 'x');
    await fs.writeFile(path.join(tempDir, 'srv', 'modpacks', 'a.mrpack'), 'x');

    const listed = await service.list('srv');
    expect(listed.map((f) => f.name)).toEqual(['a.mrpack', 'All The Mods (9).zip']);

    await service.remove('srv', 'a.mrpack');
    expect((await service.list('srv')).map((f) => f.name)).toEqual(['All The Mods (9).zip']);
    await expect(service.remove('srv', 'a.mrpack')).rejects.toThrow(NotFoundException);
  });

  it('inspects a stored modpack and reports missing ones', async () => {
    const zip = new AdmZip();
    zip.addFile('manifest.json', Buffer.from(JSON.stringify({ minecraft: { version: '1.21.1', modLoaders: [{ id: 'neoforge-21.1.72' }] } })));
    const saved = await service.save('srv', { originalname: 'pack.zip', buffer: zip.toBuffer() } as Express.Multer.File);

    expect(saved.inspection).toMatchObject({ kind: 'curseforge-client', loader: 'NEOFORGE' });
    expect(await service.inspect('srv', 'pack.zip')).toMatchObject({ minecraftVersion: '1.21.1' });
    await expect(service.inspect('srv', 'missing.zip')).rejects.toThrow(NotFoundException);
  });

  it('scans the mods of a stored pack and writes a copy without the ones picked', async () => {
    const mod = new AdmZip();
    mod.addFile('fabric.mod.json', Buffer.from(JSON.stringify({ id: 'sodium', environment: 'client' })));
    const pack = new AdmZip();
    pack.addFile('mods/sodium.jar', mod.toBuffer());
    pack.addFile('mods/carpet.jar', Buffer.from('x'));
    await service.save('srv', { originalname: 'pack.zip', buffer: pack.toBuffer() } as Express.Multer.File);

    const scan = await service.scanMods('srv', 'pack.zip');
    expect(scan.mods.map((m) => m.fileName)).toEqual(['carpet.jar', 'sodium.jar']);
    expect(scan.mods.find((m) => m.modId === 'sodium')?.side).toBe('client');

    const stripped = await service.stripMods('srv', 'pack.zip', ['mods/sodium.jar']);
    expect(stripped.name).toBe('pack-server.zip');
    expect((await service.scanMods('srv', 'pack-server.zip')).mods.map((m) => m.fileName)).toEqual(['carpet.jar']);

    // The original is what the user uploaded; a wrong call must not cost it.
    expect((await service.scanMods('srv', 'pack.zip')).mods).toHaveLength(2);
    await expect(service.stripMods('srv', 'pack.zip', [])).rejects.toThrow(BadRequestException);
    await expect(service.scanMods('srv', 'missing.zip')).rejects.toThrow(NotFoundException);
  });

  it('only accepts .zip and .mrpack names', async () => {
    await expect(service.save('srv', { originalname: 'virus.exe', buffer: Buffer.from('x') } as Express.Multer.File)).rejects.toThrow(BadRequestException);
    await expect(service.remove('srv', 'bad;name.zip')).rejects.toThrow(BadRequestException);
  });
});
