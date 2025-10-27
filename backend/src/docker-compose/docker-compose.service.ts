import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import * as path from 'node:path';
import { ServerConfig, UpdateServerConfig } from 'src/server-management/dto/server-config.model';

interface DockerComposeConfig {
  services?: {
    mc?: any;
    backup?: any;
  };
}

@Injectable()
export class DockerComposeService {
  private readonly logger = new Logger(DockerComposeService.name);
  private readonly BASE_DIR = process.env.SERVERS_DIR;

  constructor() {
    fs.ensureDirSync(this.BASE_DIR);
  }

  private validateServerId(serverId: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(serverId);
  }

  private getDockerComposePath(serverId: string): string {
    return path.join(this.BASE_DIR, serverId, 'docker-compose.yml');
  }

  private getMcDataPath(serverId: string): string {
    return path.join(this.BASE_DIR, serverId, 'mc-data');
  }

  private async findAvailablePort(startPort: number, serverId: string): Promise<number> {
    try {
      const serverIds = await this.getAllServerIds();
      const usedPorts = new Set<number>();

      for (const id of serverIds) {
        if (id === serverId) continue;

        const serverConfig = await this.loadServerConfigFromDockerCompose(id);
        if (serverConfig?.port) {
          usedPorts.add(Number.parseInt(serverConfig.port));
        }
      }

      let port = startPort;
      while (usedPorts.has(port)) port++;

      return port;
    } catch (error) {
      this.logger.error('Error finding available port', error);
      return startPort;
    }
  }

