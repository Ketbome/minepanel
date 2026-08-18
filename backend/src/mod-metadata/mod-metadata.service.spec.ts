import * as fs from 'fs-extra';
import * as os from 'node:os';
import * as path from 'node:path';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ModMetadataService } from './mod-metadata.service';

describe('ModMetadataService', () => {
  let tempDir: string;
  let service: ModMetadataService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'minepanel-mod-metadata-'));

    service = new ModMetadataService({
      get: jest.fn((key: string) => (key === 'serversDir' ? tempDir : undefined)),
    } as any);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('getMetadata returns the default shape when no file exists', async () => {
    await fs.ensureDir(path.join(tempDir, 'srv'));

    const metadata = await service.getMetadata('srv');

    expect(metadata).toEqual({ desiredMcVersion: null, notes: {} });
  });

  it('getMetadata throws NotFoundException for a missing server directory', async () => {
    await expect(service.getMetadata('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('validateServerId rejects a malformed server id', async () => {
    await expect(service.getMetadata('../etc')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('setDesiredVersion persists and round-trips, and clears on empty string', async () => {
    await fs.ensureDir(path.join(tempDir, 'srv'));

    await service.setDesiredVersion('srv', '1.21.4');
    let metadata = await service.getMetadata('srv');
    expect(metadata.desiredMcVersion).toBe('1.21.4');

    await service.setDesiredVersion('srv', '');
    metadata = await service.getMetadata('srv');
    expect(metadata.desiredMcVersion).toBeNull();
  });

  it('setModNote adds, updates, and deletes a note when set to empty', async () => {
    await fs.ensureDir(path.join(tempDir, 'srv'));

    await service.setModNote('srv', 'Sodium', 'Check for 1.21 build');
    let metadata = await service.getMetadata('srv');
    expect(metadata.notes['sodium']).toBe('Check for 1.21 build');

    await service.setModNote('srv', 'sodium', 'Updated note');
    metadata = await service.getMetadata('srv');
    expect(metadata.notes['sodium']).toBe('Updated note');

    await service.setModNote('srv', 'sodium', '   ');
    metadata = await service.getMetadata('srv');
    expect(metadata.notes['sodium']).toBeUndefined();
  });

  it('setModNote rejects an empty ref', async () => {
    await fs.ensureDir(path.join(tempDir, 'srv'));

    await expect(service.setModNote('srv', '   ', 'note')).rejects.toBeInstanceOf(BadRequestException);
  });
});
