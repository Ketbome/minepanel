import { ServerConfig } from '../dto/server-config.model';
import { IServerStrategy, ServerEdition } from './server-strategy.interface';

export class JavaServerStrategy implements IServerStrategy {
  readonly edition: ServerEdition = 'JAVA';

  getDockerImage(tag = 'latest'): string {
    return `itzg/minecraft-server:${tag}`;
  }

  getDefaultPort(): string {
    return '25565';
  }

  getProtocol(): 'tcp' | 'udp' {
    return 'tcp';
  }

  getInternalPort(): string {
    return '25565';
  }

  supportsRcon(): boolean {
    return true;
  }

  supportsBackup(): boolean {
    return true;
  }

  supportsAutoPause(): boolean {
    return true;
  }

  supportsAutoStop(): boolean {
    return true;
  }

  supportsJvmOptions(): boolean {
    return true;
  }

  supportsProxy(): boolean {
    return true;
  }

  getServerTypes(): string[] {
    return [
      'VANILLA',
      'FORGE',
      'NEOFORGE',
      'AUTO_CURSEFORGE',
      'CURSEFORGE',
      'MODRINTH',
      'SPIGOT',
      'FABRIC',
      'MAGMA',
      'PAPER',
      'QUILT',
      'BUKKIT',
      'PUFFERFISH',
      'PURPUR',
      'LEAF',
      'FOLIA',
    ];
  }

  buildEnvironment(config: ServerConfig): Record<string, string> {
    const env: Record<string, string> = {
      ID_MANAGER: config.id,
      EULA: 'TRUE',
      MOTD: config.motd || config.serverName,
      SERVER_NAME: config.serverName,
      DIFFICULTY: config.difficulty,
      MAX_PLAYERS: config.maxPlayers,
      OPS: config.ops,
      TZ: config.tz || 'UTC',
      ONLINE_MODE: String(config.onlineMode),
      PVP: String(config.pvp),
      ENABLE_COMMAND_BLOCK: String(config.commandBlock),
      ALLOW_FLIGHT: String(config.allowFlight),
      VIEW_DISTANCE: config.viewDistance,
      SIMULATION_DISTANCE: config.simulationDistance,
      STOP_SERVER_ANNOUNCE_DELAY: config.stopDelay,
      ENABLE_ROLLING_LOGS: String(config.enableRollingLogs),
      EXEC_DIRECTLY: String(config.execDirectly),
      PLAYER_IDLE_TIMEOUT: config.playerIdleTimeout,
      ENTITY_BROADCAST_RANGE_PERCENTAGE: config.entityBroadcastRange,
      LEVEL_TYPE: config.levelType,
      MODE: config.gameMode,
      HARDCORE: String(config.hardcore),
      SPAWN_ANIMALS: String(config.spawnAnimals),
      SPAWN_MONSTERS: String(config.spawnMonsters),
      SPAWN_NPCS: String(config.spawnNpcs),
      GENERATE_STRUCTURES: String(config.generateStructures),
      ALLOW_NETHER: String(config.allowNether),
      UID: config.uid,
      GID: config.gid,
      INIT_MEMORY: config.initMemory,
      MAX_MEMORY: config.maxMemory,
    };

    if (config.seed) env['SEED'] = config.seed;

    this.addJvmOptions(env, config);
    this.addAutomationOptions(env, config);
    this.addRconConfig(env, config);
    this.addConnectivityOptions(env, config);
    this.addServerTypeConfig(env, config);
    this.addCustomEnvVars(env, config);

    return env;
  }

