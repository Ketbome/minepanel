import { Test, TestingModule } from '@nestjs/testing';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ServerManagementController } from './server-management.controller';
import { ServerManagementService } from './server-management.service';
import { DockerComposeService } from '../docker-compose/docker-compose.service';
import { SettingsService } from '../users/services/settings.service';
import { ProxyService } from '../proxy/proxy.service';
import { ProxyRouterService } from '../proxy/proxy-router.service';
import { VelocityRuntimeService } from '../proxy/velocity-runtime.service';
import { BedrockAddonsService } from '../bedrock-addons/bedrock-addons.service';
import { UsersService } from '../users/services/users.service';
import { AccessControlService } from '../users/services/access-control.service';
import { AuditLogService } from '../users/services/audit-log.service';
import { VanillaTweaksService } from 'src/vanilla-tweaks/vanilla-tweaks.service';


const vanillaTweaks = { lookup: jest.fn() };
describe('ServerManagementController', () => {
  let controller: ServerManagementController;
  const mockReq = { user: { userId: 1 } };
  let serverService: jest.Mocked<ServerManagementService>;
  let dockerComposeService: jest.Mocked<DockerComposeService>;
  let settingsService: jest.Mocked<SettingsService>;
  let mockInstanceSettings: any;
  let bedrockAddonsService: jest.Mocked<BedrockAddonsService>;
  let accessControlService: jest.Mocked<AccessControlService>;
  let auditLogService: { record: jest.Mock };
  let velocity: { syncConfig: jest.Mock };
  let proxyRouter: { syncRoutes: jest.Mock };

  const useEdge = (mode: 'mc-router' | 'velocity', baseDomain: string | null = 'mc.example.com') => {
    mockInstanceSettings.getEdge.mockResolvedValue({ enabled: true, mode, baseDomain });
    mockInstanceSettings.getComposeEdge.mockResolvedValue(mode === 'velocity' ? 'velocity' : true);
  };

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
      getGamerules: jest.fn(),
      getServerResources: jest.fn(),
      getAllServersResources: jest.fn(),
      getOnlinePlayers: jest.fn(),
      getWhitelist: jest.fn(),
      getOps: jest.fn(),
      getBannedPlayers: jest.fn(),
      clearServerData: jest.fn(),
      listAvailableWorlds: jest.fn(),
      updateModWatch: jest.fn(),
      updateSpawnPoint: jest.fn(),
      updateTickCommand: jest.fn(),
    };

    const mockDockerComposeService = {
      createServer: jest.fn(),
      getServerConfig: jest.fn(),
      updateServerConfig: jest.fn(),
      getAllServerConfigs: jest.fn(),
      regenerateAllDockerCompose: jest.fn(),
      getServerIndex: jest.fn().mockResolvedValue([]),
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
      generateHostname: jest.fn((id: string, base: string, custom?: string) => (custom ? `${custom}.${base}` : `${id}.${base}`)),
    };

    mockInstanceSettings = {
      getProxy: jest.fn().mockResolvedValue({ enabled: false, baseDomain: null }),
      getEdge: jest.fn().mockResolvedValue({ enabled: false, mode: 'mc-router', baseDomain: null }),
      getComposeEdge: jest.fn().mockResolvedValue(false),
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

    auditLogService = {
      record: jest.fn(),
    };

    vanillaTweaks.lookup.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServerManagementController],
      providers: [
        { provide: InstanceSettingsService, useValue: mockInstanceSettings },
        { provide: ServerManagementService, useValue: mockServerService },
        { provide: DockerComposeService, useValue: mockDockerComposeService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: ProxyService, useValue: mockProxyService },
        { provide: VelocityRuntimeService, useValue: (velocity = { syncConfig: jest.fn() }) },
        { provide: ProxyRouterService, useValue: (proxyRouter = { syncRoutes: jest.fn() }) },
        { provide: BedrockAddonsService, useValue: mockBedrockAddonsService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: AccessControlService, useValue: mockAccessControlService },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: VanillaTweaksService, useValue: vanillaTweaks },
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

    it('should refuse a proxy hostname that another server already routes', async () => {
      useEdge('mc-router');
      dockerComposeService.getServerIndex = jest.fn().mockResolvedValue([{ id: 'victim' }, { id: 'lobby', edition: 'JAVA' }, { id: 'old', useProxy: false, proxyHostname: 'free' }]) as any;

      await expect(controller.updateServer(mockReq, 'victim', { proxyHostname: 'lobby' } as any)).rejects.toThrow(ConflictException);
      await controller.updateServer(mockReq, 'victim', { proxyHostname: 'free' } as any);
      expect(dockerComposeService.updateServerConfig).toHaveBeenCalledTimes(1);
    });

    it('should drop the tick command fields from a whole-form save', async () => {
      await controller.updateServer(mockReq, 'victim', { serverName: 'x', tickCommand: 'op me', tickTpsPattern: '(1)', tickMsptPattern: '(2)' } as any);
      const saved = dockerComposeService.updateServerConfig.mock.calls[0][1];
      expect(saved).not.toHaveProperty('tickCommand');
      expect(saved).not.toHaveProperty('tickTpsPattern');
      expect(saved).not.toHaveProperty('tickMsptPattern');
    });

    it('should check the default hostname when the proxy is turned back on', async () => {
      useEdge('mc-router');
      dockerComposeService.getServerConfig.mockResolvedValue({ ...persistedConfig, useProxy: false } as any);
      dockerComposeService.getServerIndex = jest.fn().mockResolvedValue([{ id: 'lobby', proxyHostname: 'victim' }]) as any;

      await expect(controller.updateServer(mockReq, 'victim', { useProxy: true, proxyHostname: '' } as any)).rejects.toThrow(ConflictException);
      await expect(controller.updateServer(mockReq, 'victim', { useProxy: true } as any)).rejects.toThrow(ConflictException);
      await controller.updateServer(mockReq, 'victim', { useProxy: true, proxyHostname: 'survival' } as any);
      expect(dockerComposeService.updateServerConfig).toHaveBeenCalledTimes(1);
    });

    it('should not treat a blank hostname for an unset one as a change, nor check without a base domain', async () => {
      dockerComposeService.getServerIndex = jest.fn().mockResolvedValue([{ id: 'lobby', proxyHostname: 'victim' }]) as any;

      // Both would collide with lobby's `victim` hostname if they were checked.
      await controller.updateServer(mockReq, 'victim', { proxyHostname: 'victim' } as any);
      useEdge('mc-router');
      await controller.updateServer(mockReq, 'victim', { proxyHostname: '', serverName: 'renamed' } as any);
      expect(dockerComposeService.updateServerConfig).toHaveBeenCalledTimes(2);
    });

    it('should reject Compose variables in volume sources', async () => {
      await expect(controller.updateServer(mockReq, 'victim', { dockerVolumes: './${A:-..}/x:/host' } as any)).rejects.toThrow(ForbiddenException);
    });

    it('should reject JVM, exec and port changes from a server-scoped user', async () => {
      for (const change of [{ jvmOpts: '-javaagent:/data/x.jar' }, { jvmXxOpts: '-XX:+Foo' }, { jvmDdOpts: 'a=b' }, { execDirectly: false }, { extraPorts: ['127.0.0.1:2375:2375'] }]) {
        await expect(controller.updateServer(mockReq, 'victim', change as any)).rejects.toThrow(/Only admins can change these settings/);
      }
      expect(dockerComposeService.updateServerConfig).not.toHaveBeenCalled();
    });

    it('should only accept a generic pack from a local file or a trusted host', async () => {
      await expect(controller.updateServer(mockReq, 'victim', { genericPack: 'https://evil.example.com/pack.zip' } as any)).rejects.toThrow(/GENERIC_PACK/);
      await expect(controller.updateServer(mockReq, 'victim', { genericPack: '/modpacks/pack.zip,https://evil.example.com/pack.zip' } as any)).rejects.toThrow(/evil\.example\.com/);
      await controller.updateServer(mockReq, 'victim', { genericPack: '/modpacks/pack.zip' } as any);
      expect(dockerComposeService.updateServerConfig).toHaveBeenCalledTimes(1);
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

    it('should reject a compose snippet change from a server-scoped user', async () => {
      await expect(
        controller.updateServer(mockReq, 'victim', { composeSnippets: [{ target: 'mc', yaml: 'privileged: true' }] } as any),
      ).rejects.toThrow(/composeSnippets/);

      expect(dockerComposeService.updateServerConfig).not.toHaveBeenCalled();
    });

    it('should let an admin save valid snippets and reject invalid ones', async () => {
      (controller as any).getCurrentUser = jest.fn().mockResolvedValue({ id: 2, role: 'ADMIN' });
      accessControlService.isAdmin.mockReturnValue(true);

      await controller.updateServer(mockReq, 'victim', { composeSnippets: [{ target: 'mc', yaml: 'dns:\n  - 1.1.1.1' }] } as any);
      expect(dockerComposeService.updateServerConfig).toHaveBeenCalledTimes(1);

      await expect(
        controller.updateServer(mockReq, 'victim', { composeSnippets: [{ target: 'mc', yaml: '- not a mapping' }] } as any),
      ).rejects.toThrow(BadRequestException);
      expect(dockerComposeService.updateServerConfig).toHaveBeenCalledTimes(1);
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

  describe('updateModWatch', () => {
    const mockReq = { user: { userId: 1 } };

    beforeEach(() => {
      (controller as any).getCurrentUser = jest.fn().mockResolvedValue({
        id: 1,
        username: 'someone',
        role: 'USER',
        permissions: { accessAllServers: false },
        serverAccess: ['survival'],
      });
      serverService.updateModWatch.mockResolvedValue({ id: 'survival', modNotes: { sodium: 'note' } } as any);
    });

    it('checks server access before writing', async () => {
      await controller.updateModWatch(mockReq, 'survival', { notes: { sodium: 'note' } });

      expect(accessControlService.assertServerAccess).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), 'survival');
      expect(serverService.updateModWatch).toHaveBeenCalledWith('survival', { notes: { sodium: 'note' } });
    });

    it('records an audit entry naming what changed', async () => {
      await controller.updateModWatch(mockReq, 'survival', { notes: { sodium: 'note' }, targetVersion: '1.21.4' });

      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'servers',
          action: 'update_mod_watch',
          serverId: 'survival',
          summary: 'Updated Mod Watch notes and target version for survival',
        }),
      );
    });

    // The whole reason this is not just PUT /servers/:id: regenerating the compose file
    // re-runs port allocation, and this tab is usable while the server is running.
    it('never regenerates the compose file', async () => {
      await controller.updateModWatch(mockReq, 'survival', { targetVersion: '1.21.4' });

      expect(dockerComposeService.updateServerConfig).not.toHaveBeenCalled();
    });

    // The panel submits the whole config it loaded on every save. A page opened before
    // a note was written still holds the old modNotes, so letting PUT /servers/:id carry
    // these fields would put that stale copy back — no lock can prevent it, because the
    // stale write is complete and self-consistent.
    it('is the only way in: the whole-form save drops the Mod Watch fields', async () => {
      (controller as any).getCurrentUser = jest.fn().mockResolvedValue({
        id: 1,
        role: 'ADMIN',
        permissions: { accessAllServers: true },
        serverAccess: [],
      });
      accessControlService.isAdmin.mockReturnValue(true);
      dockerComposeService.getServerConfig.mockResolvedValue({ id: 'survival', dockerVolumes: '', envVars: '' } as any);
      dockerComposeService.updateServerConfig.mockResolvedValue({ id: 'survival' } as any);

      await controller.updateServer(mockReq, 'survival', {
        maxPlayers: '40',
        modNotes: { sodium: 'stale copy' },
        modWatchTargetVersion: '1.16.5',
        activityTracking: false,
        cfApiKey: '',
        spawnX: 100,
        spawnY: 64,
        spawnZ: -200,
      } as any);

      const [, forwarded] = dockerComposeService.updateServerConfig.mock.calls[0];
      expect(forwarded).toEqual({ maxPlayers: '40' });
    });
  });

  describe('updateSpawnPoint', () => {
    const mockReq = { user: { userId: 1 } };

    beforeEach(() => {
      (controller as any).getCurrentUser = jest.fn().mockResolvedValue({
        id: 1,
        username: 'someone',
        role: 'USER',
        permissions: { accessAllServers: false },
        serverAccess: ['survival'],
      });
      serverService.updateSpawnPoint.mockResolvedValue({ id: 'survival', spawnX: 100, spawnY: 64, spawnZ: -200 } as any);
    });

    it('checks server access before writing', async () => {
      await controller.updateSpawnPoint(mockReq, 'survival', { x: 100, y: 64, z: -200 });

      expect(accessControlService.assertServerAccess).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), 'survival');
      expect(serverService.updateSpawnPoint).toHaveBeenCalledWith('survival', { x: 100, y: 64, z: -200 });
    });

    it('records an audit entry', async () => {
      await controller.updateSpawnPoint(mockReq, 'survival', { x: 100, y: 64, z: -200 });

      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'servers',
          action: 'update_spawn_point',
          serverId: 'survival',
          summary: 'Updated default spawn point for survival',
        }),
      );
    });

    // Same reasoning as Mod Watch: this write must not regenerate the compose file, since
    // the Players/Commands tabs stay usable while the server is running.
    it('never regenerates the compose file', async () => {
      await controller.updateSpawnPoint(mockReq, 'survival', { x: 100, y: 64, z: -200 });

      expect(dockerComposeService.updateServerConfig).not.toHaveBeenCalled();
    });
  });

  describe('updateTickCommand', () => {
    const mockReq = { user: { userId: 1 } };

    beforeEach(() => {
      (controller as any).getCurrentUser = jest.fn().mockResolvedValue({ id: 1, username: 'root', role: 'ADMIN' });
      serverService.updateTickCommand.mockResolvedValue({ id: 'survival', tickCommand: 'tickinfo' } as any);
    });

    it('is admin only', async () => {
      accessControlService.isAdmin.mockReturnValueOnce(false);
      await expect(controller.updateTickCommand(mockReq, 'survival', { tickCommand: 'tickinfo' })).rejects.toThrow('Only admin');
      expect(serverService.updateTickCommand).not.toHaveBeenCalled();
    });

    it('saves without regenerating compose and records an audit entry', async () => {
      accessControlService.isAdmin.mockReturnValueOnce(true);
      await controller.updateTickCommand(mockReq, 'survival', { tickCommand: 'tickinfo', tickTpsPattern: 'TPS: ([\\d.]+)' });
      expect(serverService.updateTickCommand).toHaveBeenCalledWith('survival', { tickCommand: 'tickinfo', tickTpsPattern: 'TPS: ([\\d.]+)' });
      expect(dockerComposeService.updateServerConfig).not.toHaveBeenCalled();
      expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({
        action: 'update_tick_command',
        serverId: 'survival',
        summary: 'Set metrics tick command on survival: tickinfo',
        metadata: { command: 'tickinfo', tpsPattern: 'TPS: ([\\d.]+)', msptPattern: null },
      }));
    });

    it('records a cleared command', async () => {
      accessControlService.isAdmin.mockReturnValueOnce(true);
      await controller.updateTickCommand(mockReq, 'survival', { tickCommand: '' });
      expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ summary: 'Cleared metrics tick command on survival', metadata: { command: null, tpsPattern: null, msptPattern: null } }));
    });

    it('rejects a pattern that does not compile or has no capture group', async () => {
      accessControlService.isAdmin.mockReturnValue(true);
      await expect(controller.updateTickCommand(mockReq, 'survival', { tickCommand: 'x', tickTpsPattern: '(' })).rejects.toThrow('regular expressions');
      await expect(controller.updateTickCommand(mockReq, 'survival', { tickCommand: 'x', tickTpsPattern: 'a', tickMsptPattern: 'b' })).rejects.toThrow('regular expressions');
      expect(serverService.updateTickCommand).not.toHaveBeenCalled();
    });
  });

  describe('updateTickCommand pattern time limit', () => {
    it('rejects a pattern that backtracks catastrophically', async () => {
      (controller as any).getCurrentUser = jest.fn().mockResolvedValue({ id: 1, username: 'root', role: 'ADMIN' });
      accessControlService.isAdmin.mockReturnValue(true);
      await expect(controller.updateTickCommand({ user: { userId: 1 } }, 'survival', { tickCommand: 'x', tickTpsPattern: '(a+)+$' })).rejects.toThrow('too slow');
      expect(serverService.updateTickCommand).not.toHaveBeenCalled();
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
      ['composeSnippets', { composeSnippets: [{ target: 'mc', yaml: 'privileged: true' }] }],
      ['paperDownloadUrl', { paperDownloadUrl: 'https://attacker.invalid/evil.jar' }],
      ['fabricLauncherUrl', { fabricLauncherUrl: 'https://attacker.invalid/evil.jar' }],
    ])('should reject a non-admin creating a server with %s', async (_field, overrides) => {
      await expect(
        controller.createServer(mockReq, { id: 'demo', edition: 'JAVA', ...overrides } as any),
      ).rejects.toThrow(ForbiddenException);

      expect(dockerComposeService.createServer).not.toHaveBeenCalled();
    });

    it('drops the tick command fields from a non-admin create, but keeps them for an admin', async () => {
      const tick = { tickCommand: 'op someone', tickTpsPattern: '(1)', tickMsptPattern: '(2)' };
      await controller.createServer(mockReq, { id: 'demo', edition: 'JAVA', ...tick } as any);
      const created = dockerComposeService.createServer.mock.lastCall![1] as any;
      expect(created).not.toHaveProperty('tickCommand');
      expect(created).not.toHaveProperty('tickTpsPattern');
      expect(created).not.toHaveProperty('tickMsptPattern');

      accessControlService.isAdmin.mockReturnValue(true);
      await controller.createServer(mockReq, { id: 'demo', edition: 'JAVA', ...tick } as any);
      expect(dockerComposeService.createServer).toHaveBeenLastCalledWith('demo', expect.objectContaining(tick), expect.anything());
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

    it.each(['./:/data', './.:/data', './/:/data', './docker-compose.yml:/data/c.yml', './server.json:/data/s.json', './modpacks:/modpacks', './addons:/x:rw', './worlds:/x:z'])(
      'should reject a non-admin mounting the server directory or its panel files (%s)',
      async (volume) => {
        await expect(controller.createServer(mockReq, { id: 'demo', edition: 'JAVA', dockerVolumes: volume } as any)).rejects.toThrow(ForbiddenException);

        expect(dockerComposeService.createServer).not.toHaveBeenCalled();
      },
    );

    it('should reject GENERIC_PACK from an untrusted host in envVars', async () => {
      await expect(
        controller.createServer(mockReq, { id: 'demo', edition: 'JAVA', envVars: 'GENERIC_PACK=https://evil.example.com/pack.zip' } as any),
      ).rejects.toThrow(/GENERIC_PACK/);
      await expect(
        controller.createServer(mockReq, { id: 'demo', edition: 'JAVA', envVars: 'GENERIC_PACKS=pack\nGENERIC_PACKS_PREFIX=https://evil.example.com/' } as any),
      ).rejects.toThrow(/GENERIC_PACKS_PREFIX/);
    });

    it('should refuse a new server whose default hostname is already routed', async () => {
      useEdge('mc-router');
      dockerComposeService.getServerIndex.mockResolvedValue([{ id: 'lobby', proxyHostname: 'demo' }] as any);

      await expect(controller.createServer(mockReq, { id: 'demo', edition: 'JAVA' } as any)).rejects.toThrow(ConflictException);
      await controller.createServer(mockReq, { id: 'demo', edition: 'BEDROCK' } as any);
      await controller.createServer(mockReq, { id: 'demo', edition: 'JAVA', useProxy: false } as any);
      expect(dockerComposeService.createServer).toHaveBeenCalledTimes(2);
    });

    it('should allow the default relative volumes', async () => {
      await controller.createServer(mockReq, {
        id: 'demo',
        edition: 'JAVA',
        dockerVolumes: './mc-data:/data\n./modpacks:/modpacks:ro\n./mc-data/plugins:/plugins\n./worlds:/x:ro,z',
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
      expect(proxyRouter.syncRoutes).not.toHaveBeenCalled();
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

    it('never returns the stored CurseForge key', async () => {
      dockerComposeService.getServerConfig.mockResolvedValueOnce({ id: 'a', cfApiKey: 'creator-key' } as any);
      expect(await controller.getServer(req, 'a')).toEqual({ id: 'a' });
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
        await expect(controller.createServer(req, { id: 'ok', jvmOpts: '-javaagent:/data/x.jar' } as any)).rejects.toThrow(/jvmOpts/);
        await expect(controller.createServer(req, { id: 'ok', execDirectly: false } as any)).rejects.toThrow(/execDirectly/);
        await expect(controller.createServer(req, { id: 'ok', genericPack: 'https://evil.example.com/p.zip' } as any)).rejects.toThrow(/GENERIC_PACK/);
        for (const port of ['127.0.0.1:2375:2375', '80:25565', '20000-20100:20000-20100', '22:22']) {
          await expect(controller.createServer(req, { id: 'ok', extraPorts: [port] } as any)).rejects.toThrow(/publish these ports/);
        }
      });

      it('requires the console permission for event commands, and keeps RCON_CMDS_* out of envVars', async () => {
        await expect(controller.createServer(req, { id: 'ok', rconCmdsStartup: 'op Griefer' } as any)).rejects.toThrow(/console permission/);
        await expect(controller.createServer(req, { id: 'ok', envVars: 'RCON_CMDS_STARTUP=op Griefer' } as any)).rejects.toThrow(/RCON_CMDS_STARTUP/);
        await expect(controller.createServer(req, { id: 'ok', envVars: 'rcon_cmds_on_connect=op @a' } as any)).rejects.toThrow(/RCON_CMDS_ON_CONNECT/);

        dockerComposeService.createServer.mockResolvedValue({ id: 'ok' } as any);
        expect((await controller.createServer(req, { id: 'ok', rconCmdsStartup: '  \n / ' } as any)).success).toBe(true);
        accessControlService.canUsePermission.mockReturnValue(true);
        expect((await controller.createServer(req, { id: 'ok', rconCmdsOnConnect: 'give @a bread' } as any)).success).toBe(true);
      });

      it('checks Vanilla Tweaks codes on create', async () => {
        vanillaTweaks.lookup.mockResolvedValueOnce(null);
        await expect(controller.createServer(req, { id: 'ok', vanillaTweaksCodes: ['Gone99'] } as any)).rejects.toThrow(/Gone99 was not found/);
      });

      // The Bedrock strategy never sends the codes to itzg, so a lookup would only cost a request.
      it('does not look up Vanilla Tweaks codes for a Bedrock server', async () => {
        dockerComposeService.createServer.mockResolvedValue({ id: 'ok' } as any);
        await controller.createServer(req, { id: 'ok', edition: 'BEDROCK', vanillaTweaksCodes: ['Gone99'] } as any);
        expect(vanillaTweaks.lookup).not.toHaveBeenCalled();
      });

      it('accepts same-port game mappings from templates', async () => {
        dockerComposeService.createServer.mockResolvedValue({ id: 'ok' } as any);
        expect((await controller.createServer(req, { id: 'ok', extraPorts: ['19132:19132/udp', '24454:24454'], execDirectly: true } as any)).success).toBe(true);
      });

      it('accepts trusted artifacts, version tags and admin overrides', async () => {
        dockerComposeService.createServer.mockResolvedValue({ id: 'ok' } as any);
        settingsService.getCfApiKey.mockResolvedValue('cf-key');
        expect((await controller.createServer(req, { id: 'ok', dockerImage: 'java21', envVars: 'MODS=https://cdn.modrinth.com/a.jar,sodium\nNOEQUALS\nMOTD=hi' } as any)).success).toBe(true);
        expect(dockerComposeService.createServer).toHaveBeenLastCalledWith('ok', expect.objectContaining({ cfApiKey: 'cf-key' }), false);

        accessControlService.isAdmin.mockReturnValue(true);
        expect((await controller.createServer(req, { id: 'ok', dockerVolumes: '/host:/data', uid: '0' } as any)).success).toBe(true);
        await expect(controller.createServer(req, { id: 'ok', composeSnippets: [{ target: 'root', yaml: 'a: [' }] } as any)).rejects.toThrow(/Compose snippet 1/);
      });

      it('regenerates proxy routes when the proxy is on', async () => {
        dockerComposeService.createServer.mockResolvedValue({ id: 'ok' } as any);
        useEdge('mc-router');
        await controller.createServer(req, { id: 'ok' } as any);
        expect(proxyRouter.syncRoutes).toHaveBeenCalled();
      });
    });

    describe('cloneServer', () => {
      it('needs the console permission to clone a server that has event commands', async () => {
        dockerComposeService.getServerConfig.mockResolvedValue({ id: 'a', serverExists: true, serverName: 'Alpha', rconCmdsStartup: 'op Griefer' } as any);
        dockerComposeService.createServer.mockResolvedValue({ id: 'b' } as any);

        await expect(controller.cloneServer(req, 'a', { newId: 'b' } as any)).rejects.toThrow(/console permission/);
        expect(dockerComposeService.createServer).not.toHaveBeenCalled();

        accessControlService.canUsePermission.mockReturnValue(true);
        expect((await controller.cloneServer(req, 'a', { newId: 'b' } as any)).success).toBe(true);
      });

      it('does not hand a source server\'s tick command to a non-admin clone', async () => {
        const tick = { tickCommand: 'op someone', tickTpsPattern: '(1)', tickMsptPattern: '(2)' };
        dockerComposeService.getServerConfig.mockResolvedValue({ id: 'a', serverExists: true, serverName: 'Alpha', ...tick } as any);
        dockerComposeService.createServer.mockResolvedValue({ id: 'b' } as any);
        proxy.getProxySettings.mockResolvedValue({ enabled: false });

        await controller.cloneServer(req, 'a', { newId: 'b' } as any);
        const cloned = dockerComposeService.createServer.mock.lastCall![1] as any;
        expect(cloned).not.toHaveProperty('tickCommand');
        expect(cloned).not.toHaveProperty('tickTpsPattern');
        expect(cloned).not.toHaveProperty('tickMsptPattern');

        accessControlService.isAdmin.mockReturnValue(true);
        await controller.cloneServer(req, 'a', { newId: 'b' } as any);
        expect(dockerComposeService.createServer).toHaveBeenLastCalledWith('b', expect.objectContaining(tick), false);
      });

      it('never carries Velocity membership over to the clone', async () => {
        dockerComposeService.getServerConfig.mockResolvedValue({ id: 'a', serverExists: true, serverName: 'Lobby', serverType: 'PAPER', velocityEnabled: true, velocityFallbackOrder: 1 } as any);
        dockerComposeService.createServer.mockResolvedValue({ id: 'b' } as any);

        await controller.cloneServer(req, 'a', { newId: 'b' } as any);

        expect(dockerComposeService.createServer).toHaveBeenCalledWith('b', expect.objectContaining({ velocityEnabled: undefined, velocityFallbackOrder: undefined }), expect.anything());
      });

      it('validates the source and clones with remapped volumes', async () => {
        dockerComposeService.getServerConfig.mockResolvedValueOnce({ id: 'a', serverExists: false } as any);
        await expect(controller.cloneServer(req, 'a', { newId: 'b' } as any)).rejects.toThrow(NotFoundException);

        dockerComposeService.getServerConfig.mockResolvedValue({ id: 'a', serverExists: true, serverName: 'Alpha', worldScope: 'local', worldSource: 'w.zip', forceWorldCopy: true, dockerVolumes: './mc-data:/data' } as any);
        dockerComposeService.createServer.mockResolvedValue({ id: 'b', cfApiKey: 'source-key' } as any);
        useEdge('mc-router');

        const result = await controller.cloneServer(req, 'a', { newId: 'b' } as any);

        expect(result).toMatchObject({ success: true, server: { id: 'b' } });
        expect(result.server).not.toHaveProperty('cfApiKey');
        expect(dockerComposeService.createServer).toHaveBeenCalledWith('b', expect.objectContaining({ id: 'b', serverName: 'Alpha (copy)', worldSource: '', forceWorldCopy: false, extraPorts: [], dockerVolumes: './mc-data:/data' }), true);
        expect(proxyRouter.syncRoutes).toHaveBeenCalled();

        dockerComposeService.createServer.mockRejectedValueOnce(new Error('exists'));
        await expect(controller.cloneServer(req, 'a', { newId: 'b', serverName: ' Beta ' } as any)).rejects.toThrow('exists');

        dockerComposeService.getServerIndex.mockResolvedValueOnce([{ id: 'lobby', proxyHostname: 'b' }] as any);
        await expect(controller.cloneServer(req, 'a', { newId: 'b' } as any)).rejects.toThrow(ConflictException);
      });
    });

    it('regenerateAll rebuilds routes when the proxy is on', async () => {
      accessControlService.isAdmin.mockReturnValue(true);
      dockerComposeService.regenerateAllDockerCompose.mockResolvedValue({ updated: ['a'], errors: [] } as any);
      useEdge('mc-router');
      expect(await controller.regenerateAllDockerCompose(req)).toMatchObject({ success: true, message: 'Regenerated 1 servers' });
      expect(proxyRouter.syncRoutes).toHaveBeenCalled();

      accessControlService.isAdmin.mockReturnValue(false);
      await expect(controller.regenerateAllDockerCompose(req)).rejects.toThrow(ForbiddenException);
    });

    it('regenerateAll clears routes.json and syncs Velocity when it is the edge', async () => {
      accessControlService.isAdmin.mockReturnValue(true);
      dockerComposeService.regenerateAllDockerCompose.mockResolvedValue({ updated: [], errors: [] } as any);
      useEdge('velocity', null);

      await controller.regenerateAllDockerCompose(req);

      expect(dockerComposeService.regenerateAllDockerCompose).toHaveBeenCalledWith('velocity');
      expect(proxy.clearRoutesFile).toHaveBeenCalled();
      expect(velocity.syncConfig).toHaveBeenCalled();
    });

    it('only lets admins create a Velocity member', async () => {
      for (const membership of [{ velocityEnabled: true }, { velocityFallbackOrder: 1 }]) {
        await expect(controller.createServer(req, { id: 'ok', edition: 'JAVA', serverType: 'PAPER', ...membership } as any)).rejects.toThrow(/Only admins can add a server to the Velocity network/);
      }
      expect(dockerComposeService.createServer).not.toHaveBeenCalled();

      await controller.createServer(req, { id: 'ok', edition: 'JAVA', serverType: 'PAPER', velocityEnabled: false, velocityFallbackOrder: null } as any);
      expect(dockerComposeService.createServer).toHaveBeenCalled();
    });

    it('refuses to create a Velocity member that cannot forward', async () => {
      accessControlService.isAdmin.mockReturnValue(true);
      await expect(controller.createServer(req, { id: 'ok', edition: 'JAVA', serverType: 'VANILLA', velocityEnabled: true } as any)).rejects.toThrow(BadRequestException);
      expect(dockerComposeService.createServer).not.toHaveBeenCalled();
    });

    it('deleteServer regenerates routes and reports failures', async () => {
      dockerComposeService.getServerConfig.mockResolvedValue({ id: 'a' } as any);
      serverService.deleteServer.mockResolvedValueOnce(true);
      useEdge('mc-router');
      expect((await controller.deleteServer(req, 'a')).success).toBe(true);
      expect(proxyRouter.syncRoutes).toHaveBeenCalled();

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
        useEdge('mc-router');
        await controller.updateServer(req, 'a', { useProxy: true } as any);
        expect(proxyRouter.syncRoutes).toHaveBeenCalled();
      });

      it('only lets admins change Velocity membership', async () => {
        dockerComposeService.getServerConfig.mockResolvedValue({ ...current, serverType: 'PAPER', minecraftVersion: '1.21.4', velocityFallbackOrder: 2 } as any);
        dockerComposeService.updateServerConfig.mockResolvedValue(current as any);

        for (const change of [{ velocityEnabled: true }, { velocityFallbackOrder: 1 }, { velocityFallbackOrder: null }]) {
          await expect(controller.updateServer(req, 'a', change as any)).rejects.toThrow(/Only admins can change these settings: velocity/);
        }
        expect(dockerComposeService.updateServerConfig).not.toHaveBeenCalled();

        // A whole-form save that leaves membership as it was is not a change; unset and false are equal.
        await controller.updateServer(req, 'a', { velocityEnabled: false, velocityFallbackOrder: 2, serverName: 'renamed' } as any);
        expect(dockerComposeService.updateServerConfig).toHaveBeenCalledTimes(1);
      });

      it('only lets Paper-family servers on 1.19+ join the Velocity network', async () => {
        accessControlService.isAdmin.mockReturnValue(true);
        useEdge('velocity');
        accessControlService.canUsePermission.mockReturnValue(true);
        dockerComposeService.getServerConfig.mockResolvedValue({ ...current, serverType: 'FABRIC' } as any);
        dockerComposeService.updateServerConfig.mockResolvedValue(current as any);
        await expect(controller.updateServer(req, 'a', { velocityEnabled: true } as any)).rejects.toThrow(/can join the Velocity network/);

        // The merged config is what counts: a type change away from Paper is refused too.
        dockerComposeService.getServerConfig.mockResolvedValue({ ...current, serverType: 'PAPER', velocityEnabled: true } as any);
        await expect(controller.updateServer(req, 'a', { serverType: 'SPIGOT' } as any)).rejects.toThrow(BadRequestException);
        await expect(controller.updateServer(req, 'a', { minecraftVersion: '1.18.2' } as any)).rejects.toThrow(BadRequestException);

        await controller.updateServer(req, 'a', { velocityFallbackOrder: 1 } as any);
        expect(dockerComposeService.updateServerConfig).toHaveBeenCalledTimes(1);
      });

      it('drops the membership of a server that stops qualifying while mc-router is the edge', async () => {
        useEdge('mc-router');
        accessControlService.canUsePermission.mockReturnValue(true);
        dockerComposeService.getServerConfig.mockResolvedValue({ ...current, serverType: 'PAPER', minecraftVersion: '1.21.4', velocityEnabled: true, velocityFallbackOrder: 1 } as any);
        dockerComposeService.updateServerConfig.mockResolvedValue(current as any);

        // A non-admin whole-form save: the hidden membership comes back as it was stored.
        await controller.updateServer(req, 'a', { serverType: 'FABRIC', velocityEnabled: true, velocityFallbackOrder: 1 } as any);

        expect(dockerComposeService.updateServerConfig).toHaveBeenCalledWith('a', expect.objectContaining({ serverType: 'FABRIC', velocityEnabled: false, velocityFallbackOrder: null }), true);
      });

      it('rejects hostnames that could not be routed', async () => {
        dockerComposeService.getServerConfig.mockResolvedValue({ ...current, proxyHostname: 'bad name' } as any);
        dockerComposeService.updateServerConfig.mockResolvedValue(current as any);

        for (const proxyHostname of ['play\n[servers]', 'a"b', 'two words']) {
          await expect(controller.updateServer(req, 'a', { proxyHostname } as any)).rejects.toThrow(/A hostname can only contain/);
        }
        await expect(controller.createServer(req, { id: 'ok', edition: 'JAVA', proxyHostname: 'a/b' } as any)).rejects.toThrow(/A hostname can only contain/);

        // An invalid value already stored does not block saving the rest of the form.
        await controller.updateServer(req, 'a', { proxyHostname: 'bad name', serverName: 'renamed' } as any);
        await controller.updateServer(req, 'a', { proxyHostname: 'play.mc.example.com' } as any);
        expect(dockerComposeService.updateServerConfig).toHaveBeenCalledTimes(2);
      });

      it('syncs velocity.toml instead of routes.json while Velocity is the edge', async () => {
        accessControlService.isAdmin.mockReturnValue(true);
        dockerComposeService.getServerConfig.mockResolvedValue({ ...current, serverType: 'PAPER' } as any);
        dockerComposeService.updateServerConfig.mockResolvedValue(current as any);
        useEdge('velocity');

        await controller.updateServer(req, 'a', { velocityEnabled: true, velocityFallbackOrder: 0 } as any);

        expect(dockerComposeService.updateServerConfig).toHaveBeenCalledWith('a', expect.anything(), 'velocity');
        expect(velocity.syncConfig).toHaveBeenCalled();
        expect(proxyRouter.syncRoutes).not.toHaveBeenCalled();
      });

      it('checks forced hosts only against other Velocity members', async () => {
        accessControlService.isAdmin.mockReturnValue(true);
        dockerComposeService.getServerConfig.mockResolvedValue({ ...current, serverType: 'PAPER' } as any);
        dockerComposeService.updateServerConfig.mockResolvedValue(current as any);
        useEdge('velocity');
        dockerComposeService.getServerIndex.mockResolvedValue([{ id: 'lobby', proxyHostname: 'hub' }, { id: 'hub-member', proxyHostname: 'play', velocityEnabled: true }] as any);

        await controller.updateServer(req, 'a', { velocityEnabled: true, proxyHostname: 'hub' } as any);
        await expect(controller.updateServer(req, 'a', { velocityEnabled: true, proxyHostname: 'play' } as any)).rejects.toThrow(ConflictException);
      });

      it('gates event command changes behind the console permission', async () => {
        dockerComposeService.getServerConfig.mockResolvedValue({ ...current, rconCmdsStartup: 'say hi' } as any);
        dockerComposeService.updateServerConfig.mockResolvedValue(current as any);

        // The same commands after normalisation, and the untouched fields, are not a change.
        await controller.updateServer(req, 'a', { rconCmdsStartup: '/say hi\n\n', rconCmdsOnConnect: '' } as any);
        await expect(controller.updateServer(req, 'a', { rconCmdsStartup: 'op Griefer' } as any)).rejects.toThrow(/console permission/);
        await expect(controller.updateServer(req, 'a', { rconCmdsLastDisconnect: 'stop' } as any)).rejects.toThrow(/console permission/);

        accessControlService.canUsePermission.mockReturnValue(true);
        await controller.updateServer(req, 'a', { rconCmdsStartup: 'op Griefer' } as any);
        expect(dockerComposeService.updateServerConfig).toHaveBeenCalledTimes(2);
      });

      it('checks new Vanilla Tweaks codes before saving', async () => {
        dockerComposeService.getServerConfig.mockResolvedValue({ ...current, vanillaTweaksCodes: ['Known1'] } as any);
        dockerComposeService.updateServerConfig.mockResolvedValue(current as any);

        vanillaTweaks.lookup.mockResolvedValueOnce(null);
        await expect(controller.updateServer(req, 'a', { vanillaTweaksCodes: ['Known1', 'Gone99'] } as any)).rejects.toThrow(/Gone99 was not found/);
        vanillaTweaks.lookup.mockResolvedValueOnce({ type: 'resourcepacks' });
        await expect(controller.updateServer(req, 'a', { vanillaTweaksCodes: ['RPack1'] } as any)).rejects.toThrow(/resource pack/);

        // Codes already saved are not looked up again, and an outage does not block the save.
        vanillaTweaks.lookup.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce({ type: 'datapacks' });
        await controller.updateServer(req, 'a', { vanillaTweaksCodes: ['Known1', 'NewOne'] } as any);
        await controller.updateServer(req, 'a', { vanillaTweaksCodes: ['Known1', 'Other2'] } as any);
        expect(vanillaTweaks.lookup.mock.calls.map(([code]) => code)).toEqual(['Gone99', 'RPack1', 'NewOne', 'Other2']);
        expect(dockerComposeService.updateServerConfig).toHaveBeenCalledTimes(2);
      });

      it('asks about the new Vanilla Tweaks codes together and reports the first bad one in order', async () => {
        dockerComposeService.getServerConfig.mockResolvedValue({ ...current, vanillaTweaksCodes: [] } as any);
        dockerComposeService.updateServerConfig.mockResolvedValue(current as any);
        const answers = new Map<string, (share: unknown) => void>();
        vanillaTweaks.lookup.mockImplementation((code: string) => new Promise((resolve) => answers.set(code, resolve)));

        const save = controller.updateServer(req, 'a', { vanillaTweaksCodes: ['First1', 'Second2', 'Third3'] } as any);
        const rejected = expect(save).rejects.toThrow(/First1 was not found/);
        // All three are in flight before any answers: ten codes and a dead host would otherwise add up to ten timeouts.
        for (let i = 0; i < 200 && answers.size < 3; i++) await new Promise((resolve) => setTimeout(resolve, 5));
        expect([...answers.keys()]).toEqual(['First1', 'Second2', 'Third3']);

        // The later code answers first; the one reported is still the first in the list.
        answers.get('Third3')?.({ type: 'datapacks' });
        answers.get('Second2')?.(null);
        answers.get('First1')?.(null);
        await rejected;
        vanillaTweaks.lookup.mockReset();
      });

      it('does not look up Vanilla Tweaks codes for a Bedrock server on update', async () => {
        dockerComposeService.getServerConfig.mockResolvedValue({ ...current, edition: 'BEDROCK' } as any);
        dockerComposeService.updateServerConfig.mockResolvedValue(current as any);
        await controller.updateServer(req, 'a', { vanillaTweaksCodes: ['Gone99'] } as any);
        expect(vanillaTweaks.lookup).not.toHaveBeenCalled();
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

      serverService.getGamerules.mockResolvedValue({ success: true, supported: true, complete: true, rules: [] });
      expect((await controller.getGamerules(req, 'a')).success).toBe(true);

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
