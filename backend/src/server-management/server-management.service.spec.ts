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
  spawn: jest.fn(),
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
import { AlertsService } from '../alerts/alerts.service';
import { ServerStoreService } from '../docker-compose/server-store.service';
import { DockerComposeService } from '../docker-compose/docker-compose.service';
import { InstanceSettingsService } from '../settings/instance-settings.service';
import * as fs from 'fs-extra';

// Get the mocked promisify result
const mockExec = jest.requireMock('node:util').promisify();

describe('ServerManagementService', () => {
  let service: ServerManagementService;
  let mockDockerComposeService: { getServerConfig: jest.Mock; updateServerConfig: jest.Mock; refreshComposeFile: jest.Mock };
  let mockSettingsRepo: { findOne: jest.Mock };
  let mockInstanceSettings: { getNetwork: jest.Mock; getProxy: jest.Mock };
  let mockStore: { removeFromIndex: jest.Mock; updateConfig: jest.Mock; readConfig: jest.Mock };

  const SERVERS_DIR = '/app/servers';

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'serversDir') return SERVERS_DIR;
        if (key === 'serversHostDir') return '/app/servers';
        return null;
      }),
    };

    mockSettingsRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const mockDiscordService = {
      sendServerNotification: jest.fn(),
    };

    const mockAlertsService = {
      markExpectedStop: jest.fn(),
    };

    mockDockerComposeService = {
      getServerConfig: jest.fn().mockResolvedValue(null),
      updateServerConfig: jest.fn().mockResolvedValue(null),
      refreshComposeFile: jest.fn().mockResolvedValue(true),
    };

    mockStore = {
      removeFromIndex: jest.fn().mockResolvedValue(undefined),
      readConfig: jest.fn().mockResolvedValue({ edition: 'JAVA', maxPlayers: '20' }),
      // Mirrors the real store: hand the mutator a config, return what it produced.
      updateConfig: jest.fn(async (_serverId: string, mutate: (config: any) => void) => {
        const config = { id: 'myserver' } as any;
        mutate(config);
        return config;
      }),
    };

    mockInstanceSettings = {
      getNetwork: jest.fn().mockResolvedValue({ publicIp: null, lanIp: null }),
      getProxy: jest.fn().mockResolvedValue({ enabled: false, baseDomain: null }),
    };

    (fs.ensureDirSync as jest.Mock).mockImplementation(() => {});
    (fs.pathExists as jest.Mock).mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServerManagementService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(Settings), useValue: mockSettingsRepo },
        { provide: DiscordService, useValue: mockDiscordService },
        { provide: AlertsService, useValue: mockAlertsService },
        { provide: ServerStoreService, useValue: mockStore },
        { provide: DockerComposeService, useValue: mockDockerComposeService },
        { provide: InstanceSettingsService, useValue: mockInstanceSettings },
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

  describe('findContainerId', () => {
    it('should resolve container via docker compose first', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      mockExec.mockResolvedValueOnce({ stdout: 'compose123\n', stderr: '' });

      const containerId = await (service as any).findContainerId('myserver');

      expect(containerId).toBe('compose123');
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('docker compose ps -aq mc'),
        expect.objectContaining({ cwd: '/app/servers/myserver' }),
      );
    });

    it('should fallback to legacy exact name lookup when compose lookup fails', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      mockExec
        .mockRejectedValueOnce(new Error('compose unavailable'))
        .mockResolvedValueOnce({ stdout: 'legacy123\n', stderr: '' });

      const containerId = await (service as any).findContainerId('myserver');

      expect(containerId).toBe('legacy123');
      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('name=^/myserver$'));
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

  describe('updateModWatch', () => {
    it('writes notes and the target version without regenerating the compose file', async () => {
      const config = await service.updateModWatch('myserver', { targetVersion: ' 1.21.4 ', notes: { sodium: 'waiting on Iris' } });

      expect(config.modWatchTargetVersion).toBe('1.21.4');
      expect(config.modNotes).toEqual({ sodium: 'waiting on Iris' });
      // The whole point of the separate path: Mod Watch is usable while the server runs,
      // and regenerating compose there can reassign the published port.
      expect(mockDockerComposeService.updateServerConfig).not.toHaveBeenCalled();
      expect(mockDockerComposeService.refreshComposeFile).not.toHaveBeenCalled();
    });

    it('drops blank notes and clears an emptied target version', async () => {
      const config = await service.updateModWatch('myserver', { targetVersion: '', notes: { sodium: '   ', jei: 'keep' } });

      expect(config.modWatchTargetVersion).toBeUndefined();
      expect(config.modNotes).toEqual({ jei: 'keep' });
    });

    it('leaves a field alone when it is not in the request', async () => {
      mockStore.updateConfig.mockImplementation(async (_serverId: string, mutate: (config: any) => void) => {
        const config = { id: 'myserver', modWatchTargetVersion: '1.20.1', modNotes: { sodium: 'existing' } } as any;
        mutate(config);
        return config;
      });

      const config = await service.updateModWatch('myserver', { notes: {} });

      expect(config.modWatchTargetVersion).toBe('1.20.1');
      expect(config.modNotes).toBeUndefined();
    });

    it('throws when the server has no server.json', async () => {
      mockStore.updateConfig.mockResolvedValue(null);

      await expect(service.updateModWatch('ghost', { notes: {} })).rejects.toThrow('not found');
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

    it('should reject empty command after normalization', async () => {
      const result = await service.executeCommand('myserver', '\u001b[31m   \u0007', '25575');

      expect(result.success).toBe(false);
      expect(result.output).toContain('Invalid command payload');
    });

    it('should execute Java command using argument-safe process args', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);

      jest.spyOn(service as any, 'findContainerId').mockResolvedValue('container123');
      jest.spyOn(service as any, 'getServerEdition').mockResolvedValue('JAVA');
      const executeProcessSpy = jest.spyOn(service as any, 'executeProcess').mockResolvedValue({
        stdout: 'Done',
        stderr: '',
        exitCode: 0,
      });

      const result = await service.executeCommand('myserver', 'say hello world', '25575', 'secret');

      expect(result.success).toBe(true);
      expect(executeProcessSpy).toHaveBeenCalledWith(
        'docker',
        ['exec', 'container123', 'rcon-cli', '--port', '25575', '--password', 'secret', 'say', 'hello', 'world'],
      );
    });

    it('should normalize command before execution by trimming and removing control chars', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);

      jest.spyOn(service as any, 'findContainerId').mockResolvedValue('container123');
      jest.spyOn(service as any, 'getServerEdition').mockResolvedValue('JAVA');
      const executeProcessSpy = jest.spyOn(service as any, 'executeProcess').mockResolvedValue({
        stdout: 'ok',
        stderr: '',
        exitCode: 0,
      });

      await service.executeCommand('myserver', ' \u001b[32msay hello\u001b[0m\u0007 ', '25575');

      expect(executeProcessSpy).toHaveBeenCalledWith(
        'docker',
        ['exec', 'container123', 'rcon-cli', '--port', '25575', 'say', 'hello'],
      );
    });

    it('should strip ANSI escape codes from command output', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);

      jest.spyOn(service as any, 'findContainerId').mockResolvedValue('container123');
      jest.spyOn(service as any, 'getServerEdition').mockResolvedValue('JAVA');
      jest.spyOn(service as any, 'executeProcess').mockResolvedValue({
        stdout: '\u001b[32mOK\u001b[0m',
        stderr: '',
        exitCode: 0,
      });

      const result = await service.executeCommand('myserver', 'list', '25575');

      expect(result.success).toBe(true);
      expect(result.output).toBe('OK');
    });

    it('should send gamerule command as separate rcon args', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);

      jest.spyOn(service as any, 'findContainerId').mockResolvedValue('container123');
      jest.spyOn(service as any, 'getServerEdition').mockResolvedValue('JAVA');
      const executeProcessSpy = jest.spyOn(service as any, 'executeProcess').mockResolvedValue({
        stdout: 'Game rule has been updated',
        stderr: '',
        exitCode: 0,
      });

      const result = await service.executeCommand('myserver', 'gamerule keepInventory true', '25575');

      expect(result.success).toBe(true);
      expect(executeProcessSpy).toHaveBeenCalledWith(
        'docker',
        ['exec', 'container123', 'rcon-cli', '--port', '25575', 'gamerule', 'keepInventory', 'true'],
      );
    });

    it('should fallback to single-arg command style when tokenized style is rejected', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);

      jest.spyOn(service as any, 'findContainerId').mockResolvedValue('container123');
      jest.spyOn(service as any, 'getServerEdition').mockResolvedValue('JAVA');
      const executeProcessSpy = jest
        .spyOn(service as any, 'executeProcess')
        .mockResolvedValueOnce({
          stdout: 'Incorrect argument for commandgamerule keepInventory true<--[HERE]',
          stderr: '',
          exitCode: 0,
        })
        .mockResolvedValueOnce({
          stdout: 'Game rule has been updated',
          stderr: '',
          exitCode: 0,
        });

      const result = await service.executeCommand('myserver', 'gamerule keepInventory true', '25575');

      expect(result.success).toBe(true);
      expect(executeProcessSpy).toHaveBeenNthCalledWith(1, 'docker', [
        'exec',
        'container123',
        'rcon-cli',
        '--port',
        '25575',
        'gamerule',
        'keepInventory',
        'true',
      ]);
      expect(executeProcessSpy).toHaveBeenNthCalledWith(2, 'docker', [
        'exec',
        'container123',
        'rcon-cli',
        '--port',
        '25575',
        'gamerule keepInventory true',
      ]);
    });

    it('should mark brigadier syntax output as failure', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);

      jest.spyOn(service as any, 'findContainerId').mockResolvedValue('container123');
      jest.spyOn(service as any, 'getServerEdition').mockResolvedValue('JAVA');
      jest.spyOn(service as any, 'executeProcess').mockResolvedValue({
        stdout: 'Unknown or incomplete command, see below for error',
        stderr: '',
        exitCode: 0,
      });

      const result = await service.executeCommand('myserver', 'gamerule keepInventory true', '25575');

      expect(result.success).toBe(false);
      expect(result.output).toContain('Execution failed');
    });

    it('should retry gamerule with snake_case when camelCase is rejected', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);

      jest.spyOn(service as any, 'findContainerId').mockResolvedValue('container123');
      jest.spyOn(service as any, 'getServerEdition').mockResolvedValue('JAVA');
      const executeProcessSpy = jest
        .spyOn(service as any, 'executeProcess')
        .mockResolvedValueOnce({
          stdout: 'Incorrect argument for commandgamerule keepInventory true<--[HERE]',
          stderr: '',
          exitCode: 0,
        })
        .mockResolvedValueOnce({
          stdout: 'Unknown or incomplete command, see below for error',
          stderr: '',
          exitCode: 0,
        })
        .mockResolvedValueOnce({
          stdout: 'Game rule has been updated',
          stderr: '',
          exitCode: 0,
        });

      const result = await service.executeCommand('myserver', 'gamerule keepInventory true', '25575');

      expect(result.success).toBe(true);
      expect(executeProcessSpy).toHaveBeenNthCalledWith(3, 'docker', [
        'exec',
        'container123',
        'rcon-cli',
        '--port',
        '25575',
        'gamerule',
        'keep_inventory',
        'true',
      ]);
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

  describe('getServerProxyHostname', () => {
    it('should read custom hostname from object-style labels', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as any).mockResolvedValue(`services:\n  mc:\n    labels:\n      minepanel.proxy.hostname: crossplay\n`);

      const result = await (service as any).getServerProxyHostname('myserver', 'example.com');

      expect(result).toBe('crossplay');
    });

    it('should return null when object-style labels disable proxy', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as any).mockResolvedValue(`services:\n  mc:\n    labels:\n      minepanel.proxy.enabled: 'false'\n`);

      const result = await (service as any).getServerProxyHostname('myserver', 'example.com');

      expect(result).toBeNull();
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
       
      (fs.readFile as any).mockResolvedValue(JSON.stringify(mockWhitelist));

      const result = await service.getWhitelist('myserver');

      expect(result).toEqual(mockWhitelist);
    });
  });
  describe('getServerRuntimeStats', () => {
    // Frozen so the uptime assertion cannot straddle a second between the stub and the read.
    const NOW = 1_700_000_000_000;

    const freezeClock = () => {
      jest.spyOn(Date, 'now').mockReturnValue(NOW);
    };

    // jest is not configured with restoreMocks, and clearAllMocks does not undo a spy:
    // without this the frozen clock would leak into every later test in this file.
    afterEach(() => {
      jest.restoreAllMocks();
    });

    const stubRunningServer = (probe: unknown) => {
      jest.spyOn(service, 'getServerStatus').mockResolvedValue('running');
      jest.spyOn(service, 'getServerResources').mockResolvedValue({
        status: 'running',
        cpuUsage: '25.00%',
        memoryUsage: '1GiB',
        memoryLimit: '4GiB',
      } as never);
      jest.spyOn(service as any, 'getServerLimits').mockResolvedValue({ cpuLimit: '2', memoryLimit: '4G' });
      jest.spyOn(service as any, 'findContainerId').mockResolvedValue('container123');
      jest.spyOn(service as any, 'runMinecraftStatusProbe').mockResolvedValue(probe);
      jest.spyOn(service as any, 'getContainersStartedAt').mockResolvedValue({ container123: NOW - 120_000 });
    };

    it('reports players and version when the game answers', async () => {
      freezeClock();
      stubRunningServer({ playersOnline: 3, playersMax: 10, version: '1.21.4' });

      const stats = await service.getServerRuntimeStats('myserver');

      expect(stats.playersOnline).toBe(3);
      expect(stats.playersMax).toBe(10);
      expect(stats.version).toBe('1.21.4');
      expect(stats.gameReachable).toBe(true);
      expect(stats.uptimeSeconds).toBe(120);
      expect(stats.cpuUsage).toBe('25.00%');
    });

    it('keeps player count null when the probe fails on a running server', async () => {
      stubRunningServer(null);

      const stats = await service.getServerRuntimeStats('myserver');

      expect(stats.playersOnline).toBeNull();
      expect(stats.version).toBeNull();
      expect(stats.gameReachable).toBe(false);
      // maxPlayers still comes from server.json so the UI can render "- / 20".
      expect(stats.playersMax).toBe(20);
    });

    it('returns no game stats and skips the probe for a stopped server', async () => {
      jest.spyOn(service, 'getServerStatus').mockResolvedValue('stopped');
      jest.spyOn(service as any, 'getServerLimits').mockResolvedValue({ cpuLimit: '2', memoryLimit: '4G' });
      jest.spyOn(service as any, 'findContainerId').mockResolvedValue('');
      const probe = jest.spyOn(service as any, 'runMinecraftStatusProbe');

      const stats = await service.getServerRuntimeStats('myserver');

      expect(stats.status).toBe('stopped');
      expect(stats.playersOnline).toBeNull();
      expect(stats.playersMax).toBeNull();
      expect(stats.uptimeSeconds).toBeNull();
      expect(stats.gameReachable).toBe(false);
      expect(probe).not.toHaveBeenCalled();
    });

    it('runs a single probe for concurrent callers of the same server', async () => {
      stubRunningServer({ playersOnline: 1, playersMax: 10, version: '1.21.4' });
      const probe = jest.spyOn(service as any, 'runMinecraftStatusProbe');

      await Promise.all([service.getServerRuntimeStats('myserver'), service.getServerRuntimeStats('myserver')]);
      await service.getServerRuntimeStats('myserver');

      expect(probe).toHaveBeenCalledTimes(1);
    });

    it('returns not_found for an invalid server id', async () => {
      const stats = await service.getServerRuntimeStats('../hack');

      expect(stats.status).toBe('not_found');
      expect(stats.gameReachable).toBe(false);
    });
  });
});
