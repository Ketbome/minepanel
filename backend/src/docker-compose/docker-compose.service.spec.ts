import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DockerComposeService } from './docker-compose.service';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';

jest.mock('fs-extra', () => ({
  ensureDirSync: jest.fn(),
  ensureDir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  pathExists: jest.fn().mockResolvedValue(false),
  readFile: jest.fn(),
  existsSync: jest.fn().mockReturnValue(false),
  readdir: jest.fn().mockResolvedValue([]),
}));

describe('DockerComposeService', () => {
  let service: DockerComposeService;

  const SERVERS_DIR = '/app/servers';
  const BASE_DIR = '/app';

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'serversDir') return SERVERS_DIR;
        if (key === 'baseDir') return BASE_DIR;
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DockerComposeService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<DockerComposeService>(DockerComposeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllServerIds', () => {
    it('should return empty array when no servers exist', async () => {
      const result = await service.getAllServerIds();
      expect(result).toEqual([]);
    });
  });

  describe('getServerConfig', () => {
    it('should return null when server does not exist', async () => {
      const result = await service.getServerConfig('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('generateDockerComposeFile', () => {
    it('should generate mc service without container_name', async () => {
      const config = (service as any).createDefaultConfig('survival');

      await service.generateDockerComposeFile(config, false);

      const writeFileMock = fs.writeFile as unknown as jest.Mock;
      const [, yamlContent] = writeFileMock.mock.calls[0];
      const parsed = yaml.load(yamlContent as string) as any;

      expect(parsed.services.mc.container_name).toBeUndefined();
    });

    it('should add stable proxy alias when proxy is enabled', async () => {
      const config = (service as any).createDefaultConfig('proxyserver');

      await service.generateDockerComposeFile(config, true);

      const writeFileMock = fs.writeFile as unknown as jest.Mock;
      const [, yamlContent] = writeFileMock.mock.calls[0];
      const parsed = yaml.load(yamlContent as string) as any;

      expect(parsed.services.mc.networks['minepanel-network'].aliases).toEqual(['proxyserver']);
    });
  });
});
