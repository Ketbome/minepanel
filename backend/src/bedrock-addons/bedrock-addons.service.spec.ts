import * as fs from 'fs-extra';
import * as os from 'node:os';
import * as path from 'node:path';
import { BadRequestException } from '@nestjs/common';
import { BedrockAddonsService } from './bedrock-addons.service';

describe('BedrockAddonsService', () => {
  let tempDir: string;
  let service: BedrockAddonsService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'minepanel-bedrock-addons-'));

    service = new BedrockAddonsService(
      {
        get: jest.fn((key: string) => {
          if (key === 'serversDir') {
            return tempDir;
          }
          return undefined;
        }),
      } as any,
      {
        getSettings: jest.fn(),
      } as any,
      {
        getServerConfig: jest.fn().mockResolvedValue({ id: 'bed', edition: 'BEDROCK' }),
      } as any,
    );
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('clearAddonRuntimeState should disable enabled addons and persist registry', async () => {
    const serverDir = path.join(tempDir, 'bed');
    await fs.ensureDir(path.join(serverDir, 'addons'));
    await fs.ensureDir(path.join(serverDir, 'mc-data'));
    await fs.writeJson(path.join(serverDir, 'addons', 'registry.json'), {
      addons: [
        { id: 'a1', enabled: true, packs: [] },
        { id: 'a2', enabled: false, packs: [] },
      ],
    });

    const result = await service.clearAddonRuntimeState('bed');
    const registry = await fs.readJson(path.join(serverDir, 'addons', 'registry.json'));

    expect(result).toEqual({ success: true, changed: true });
    expect(registry.addons).toEqual([
      expect.objectContaining({ id: 'a1', enabled: false }),
      expect.objectContaining({ id: 'a2', enabled: false }),
    ]);
  });

  it('clearAddonRuntimeState should report unchanged when all addons are already disabled', async () => {
    const serverDir = path.join(tempDir, 'bed');
    await fs.ensureDir(path.join(serverDir, 'addons'));
    await fs.ensureDir(path.join(serverDir, 'mc-data'));
    await fs.writeJson(path.join(serverDir, 'addons', 'registry.json'), {
      addons: [{ id: 'a1', enabled: false, packs: [] }],
    });

    const result = await service.clearAddonRuntimeState('bed');

    expect(result).toEqual({ success: true, changed: false });
  });

  it('clearAddonRuntimeState should reject non-Bedrock servers', async () => {
    const serverDir = path.join(tempDir, 'java');
    await fs.ensureDir(path.join(serverDir, 'addons'));
    await fs.ensureDir(path.join(serverDir, 'mc-data'));

    const javaService = new BedrockAddonsService(
      {
        get: jest.fn((key: string) => {
          if (key === 'serversDir') {
            return tempDir;
          }
          return undefined;
        }),
      } as any,
      {
        getSettings: jest.fn(),
      } as any,
      {
        getServerConfig: jest.fn().mockResolvedValue({ id: 'java', edition: 'JAVA' }),
      } as any,
    );

    await expect(javaService.clearAddonRuntimeState('java')).rejects.toBeInstanceOf(BadRequestException);
  });

  interface SeedAddonInput {
    id: string;
    enabled?: boolean;
    createdAt?: string;
    downloadPath?: string;
    behaviorUuid?: string;
    resourceUuid?: string;
  }

  async function seedServer(serverId: string, addons: SeedAddonInput[]) {
    const serverDir = path.join(tempDir, serverId);
    const addonsDir = path.join(serverDir, 'addons');
    await fs.ensureDir(path.join(addonsDir, 'downloads'));
    await fs.ensureDir(path.join(serverDir, 'mc-data'));

    const records = [];
    for (const input of addons) {
      const packs = [];
      for (const kind of ['behavior', 'resource'] as const) {
        const uuid = kind === 'behavior' ? input.behaviorUuid : input.resourceUuid;
        if (!uuid) {
          continue;
        }
        const relativePath = path.join(`${kind}_packs`, uuid);
        await fs.outputJson(path.join(addonsDir, 'extracted', input.id, relativePath, 'manifest.json'), { header: { uuid } });
        packs.push({ uuid, version: [1, 0, 0], kind, name: `${input.id}-${kind}`, relativePath });
      }

      const downloadPath = input.downloadPath ?? path.join('downloads', `${input.id}.mcaddon`);
      await fs.outputFile(path.join(addonsDir, downloadPath), 'zip');
      records.push({
        id: input.id,
        name: input.id,
        source: 'upload',
        fileName: `${input.id}.mcaddon`,
        enabled: input.enabled ?? true,
        createdAt: input.createdAt ?? new Date().toISOString(),
        downloadPath,
        packs,
      });
    }

    await fs.writeJson(path.join(addonsDir, 'registry.json'), { addons: records });
    return serverDir;
  }

  it('reorderAddons should reorder registry and world pack files', async () => {
    const serverDir = await seedServer('bed', [
      { id: 'a1', behaviorUuid: 'bp-1', resourceUuid: 'rp-1' },
      { id: 'a2', behaviorUuid: 'bp-2', resourceUuid: 'rp-2' },
    ]);

    const result = await service.reorderAddons('bed', ['a2', 'a1']);

    expect(result.success).toBe(true);
    expect(result.addons.map((addon) => addon.id)).toEqual(['a2', 'a1']);

    const registry = await fs.readJson(path.join(serverDir, 'addons', 'registry.json'));
    expect(registry.addons.map((addon: { id: string }) => addon.id)).toEqual(['a2', 'a1']);

    const worldDir = path.join(serverDir, 'mc-data', 'worlds', result.levelName);
    const behavior = await fs.readJson(path.join(worldDir, 'world_behavior_packs.json'));
    const resource = await fs.readJson(path.join(worldDir, 'world_resource_packs.json'));
    expect(behavior.map((entry: { pack_id: string }) => entry.pack_id)).toEqual(['bp-2', 'bp-1']);
    expect(resource.map((entry: { pack_id: string }) => entry.pack_id)).toEqual(['rp-2', 'rp-1']);
  });

  it('reorderAddons should reject unknown, missing or duplicate addon ids', async () => {
    const serverDir = await seedServer('bed', [
      { id: 'a1', behaviorUuid: 'bp-1' },
      { id: 'a2', behaviorUuid: 'bp-2' },
    ]);

    await expect(service.reorderAddons('bed', ['a1', 'ghost'])).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.reorderAddons('bed', ['a1'])).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.reorderAddons('bed', ['a1', 'a1'])).rejects.toBeInstanceOf(BadRequestException);

    const registry = await fs.readJson(path.join(serverDir, 'addons', 'registry.json'));
    expect(registry.addons.map((addon: { id: string }) => addon.id)).toEqual(['a1', 'a2']);
  });

  it('reorderAddons should keep manually installed packs after managed packs', async () => {
    const serverDir = await seedServer('bed', [
      { id: 'a1', behaviorUuid: 'bp-1' },
      { id: 'a2', behaviorUuid: 'bp-2' },
    ]);
    const worldDir = path.join(serverDir, 'mc-data', 'worlds', 'world');
    await fs.outputJson(path.join(worldDir, 'world_behavior_packs.json'), [
      { pack_id: 'manual-pack', version: [2, 0, 0] },
    ]);

    await service.reorderAddons('bed', ['a2', 'a1']);

    const behavior = await fs.readJson(path.join(worldDir, 'world_behavior_packs.json'));
    expect(behavior.map((entry: { pack_id: string }) => entry.pack_id)).toEqual(['bp-2', 'bp-1', 'manual-pack']);
  });

  it('listAddons should return addons in registry order', async () => {
    await seedServer('bed', [
      { id: 'a1', enabled: false, createdAt: '2024-01-01T00:00:00.000Z', behaviorUuid: 'bp-1' },
      { id: 'a2', enabled: false, createdAt: '2025-01-01T00:00:00.000Z', behaviorUuid: 'bp-2' },
    ]);

    const result = await service.listAddons('bed');

    expect(result.addons.map((addon) => addon.id)).toEqual(['a1', 'a2']);
  });

  it('deleteAddon should remove download and extracted files', async () => {
    const serverDir = await seedServer('bed', [{ id: 'a1', behaviorUuid: 'bp-1' }]);

    const result = await service.deleteAddon('bed', 'a1');

    expect(result.success).toBe(true);
    expect(await fs.pathExists(path.join(serverDir, 'addons', 'extracted', 'a1'))).toBe(false);
    expect(await fs.pathExists(path.join(serverDir, 'addons', 'downloads', 'a1.mcaddon'))).toBe(false);

    const registry = await fs.readJson(path.join(serverDir, 'addons', 'registry.json'));
    expect(registry.addons).toEqual([]);
  });

  it('deleteAddon should skip download removal for paths outside the addons directory', async () => {
    const escapePath = path.join(tempDir, 'escape.zip');
    await fs.outputFile(escapePath, 'keep me');
    const serverDir = await seedServer('bed', [
      { id: 'a1', behaviorUuid: 'bp-1', downloadPath: path.join('..', '..', 'escape.zip') },
    ]);

    const result = await service.deleteAddon('bed', 'a1');

    expect(result.success).toBe(true);
    expect(await fs.pathExists(escapePath)).toBe(true);

    const registry = await fs.readJson(path.join(serverDir, 'addons', 'registry.json'));
    expect(registry.addons).toEqual([]);
  });
});
