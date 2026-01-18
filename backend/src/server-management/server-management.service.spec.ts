import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Settings } from '../users/entities/settings.entity';
import { DiscordService } from '../discord/discord.service';

// Mock fs-extra with factory function
jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  readFile: jest.fn(),
  remove: jest.fn(),
  ensureDir: jest.fn(),
  ensureDirSync: jest.fn(),
}));

// Mock child_process
jest.mock('node:child_process', () => ({
  exec: jest.fn(),
}));

// Mock util.promisify to return our mock function
jest.mock('node:util', () => {
  const execMock = jest.fn();
  return {
    ...jest.requireActual('node:util'),
    promisify: () => execMock,
  };
});

// Import after mocks
import { ServerManagementService } from './server-management.service';
import * as fs from 'fs-extra';

// Get the mocked promisify result
const mockExec = jest.requireMock('node:util').promisify();

describe('ServerManagementService', () => {
  let service: ServerManagementService;

  const SERVERS_DIR = '/app/servers';

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'serversDir') return SERVERS_DIR;
        return null;
      }),
    };

    const mockSettingsRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const mockDiscordService = {
      sendServerNotification: jest.fn(),
    };

    (fs.ensureDirSync as jest.Mock).mockImplementation(() => {});
    (fs.pathExists as jest.Mock).mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServerManagementService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(Settings), useValue: mockSettingsRepo },
        { provide: DiscordService, useValue: mockDiscordService },
      ],
    }).compile();

    service = module.get<ServerManagementService>(ServerManagementService);
  });

  describe('server ID validation', () => {
    it('should reject invalid server IDs', async () => {
      const invalidIds = ['server with space', '../hack', 'server;rm -rf', 'server$var', ''];

      for (const id of invalidIds) {
        const status = await service.getServerStatus(id);
        expect(status).toBe('not_found');
      }
    });
  });

  describe('getServerStatus', () => {
    it('should return "not_found" when server directory does not exist', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      const status = await service.getServerStatus('nonexistent');

      expect(status).toBe('not_found');
    });

    it('should return "running" when container is running', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      mockExec
        .mockResolvedValueOnce({ stdout: 'container123\n' })
        .mockResolvedValueOnce({ stdout: 'running\n' });

      const status = await service.getServerStatus('myserver');

      expect(status).toBe('running');
    });

    it('should return "stopped" when container is exited', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      mockExec
        .mockResolvedValueOnce({ stdout: 'container123\n' })
        .mockResolvedValueOnce({ stdout: 'exited\n' });

      const status = await service.getServerStatus('myserver');

      expect(status).toBe('stopped');
    });

    it('should return "starting" when container is restarting', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      mockExec
        .mockResolvedValueOnce({ stdout: 'container123\n' })
        .mockResolvedValueOnce({ stdout: 'restarting\n' });

      const status = await service.getServerStatus('myserver');

      expect(status).toBe('starting');
    });
  });

  describe('getServerInfo', () => {
    it('should return not found for invalid server ID', async () => {
      const info = await service.getServerInfo('invalid;id');

      expect(info.exists).toBe(false);
      expect(info.status).toBe('not_found');
      expect(info.error).toBe('Invalid server ID');
    });
  });

  describe('startServer', () => {
    it('should fail for invalid server ID', async () => {
      const result = await service.startServer('invalid;id');
      expect(result).toBe(false);
    });

    it('should fail when docker-compose does not exist', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      const result = await service.startServer('myserver');

      expect(result).toBe(false);
    });
  });

  describe('stopServer', () => {
    it('should fail for invalid server ID', async () => {
      const result = await service.stopServer('invalid;id');
      expect(result).toBe(false);
    });

    it('should stop server successfully', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      mockExec.mockResolvedValue({ stdout: '' });

      const result = await service.stopServer('myserver');

      expect(result).toBe(true);
    });
  });

  describe('restartServer', () => {
    it('should restart server successfully', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      mockExec
        .mockResolvedValueOnce({ stdout: '' })
        .mockResolvedValueOnce({ stdout: '' });

      const result = await service.restartServer('myserver');

      expect(result).toBe(true);
    });
  });

  describe('deleteServer', () => {
    it('should fail when server directory does not exist', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      const result = await service.deleteServer('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getServerLogs', () => {
    it('should return error for invalid server ID', async () => {
      const result = await service.getServerLogs('invalid;id');

      expect(result.logs).toBe('Invalid server ID');
      expect(result.hasErrors).toBe(true);
    });
  });

  describe('executeCommand', () => {
    it('should return error when container not found', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      mockExec.mockResolvedValueOnce({ stdout: '' });

      const result = await service.executeCommand('myserver', 'say hello', '25575');

      expect(result.success).toBe(false);
      expect(result.output).toContain('Container not found');
    });
  });

  describe('getServerResources', () => {
    it('should return N/A when container not found', async () => {
      mockExec.mockResolvedValueOnce({ stdout: '' });

      const result = await service.getServerResources('myserver');

      expect(result.cpuUsage).toBe('N/A');
      expect(result.memoryUsage).toBe('N/A');
    });
  });

  describe('getWhitelist', () => {
    it('should return empty array when whitelist does not exist', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      const result = await service.getWhitelist('myserver');

      expect(result).toEqual([]);
    });

    it('should return whitelist from file', async () => {
      const mockWhitelist = [
        { uuid: 'uuid-1', name: 'Player1' },
        { uuid: 'uuid-2', name: 'Player2' },
      ];

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fs.readFile as any).mockResolvedValue(JSON.stringify(mockWhitelist));

      const result = await service.getWhitelist('myserver');

      expect(result).toEqual(mockWhitelist);
    });
  });
});
