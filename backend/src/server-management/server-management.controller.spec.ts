import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ServerManagementController } from './server-management.controller';
import { ServerManagementService } from './server-management.service';
import { DockerComposeService } from '../docker-compose/docker-compose.service';
import { SettingsService } from '../users/services/settings.service';
import { ProxyService } from '../proxy/proxy.service';
import { BedrockAddonsService } from '../bedrock-addons/bedrock-addons.service';
import { UsersService } from '../users/services/users.service';
import { AccessControlService } from '../users/services/access-control.service';
import { AuditLogService } from '../users/services/audit-log.service';

describe('ServerManagementController', () => {
  let controller: ServerManagementController;
  let serverService: jest.Mocked<ServerManagementService>;
  let dockerComposeService: jest.Mocked<DockerComposeService>;
  let settingsService: jest.Mocked<SettingsService>;
  let bedrockAddonsService: jest.Mocked<BedrockAddonsService>;
  let accessControlService: jest.Mocked<AccessControlService>;

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
      clearRoutesFile: jest.fn(),
      getProxySettings: jest.fn(),
      getServerHostname: jest.fn(),
    };

    const mockBedrockAddonsService = {
      clearAddonRuntimeState: jest.fn(),
    };

    const mockUsersService = {
      getRequiredUserById: jest.fn(),
    };

    const mockAccessControlService = {
      assertCreateServers: jest.fn(),
      assertServerAccess: jest.fn(),
      assertViewLogs: jest.fn(),
      assertUseConsole: jest.fn(),
      getVisibleServerIds: jest.fn((_, ids) => ids),
      isAdmin: jest.fn(() => false),
    };

    const mockAuditLogService = {
      record: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServerManagementController],
      providers: [
        { provide: ServerManagementService, useValue: mockServerService },
        { provide: DockerComposeService, useValue: mockDockerComposeService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: ProxyService, useValue: mockProxyService },
        { provide: BedrockAddonsService, useValue: mockBedrockAddonsService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: AccessControlService, useValue: mockAccessControlService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    controller = module.get<ServerManagementController>(ServerManagementController);
    serverService = module.get(ServerManagementService);
    dockerComposeService = module.get(DockerComposeService);
    settingsService = module.get(SettingsService);
    bedrockAddonsService = module.get(BedrockAddonsService);
    accessControlService = module.get(AccessControlService);
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

  describe('clearServerData', () => {
    const mockReq = { user: { userId: 1 } };

    it('should clear addon runtime state for BEDROCK servers', async () => {
      dockerComposeService.getServerConfig.mockResolvedValue({ id: 'bed', edition: 'BEDROCK' } as any);
      dockerComposeService.updateServerConfig.mockResolvedValue({ id: 'bed' } as any);
      settingsService.getSettings.mockResolvedValue({ preferences: {} } as any);
      serverService.clearServerData.mockResolvedValue(true);
      bedrockAddonsService.clearAddonRuntimeState.mockResolvedValue({ success: true, changed: true } as any);

      const result = await controller.clearServerData(mockReq, 'bed');

      expect(result.success).toBe(true);
      expect(bedrockAddonsService.clearAddonRuntimeState).toHaveBeenCalledWith('bed');
    });

    it('should not clear addon runtime state for JAVA servers', async () => {
      dockerComposeService.getServerConfig.mockResolvedValue({ id: 'java', edition: 'JAVA' } as any);
      dockerComposeService.updateServerConfig.mockResolvedValue({ id: 'java' } as any);
      settingsService.getSettings.mockResolvedValue({ preferences: {} } as any);
      serverService.clearServerData.mockResolvedValue(true);

      const result = await controller.clearServerData(mockReq, 'java');

      expect(result.success).toBe(true);
      expect(bedrockAddonsService.clearAddonRuntimeState).not.toHaveBeenCalled();
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
      settingsService.getSettings.mockResolvedValue({ preferences: {} } as any);

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

  describe('createServer', () => {
    const mockReq = { user: { userId: 1 } };

    beforeEach(() => {
      (controller as any).getCurrentUser = jest.fn().mockResolvedValue({
        id: 1,
        role: 'USER',
        permissions: { accessAllServers: true },
        serverAccess: [],
      });
    });

    it('should apply global java defaults when creating JAVA server', async () => {
      settingsService.getSettings.mockResolvedValue({
        preferences: {
          proxyEnabled: false,
          proxyBaseDomain: null,
          javaServerDefaults: {
            onlineMode: false,
            maxMemory: '3G',
            cpuLimit: '1',
            ignoredField: 'ignored',
          },
        },
      } as any);
      dockerComposeService.createServer.mockResolvedValue({ id: 'demo' } as any);

      await controller.createServer(mockReq, { id: 'demo', edition: 'JAVA', maxMemory: '4G' } as any);

      expect(dockerComposeService.createServer).toHaveBeenCalledWith(
        'demo',
        expect.objectContaining({
          id: 'demo',
          edition: 'JAVA',
          onlineMode: false,
          maxMemory: '4G',
          cpuLimit: '1',
        }),
        false,
      );
      const javaPayload = dockerComposeService.createServer.mock.calls[0][1] as Record<string, unknown>;
      expect(javaPayload.ignoredField).toBeUndefined();
    });

    it('should not apply java defaults for BEDROCK server', async () => {
      settingsService.getSettings.mockResolvedValue({
        preferences: {
          proxyEnabled: false,
          proxyBaseDomain: null,
          javaServerDefaults: {
            onlineMode: false,
          },
        },
      } as any);
      dockerComposeService.createServer.mockResolvedValue({ id: 'bedrock-1' } as any);

      await controller.createServer(mockReq, { id: 'bedrock-1', edition: 'BEDROCK' } as any);

      const bedrockPayload = dockerComposeService.createServer.mock.calls[0][1] as Record<string, unknown>;
      expect(bedrockPayload.onlineMode).toBeUndefined();
    });

    it('should enforce create server permission before creating', async () => {
      settingsService.getSettings.mockResolvedValue({ preferences: {} } as any);
      dockerComposeService.createServer.mockResolvedValue({ id: 'restricted' } as any);

      await controller.createServer(mockReq, { id: 'restricted', edition: 'JAVA' } as any);

      expect(accessControlService.assertCreateServers).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1 }),
      );
    });
  });

  describe('regenerateAllDockerCompose', () => {
    it('should clear proxy routes when global proxy is disabled', async () => {
      (controller as any).getCurrentUser = jest.fn().mockResolvedValue({ role: 'ADMIN' });
      accessControlService.isAdmin.mockReturnValue(true);
      settingsService.getSettings.mockResolvedValue({ preferences: { proxyEnabled: false, proxyBaseDomain: null } } as any);
      dockerComposeService.regenerateAllDockerCompose.mockResolvedValue({ updated: [], errors: [] });

      await controller.regenerateAllDockerCompose({ user: { userId: 1 } });

      const proxyService = (controller as any).proxyService;
      expect(proxyService.clearRoutesFile).toHaveBeenCalled();
      expect(proxyService.generateRoutesFile).not.toHaveBeenCalled();
    });
  });
});