  private async loadServerConfigFromDockerCompose(serverId: string): Promise<ServerConfig> {
    if (!this.validateServerId(serverId)) {
      this.logger.error(`Invalid server ID: ${serverId}`);
      return this.createDefaultConfig(serverId);
    }

    const dockerComposePath = this.getDockerComposePath(serverId);

    if (!fs.existsSync(dockerComposePath)) {
      this.logger.error(`Docker compose file does not exist for server ${serverId}`);
      return this.createDefaultConfig(serverId);
    }

    try {
      const composeFileContent = await fs.readFile(dockerComposePath, 'utf8');
      const composeConfig = yaml.load(composeFileContent) as DockerComposeConfig;

      if (!composeConfig.services?.mc) {
        return this.createDefaultConfig(serverId);
      }

      const mcService = composeConfig.services.mc;
      const backupService = composeConfig.services.backup;
      const env = mcService.environment ?? {};
      const resources = mcService.deploy?.resources ?? {};
      const backupEnv = backupService?.environment ?? {};

      const port = mcService.ports?.[0]?.split(':')[0] ?? '25565';
      const extraPorts = mcService.ports?.slice(1) || [];

      const serverConfig: ServerConfig = {
        id: env.ID_MANAGER ?? serverId,
        active: fs.existsSync(this.getMcDataPath(serverId)),
        serverType: env.TYPE ?? 'VANILLA',

        serverName: env.SERVER_NAME ?? 'Minecraft Server',
        motd: env.MOTD ?? 'Un servidor de Minecraft increíble',
        port: port,
        difficulty: env.DIFFICULTY ?? 'hard',
        maxPlayers: env.MAX_PLAYERS ?? '10',
        ops: env.OPS ?? '',
        playerIdleTimeout: env.PLAYER_IDLE_TIMEOUT ?? '60',
        onlineMode: env.ONLINE_MODE === 'true',
        pvp: env.PVP === 'true',
        commandBlock: env.ENABLE_COMMAND_BLOCK === 'true',
        allowFlight: env.ALLOW_FLIGHT === 'true',
        gameMode: env.MODE ?? 'survival',
        seed: env.SEED,
        levelType: env.LEVEL_TYPE ?? 'minecraft:default',
        hardcore: env.HARDCORE === 'true',
        spawnAnimals: env.SPAWN_ANIMALS !== 'false',
        spawnMonsters: env.SPAWN_MONSTERS !== 'false',
        spawnNpcs: env.SPAWN_NPCS !== 'false',
        generateStructures: env.GENERATE_STRUCTURES !== 'false',
        allowNether: env.ALLOW_NETHER !== 'false',
        entityBroadcastRange: env.ENTITY_BROADCAST_RANGE_PERCENTAGE ?? '100',

        enableAutoStop: env.ENABLE_AUTOSTOP === 'true',
        autoStopTimeoutEst: env.AUTOSTOP_TIMEOUT_EST ?? '3600',
        autoStopTimeoutInit: env.AUTOSTOP_TIMEOUT_INIT ?? '1800',

        enableAutoPause: env.ENABLE_AUTOPAUSE === 'true',
        autoPauseTimeoutEst: env.AUTOPAUSE_TIMEOUT_EST ?? '3600',
        autoPauseTimeoutInit: env.AUTOPAUSE_TIMEOUT_INIT ?? '600',
        autoPauseKnockInterface: env.AUTOPAUSE_KNOCK_INTERFACE ?? 'eth0',

        preventProxyConnections: env.PREVENT_PROXY_CONNECTIONS === 'true',
        opPermissionLevel: env.OP_PERMISSION_LEVEL ?? '4',

        enableRcon: env.ENABLE_RCON !== 'false',
        rconPort: env.RCON_PORT ?? '25575',
        rconPassword: env.RCON_PASSWORD ?? '',
        broadcastRconToOps: env.BROADCAST_RCON_TO_OPS === 'true',

        enableBackup: !!backupService,
        backupInterval: backupEnv.BACKUP_INTERVAL ?? '24h',
        backupMethod: backupEnv.BACKUP_METHOD ?? 'tar',
        backupInitialDelay: backupEnv.INITIAL_DELAY ?? '2m',
        backupPruneDays: backupEnv.PRUNE_BACKUPS_DAYS ?? '7',
        backupDestDir: backupEnv.DEST_DIR ?? '/backups',
        backupName: backupEnv.BACKUP_NAME ?? 'world',
        backupOnStartup: backupEnv.BACKUP_ON_STARTUP !== 'false',
        pauseIfNoPlayers: backupEnv.PAUSE_IF_NO_PLAYERS === 'true',
        playersOnlineCheckInterval: backupEnv.PLAYERS_ONLINE_CHECK_INTERVAL ?? '5m',
        rconRetries: backupEnv.RCON_RETRIES ?? '5',
        rconRetryInterval: backupEnv.RCON_RETRY_INTERVAL ?? '10s',
        backupIncludes: backupEnv.INCLUDES ?? '.',
        backupExcludes: backupEnv.EXCLUDES ?? '*.jar,cache,logs,*.tmp',
        tarCompressMethod: backupEnv.TAR_COMPRESS_METHOD ?? 'gzip',

        initMemory: env.INIT_MEMORY ?? '6G',
        maxMemory: env.MAX_MEMORY ?? '10G',
        cpuLimit: resources.limits?.cpus ?? '2',
        cpuReservation: resources.reservations?.cpus ?? '0.3',
        memoryReservation: resources.reservations?.memory ?? '4G',
        viewDistance: env.VIEW_DISTANCE ?? '6',
        simulationDistance: env.SIMULATION_DISTANCE ?? '4',
        uid: env.UID ?? '1000',
        gid: env.GID ?? '1000',

        useAikarFlags: env.USE_AIKAR_FLAGS === 'true',
        enableJmx: env.ENABLE_JMX === 'true',
        jmxHost: env.JMX_HOST ?? '',
        jvmOpts: env.JVM_OPTS ?? '',
        jvmXxOpts: env.JVM_XX_OPTS ?? '',
        jvmDdOpts: env.JVM_DD_OPTS ?? '',
        extraArgs: env.EXTRA_ARGS ?? '',
        tz: env.TZ ?? 'UTC',
        enableRollingLogs: env.ENABLE_ROLLING_LOGS === 'true',
        logTimestamp: env.LOG_TIMESTAMP === 'true',

        dockerImage: mcService.image ? (mcService.image.split(':')[1] ?? 'latest') : 'latest',
        minecraftVersion: String(env.VERSION),
        dockerVolumes: Array.isArray(mcService.volumes) ? mcService.volumes.join('\n') : './mc-data:/data\n./modpacks:/modpacks:ro',
        restartPolicy: mcService.restart ?? 'unless-stopped',
        stopDelay: env.STOP_SERVER_ANNOUNCE_DELAY ?? '60',
        execDirectly: env.EXEC_DIRECTLY === 'true',
        envVars: '',
        extraPorts: extraPorts,
      };

      this.parseServerTypeSpecificConfig(serverConfig, env);
      return serverConfig;
    } catch (error) {
      this.logger.error(`Error loading config for server ${serverId}`, error);
      return this.createDefaultConfig(serverId);
    }
  }

