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
});
