import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ServerManagementController } from './server-management.controller';
import { ServerManagementService } from './server-management.service';
import { DockerComposeService } from '../docker-compose/docker-compose.service';
import { SettingsService } from '../users/services/settings.service';
import { ProxyService } from '../proxy/proxy.service';

describe('ServerManagementController', () => {
  let controller: ServerManagementController;
  let serverService: jest.Mocked<ServerManagementService>;
  let dockerComposeService: jest.Mocked<DockerComposeService>;

  beforeEach(async () => {
    const mockServerService = {
      getServerStatus: jest.fn(),
      getAllServersStatus: jest.fn(),
      getServerInfo: jest.fn(),
      startServer: jest.fn(),
      stopServer: jest.fn(),
      restartServer: jest.fn(),
      deleteServer: jest.fn(),
      getServerLogs: jest.fn(),
      executeCommand: jest.fn(),
      getServerResources: jest.fn(),
      getAllServersResources: jest.fn(),
      getOnlinePlayers: jest.fn(),
      getWhitelist: jest.fn(),
      getOps: jest.fn(),
      getBannedPlayers: jest.fn(),
      clearServerData: jest.fn(),
    };

    const mockDockerComposeService = {
      createServer: jest.fn(),
      getServerConfig: jest.fn(),
      updateServerConfig: jest.fn(),
      getAllServerConfigs: jest.fn(),
      regenerateAllDockerCompose: jest.fn(),
    };

    const mockSettingsService = {
      getSettings: jest.fn(),
    };

    const mockProxyService = {
      generateRoutesFile: jest.fn(),
      getProxySettings: jest.fn(),
      getServerHostname: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServerManagementController],
      providers: [
        { provide: ServerManagementService, useValue: mockServerService },
        { provide: DockerComposeService, useValue: mockDockerComposeService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: ProxyService, useValue: mockProxyService },
      ],
    }).compile();

    controller = module.get<ServerManagementController>(ServerManagementController);
    serverService = module.get(ServerManagementService);
    dockerComposeService = module.get(DockerComposeService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllServersStatus', () => {
    it('should return status of all servers', async () => {
      const mockStatus = {
        server1: 'running',
        server2: 'stopped',
      };
      serverService.getAllServersStatus.mockResolvedValue(mockStatus as any);

      const result = await controller.getAllServersStatus();

      expect(result).toEqual(mockStatus);
    });
  });

  describe('getServerStatus', () => {
    it('should return status of a specific server', async () => {
      serverService.getServerStatus.mockResolvedValue('running');

      const result = await controller.getServerStatus('myserver');

      expect(result).toEqual({ status: 'running' });
    });
  });

  describe('startServer', () => {
    it('should start server and return success message', async () => {
      serverService.startServer.mockResolvedValue(true);

      const result = await controller.startServer('myserver');

      expect(result.success).toBe(true);
      expect(result.message).toContain('started');
    });
  });

  describe('stopServer', () => {
    it('should stop server and return success message', async () => {
      serverService.stopServer.mockResolvedValue(true);

      const result = await controller.stopServer('myserver');

      expect(result.success).toBe(true);
      expect(result.message).toContain('stopped');
    });
  });

  describe('restartServer', () => {
    it('should restart server and return success message', async () => {
      serverService.restartServer.mockResolvedValue(true);

      const result = await controller.restartServer('myserver');

      expect(result.success).toBe(true);
      expect(result.message).toContain('restarted');
    });
  });

  describe('deleteServer', () => {
    const mockReq = { user: { userId: 1 } };

    it('should throw NotFoundException when server does not exist', async () => {
      dockerComposeService.getServerConfig.mockResolvedValue(null);

      await expect(controller.deleteServer(mockReq, 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should delete server when it exists', async () => {
      dockerComposeService.getServerConfig.mockResolvedValue({ id: 'myserver' } as any);
      serverService.deleteServer.mockResolvedValue(true);

      const result = await controller.deleteServer(mockReq, 'myserver');

      expect(result.success).toBe(true);
    });
  });

  describe('getServerLogs', () => {
    it('should return server logs', async () => {
      const mockLogs = {
        logs: '[INFO] Server started',
        hasErrors: false,
        lastUpdate: new Date(),
        status: 'running',
      };
      serverService.getServerLogs.mockResolvedValue(mockLogs as any);

      const result = await controller.getServerLogs('myserver', 100);

      expect(result).toEqual(mockLogs);
    });
  });
});
