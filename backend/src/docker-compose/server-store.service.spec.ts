import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import * as os from 'node:os';
import * as path from 'node:path';
import { ServerConfig } from 'src/server-management/dto/server-config.model';
import { ServerStoreService } from './server-store.service';

describe('ServerStoreService', () => {
  let service: ServerStoreService;
  let serversDir: string;

  const config = (id: string, overrides: Partial<ServerConfig> = {}): ServerConfig =>
    ({
      id,
      edition: 'JAVA',
      serverType: 'VANILLA',
      serverName: `${id} name`,
      motd: `${id} motd`,
      port: '25565',
      ...overrides,
    }) as ServerConfig;

  const indexIds = async (): Promise<string[]> => {
    const entries = await service.readIndex();
    return (entries ?? []).map((entry) => entry.id);
  };

  beforeEach(async () => {
    serversDir = await fs.mkdtemp(path.join(os.tmpdir(), 'minepanel-store-'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServerStoreService,
        { provide: ConfigService, useValue: { get: (key: string) => (key === 'serversDir' ? serversDir : null) } },
      ],
    }).compile();

    service = module.get(ServerStoreService);
  });

  afterEach(async () => {
    await fs.remove(serversDir);
  });

  describe('per-server config', () => {
    it('round-trips a config through server.json', async () => {
      const original = config('survival', { maxPlayers: '42', envVars: 'FOO=bar=baz' });

      await service.writeConfig(original);

      expect(await service.readConfig('survival')).toEqual(original);
    });

    it('does not persist state that is derived from the filesystem', async () => {
      await service.writeConfig(config('survival', { active: true, serverExists: true } as Partial<ServerConfig>));

      const stored = await fs.readJson(service.getConfigPath('survival'));
      expect(stored).not.toHaveProperty('active');
      expect(stored).not.toHaveProperty('serverExists');
    });

    it('returns null for a server that has no server.json', async () => {
      expect(await service.readConfig('missing')).toBeNull();
    });

    it('throws instead of reporting "no config" when server.json is corrupt', async () => {
      await fs.ensureDir(path.join(serversDir, 'survival'));
      await fs.writeFile(service.getConfigPath('survival'), '{ not json');

      await expect(service.readConfig('survival')).rejects.toBeDefined();
    });

    it('leaves no temporary files behind', async () => {
      await service.writeConfig(config('survival'));

      const entries = await fs.readdir(path.join(serversDir, 'survival'));
      expect(entries.filter((name) => name.endsWith('.tmp'))).toEqual([]);
    });

    it('refuses to write a config with no server id', async () => {
      await expect(service.writeConfig({} as ServerConfig)).rejects.toThrow('without a server id');
      expect(await fs.pathExists(path.join(serversDir, 'undefined'))).toBe(false);
    });

    it('leaves the previous config intact when the new one cannot be serialised', async () => {
      await service.writeConfig(config('survival', { maxPlayers: '20' }));

      const circular = config('survival') as ServerConfig & { self?: unknown };
      circular.self = circular;

      await expect(service.writeConfig(circular)).rejects.toBeDefined();
      expect((await service.readConfig('survival'))?.maxPlayers).toBe('20');
      const entries = await fs.readdir(path.join(serversDir, 'survival'));
      expect(entries.filter((name) => name.endsWith('.tmp'))).toEqual([]);
    });

    it('never leaves the config missing while it is being replaced', async () => {
      await service.writeConfig(config('survival', { maxPlayers: '20' }));
      const configPath = service.getConfigPath('survival');

      let sawMissing = false;
      const poll = setInterval(() => {
        if (!fs.pathExistsSync(configPath)) sawMissing = true;
      }, 0);

      try {
        for (let i = 0; i < 40; i++) {
          await service.writeConfig(config('survival', { maxPlayers: String(i) }));
        }
      } finally {
        clearInterval(poll);
      }

      expect(sawMissing).toBe(false);
      expect((await service.readConfig('survival'))?.maxPlayers).toBe('39');
    });
  });

  describe('index', () => {
    it('carries the fields the dashboard and the proxy routes need', async () => {
      await service.writeConfig(
        config('survival', { useProxy: false, proxyHostname: 'lobby', useAutoScale: false, edition: 'BEDROCK' }),
      );

      const [entry] = (await service.readIndex()) ?? [];
      expect(entry).toEqual({
        id: 'survival',
        serverName: 'survival name',
        motd: 'survival motd',
        port: '25565',
        serverType: 'VANILLA',
        edition: 'BEDROCK',
        useProxy: false,
        proxyHostname: 'lobby',
        useAutoScale: false,
      });
    });

    it('never writes the derived active flag', async () => {
      await service.writeConfig(config('survival', { active: true } as Partial<ServerConfig>));

      const [entry] = (await service.readIndex()) ?? [];
      expect(entry).not.toHaveProperty('active');
    });

    it('reports a missing index as null so the caller rebuilds it', async () => {
      expect(await service.readIndex()).toBeNull();
    });

    it('reports a corrupt index as null instead of throwing', async () => {
      await fs.writeFile(path.join(serversDir, 'servers.json'), 'definitely not json');

      expect(await service.readIndex()).toBeNull();
    });

    it('keeps every entry when servers are created concurrently', async () => {
      await Promise.all([
        service.writeConfig(config('one')),
        service.writeConfig(config('two')),
        service.writeConfig(config('three')),
      ]);

      expect(await indexIds()).toEqual(['one', 'three', 'two']);
    });

    it('updates an existing entry instead of duplicating it', async () => {
      await service.writeConfig(config('survival', { port: '25565' }));
      await service.writeConfig(config('survival', { port: '25570' }));

      const entries = (await service.readIndex()) ?? [];
      expect(entries).toHaveLength(1);
      expect(entries[0].port).toBe('25570');
    });

    it('drops an entry when the server is removed', async () => {
      await service.writeConfig(config('one'));
      await service.writeConfig(config('two'));

      await service.removeFromIndex('one');

      expect(await indexIds()).toEqual(['two']);
    });
  });

  describe('listServerDirs', () => {
    const makeServer = async (id: string, files: string[]) => {
      await fs.ensureDir(path.join(serversDir, id));
      for (const file of files) {
        await fs.writeFile(path.join(serversDir, id, file), '');
      }
    };

    it('counts folders that only have a server.json', async () => {
      await makeServer('new-style', ['server.json']);

      expect(await service.listServerDirs()).toEqual(['new-style']);
    });

    it('still counts folders that only have a compose file, so pre-1.12 servers survive', async () => {
      await makeServer('old-style', ['docker-compose.yml']);

      expect(await service.listServerDirs()).toEqual(['old-style']);
    });

    it('ignores folders with neither file', async () => {
      await makeServer('junk', ['readme.txt']);

      expect(await service.listServerDirs()).toEqual([]);
    });

    it('ignores the reserved world library and dot folders', async () => {
      await makeServer('.world', ['server.json']);
      await makeServer('.hidden', ['server.json']);
      await makeServer('survival', ['server.json']);

      expect(await service.listServerDirs()).toEqual(['survival']);
    });

    it('ignores the index file itself', async () => {
      await service.writeConfig(config('survival'));

      expect(await service.listServerDirs()).toEqual(['survival']);
    });
  });

  describe('storing every configurable field', () => {
    const fullConfig = () =>
      ({
      id: 'id-value',
      active: true,
      serverExists: true,
      edition: 'edition-value',
      serverType: 'VANILLA',
      serverName: 'serverName-value',
      motd: 'motd-value',
      port: 'port-value',
      difficulty: 'peaceful',
      maxPlayers: 'maxPlayers-value',
      ops: 'ops-value',
      onlineMode: true,
      pvp: true,
      commandBlock: true,
      allowFlight: true,
      gameMode: 'survival',
      seed: 'seed-value',
      worldSource: 'worldSource-value',
      worldScope: 'local',
      worldLevelName: 'worldLevelName-value',
      forceWorldCopy: true,
      levelType: 'levelType-value',
      hardcore: true,
      spawnAnimals: true,
      spawnMonsters: true,
      spawnNpcs: true,
      generateStructures: true,
      allowNether: true,
      entityBroadcastRange: 'entityBroadcastRange-value',
      enableAutoStop: true,
      autoStopTimeoutEst: 'autoStopTimeoutEst-value',
      autoStopTimeoutInit: 'autoStopTimeoutInit-value',
      enableAutoPause: true,
      autoPauseTimeoutEst: 'autoPauseTimeoutEst-value',
      autoPauseTimeoutInit: 'autoPauseTimeoutInit-value',
      autoPauseKnockInterface: 'autoPauseKnockInterface-value',
      playerIdleTimeout: 'playerIdleTimeout-value',
      preventProxyConnections: true,
      opPermissionLevel: 'opPermissionLevel-value',
      spawnProtection: 'spawnProtection-value',
      enableRcon: true,
      rconPort: 'rconPort-value',
      rconPassword: 'rconPassword-value',
      broadcastRconToOps: true,
      initMemory: 'initMemory-value',
      maxMemory: 'maxMemory-value',
      cpuLimit: 'cpuLimit-value',
      cpuReservation: 'cpuReservation-value',
      memoryReservation: 'memoryReservation-value',
      viewDistance: 'viewDistance-value',
      simulationDistance: 'simulationDistance-value',
      uid: 'uid-value',
      gid: 'gid-value',
      enableBackup: true,
      backupInterval: 'backupInterval-value',
      backupMethod: 'backupMethod-value',
      backupInitialDelay: 'backupInitialDelay-value',
      backupPruneDays: 'backupPruneDays-value',
      backupDestDir: 'backupDestDir-value',
      backupHostDir: 'backupHostDir-value',
      backupName: 'backupName-value',
      resticRepository: 'resticRepository-value',
      resticPassword: 'resticPassword-value',
      resticS3AccessKeyId: 'resticS3AccessKeyId-value',
      resticS3SecretAccessKey: 'resticS3SecretAccessKey-value',
      resticRetention: 'resticRetention-value',
      useAikarFlags: true,
      enableJmx: true,
      jmxHost: 'jmxHost-value',
      jvmOpts: 'jvmOpts-value',
      jvmXxOpts: 'jvmXxOpts-value',
      jvmDdOpts: 'jvmDdOpts-value',
      extraArgs: 'extraArgs-value',
      tz: 'tz-value',
      enableRollingLogs: true,
      logTimestamp: true,
      dockerImage: 'dockerImage-value',
      minecraftVersion: 'minecraftVersion-value',
      dockerVolumes: 'dockerVolumes-value',
      restartPolicy: 'no',
      stopDelay: 'stopDelay-value',
      execDirectly: true,
      envVars: 'envVars-value',
      dockerLabels: 'dockerLabels-value',
      backupIncludes: 'backupIncludes-value',
      backupExcludes: 'backupExcludes-value',
      tarCompressMethod: 'gzip',
      backupOnStartup: true,
      pauseIfNoPlayers: true,
      playersOnlineCheckInterval: 'playersOnlineCheckInterval-value',
      rconRetries: 'rconRetries-value',
      rconRetryInterval: 'rconRetryInterval-value',
      enableSaveAll: true,
      enableSync: true,
      forgeBuild: 'forgeBuild-value',
      neoforgeBuild: 'neoforgeBuild-value',
      fabricLoaderVersion: 'fabricLoaderVersion-value',
      fabricLauncherVersion: 'fabricLauncherVersion-value',
      fabricLauncher: 'fabricLauncher-value',
      fabricLauncherUrl: 'fabricLauncherUrl-value',
      fabricForceReinstall: true,
      modrinthProjects: 'modrinthProjects-value',
      modrinthDownloadDependencies: 'none',
      modrinthDefaultVersionType: 'release',
      modrinthLoader: 'modrinthLoader-value',
      versionFromModrinthProjects: true,
      modrinthModpack: 'modrinthModpack-value',
      gtnhPackVersion: 'gtnhPackVersion-value',
      gtnhDeleteBackups: true,
      skipGtnhUpdateCheck: true,
      ftbModpackId: 'ftbModpackId-value',
      ftbModpackVersionId: 'ftbModpackVersionId-value',
      extraPorts: ['extraPorts-a'],
      cfMethod: 'url',
      cfUrl: 'cfUrl-value',
      cfSlug: 'cfSlug-value',
      cfFile: 'cfFile-value',
      cfApiKey: 'cfApiKey-value',
      cfSync: true,
      cfFiles: 'cfFiles-value',
      cfForceInclude: 'cfForceInclude-value',
      cfExclude: 'cfExclude-value',
      cfFilenameMatcher: 'cfFilenameMatcher-value',
      cfModpackZip: 'cfModpackZip-value',
      cfParallelDownloads: 'cfParallelDownloads-value',
      cfOverridesSkipExisting: true,
      cfSetLevelFrom: 'cfSetLevelFrom-value',
      cfServerMod: 'cfServerMod-value',
      cfBaseDir: 'cfBaseDir-value',
      useModpackStartScript: true,
      ftbLegacyJavaFixer: true,
      spigetResources: 'spigetResources-value',
      paperBuild: 'paperBuild-value',
      paperChannel: 'paperChannel-value',
      paperDownloadUrl: 'paperDownloadUrl-value',
      bukkitDownloadUrl: 'bukkitDownloadUrl-value',
      spigotDownloadUrl: 'spigotDownloadUrl-value',
      buildFromSource: true,
      pufferfishBuild: 'pufferfishBuild-value',
      useFlareFlags: true,
      purpurBuild: 'purpurBuild-value',
      purpurDownloadUrl: 'purpurDownloadUrl-value',
      leafBuild: 'leafBuild-value',
      foliaBuild: 'foliaBuild-value',
      foliaChannel: 'foliaChannel-value',
      foliaDownloadUrl: 'foliaDownloadUrl-value',
      skipDownloadDefaults: true,
      proxyHostname: 'proxyHostname-value',
      useProxy: true,
      useAutoScale: true,
      allowCheats: true,
      tickDistance: 'tickDistance-value',
      maxThreads: 'maxThreads-value',
      defaultPlayerPermissionLevel: 'visitor',
      texturepackRequired: true,
      serverPortV6: 'serverPortV6-value',
      whiteList: true,
      }) as unknown as ServerConfig;

    it('round-trips the complete configuration', async () => {
      const original = fullConfig();

      await service.writeConfig(original);
      const stored = await service.readConfig('id-value');

      const { active: _active, serverExists: _serverExists, ...persisted } = original;
      expect(stored).toEqual(persisted);
    });

    it('keeps every field that is not derived from the filesystem', async () => {
      const original = fullConfig();

      await service.writeConfig(original);
      const stored = (await service.readConfig('id-value')) as unknown as Record<string, unknown>;

      const missing = Object.keys(original).filter(
        (key) => !['active', 'serverExists'].includes(key) && !(key in stored),
      );
      expect(missing).toEqual([]);
    });
  });
});
