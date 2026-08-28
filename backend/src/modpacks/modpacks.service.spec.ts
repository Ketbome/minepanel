import * as fs from 'fs-extra';
import * as os from 'node:os';
import * as path from 'node:path';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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

  it('only accepts .zip and .mrpack names', async () => {
    await expect(service.save('srv', { originalname: 'virus.exe', buffer: Buffer.from('x') } as Express.Multer.File)).rejects.toThrow(BadRequestException);
    await expect(service.remove('srv', 'bad;name.zip')).rejects.toThrow(BadRequestException);
  });
});
