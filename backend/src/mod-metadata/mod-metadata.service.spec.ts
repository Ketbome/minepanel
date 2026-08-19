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

    expect(metadata).toEqual({ desiredMcVersion: null, notes: {}, pendingChanges: [] });
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

  describe('queueChange / cancelQueuedChange / consumePendingQueue', () => {
    it('queueChange adds an entry and upserts on a repeated ref', async () => {
      await fs.ensureDir(path.join(tempDir, 'srv'));

      await service.queueChange('srv', { provider: 'modrinth', ref: 'Sodium', action: 'add', version: 'v1', label: 'Sodium' });
      let metadata = await service.getMetadata('srv');
      expect(metadata.pendingChanges).toEqual([{ provider: 'modrinth', ref: 'Sodium', action: 'add', version: 'v1', label: 'Sodium' }]);

      // Same ref, different case and intent - replaces the prior entry rather than appending.
      await service.queueChange('srv', { provider: 'modrinth', ref: 'sodium', action: 'remove', label: 'Sodium' });
      metadata = await service.getMetadata('srv');
      expect(metadata.pendingChanges).toEqual([{ provider: 'modrinth', ref: 'sodium', action: 'remove', label: 'Sodium' }]);
    });

    it('queueChange rejects an empty ref', async () => {
      await fs.ensureDir(path.join(tempDir, 'srv'));

      await expect(service.queueChange('srv', { provider: 'curseforge', ref: '  ', action: 'add', label: 'x' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('cancelQueuedChange removes only the matching provider+ref entry', async () => {
      await fs.ensureDir(path.join(tempDir, 'srv'));

      await service.queueChange('srv', { provider: 'modrinth', ref: 'sodium', action: 'add', label: 'Sodium' });
      await service.queueChange('srv', { provider: 'curseforge', ref: 'sodium', action: 'add', label: 'Sodium (CF)' });

      await service.cancelQueuedChange('srv', 'modrinth', 'sodium');
      const metadata = await service.getMetadata('srv');
      expect(metadata.pendingChanges).toEqual([{ provider: 'curseforge', ref: 'sodium', action: 'add', label: 'Sodium (CF)' }]);
    });

    it('peekPendingQueue returns an empty array when empty, without clearing anything', async () => {
      await fs.ensureDir(path.join(tempDir, 'srv'));

      expect(await service.peekPendingQueue('srv')).toEqual([]);

      await service.queueChange('srv', { provider: 'modrinth', ref: 'sodium', action: 'add', label: 'Sodium' });
      const peeked = await service.peekPendingQueue('srv');
      expect(peeked).toEqual([{ provider: 'modrinth', ref: 'sodium', action: 'add', label: 'Sodium' }]);

      const metadata = await service.getMetadata('srv');
      expect(metadata.pendingChanges).toEqual([{ provider: 'modrinth', ref: 'sodium', action: 'add', label: 'Sodium' }]);
    });

    it('acknowledgeQueue removes only the applied entries, preserving concurrently queued ones', async () => {
      await fs.ensureDir(path.join(tempDir, 'srv'));

      await service.queueChange('srv', { provider: 'modrinth', ref: 'sodium', action: 'add', label: 'Sodium' });
      const applied = await service.peekPendingQueue('srv');

      // Simulate a change queued while `applied` was being processed.
      await service.queueChange('srv', { provider: 'curseforge', ref: 'jei', action: 'add', label: 'JEI' });

      await service.acknowledgeQueue('srv', applied);

      const metadata = await service.getMetadata('srv');
      expect(metadata.pendingChanges).toEqual([{ provider: 'curseforge', ref: 'jei', action: 'add', label: 'JEI' }]);
    });

    it('acknowledgeQueue does not remove a same-ref replacement queued with a different version', async () => {
      await fs.ensureDir(path.join(tempDir, 'srv'));

      await service.queueChange('srv', { provider: 'modrinth', ref: 'sodium', action: 'add', version: 'v1', label: 'Sodium' });
      const applied = await service.peekPendingQueue('srv');

      // Simulate the user re-queueing a newer version for the same ref while `applied` (v1) is
      // being processed by the startup lifecycle.
      await service.queueChange('srv', { provider: 'modrinth', ref: 'sodium', action: 'add', version: 'v2', label: 'Sodium' });

      await service.acknowledgeQueue('srv', applied);

      const metadata = await service.getMetadata('srv');
      expect(metadata.pendingChanges).toEqual([{ provider: 'modrinth', ref: 'sodium', action: 'add', version: 'v2', label: 'Sodium' }]);
    });
  });

  describe('applyQueueToConfig', () => {
    it('adds a new ref and updates an existing pin', () => {
      const result = service.applyQueueToConfig('jei:123', '', [
        { provider: 'modrinth', ref: 'sodium', action: 'add', version: 'v2', label: 'Sodium' },
        { provider: 'curseforge', ref: 'jei', action: 'add', version: '456', label: 'JEI' },
      ]);

      expect(result.modrinthProjects).toBe('sodium:v2');
      expect(result.cfFiles).toBe('jei:456');
    });

    it('removes a matching ref and leaves everything else untouched', () => {
      const result = service.applyQueueToConfig('jei:123\nfabric:fabric-api:v9', '', [
        { provider: 'curseforge', ref: 'jei', action: 'remove', label: 'JEI' },
      ]);

      expect(result.cfFiles).toBe('fabric:fabric-api:v9');
    });

    it('adds an unpinned ref with no version', () => {
      const result = service.applyQueueToConfig('', '', [{ provider: 'curseforge', ref: 'jei', action: 'add', label: 'JEI' }]);

      expect(result.cfFiles).toBe('jei');
    });

    it('preserves the loader prefix and optional marker when updating an existing entry', () => {
      const result = service.applyQueueToConfig('', 'fabric:bluemap?:abc123', [
        { provider: 'modrinth', ref: 'bluemap', action: 'add', version: 'xyz789', label: 'BlueMap' },
      ]);

      expect(result.modrinthProjects).toBe('fabric:bluemap?:xyz789');
    });
  });
});