  private addJvmOptions(env: Record<string, string>, config: ServerConfig): void {
    if (config.useAikarFlags) env['USE_AIKAR_FLAGS'] = 'true';
    if (config.enableJmx) {
      env['ENABLE_JMX'] = 'true';
      if (config.jmxHost) env['JMX_HOST'] = config.jmxHost;
    }
    if (config.jvmOpts) env['JVM_OPTS'] = config.jvmOpts;
    if (config.jvmXxOpts) env['JVM_XX_OPTS'] = config.jvmXxOpts;
    if (config.jvmDdOpts) env['JVM_DD_OPTS'] = config.jvmDdOpts;
    if (config.extraArgs) env['EXTRA_ARGS'] = config.extraArgs;
    if (config.logTimestamp) env['LOG_TIMESTAMP'] = 'true';
  }

  private addAutomationOptions(env: Record<string, string>, config: ServerConfig): void {
    if (config.enableAutoStop) {
      env['ENABLE_AUTOSTOP'] = 'true';
      env['AUTOSTOP_TIMEOUT_EST'] = config.autoStopTimeoutEst;
      env['AUTOSTOP_TIMEOUT_INIT'] = config.autoStopTimeoutInit;
    }

    if (config.enableAutoPause) {
      env['ENABLE_AUTOPAUSE'] = 'true';
      env['AUTOPAUSE_TIMEOUT_EST'] = config.autoPauseTimeoutEst;
      env['AUTOPAUSE_TIMEOUT_INIT'] = config.autoPauseTimeoutInit;
      env['AUTOPAUSE_KNOCK_INTERFACE'] = config.autoPauseKnockInterface;
    }
  }

  private addRconConfig(env: Record<string, string>, config: ServerConfig): void {
    if (config.enableRcon) {
      env['ENABLE_RCON'] = 'true';
      env['RCON_PORT'] = config.rconPort;
      if (config.rconPassword) env['RCON_PASSWORD'] = config.rconPassword;
      if (config.broadcastRconToOps) env['BROADCAST_RCON_TO_OPS'] = 'true';
    } else {
      env['ENABLE_RCON'] = 'false';
    }
  }

  private addConnectivityOptions(env: Record<string, string>, config: ServerConfig): void {
    if (config.preventProxyConnections) env['PREVENT_PROXY_CONNECTIONS'] = 'true';
    if (config.opPermissionLevel) env['OP_PERMISSION_LEVEL'] = config.opPermissionLevel;
  }

  private addForgeConfig(env: Record<string, string>, config: ServerConfig): void {
    if (config.forgeBuild) env['FORGE_VERSION'] = config.forgeBuild;
    env['VERSION'] = String(config.minecraftVersion);
  }

  private addNeoforgeConfig(env: Record<string, string>, config: ServerConfig): void {
    if (config.neoforgeBuild) env['NEOFORGE_VERSION'] = config.neoforgeBuild;
    env['VERSION'] = String(config.minecraftVersion);
  }

  private addFabricConfig(env: Record<string, string>, config: ServerConfig): void {
    if (config.fabricLoaderVersion) env['FABRIC_LOADER_VERSION'] = config.fabricLoaderVersion;
    if (config.fabricLauncherVersion) env['FABRIC_LAUNCHER_VERSION'] = config.fabricLauncherVersion;
    if (config.fabricLauncher) env['FABRIC_LAUNCHER'] = config.fabricLauncher;
    if (config.fabricLauncherUrl) env['FABRIC_LAUNCHER_URL'] = config.fabricLauncherUrl;
    if (config.fabricForceReinstall) env['FABRIC_FORCE_REINSTALL'] = 'true';
    env['VERSION'] = String(config.minecraftVersion);
  }