  private parseServerTypeSpecificConfig(serverConfig: ServerConfig, env: any): void {
    const typeHandlers = {
      AUTO_CURSEFORGE: () => {
        let cfMethod: 'url' | 'file' | 'slug' = 'url';
        if (env.CF_SERVER_MOD) {
          cfMethod = 'file';
        } else if (env.CF_SLUG) {
          cfMethod = 'slug';
        }
        serverConfig.cfMethod = cfMethod;
        serverConfig.cfUrl = env.CF_PAGE_URL ?? '';
        serverConfig.cfSlug = env.CF_SLUG ?? '';
        serverConfig.cfFile = env.CF_FILE_ID ?? '';
        serverConfig.cfSync = env.CF_FORCE_SYNCHRONIZE === 'true';
        serverConfig.cfForceInclude = env.CF_FORCE_INCLUDE_MODS ?? '';
        serverConfig.cfExclude = env.CF_EXCLUDE_MODS ?? '';
        serverConfig.cfFilenameMatcher = env.CF_FILENAME_MATCHER ?? '';
        serverConfig.cfParallelDownloads = env.CF_PARALLEL_DOWNLOADS ?? '4';
        serverConfig.cfOverridesSkipExisting = env.CF_OVERRIDES_SKIP_EXISTING === 'true';
        serverConfig.cfSetLevelFrom = env.CF_SET_LEVEL_FROM ?? '';
        serverConfig.cfApiKey = env.CF_API_KEY ?? '';
      },
      CURSEFORGE: () => {
        serverConfig.cfServerMod = env.CF_SERVER_MOD ?? '';
        serverConfig.cfBaseDir = env.CF_BASE_DIR ?? '/data';
        serverConfig.useModpackStartScript = env.USE_MODPACK_START_SCRIPT !== 'false';
        serverConfig.ftbLegacyJavaFixer = env.FTB_LEGACYJAVAFIXER === 'true';
        serverConfig.cfApiKey = env.CF_API_KEY ?? '';
      },
    };

    const pluginServers = ['SPIGOT', 'PAPER', 'BUKKIT', 'PUFFERFISH', 'PURPUR', 'LEAF', 'FOLIA'];
    if (pluginServers.includes(serverConfig.serverType)) {
      this.parsePluginServerConfig(serverConfig, env);
    } else {
      const handler = typeHandlers[serverConfig.serverType];
      if (handler) handler();
    }
  }

  private parsePluginServerConfig(serverConfig: ServerConfig, env: any): void {
    serverConfig.spigetResources = env.SPIGET_RESOURCES ?? '';
    serverConfig.skipDownloadDefaults = env.SKIP_DOWNLOAD_DEFAULTS === 'true';

    const specificParsers = {
      PAPER: () => {
        serverConfig.paperBuild = env.PAPER_BUILD ?? '';
        serverConfig.paperChannel = env.PAPER_CHANNEL ?? '';
        serverConfig.paperDownloadUrl = env.PAPER_DOWNLOAD_URL ?? '';
      },
      BUKKIT: () => {
        serverConfig.bukkitDownloadUrl = env.BUKKIT_DOWNLOAD_URL ?? '';
        serverConfig.buildFromSource = env.BUILD_FROM_SOURCE === 'true';
      },
      SPIGOT: () => {
        serverConfig.spigotDownloadUrl = env.SPIGOT_DOWNLOAD_URL ?? '';
        serverConfig.buildFromSource = env.BUILD_FROM_SOURCE === 'true';
      },
      PUFFERFISH: () => {
        serverConfig.pufferfishBuild = env.PUFFERFISH_BUILD ?? '';
        serverConfig.useFlareFlags = env.USE_FLARE_FLAGS === 'true';
      },
      PURPUR: () => {
        serverConfig.purpurBuild = env.PURPUR_BUILD ?? '';
        serverConfig.purpurDownloadUrl = env.PURPUR_DOWNLOAD_URL ?? '';
        serverConfig.useFlareFlags = env.USE_FLARE_FLAGS === 'true';
      },
      LEAF: () => {
        serverConfig.leafBuild = env.LEAF_BUILD ?? '';
      },
      FOLIA: () => {
        serverConfig.foliaBuild = env.FOLIA_BUILD ?? '';
        serverConfig.foliaChannel = env.FOLIA_CHANNEL ?? '';
        serverConfig.foliaDownloadUrl = env.FOLIA_DOWNLOAD_URL ?? '';
      },
    };

    const parser = specificParsers[serverConfig.serverType];
    if (parser) parser();
  }

