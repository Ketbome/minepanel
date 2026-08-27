import { Test, TestingModule } from '@nestjs/testing';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
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
  let mockInstanceSettings: any;
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
      listAvailableWorlds: jest.fn(),
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
      getCfApiKey: jest.fn(async () => ''),
    };

    const mockProxyService = {
      generateRoutesFile: jest.fn(),
      clearRoutesFile: jest.fn(),
      getProxySettings: jest.fn().mockResolvedValue({ enabled: false, baseDomain: null }),
      getServerHostname: jest.fn(),
    };

    mockInstanceSettings = {
      getProxy: jest.fn().mockResolvedValue({ enabled: false, baseDomain: null }),
      getNetwork: jest.fn().mockResolvedValue({ publicIp: null, lanIp: null }),
      getJavaServerDefaults: jest.fn().mockResolvedValue(null),
      setProxy: jest.fn().mockResolvedValue({ enabled: false, baseDomain: null }),
      setNetwork: jest.fn().mockResolvedValue({ publicIp: null, lanIp: null }),
      setJavaServerDefaults: jest.fn().mockResolvedValue(undefined),
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
      canUsePermission: jest.fn(() => false),
    };

    const mockAuditLogService = {
      record: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServerManagementController],
      providers: [
        { provide: InstanceSettingsService, useValue: mockInstanceSettings },
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
      mockInstanceSettings.getJavaServerDefaults.mockResolvedValue({
        onlineMode: false,
        maxMemory: '3G',
        cpuLimit: '1',
        ignoredField: 'ignored',
      });
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

  describe('updateServer', () => {
    const mockReq = { user: { userId: 1 } };
    const persistedConfig = {
      id: 'victim',
      serverName: 'victim',
      dockerVolumes: './mc-data:/data\n./modpacks:/modpacks:ro',
      uid: '1000',
      gid: '1000',
      envVars: '',
      dockerImage: 'latest',
    };

    beforeEach(() => {
      (controller as any).getCurrentUser = jest.fn().mockResolvedValue({
        id: 1,
        role: 'USER',
        permissions: { accessAllServers: false },
        serverAccess: ['victim'],
      });
      settingsService.getSettings.mockResolvedValue({ preferences: {} } as any);
      dockerComposeService.getServerConfig.mockResolvedValue(persistedConfig as any);
      dockerComposeService.updateServerConfig.mockResolvedValue(persistedConfig as any);
    });

    it('should reject host bind mounts from a server-scoped user', async () => {
      await expect(
        controller.updateServer(mockReq, 'victim', {
          dockerVolumes: '/:/host-root\n/var/run/docker.sock:/var/run/docker.sock',
          uid: '0',
          gid: '0',
        } as any),
      ).rejects.toThrow(ForbiddenException);

      expect(dockerComposeService.updateServerConfig).not.toHaveBeenCalled();
    });

    it('should reject relative volume sources that escape the server directory', async () => {
      await expect(
        controller.updateServer(mockReq, 'victim', { dockerVolumes: './../../:/host-root' } as any),
      ).rejects.toThrow(ForbiddenException);

      expect(dockerComposeService.updateServerConfig).not.toHaveBeenCalled();
    });

    it('should allow a full-form save when advanced fields are unchanged', async () => {
      await controller.updateServer(mockReq, 'victim', {
        ...persistedConfig,
        serverName: 'renamed',
      } as any);

      expect(dockerComposeService.updateServerConfig).toHaveBeenCalledWith(
        'victim',
        expect.objectContaining({ serverName: 'renamed' }),
        false,
      );
    });

    it('should let an admin change advanced fields', async () => {
      (controller as any).getCurrentUser = jest.fn().mockResolvedValue({ id: 2, role: 'ADMIN' });
      accessControlService.isAdmin.mockReturnValue(true);

      await controller.updateServer(mockReq, 'victim', {
        dockerVolumes: '/network-disk/shared:/data/shared',
      } as any);

      expect(dockerComposeService.updateServerConfig).toHaveBeenCalled();
    });
  });

  describe('createServer host mounts', () => {
    const mockReq = { user: { userId: 1 } };

    beforeEach(() => {
      (controller as any).getCurrentUser = jest.fn().mockResolvedValue({
        id: 1,
        role: 'USER',
        permissions: { accessAllServers: true },
        serverAccess: [],
      });
      settingsService.getSettings.mockResolvedValue({ preferences: {} } as any);
      dockerComposeService.createServer.mockResolvedValue({ id: 'demo' } as any);
    });

    it('should reject a non-admin creating a server with a host bind mount', async () => {
      await expect(
        controller.createServer(mockReq, { id: 'demo', edition: 'JAVA', dockerVolumes: '/:/host-root' } as any),
      ).rejects.toThrow(ForbiddenException);

      expect(dockerComposeService.createServer).not.toHaveBeenCalled();
    });

    it.each([
      ['uid', { uid: '0' }],
      ['gid', { gid: '0' }],
      ['dockerImage', { dockerImage: 'attacker/evil:latest' }],
      ['dockerLabels', { dockerLabels: 'traefik.enable=true' }],
      ['paperDownloadUrl', { paperDownloadUrl: 'https://attacker.invalid/evil.jar' }],
      ['fabricLauncherUrl', { fabricLauncherUrl: 'https://attacker.invalid/evil.jar' }],
    ])('should reject a non-admin creating a server with %s', async (_field, overrides) => {
      await expect(
        controller.createServer(mockReq, { id: 'demo', edition: 'JAVA', ...overrides } as any),
      ).rejects.toThrow(ForbiddenException);

      expect(dockerComposeService.createServer).not.toHaveBeenCalled();
    });

    it('should still allow template envVars and extraPorts', async () => {
      await controller.createServer(mockReq, {
        id: 'demo',
        edition: 'JAVA',
        envVars: 'PLUGINS=https://download.geysermc.org/v2/projects/geyser/versions/latest/builds/latest/downloads/spigot',
        extraPorts: ['19132:19132/udp'],
      } as any);

      expect(dockerComposeService.createServer).toHaveBeenCalled();
    });

    it('should allow the default relative volumes', async () => {
      await controller.createServer(mockReq, {
        id: 'demo',
        edition: 'JAVA',
        dockerVolumes: './mc-data:/data\n./modpacks:/modpacks:ro',
      } as any);

      expect(dockerComposeService.createServer).toHaveBeenCalled();
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
  describe('selectServerWorld', () => {
    const mockReq = { user: { userId: 1 } };

    beforeEach(() => {
      dockerComposeService.getServerConfig.mockResolvedValue({ id: 'java', edition: 'JAVA', worldSource: 'Oneblock.zip', worldScope: 'global', worldLevelName: 'world' } as any);
      dockerComposeService.updateServerConfig.mockResolvedValue({ id: 'java', worldSource: '' } as any);
      serverService.getServerStatus.mockResolvedValue('stopped');
    });

    it('clears the selection when worldSource is empty', async () => {
      const result = await controller.selectServerWorld(mockReq, 'java', {
        worldSource: '',
        worldLevelName: 'world',
        forceWorldCopy: true,
        restartIfRunning: false,
      } as any);

      expect(result.success).toBe(true);
      // Nothing to look up: an empty source is a removal, not a pick.
      expect(serverService.listAvailableWorlds).not.toHaveBeenCalled();
      expect(dockerComposeService.updateServerConfig).toHaveBeenCalledWith(
        'java',
        expect.objectContaining({ worldSource: '', worldScope: 'local', forceWorldCopy: false }),
        false,
      );
    });

    it('treats a whitespace-only worldSource as a removal', async () => {
      await controller.selectServerWorld(mockReq, 'java', { worldSource: '   ', worldLevelName: 'world', restartIfRunning: false } as any);

      expect(serverService.listAvailableWorlds).not.toHaveBeenCalled();
      expect(dockerComposeService.updateServerConfig).toHaveBeenCalledWith('java', expect.objectContaining({ worldSource: '' }), false);
    });

    it('still rejects a non-empty world that does not exist', async () => {
      serverService.listAvailableWorlds.mockResolvedValue([] as any);

      await expect(controller.selectServerWorld(mockReq, 'java', { worldSource: 'ghost.zip', worldLevelName: 'world', restartIfRunning: false } as any)).rejects.toThrow(BadRequestException);
    });

    it('keeps persisting a valid pick', async () => {
      serverService.listAvailableWorlds.mockResolvedValue([{ source: 'One Chunk.zip', scope: 'local' }] as any);

      await controller.selectServerWorld(mockReq, 'java', {
        worldSource: 'One Chunk.zip',
        worldScope: 'local',
        worldLevelName: 'chunk',
        forceWorldCopy: true,
        restartIfRunning: false,
      } as any);

      expect(dockerComposeService.updateServerConfig).toHaveBeenCalledWith(
        'java',
        expect.objectContaining({ worldSource: 'One Chunk.zip', worldScope: 'local', worldLevelName: 'chunk', forceWorldCopy: true }),
        false,
      );
    });
  });
});