  private addServerTypeConfig(env: Record<string, string>, config: ServerConfig): void {
    env['TYPE'] =
      config.serverType === 'AUTO_CURSEFORGE' || config.serverType === 'CURSEFORGE'
        ? config.serverType
        : config.serverType.toUpperCase();

    this.addModrinthConfig(env, config);
    this.addCurseForgeFilesConfig(env, config);

    const serverTypeHandlers: Record<string, () => void> = {
      FORGE: () => this.addForgeConfig(env, config),
      NEOFORGE: () => this.addNeoforgeConfig(env, config),
      FABRIC: () => this.addFabricConfig(env, config),
      AUTO_CURSEFORGE: () => this.addAutoCurseForgeConfig(env, config),
      CURSEFORGE: () => this.addManualCurseForgeConfig(env, config),
      MODRINTH: () => this.addModrinthConfig(env, config),
      SPIGOT: () => this.addPluginServerConfig(env, config),
      PAPER: () => this.addPluginServerConfig(env, config),
      BUKKIT: () => this.addPluginServerConfig(env, config),
      PUFFERFISH: () => this.addPluginServerConfig(env, config),
      PURPUR: () => this.addPluginServerConfig(env, config),
      LEAF: () => this.addPluginServerConfig(env, config),
      FOLIA: () => this.addPluginServerConfig(env, config),
    };

    const handler = serverTypeHandlers[config.serverType];
    if (handler) {
      handler();
    } else {
      env['VERSION'] = String(config.minecraftVersion);
    }
  }

  private addModrinthConfig(env: Record<string, string>, config: ServerConfig): void {
    if (config.modrinthProjects) env['MODRINTH_PROJECTS'] = config.modrinthProjects;
    if (config.modrinthDownloadDependencies && config.modrinthDownloadDependencies !== 'none') {
      env['MODRINTH_DOWNLOAD_DEPENDENCIES'] = config.modrinthDownloadDependencies;
    }
    if (config.modrinthDefaultVersionType && config.modrinthDefaultVersionType !== 'release') {
      env['MODRINTH_PROJECTS_DEFAULT_VERSION_TYPE'] = config.modrinthDefaultVersionType;
    }
    if (config.modrinthLoader) env['MODRINTH_LOADER'] = config.modrinthLoader;

    // Only set MODPACK for pure MODRINTH server
    if (config.serverType === 'MODRINTH') {
      env['MODRINTH_MODPACK'] = config.modrinthModpack;
    }
  }

  private addCurseForgeFilesConfig(env: Record<string, string>, config: ServerConfig): void {
    const compatibleTypes = ['FORGE', 'NEOFORGE', 'FABRIC', 'QUILT', 'AUTO_CURSEFORGE', 'MODRINTH'];
    if (!compatibleTypes.includes(config.serverType)) return;

    const apiKey = config.cfApiKey;
    if (apiKey) env['CF_API_KEY'] = apiKey.split('$').join('$$');
    if (config.cfFiles) env['CURSEFORGE_FILES'] = config.cfFiles;
  }

  private addAutoCurseForgeConfig(env: Record<string, string>, config: ServerConfig): void {
    if (config.cfMethod === 'url' && config.cfUrl) {
      env['CF_PAGE_URL'] = config.cfUrl;
      env['MODPACK_PLATFORM'] = 'AUTO_CURSEFORGE';
    } else if (config.cfMethod === 'slug' && config.cfSlug) {
      env['CF_SLUG'] = config.cfSlug;
      env['MODPACK_PLATFORM'] = 'AUTO_CURSEFORGE';
      if (config.cfFile) env['CF_FILE_ID'] = config.cfFile;
    } else if (config.cfMethod === 'file' && config.cfFilenameMatcher) {
      env['CF_FILENAME_MATCHER'] = config.cfFilenameMatcher;
      env['MODPACK_PLATFORM'] = 'AUTO_CURSEFORGE';
    }

    if (config.cfSync) env['CF_FORCE_SYNCHRONIZE'] = 'true';
    if (config.cfForceInclude) env['CF_FORCE_INCLUDE_MODS'] = config.cfForceInclude;
    if (config.cfExclude) env['CF_EXCLUDE_MODS'] = config.cfExclude;
    if (config.cfParallelDownloads) env['CF_PARALLEL_DOWNLOADS'] = config.cfParallelDownloads;
    if (config.cfOverridesSkipExisting) env['CF_OVERRIDES_SKIP_EXISTING'] = 'true';
    if (config.cfSetLevelFrom) env['CF_SET_LEVEL_FROM'] = config.cfSetLevelFrom;
  }