  private createDefaultConfig(id: string): ServerConfig {
    return {
      id,
      active: false,
      serverType: 'VANILLA',

      serverName: id,
      motd: 'Un servidor de Minecraft increíble',
      port: '25565',
      difficulty: 'hard',
      maxPlayers: '10',
      ops: '',
      onlineMode: true,
      pvp: true,
      commandBlock: true,
      allowFlight: true,
      gameMode: 'survival',
      seed: '',
      levelType: 'minecraft:default',
      hardcore: false,
      spawnAnimals: true,
      spawnMonsters: true,
      spawnNpcs: true,
      generateStructures: true,
      allowNether: true,
      entityBroadcastRange: '100',

      enableAutoStop: false,
      autoStopTimeoutEst: '3600',
      autoStopTimeoutInit: '1800',

      enableAutoPause: false,
      autoPauseTimeoutEst: '3600',
      autoPauseTimeoutInit: '600',
      autoPauseKnockInterface: 'eth0',

      playerIdleTimeout: '0',
      preventProxyConnections: false,
      opPermissionLevel: '4',

      enableRcon: true,
      rconPort: '25575',
      rconPassword: '',
      broadcastRconToOps: false,

      enableBackup: false,
      backupInterval: '24h',
      backupMethod: 'tar',
      backupInitialDelay: '2m',
      backupPruneDays: '7',
      backupDestDir: '/backups',
      backupName: 'world',
      backupOnStartup: true,
      pauseIfNoPlayers: false,
      playersOnlineCheckInterval: '5m',
      rconRetries: '5',
      rconRetryInterval: '10s',
      backupIncludes: '.',
      backupExcludes: '*.jar,cache,logs,*.tmp',
      tarCompressMethod: 'gzip',

      initMemory: '6G',
      maxMemory: '10G',
      cpuLimit: '2',
      cpuReservation: '0.3',
      memoryReservation: '4G',
      viewDistance: '6',
      simulationDistance: '4',
      uid: '1000',
      gid: '1000',

      useAikarFlags: false,
      enableJmx: false,
      jmxHost: '',
      jvmOpts: '',
      jvmXxOpts: '',
      jvmDdOpts: '',
      extraArgs: '',
      tz: 'UTC',
      enableRollingLogs: false,
      logTimestamp: false,

      dockerImage: 'latest',
      minecraftVersion: '1.21.10',
      dockerVolumes: './mc-data:/data\n./modpacks:/modpacks:ro',
      restartPolicy: 'unless-stopped',
      stopDelay: '60',
      execDirectly: true,
      envVars: '',
      extraPorts: [],

      cfMethod: 'url',
      cfUrl: '',
      cfSlug: '',
      cfFile: '',
      cfApiKey: '',
      cfSync: false,
      cfForceInclude: '',
      cfExclude: '',
      cfFilenameMatcher: '',
      cfParallelDownloads: '4',
      cfOverridesSkipExisting: false,
      cfSetLevelFrom: '',

      cfServerMod: '',
      cfBaseDir: '/data',
      useModpackStartScript: true,
      ftbLegacyJavaFixer: false,

      spigetResources: '',

      paperBuild: '',
      paperChannel: '',
      paperDownloadUrl: '',

      bukkitDownloadUrl: '',
      spigotDownloadUrl: '',
      buildFromSource: false,

      pufferfishBuild: '',
      useFlareFlags: false,

      purpurBuild: '',
      purpurDownloadUrl: '',

      leafBuild: '',

      foliaBuild: '',
      foliaChannel: '',
      foliaDownloadUrl: '',

      skipDownloadDefaults: false,
    };
  }

