import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DockerComposeService } from './docker-compose.service';

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
});