  private addManualCurseForgeConfig(env: Record<string, string>, config: ServerConfig): void {
    if (config.cfServerMod) env['CF_SERVER_MOD'] = config.cfServerMod;
    if (config.cfBaseDir) env['CF_BASE_DIR'] = config.cfBaseDir;
    if (config.useModpackStartScript === false) env['USE_MODPACK_START_SCRIPT'] = 'false';
    if (config.ftbLegacyJavaFixer) env['FTB_LEGACYJAVAFIXER'] = 'true';
  }

  private addPluginServerConfig(env: Record<string, string>, config: ServerConfig): void {
    env['VERSION'] = String(config.minecraftVersion);

    if (config.spigetResources) env['SPIGET_RESOURCES'] = config.spigetResources;
    if (config.skipDownloadDefaults) env['SKIP_DOWNLOAD_DEFAULTS'] = 'true';

    const specificConfigs: Record<string, () => void> = {
      PAPER: () => {
        if (config.paperBuild) env['PAPER_BUILD'] = config.paperBuild;
        if (config.paperChannel) env['PAPER_CHANNEL'] = config.paperChannel;
        if (config.paperDownloadUrl) env['PAPER_DOWNLOAD_URL'] = config.paperDownloadUrl;
      },
      BUKKIT: () => {
        if (config.bukkitDownloadUrl) env['BUKKIT_DOWNLOAD_URL'] = config.bukkitDownloadUrl;
        if (config.buildFromSource) env['BUILD_FROM_SOURCE'] = 'true';
      },
      SPIGOT: () => {
        if (config.spigotDownloadUrl) env['SPIGOT_DOWNLOAD_URL'] = config.spigotDownloadUrl;
        if (config.buildFromSource) env['BUILD_FROM_SOURCE'] = 'true';
      },
      PUFFERFISH: () => {
        if (config.pufferfishBuild) env['PUFFERFISH_BUILD'] = config.pufferfishBuild;
        if (config.useFlareFlags) env['USE_FLARE_FLAGS'] = 'true';
      },
      PURPUR: () => {
        if (config.purpurBuild) env['PURPUR_BUILD'] = config.purpurBuild;
        if (config.purpurDownloadUrl) env['PURPUR_DOWNLOAD_URL'] = config.purpurDownloadUrl;
        if (config.useFlareFlags) env['USE_FLARE_FLAGS'] = 'true';
      },
      LEAF: () => {
        if (config.leafBuild) env['LEAF_BUILD'] = config.leafBuild;
      },
      FOLIA: () => {
        if (config.foliaBuild) env['FOLIA_BUILD'] = config.foliaBuild;
        if (config.foliaChannel) env['FOLIA_CHANNEL'] = config.foliaChannel;
        if (config.foliaDownloadUrl) env['FOLIA_DOWNLOAD_URL'] = config.foliaDownloadUrl;
      },
    };

    const specificConfig = specificConfigs[config.serverType];
    if (specificConfig) specificConfig();
  }

  private addCustomEnvVars(env: Record<string, string>, config: ServerConfig): void {
    if (!config.envVars) return;
    const customVars = config.envVars
      .split('\n')
      .filter((line) => line.trim())
      .reduce(
        (acc, line) => {
          const [key, value] = line.split('=').map((part) => part.trim());
          if (key && value) acc[key] = value;
          return acc;
        },
        {} as Record<string, string>,
      );
    Object.assign(env, customVars);
  }

  getDefaultConfig(_id: string): Partial<ServerConfig> {
    return {
      edition: 'JAVA',
      serverType: 'VANILLA',
      port: '25565',
      enableRcon: true,
      rconPort: '25575',
      initMemory: '6G',
      maxMemory: '10G',
      useAikarFlags: false,
      enableAutoPause: false,
      enableAutoStop: false,
    };
  }
}