  async getAllServerIds(): Promise<string[]> {
    try {
      if (!fs.existsSync(this.BASE_DIR)) {
        await fs.ensureDir(this.BASE_DIR);
        return [];
      }

      const entries = await fs.readdir(this.BASE_DIR, { withFileTypes: true });
      const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

      const serverIds = await Promise.all(
        directories.map(async (dir) => {
          const hasDockerCompose = await fs.pathExists(this.getDockerComposePath(dir));
          return hasDockerCompose ? dir : null;
        }),
      );

      return serverIds.filter((id): id is string => id !== null);
    } catch (error) {
      this.logger.error('Error getting server IDs', error);
      return [];
    }
  }

  async getAllServerConfigs(): Promise<ServerConfig[]> {
    const serverIds = await this.getAllServerIds();
    const configs: ServerConfig[] = [];

    for (const id of serverIds) {
      const config = await this.loadServerConfigFromDockerCompose(id);
      configs.push(config);
    }

    return configs;
  }

  async getServerConfig(id: string): Promise<ServerConfig | null> {
    const serverPath = path.join(this.BASE_DIR, id);
    if (!fs.existsSync(serverPath)) {
      return null;
    }

    return this.loadServerConfigFromDockerCompose(id);
  }

  async saveServerConfigs(configs: ServerConfig[]): Promise<void> {
    // Generate docker-compose.yml for each server
    for (const config of configs) {
      await this.generateDockerComposeFile(config);
    }
  }

  async createServer(id: string, config: UpdateServerConfig = {}): Promise<ServerConfig> {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new Error('El ID del servidor solo puede contener letras, números, guiones y guiones bajos');
    }

    const serverPath = path.join(this.BASE_DIR, id);
    if (fs.existsSync(serverPath)) {
      throw new Error(`El servidor "${id}" ya existe`);
    }

    await fs.ensureDir(serverPath);
    await fs.ensureDir(path.join(serverPath, 'mc-data'));

    const defaultConfig = this.createDefaultConfig(id);
    const serverConfig = { ...defaultConfig, ...config };

