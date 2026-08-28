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
  const mockReq = { user: { userId: 1 } };
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

      const result = await controller.getAllServersStatus(mockReq);

      expect(result).toEqual(mockStatus);
    });
  });

  describe('getServerStatus', () => {
    it('should return status of a specific server', async () => {
      serverService.getServerStatus.mockResolvedValue('running');

      const result = await controller.getServerStatus(mockReq, 'myserver');

      expect(result).toEqual({ status: 'running' });
    });
  });

  describe('startServer', () => {
    it('should start server and return success message', async () => {
      serverService.startServer.mockResolvedValue(true);

      const result = await controller.startServer(mockReq, 'myserver');

      expect(result.success).toBe(true);
      expect(result.message).toContain('started');
    });
  });

  describe('stopServer', () => {
    it('should stop server and return success message', async () => {
      serverService.stopServer.mockResolvedValue(true);

      const result = await controller.stopServer(mockReq, 'myserver');

      expect(result.success).toBe(true);
      expect(result.message).toContain('stopped');
    });
  });

  describe('restartServer', () => {
    it('should restart server and return success message', async () => {
      serverService.restartServer.mockResolvedValue(true);

      const result = await controller.restartServer(mockReq, 'myserver');

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

      const result = await controller.getServerLogs(mockReq, 'myserver', 100);

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
  describe('remaining routes', () => {
    const req = { user: { userId: 1, username: 'admin' } };
    let mgmt: any;
    let compose: any;
    let proxy: any;

    beforeEach(() => {
      mgmt = serverService as any;
      compose = dockerComposeService as any;
      proxy = (controller as any).proxyService;
      mgmt.getAllServersRuntimeStats = jest.fn().mockResolvedValue({ a: { status: 'running' }, b: { status: 'stopped' } });
      mgmt.getServerRuntimeStats = jest.fn().mockResolvedValue({ status: 'running' });
      mgmt.getBackupSnapshots = jest.fn().mockResolvedValue({ success: true, snapshots: [] });
      mgmt.getServerLogsStream = jest.fn().mockResolvedValue('stream');
      mgmt.getServerLogsSince = jest.fn().mockResolvedValue('since');
      mgmt.forceStopServer = jest.fn().mockResolvedValue(true);
      compose.getServerIndex = jest.fn().mockResolvedValue([
        { id: 'a', edition: 'JAVA', proxyHostname: 'play' },
        { id: 'b', edition: 'BEDROCK' },
        { id: 'c', edition: 'JAVA', useProxy: false },
      ]);
      compose.remapVolumesToServer = jest.fn().mockReturnValue('./mc-data:/data');
      accessControlService.getVisibleServerIds.mockImplementation((_, ids) => ids.filter((id) => id !== 'b'));
      (controller as any).usersService.getRequiredUserById.mockResolvedValue({ id: 1, username: 'admin', role: 'USER' });
    });

    it('lists servers and stats filtered by visibility', async () => {
      const servers = await controller.getAllServers(req);
      expect(servers.map((s) => s.id)).toEqual(['a', 'c']);
      mgmt.getAllServersResources.mockResolvedValue({ a: { cpuUsage: '1%' }, b: { cpuUsage: '2%' } });
      expect(Object.keys(await controller.getAllServersResources(req))).toEqual(['a']);
      expect(Object.keys(await controller.getAllServersRuntimeStats(req))).toEqual(['a']);
    });

    it('getServer returns the config or 404', async () => {
      dockerComposeService.getServerConfig.mockResolvedValueOnce({ id: 'a' } as any);
      expect(await controller.getServer(req, 'a')).toEqual({ id: 'a' });
      dockerComposeService.getServerConfig.mockResolvedValueOnce(null);
      await expect(controller.getServer(req, 'zz')).rejects.toThrow(NotFoundException);
    });

    describe('createServer validation', () => {
      it('requires a valid id and wraps unexpected errors', async () => {
        await expect(controller.createServer(req, {} as any)).rejects.toThrow('Server ID is required');
        await expect(controller.createServer(req, { id: 'bad id' } as any)).rejects.toThrow(BadRequestException);
        dockerComposeService.createServer.mockRejectedValueOnce(new Error('disk full'));
        await expect(controller.createServer(req, { id: 'ok' } as any)).rejects.toThrow('disk full');
        dockerComposeService.createServer.mockRejectedValueOnce(new Error(''));
        await expect(controller.createServer(req, { id: 'ok' } as any)).rejects.toThrow('Failed to create server');
      });

      it('rejects admin-only settings from non-admins', async () => {
        await expect(controller.createServer(req, { id: 'ok', backupHostDir: '/nas' } as any)).rejects.toThrow(/backup host directory/);
        await expect(controller.createServer(req, { id: 'ok', uid: '0', dockerImage: 'custom/image' } as any)).rejects.toThrow(/Only admins can set these settings: dockerImage, uid/);
        await expect(controller.createServer(req, { id: 'ok', envVars: 'JVM_OPTS=-Xmx1G' } as any)).rejects.toThrow(/JVM_OPTS/);
        await expect(controller.createServer(req, { id: 'ok', envVars: 'PAPER_DOWNLOAD_URL=https://x' } as any)).rejects.toThrow(/PAPER_DOWNLOAD_URL/);
        await expect(controller.createServer(req, { id: 'ok', envVars: 'MODS=https://evil.example.com/mod.jar,http://cdn.modrinth.com/x' } as any)).rejects.toThrow(/untrusted source/);
        await expect(controller.createServer(req, { id: 'ok', envVars: 'PLUGINS=ftp://mirror/x.jar' } as any)).rejects.toThrow(/untrusted source/);
        await expect(controller.createServer(req, { id: 'ok', envVars: 'MODS=https://' } as any)).rejects.toThrow(/untrusted source/);
      });

      it('accepts trusted artifacts, version tags and admin overrides', async () => {
        dockerComposeService.createServer.mockResolvedValue({ id: 'ok' } as any);
        settingsService.getCfApiKey.mockResolvedValue('cf-key');
        expect((await controller.createServer(req, { id: 'ok', dockerImage: 'java21', envVars: 'MODS=https://cdn.modrinth.com/a.jar,sodium\nNOEQUALS\nMOTD=hi' } as any)).success).toBe(true);
        expect(dockerComposeService.createServer).toHaveBeenLastCalledWith('ok', expect.objectContaining({ cfApiKey: 'cf-key' }), false);

        accessControlService.isAdmin.mockReturnValue(true);
        expect((await controller.createServer(req, { id: 'ok', dockerVolumes: '/host:/data', uid: '0' } as any)).success).toBe(true);
      });

      it('regenerates proxy routes when the proxy is on', async () => {
        dockerComposeService.createServer.mockResolvedValue({ id: 'ok' } as any);
        proxy.getProxySettings.mockResolvedValue({ enabled: true, baseDomain: 'mc.example.com' });
        await controller.createServer(req, { id: 'ok' } as any);
        expect(proxy.generateRoutesFile).toHaveBeenCalledWith([{ id: 'a', hostname: 'play', useProxy: true }], 'mc.example.com');
      });
    });

    describe('cloneServer', () => {
      it('validates the source and clones with remapped volumes', async () => {
        dockerComposeService.getServerConfig.mockResolvedValueOnce({ id: 'a', serverExists: false } as any);
        await expect(controller.cloneServer(req, 'a', { newId: 'b' } as any)).rejects.toThrow(NotFoundException);

        dockerComposeService.getServerConfig.mockResolvedValue({ id: 'a', serverExists: true, serverName: 'Alpha', worldScope: 'local', worldSource: 'w.zip', forceWorldCopy: true, dockerVolumes: './mc-data:/data' } as any);
        dockerComposeService.createServer.mockResolvedValue({ id: 'b' } as any);
        proxy.getProxySettings.mockResolvedValue({ enabled: true, baseDomain: 'mc.example.com' });

        const result = await controller.cloneServer(req, 'a', { newId: 'b' } as any);

        expect(result).toMatchObject({ success: true, server: { id: 'b' } });
        expect(dockerComposeService.createServer).toHaveBeenCalledWith('b', expect.objectContaining({ id: 'b', serverName: 'Alpha (copy)', worldSource: '', forceWorldCopy: false, extraPorts: [], dockerVolumes: './mc-data:/data' }), true);
        expect(proxy.generateRoutesFile).toHaveBeenCalled();

        dockerComposeService.createServer.mockRejectedValueOnce(new Error('exists'));
        await expect(controller.cloneServer(req, 'a', { newId: 'b', serverName: ' Beta ' } as any)).rejects.toThrow('exists');
      });
    });

    it('regenerateAll rebuilds routes when the proxy is on', async () => {
      accessControlService.isAdmin.mockReturnValue(true);
      dockerComposeService.regenerateAllDockerCompose.mockResolvedValue({ updated: ['a'], errors: [] } as any);
      proxy.getProxySettings.mockResolvedValue({ enabled: true, baseDomain: 'mc.example.com' });
      expect(await controller.regenerateAllDockerCompose(req)).toMatchObject({ success: true, message: 'Regenerated 1 servers' });
      expect(proxy.generateRoutesFile).toHaveBeenCalled();

      accessControlService.isAdmin.mockReturnValue(false);
      await expect(controller.regenerateAllDockerCompose(req)).rejects.toThrow(ForbiddenException);
    });

    it('deleteServer regenerates routes and reports failures', async () => {
      dockerComposeService.getServerConfig.mockResolvedValue({ id: 'a' } as any);
      serverService.deleteServer.mockResolvedValueOnce(true);
      proxy.getProxySettings.mockResolvedValue({ enabled: true, baseDomain: 'mc.example.com' });
      expect((await controller.deleteServer(req, 'a')).success).toBe(true);
      expect(proxy.generateRoutesFile).toHaveBeenCalled();

      serverService.deleteServer.mockResolvedValueOnce(false);
      expect((await controller.deleteServer(req, 'a')).message).toMatch(/Failed/);
    });

    it('serves resources and runtime stats', async () => {
      dockerComposeService.getServerConfig.mockResolvedValueOnce(null);
      await expect(controller.getServerResources(req, 'a')).rejects.toThrow(NotFoundException);

      dockerComposeService.getServerConfig.mockResolvedValue({ id: 'a' } as any);
      serverService.getServerStatus.mockResolvedValueOnce('not_found');
      await expect(controller.getServerResources(req, 'a')).rejects.toThrow(NotFoundException);

      serverService.getServerStatus.mockResolvedValueOnce('stopped');
      expect(await controller.getServerResources(req, 'a')).toMatchObject({ status: 'stopped', cpuUsage: 'N/A' });

      serverService.getServerStatus.mockResolvedValueOnce('running');
      serverService.getServerResources.mockResolvedValue({ cpuUsage: '5%', memoryUsage: '1G', memoryLimit: '2G' });
      expect(await controller.getServerResources(req, 'a')).toEqual({ cpuUsage: '5%', memoryUsage: '1G', memoryLimit: '2G', status: 'running' });

      expect(await controller.getServerRuntimeStats(req, 'a')).toEqual({ status: 'running' });
      dockerComposeService.getServerConfig.mockResolvedValueOnce(null);
      await expect(controller.getServerRuntimeStats(req, 'a')).rejects.toThrow(NotFoundException);
    });

    describe('updateServer', () => {
      const current = { id: 'a', minecraftVersion: '1.20.1', dockerImage: 'java17', envVars: '' };

      it('handles missing servers and proxy regeneration', async () => {
        dockerComposeService.getServerConfig.mockResolvedValueOnce(null);
        await expect(controller.updateServer(req, 'a', {} as any)).rejects.toThrow(NotFoundException);

        dockerComposeService.getServerConfig.mockResolvedValue(current as any);
        dockerComposeService.updateServerConfig.mockResolvedValueOnce(null);
        await expect(controller.updateServer(req, 'a', {} as any)).rejects.toThrow(NotFoundException);

        dockerComposeService.updateServerConfig.mockResolvedValue({ ...current, useProxy: true } as any);
        proxy.getProxySettings.mockResolvedValue({ enabled: true, baseDomain: 'mc.example.com' });
        await controller.updateServer(req, 'a', { useProxy: true } as any);
        expect(proxy.generateRoutesFile).toHaveBeenCalled();
      });

      it('gates version changes behind changeServerVersion', async () => {
        dockerComposeService.getServerConfig.mockResolvedValue(current as any);
        dockerComposeService.updateServerConfig.mockResolvedValue(current as any);

        await expect(controller.updateServer(req, 'a', { minecraftVersion: '1.21' } as any)).rejects.toThrow(/change the server version/);

        accessControlService.canUsePermission.mockReturnValue(true);
        await controller.updateServer(req, 'a', { minecraftVersion: '1.21', dockerImage: 'java21' } as any);
        await expect(controller.updateServer(req, 'a', { dockerImage: 'custom/image' } as any)).rejects.toThrow(/dockerImage/);
      });
    });

    it('lists and selects worlds for Java servers only', async () => {
      dockerComposeService.getServerConfig.mockResolvedValueOnce(null);
      await expect(controller.getServerWorlds(req, 'a')).rejects.toThrow(NotFoundException);
      dockerComposeService.getServerConfig.mockResolvedValueOnce({ edition: 'BEDROCK' } as any);
      await expect(controller.getServerWorlds(req, 'a')).rejects.toThrow(BadRequestException);
      dockerComposeService.getServerConfig.mockResolvedValueOnce({ worldSource: 'w', worldLevelName: 'l' } as any);
      serverService.listAvailableWorlds.mockResolvedValue(['w'] as any);
      expect(await controller.getServerWorlds(req, 'a')).toEqual(['w']);
      expect(serverService.listAvailableWorlds).toHaveBeenCalledWith('a', 'w', 'l', 'local');

      dockerComposeService.getServerConfig.mockResolvedValueOnce(null);
      await expect(controller.selectServerWorld(req, 'a', { worldLevelName: 'x' } as any)).rejects.toThrow(NotFoundException);
      dockerComposeService.getServerConfig.mockResolvedValueOnce({ edition: 'BEDROCK' } as any);
      await expect(controller.selectServerWorld(req, 'a', { worldLevelName: 'x' } as any)).rejects.toThrow(/Java Edition/);
      dockerComposeService.getServerConfig.mockResolvedValue({ edition: 'JAVA' } as any);
      await expect(controller.selectServerWorld(req, 'a', { worldLevelName: '  ' } as any)).rejects.toThrow('worldLevelName is required');

      dockerComposeService.updateServerConfig.mockResolvedValueOnce(null);
      await expect(controller.selectServerWorld(req, 'a', { worldLevelName: 'x', worldSource: '' } as any)).rejects.toThrow(NotFoundException);

      dockerComposeService.updateServerConfig.mockResolvedValue({ id: 'a' } as any);
      serverService.getServerStatus.mockResolvedValue('running');
      serverService.restartServer.mockResolvedValue(true);
      expect(await controller.selectServerWorld(req, 'a', { worldLevelName: 'x', worldSource: '' } as any)).toEqual({ success: true, restarted: true, config: { id: 'a' } });
    });

    it('serves info, snapshots, status and player lists', async () => {
      serverService.getServerInfo.mockResolvedValueOnce({ exists: false, status: 'not_found' });
      await expect(controller.getServerInfo(req, 'a')).rejects.toThrow(NotFoundException);
      serverService.getServerInfo.mockResolvedValueOnce({ exists: true, status: 'running' });
      dockerComposeService.getServerConfig.mockResolvedValueOnce(null);
      expect(await controller.getServerInfo(req, 'a')).toEqual({ exists: true, status: 'running', config: undefined });

      dockerComposeService.getServerConfig.mockResolvedValueOnce({ serverExists: false } as any);
      await expect(controller.getBackupSnapshots(req, 'a')).rejects.toThrow(NotFoundException);
      dockerComposeService.getServerConfig.mockResolvedValueOnce({ serverExists: true, backupMethod: 'tar' } as any);
      await expect(controller.getBackupSnapshots(req, 'a')).rejects.toThrow(BadRequestException);
      dockerComposeService.getServerConfig.mockResolvedValueOnce({ serverExists: true, backupMethod: 'restic' } as any);
      expect(await controller.getBackupSnapshots(req, 'a')).toEqual({ success: true, snapshots: [] });

      dockerComposeService.getServerConfig.mockResolvedValueOnce(null);
      await expect(controller.clearServerData(req, 'a')).rejects.toThrow(NotFoundException);

      serverService.getServerStatus.mockResolvedValue('running');
      expect(await controller.getServerStatus(req, 'a')).toEqual({ status: 'running' });
      serverService.getOnlinePlayers.mockResolvedValue({ online: 1 } as any);
      expect(await controller.getOnlinePlayers(req, 'a', { rconPort: '25575' })).toEqual({ online: 1 });
      serverService.getWhitelist.mockResolvedValue(['w'] as any);
      serverService.getOps.mockResolvedValue(['o'] as any);
      serverService.getBannedPlayers.mockResolvedValue(['b'] as any);
      expect(await controller.getWhitelist(req, 'a')).toEqual(['w']);
      expect(await controller.getOps(req, 'a')).toEqual(['o']);
      expect(await controller.getBannedPlayers(req, 'a')).toEqual(['b']);
    });

    it('routes log requests and validates the since value', async () => {
      serverService.getServerLogs.mockResolvedValue('logs' as any);
      expect(await controller.getServerLogs(req, 'a', 20000)).toBe('logs');
      expect(serverService.getServerLogs).toHaveBeenCalledWith('a', 10000);
      expect(await controller.getServerLogs(req, 'a', undefined, '10m', 'true')).toBe('stream');
      expect(await controller.getServerLogs(req, 'a', undefined, '2026-01-01T00:00:00Z')).toBe('since');
      await expect(controller.getServerLogs(req, 'a', undefined, 'rm -rf /')).rejects.toThrow(BadRequestException);

      expect(await controller.getServerLogsStream(req, 'a')).toBe('stream');
      expect(mgmt.getServerLogsStream).toHaveBeenLastCalledWith('a', 500, undefined);
      expect(await controller.getServerLogsStream(req, 'a', 9000, '1h30m')).toBe('stream');
      expect(mgmt.getServerLogsStream).toHaveBeenLastCalledWith('a', 5000, '1h30m');
      await expect(controller.getServerLogsStream(req, 'a', 1, '$(x)')).rejects.toThrow(BadRequestException);

      expect(await controller.getServerLogsSince(req, 'a', '1700000000')).toBe('since');
      await expect(controller.getServerLogsSince(req, 'a', 'later')).rejects.toThrow(BadRequestException);
    });

    it('executes commands, force stops and audits', async () => {
      serverService.executeCommand.mockResolvedValue({ success: true, output: 'ok' });
      expect(await controller.executeCommand(req, 'a', { command: 'say hi', rconPort: '25575' } as any)).toEqual({ success: true, output: 'ok' });
      expect(accessControlService.assertUseConsole).toHaveBeenCalled();

      expect(await controller.forceStopServer(req, 'a')).toEqual({ success: true, message: 'Server force stopped successfully' });
      mgmt.forceStopServer.mockResolvedValueOnce(false);
      expect((await controller.forceStopServer(req, 'a')).success).toBe(false);
      serverService.startServer.mockResolvedValueOnce(false);
      expect((await controller.startServer(req, 'a')).success).toBe(false);
      serverService.stopServer.mockResolvedValueOnce(false);
      expect((await controller.stopServer(req, 'a')).success).toBe(false);
      serverService.restartServer.mockResolvedValueOnce(false);
      expect((await controller.restartServer(req, 'a')).success).toBe(false);
    });
  });
});
