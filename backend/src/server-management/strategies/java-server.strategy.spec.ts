import { ServerConfig } from '../dto/server-config.model';
import { JavaServerStrategy } from './java-server.strategy';

describe('JavaServerStrategy', () => {
  const strategy = new JavaServerStrategy();

  const baseConfig = (): ServerConfig =>
    ({
      id: 'test-server',
      edition: 'JAVA',
      serverType: 'NEOFORGE',
      serverName: 'Test Server',
      motd: 'Test MOTD',
      difficulty: 'easy',
      maxPlayers: '10',
      ops: '',
      tz: 'UTC',
      onlineMode: true,
      pvp: true,
      commandBlock: true,
      allowFlight: false,
      viewDistance: '10',
      simulationDistance: '10',
      stopDelay: '60',
      enableRollingLogs: false,
      execDirectly: false,
      playerIdleTimeout: '0',
      entityBroadcastRange: '100',
      levelType: 'minecraft:default',
      gameMode: 'survival',
      hardcore: false,
      spawnAnimals: true,
      spawnMonsters: true,
      spawnNpcs: true,
      generateStructures: true,
      allowNether: true,
      uid: '1000',
      gid: '1000',
      initMemory: '2G',
      maxMemory: '4G',
      enableAutoStop: false,
      enableAutoPause: false,
      enableRcon: true,
      rconPort: '25575',
      preventProxyConnections: false,
      minecraftVersion: '1.21.1',
      neoforgeBuild: '21.1.64',
    }) as ServerConfig;

  it('should include VERSION for NEOFORGE servers', () => {
    const config = baseConfig();
    const env = strategy.buildEnvironment(config);

    expect(env.TYPE).toBe('NEOFORGE');
    expect(env.NEOFORGE_VERSION).toBe('21.1.64');
    expect(env.VERSION).toBe('1.21.1');
  });

  it('should include VERSION for FORGE servers', () => {
    const config = {
      ...baseConfig(),
      serverType: 'FORGE',
      forgeBuild: '47.3.0',
      neoforgeBuild: '',
    } as ServerConfig;

    const env = strategy.buildEnvironment(config);

    expect(env.TYPE).toBe('FORGE');
    expect(env.FORGE_VERSION).toBe('47.3.0');
    expect(env.VERSION).toBe('1.21.1');
  });

  it('should install an unpublished modpack zip with AUTO_CURSEFORGE', () => {
    const config = {
      ...baseConfig(),
      serverType: 'AUTO_CURSEFORGE',
      cfMethod: 'file',
      cfModpackZip: '/modpacks/my-pack.zip',
      cfFilenameMatcher: '1.20.1',
    } as ServerConfig;

    const env = strategy.buildEnvironment(config);

    expect(env.CF_MODPACK_ZIP).toBe('/modpacks/my-pack.zip');
    expect(env.CF_SLUG).toBe('custom');
    expect(env.MODPACK_PLATFORM).toBe('AUTO_CURSEFORGE');
    // The matcher only narrows published files, so it must not leak into this method
    expect(env.CF_FILENAME_MATCHER).toBeUndefined();
  });

  it('should keep CF_FILENAME_MATCHER as a filter for published modpacks', () => {
    const config = {
      ...baseConfig(),
      serverType: 'AUTO_CURSEFORGE',
      cfMethod: 'slug',
      cfSlug: 'all-the-mods-9',
      cfFilenameMatcher: '1.20.1',
    } as ServerConfig;

    const env = strategy.buildEnvironment(config);

    expect(env.CF_SLUG).toBe('all-the-mods-9');
    expect(env.CF_FILENAME_MATCHER).toBe('1.20.1');
    expect(env.CF_MODPACK_ZIP).toBeUndefined();
  });

  it('should allow custom VERSION in envVars to override generated VERSION', () => {
    const config = {
      ...baseConfig(),
      envVars: 'VERSION=1.20.6',
    } as ServerConfig;

    const env = strategy.buildEnvironment(config);

    expect(env.VERSION).toBe('1.20.6');
  });

  it('should keep a custom env var whose value contains an equals sign', () => {
    const config = {
      ...baseConfig(),
      envVars: 'JVM_EXTRA=-Dfoo=bar=baz',
    } as ServerConfig;

    const env = strategy.buildEnvironment(config);

    expect(env.JVM_EXTRA).toBe('-Dfoo=bar=baz');
  });
  describe('remaining environment builders', () => {
    it('exposes edition capabilities and defaults', () => {
      expect(strategy.getDockerImage()).toBe('itzg/minecraft-server:latest');
      expect(strategy.getDockerImage('java21')).toBe('itzg/minecraft-server:java21');
      expect([strategy.getDefaultPort(), strategy.getProtocol(), strategy.getInternalPort()]).toEqual(['25565', 'tcp', '25565']);
      expect([strategy.supportsRcon(), strategy.supportsAutoPause(), strategy.supportsAutoStop(), strategy.supportsJvmOptions(), strategy.supportsProxy()]).toEqual([true, true, true, true, true]);
      expect(strategy.getServerTypes()).toContain('PAPER');
      expect(strategy.getDefaultConfig('x')).toMatchObject({ edition: 'JAVA', serverType: 'VANILLA', rconPort: '25575' });
    });

    it('adds jvm, automation, rcon and connectivity options', () => {
      const env = strategy.buildEnvironment({
        ...baseConfig(),
        serverType: 'VANILLA',
        seed: '123',
        useAikarFlags: true,
        enableJmx: true,
        jmxHost: '0.0.0.0',
        jvmOpts: '-Xss1M',
        jvmXxOpts: '-XX:+UseG1GC',
        jvmDdOpts: 'a=b',
        extraArgs: '--nogui',
        logTimestamp: true,
        enableAutoStop: true,
        autoStopTimeoutEst: '3600',
        autoStopTimeoutInit: '1800',
        enableAutoPause: true,
        autoPauseTimeoutEst: '600',
        autoPauseTimeoutInit: '300',
        autoPauseKnockInterface: 'eth0',
        enableRcon: true,
        rconPort: '25575',
        rconPassword: 'pw',
        broadcastRconToOps: true,
        preventProxyConnections: true,
        opPermissionLevel: '3',
        spawnProtection: '16',
        worldLevelName: 'myworld',
        worldSource: 'library/world.zip',
        worldScope: 'global',
        forceWorldCopy: true,
      } as any);

      expect(env).toMatchObject({
        SEED: '123',
        USE_AIKAR_FLAGS: 'true',
        ENABLE_JMX: 'true',
        JMX_HOST: '0.0.0.0',
        JVM_OPTS: '-Xss1M',
        JVM_XX_OPTS: '-XX:+UseG1GC',
        JVM_DD_OPTS: 'a=b',
        EXTRA_ARGS: '--nogui',
        LOG_TIMESTAMP: 'true',
        ENABLE_AUTOSTOP: 'true',
        AUTOSTOP_TIMEOUT_EST: '3600',
        ENABLE_AUTOPAUSE: 'true',
        AUTOPAUSE_KNOCK_INTERFACE: 'eth0',
        ENABLE_RCON: 'true',
        RCON_PASSWORD: 'pw',
        BROADCAST_RCON_TO_OPS: 'true',
        PREVENT_PROXY_CONNECTIONS: 'true',
        OP_PERMISSION_LEVEL: '3',
        SPAWN_PROTECTION: '16',
        LEVEL: 'myworld',
        WORLD: '/data/.world-library/global/library/world.zip',
        FORCE_WORLD_COPY: 'TRUE',
        VERSION: '1.21.1',
        TYPE: 'VANILLA',
      });
    });

    it('maps world sources by scope and absolute path, and disables rcon explicitly', () => {
      expect(strategy.buildEnvironment({ ...baseConfig(), enableRcon: false, worldSource: 'w' } as any)).toMatchObject({ ENABLE_RCON: 'false', WORLD: '/data/.world-library/local/w' });
      expect(strategy.buildEnvironment({ ...baseConfig(), worldSource: '/abs/world' } as any).WORLD).toBe('/abs/world');
    });

    it('builds fabric, modrinth, gtnh and ftba specific variables', () => {
      const fabric = strategy.buildEnvironment({ ...baseConfig(), serverType: 'FABRIC', fabricLoaderVersion: '0.15', fabricLauncherVersion: '1.0', fabricLauncher: 'l.jar', fabricLauncherUrl: 'https://x', fabricForceReinstall: true, modrinthProjects: 'sodium', modrinthDownloadDependencies: 'required', modrinthDefaultVersionType: 'beta', modrinthLoader: 'fabric', versionFromModrinthProjects: true, cfApiKey: 'k$1', cfFiles: 'a,b' } as any);
      expect(fabric).toMatchObject({ TYPE: 'FABRIC', FABRIC_LOADER_VERSION: '0.15', FABRIC_LAUNCHER_VERSION: '1.0', FABRIC_LAUNCHER: 'l.jar', FABRIC_LAUNCHER_URL: 'https://x', FABRIC_FORCE_REINSTALL: 'true', MODRINTH_PROJECTS: 'sodium', MODRINTH_DOWNLOAD_DEPENDENCIES: 'required', MODRINTH_PROJECTS_DEFAULT_VERSION_TYPE: 'beta', MODRINTH_LOADER: 'fabric', VERSION_FROM_MODRINTH_PROJECTS: 'true', CF_API_KEY: 'k$$1', CURSEFORGE_FILES: 'a,b' });
      expect(fabric.MODRINTH_MODPACK).toBeUndefined();

      const modrinth = strategy.buildEnvironment({ ...baseConfig(), serverType: 'MODRINTH', modrinthModpack: 'atm' } as any);
      expect(modrinth.MODRINTH_MODPACK).toBe('atm');

      const gtnh = strategy.buildEnvironment({ ...baseConfig(), serverType: 'GTNH', levelType: 'rwg', gtnhPackVersion: '2.7', gtnhDeleteBackups: true, skipGtnhUpdateCheck: true } as any);
      expect(gtnh).toMatchObject({ GTNH_PACK_VERSION: '2.7', GTNH_DELETE_BACKUPS: 'true', SKIP_GTNH_UPDATE_CHECK: 'true', LEVEL_TYPE: 'rwg' });
      expect(strategy.buildEnvironment({ ...baseConfig(), serverType: 'VANILLA', levelType: 'rwg' } as any).LEVEL_TYPE).toBe('minecraft:default');

      expect(strategy.buildEnvironment({ ...baseConfig(), serverType: 'FTBA', ftbModpackId: '1', ftbModpackVersionId: '2' } as any)).toMatchObject({ FTB_MODPACK_ID: '1', FTB_MODPACK_VERSION_ID: '2' });
    });

    it('builds auto and manual CurseForge variables', () => {
      expect(strategy.buildEnvironment({ ...baseConfig(), serverType: 'AUTO_CURSEFORGE', cfMethod: 'url', cfUrl: 'https://cf/x', cfFilenameMatcher: 'server', cfSync: true, cfForceInclude: 'a', cfExclude: 'b', cfParallelDownloads: '4', cfOverridesSkipExisting: true, cfSetLevelFrom: 'WORLD_FILE' } as any)).toMatchObject({
        CF_PAGE_URL: 'https://cf/x',
        MODPACK_PLATFORM: 'AUTO_CURSEFORGE',
        CF_FILENAME_MATCHER: 'server',
        CF_FORCE_SYNCHRONIZE: 'true',
        CF_FORCE_INCLUDE_MODS: 'a',
        CF_EXCLUDE_MODS: 'b',
        CF_PARALLEL_DOWNLOADS: '4',
        CF_OVERRIDES_SKIP_EXISTING: 'true',
        CF_SET_LEVEL_FROM: 'WORLD_FILE',
      });
      expect(strategy.buildEnvironment({ ...baseConfig(), serverType: 'AUTO_CURSEFORGE', cfMethod: 'slug', cfSlug: 'atm9', cfFile: '123' } as any)).toMatchObject({ CF_SLUG: 'atm9', CF_FILE_ID: '123' });
      expect(strategy.buildEnvironment({ ...baseConfig(), serverType: 'CURSEFORGE', cfServerMod: 'pack.zip', cfBaseDir: '/data', useModpackStartScript: false, ftbLegacyJavaFixer: true } as any)).toMatchObject({ TYPE: 'CURSEFORGE', CF_SERVER_MOD: 'pack.zip', CF_BASE_DIR: '/data', USE_MODPACK_START_SCRIPT: 'false', FTB_LEGACYJAVAFIXER: 'true' });
    });

    it('builds plugin server variables per flavour', () => {
      const cases: Array<[string, Record<string, unknown>, Record<string, string>]> = [
        ['PAPER', { paperBuild: '1', paperChannel: 'experimental', paperDownloadUrl: 'https://p' }, { PAPER_BUILD: '1', PAPER_CHANNEL: 'experimental', PAPER_DOWNLOAD_URL: 'https://p' }],
        ['BUKKIT', { bukkitDownloadUrl: 'https://b', buildFromSource: true }, { BUKKIT_DOWNLOAD_URL: 'https://b', BUILD_FROM_SOURCE: 'true' }],
        ['SPIGOT', { spigotDownloadUrl: 'https://s', buildFromSource: true }, { SPIGOT_DOWNLOAD_URL: 'https://s', BUILD_FROM_SOURCE: 'true' }],
        ['PUFFERFISH', { pufferfishBuild: '2', useFlareFlags: true }, { PUFFERFISH_BUILD: '2', USE_FLARE_FLAGS: 'true' }],
        ['PURPUR', { purpurBuild: '3', purpurDownloadUrl: 'https://pu', useFlareFlags: true }, { PURPUR_BUILD: '3', PURPUR_DOWNLOAD_URL: 'https://pu', USE_FLARE_FLAGS: 'true' }],
        ['LEAF', { leafBuild: '4' }, { LEAF_BUILD: '4' }],
        ['FOLIA', { foliaBuild: '5', foliaChannel: 'default', foliaDownloadUrl: 'https://f' }, { FOLIA_BUILD: '5', FOLIA_CHANNEL: 'default', FOLIA_DOWNLOAD_URL: 'https://f' }],
      ];
      for (const [serverType, extra, expected] of cases) {
        const env = strategy.buildEnvironment({ ...baseConfig(), serverType, spigetResources: '1,2', skipDownloadDefaults: true, ...extra } as any);
        expect(env).toMatchObject({ TYPE: serverType, VERSION: '1.21.1', SPIGET_RESOURCES: '1,2', SKIP_DOWNLOAD_DEFAULTS: 'true', ...expected });
      }
    });

    it('ignores malformed custom env lines', () => {
      const env = strategy.buildEnvironment({ ...baseConfig(), serverType: 'QUILT', envVars: 'NO_SEPARATOR\n=novalue\nKEY=\nGOOD=yes\n' } as any);
      expect(env.GOOD).toBe('yes');
      expect(env.KEY).toBeUndefined();
      expect(env.TYPE).toBe('QUILT');
    });
  });
});