    await this.generateDockerComposeFile(serverConfig);
    return serverConfig;
  }

  async updateServerConfig(id: string, config: Partial<ServerConfig>): Promise<ServerConfig | null> {
    const currentConfig = await this.loadServerConfigFromDockerCompose(id);
    const updatedConfig = { ...currentConfig, ...config };

    await this.generateDockerComposeFile(updatedConfig);
    return updatedConfig;
  }

  private buildBaseEnvironment(config: ServerConfig): Record<string, string> {
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

  private addServerTypeConfig(env: Record<string, string>, config: ServerConfig): void {
    env['TYPE'] = config.serverType === 'AUTO_CURSEFORGE' || config.serverType === 'CURSEFORGE' ? config.serverType : config.serverType.toUpperCase();

    if (config.serverType === 'FORGE' && config.forgeBuild) {
      env['FORGE_VERSION'] = config.forgeBuild;
    }

    const apiKey = config.cfApiKey;
    if (apiKey) env['CF_API_KEY'] = apiKey;

    const serverTypeHandlers = {
      AUTO_CURSEFORGE: () => this.addAutoCurseForgeConfig(env, config),
      CURSEFORGE: () => this.addManualCurseForgeConfig(env, config),
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

    const specificConfigs = {
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

  private parseVolumes(config: ServerConfig): string[] {
    return config.dockerVolumes
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => line.trim());
  }

  private async ensurePortAvailable(config: ServerConfig): Promise<string> {
    const requestedPort = Number.parseInt(config.port || '25565');
    const availablePort = await this.findAvailablePort(requestedPort, config.id);
    if (availablePort !== requestedPort) {
      config.port = availablePort.toString();
    }
    return config.port;
  }

  private buildDockerComposeConfig(config: ServerConfig, environment: Record<string, string>, volumes: string[], port: string): any {
    return {
      services: {
        mc: {
          image: `itzg/minecraft-server:${config.dockerImage}`,
          tty: true,
          stdin_open: true,
          container_name: config.id,
          ports: [`${port}:25565`, ...(config.extraPorts || [])],
          environment,
          volumes,
          restart: config.restartPolicy,
          deploy: {
            resources: {
              limits: { cpus: config.cpuLimit, memory: config.maxMemory },
              reservations: { cpus: config.cpuReservation, memory: config.memoryReservation },
            },
          },
        },
      },
      volumes: { 'mc-data': {} },
    };
  }

  private async addBackupService(dockerComposeConfig: any, config: ServerConfig, serverDir: string): Promise<void> {
    const backupEnv: Record<string, string> = {
      BACKUP_METHOD: config.backupMethod || 'tar',
      BACKUP_NAME: config.backupName || 'world',
      BACKUP_INTERVAL: config.backupInterval || '24h',
      INITIAL_DELAY: config.backupInitialDelay || '2m',
      RCON_HOST: 'mc',
      RCON_PORT: config.rconPort || '25575',
      PRUNE_BACKUPS_DAYS: config.backupPruneDays || '7',
      DEST_DIR: config.backupDestDir || '/backups',
    };

    if (config.rconPassword) backupEnv.RCON_PASSWORD = config.rconPassword;
    if (config.pauseIfNoPlayers !== undefined) backupEnv.PAUSE_IF_NO_PLAYERS = String(config.pauseIfNoPlayers);
    if (config.playersOnlineCheckInterval) backupEnv.PLAYERS_ONLINE_CHECK_INTERVAL = config.playersOnlineCheckInterval;
    if (config.backupOnStartup !== undefined) backupEnv.BACKUP_ON_STARTUP = String(config.backupOnStartup);
    if (config.rconRetries) backupEnv.RCON_RETRIES = config.rconRetries;
    if (config.rconRetryInterval) backupEnv.RCON_RETRY_INTERVAL = config.rconRetryInterval;
    if (config.backupIncludes) backupEnv.INCLUDES = config.backupIncludes;
    if (config.backupExcludes) backupEnv.EXCLUDES = config.backupExcludes;
    if (config.tarCompressMethod && config.backupMethod === 'tar') backupEnv.TAR_COMPRESS_METHOD = config.tarCompressMethod;

    dockerComposeConfig.services.backup = {
      image: 'itzg/mc-backup',
      container_name: `${config.id}-backup`,
      depends_on: ['mc'],
      environment: backupEnv,
      volumes: ['./mc-data:/data:ro', './backups:/backups'],
      restart: 'unless-stopped',
    };

    dockerComposeConfig.volumes.backups = {};
    await fs.ensureDir(path.join(serverDir, 'backups'));
  }

  private async generateDockerComposeFile(config: ServerConfig): Promise<void> {
    const serverDir = path.join(this.BASE_DIR, config.id);
    await fs.ensureDir(serverDir);

    const environment = this.buildBaseEnvironment(config);
    this.addJvmOptions(environment, config);
    this.addAutomationOptions(environment, config);
    this.addRconConfig(environment, config);
    this.addConnectivityOptions(environment, config);
    this.addServerTypeConfig(environment, config);
    this.addCustomEnvVars(environment, config);

    const availablePort = await this.ensurePortAvailable(config);
    const volumes = this.parseVolumes(config);
    const dockerComposeConfig = this.buildDockerComposeConfig(config, environment, volumes, availablePort);

    if (config.enableBackup) {
      await this.addBackupService(dockerComposeConfig, config, serverDir);
    }

    const yamlContent = yaml.dump(dockerComposeConfig);
    await fs.writeFile(this.getDockerComposePath(config.id), yamlContent);
  }
}
