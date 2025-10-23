import { Injectable } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { ServerConfig, UpdateServerConfig } from 'src/server-management/dto/server-config.model';

@Injectable()
export class DockerComposeService {
  private readonly BASE_DIR = process.env.SERVERS_DIR || path.join(process.cwd(), '..', 'servers');

  constructor(private readonly configService: ConfigService) {
    fs.ensureDirSync(this.BASE_DIR);
  }

  private getDockerComposePath(serverId: string): string {
    return path.join(this.BASE_DIR, serverId, 'docker-compose.yml');
  }

  private getMcDataPath(serverId: string): string {
    return path.join(this.BASE_DIR, serverId, 'mc-data');
  }

  private async findAvailablePort(startPort: number, serverId: string): Promise<number> {
    try {
      // Get all server configurations
      const serverIds = await this.getAllServerIds();
      const usedPorts = new Set<number>();

      // Collect all ports used by other servers
      for (const id of serverIds) {
        if (id === serverId) continue; // Skip current server

        const serverConfig = await this.loadServerConfigFromDockerCompose(id);
        if (serverConfig?.port) {
          usedPorts.add(parseInt(serverConfig.port));
        }
      }

      // Find the next available port starting from startPort
      let port = startPort;
      while (usedPorts.has(port)) {
        port++;
      }

      return port;
    } catch (error) {
      console.error('Error finding available port:', error);
      return startPort;
    }
  }

  private async loadServerConfigFromDockerCompose(serverId: string): Promise<ServerConfig> {
    const dockerComposePath = this.getDockerComposePath(serverId);

    if (!fs.existsSync(dockerComposePath)) {
      console.error(`Docker compose file does not exist for server ${serverId}`);
      return this.createDefaultConfig(serverId);
    }

    try {
      const composeFileContent = await fs.readFile(dockerComposePath, 'utf8');
      const composeConfig = yaml.load(composeFileContent) as any;

      if (!composeConfig.services?.mc) {
        // Create default config if docker-compose.yml doesn't have mc service
        return this.createDefaultConfig(serverId);
      }

      const mcService = composeConfig.services.mc;
      const backupService = composeConfig.services.backup;
      const env = mcService.environment ?? {};
      const resources = mcService.deploy?.resources ?? {};
      const backupEnv = backupService?.environment ?? {};

      const port = mcService.ports?.[0]?.split(':')[0] ?? '25565';
      const extraPorts = mcService.ports?.slice(1) || [];

      // Extract server config from docker-compose
      const serverConfig: ServerConfig = {
        id: env.ID_MANAGER ?? serverId,
        active: fs.existsSync(this.getMcDataPath(serverId)),
        serverType: env.TYPE ?? 'VANILLA',

        // General configuration
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

        // Auto-Stop
        enableAutoStop: env.ENABLE_AUTOSTOP === 'true',
        autoStopTimeoutEst: env.AUTOSTOP_TIMEOUT_EST ?? '3600',
        autoStopTimeoutInit: env.AUTOSTOP_TIMEOUT_INIT ?? '1800',

        // Auto-Pause
        enableAutoPause: env.ENABLE_AUTOPAUSE === 'true',
        autoPauseTimeoutEst: env.AUTOPAUSE_TIMEOUT_EST ?? '3600',
        autoPauseTimeoutInit: env.AUTOPAUSE_TIMEOUT_INIT ?? '600',
        autoPauseKnockInterface: env.AUTOPAUSE_KNOCK_INTERFACE ?? 'eth0',

        // Connectivity
        preventProxyConnections: env.PREVENT_PROXY_CONNECTIONS === 'true',
        opPermissionLevel: env.OP_PERMISSION_LEVEL ?? '4',

        // RCON
        enableRcon: env.ENABLE_RCON !== 'false',
        rconPort: env.RCON_PORT ?? '25575',
        rconPassword: env.RCON_PASSWORD ?? '',
        broadcastRconToOps: env.BROADCAST_RCON_TO_OPS === 'true',

        // Backup configuration.
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

        // Resources
        initMemory: env.INIT_MEMORY ?? '6G',
        maxMemory: env.MAX_MEMORY ?? '10G',
        cpuLimit: resources.limits?.cpus ?? '2',
        cpuReservation: resources.reservations?.cpus ?? '0.3',
        memoryReservation: resources.reservations?.memory ?? '4G',
        viewDistance: env.VIEW_DISTANCE ?? '6',
        simulationDistance: env.SIMULATION_DISTANCE ?? '4',
        uid: env.UID ?? '1000',
        gid: env.GID ?? '1000',

        // JVM Options
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

        // Docker
        dockerImage: mcService.image ? (mcService.image.split(':')[1] ?? 'latest') : 'latest',
        minecraftVersion: env.VERSION,
        dockerVolumes: Array.isArray(mcService.volumes) ? mcService.volumes.join('\n') : './mc-data:/data\n./modpacks:/modpacks:ro',
        restartPolicy: mcService.restart ?? 'unless-stopped',
        stopDelay: env.STOP_SERVER_ANNOUNCE_DELAY ?? '60',
        execDirectly: env.EXEC_DIRECTLY === 'true',
        envVars: '',
        extraPorts: extraPorts,
      };

      // Add CurseForge specific config
      if (serverConfig.serverType === 'AUTO_CURSEFORGE') {
        serverConfig.cfMethod = env.CF_SERVER_MOD ? 'file' : env.CF_SLUG ? 'slug' : 'url';
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
      }

      // Add Manual CurseForge specific config (deprecated)
      if (serverConfig.serverType === 'CURSEFORGE') {
        serverConfig.cfServerMod = env.CF_SERVER_MOD ?? '';
        serverConfig.cfBaseDir = env.CF_BASE_DIR ?? '/data';
        serverConfig.useModpackStartScript = env.USE_MODPACK_START_SCRIPT !== 'false';
        serverConfig.ftbLegacyJavaFixer = env.FTB_LEGACYJAVAFIXER === 'true';
        serverConfig.cfApiKey = env.CF_API_KEY ?? '';
      }

      // Add Plugin specific config (for plugin-based servers)
      if (serverConfig.serverType === 'SPIGOT' || serverConfig.serverType === 'PAPER' || serverConfig.serverType === 'BUKKIT' || serverConfig.serverType === 'PUFFERFISH' || serverConfig.serverType === 'PURPUR' || serverConfig.serverType === 'LEAF' || serverConfig.serverType === 'FOLIA') {
        serverConfig.spigetResources = env.SPIGET_RESOURCES ?? '';
      }

      // Paper specific config
      if (serverConfig.serverType === 'PAPER') {
        serverConfig.paperBuild = env.PAPER_BUILD ?? '';
        serverConfig.paperChannel = env.PAPER_CHANNEL ?? '';
        serverConfig.paperDownloadUrl = env.PAPER_DOWNLOAD_URL ?? '';
      }

      // Bukkit/Spigot specific config
      if (serverConfig.serverType === 'BUKKIT' || serverConfig.serverType === 'SPIGOT') {
        serverConfig.bukkitDownloadUrl = env.BUKKIT_DOWNLOAD_URL ?? '';
        serverConfig.spigotDownloadUrl = env.SPIGOT_DOWNLOAD_URL ?? '';
        serverConfig.buildFromSource = env.BUILD_FROM_SOURCE === 'true';
      }

      // Pufferfish specific config
      if (serverConfig.serverType === 'PUFFERFISH') {
        serverConfig.pufferfishBuild = env.PUFFERFISH_BUILD ?? '';
        serverConfig.useFlareFlags = env.USE_FLARE_FLAGS === 'true';
      }

      // Purpur specific config
      if (serverConfig.serverType === 'PURPUR') {
        serverConfig.purpurBuild = env.PURPUR_BUILD ?? '';
        serverConfig.purpurDownloadUrl = env.PURPUR_DOWNLOAD_URL ?? '';
        serverConfig.useFlareFlags = env.USE_FLARE_FLAGS === 'true';
      }

      // Leaf specific config
      if (serverConfig.serverType === 'LEAF') {
        serverConfig.leafBuild = env.LEAF_BUILD ?? '';
      }

      // Folia specific config
      if (serverConfig.serverType === 'FOLIA') {
        serverConfig.foliaBuild = env.FOLIA_BUILD ?? '';
        serverConfig.foliaChannel = env.FOLIA_CHANNEL ?? '';
        serverConfig.foliaDownloadUrl = env.FOLIA_DOWNLOAD_URL ?? '';
      }

      // General Paper/Bukkit/Spigot config
      if (serverConfig.serverType === 'SPIGOT' || serverConfig.serverType === 'PAPER' || serverConfig.serverType === 'BUKKIT' || serverConfig.serverType === 'PUFFERFISH' || serverConfig.serverType === 'PURPUR' || serverConfig.serverType === 'LEAF' || serverConfig.serverType === 'FOLIA') {
        serverConfig.skipDownloadDefaults = env.SKIP_DOWNLOAD_DEFAULTS === 'true';
      }

      return serverConfig;
    } catch (error) {
      console.error(`Error loading config for server ${serverId}:`, error);
      return this.createDefaultConfig(serverId);
    }
  }

  private createDefaultConfig(id: string): ServerConfig {
    return {
      id,
      active: false,
      serverType: 'VANILLA',

      // General configuration
      serverName: id,
      motd: 'Un servidor de Minecraft increíble',
      port: '25565',
      difficulty: 'hard',
      maxPlayers: '10',
      ops: '',
      onlineMode: false,
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

      // Auto-Stop
      enableAutoStop: false,
      autoStopTimeoutEst: '3600',
      autoStopTimeoutInit: '1800',

      // Auto-Pause
      enableAutoPause: false,
      autoPauseTimeoutEst: '3600',
      autoPauseTimeoutInit: '600',
      autoPauseKnockInterface: 'eth0',

      // Connectivity
      playerIdleTimeout: '0',
      preventProxyConnections: false,
      opPermissionLevel: '4',

      // RCON
      enableRcon: true,
      rconPort: '25575',
      rconPassword: '',
      broadcastRconToOps: false,

      // Backup configuration
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

      // Resources
      initMemory: '6G',
      maxMemory: '10G',
      cpuLimit: '2',
      cpuReservation: '0.3',
      memoryReservation: '4G',
      viewDistance: '6',
      simulationDistance: '4',
      uid: '1000',
      gid: '1000',

      // JVM Options
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

      // Docker
      dockerImage: 'latest',
      minecraftVersion: '1.19.2',
      dockerVolumes: './mc-data:/data\n./modpacks:/modpacks:ro',
      restartPolicy: 'unless-stopped',
      stopDelay: '60',
      execDirectly: true,
      envVars: '',
      extraPorts: [],

      // CurseForge specific
      cfMethod: 'url',
      cfUrl: '',
      cfSlug: '',
      cfFile: '',
      cfApiKey: process.env.CF_API_KEY || '',
      cfSync: false,
      cfForceInclude: '',
      cfExclude: '',
      cfFilenameMatcher: '',
      cfParallelDownloads: '4',
      cfOverridesSkipExisting: false,
      cfSetLevelFrom: '',

      // Manual CurseForge (deprecated) specific
      cfServerMod: '',
      cfBaseDir: '/data',
      useModpackStartScript: true,
      ftbLegacyJavaFixer: false,

      // Plugin specific
      spigetResources: '',

      // Paper specific
      paperBuild: '',
      paperChannel: '',
      paperDownloadUrl: '',

      // Bukkit/Spigot specific
      bukkitDownloadUrl: '',
      spigotDownloadUrl: '',
      buildFromSource: false,

      // Pufferfish specific
      pufferfishBuild: '',
      useFlareFlags: false,

      // Purpur specific
      purpurBuild: '',
      purpurDownloadUrl: '',

      // Leaf specific
      leafBuild: '',

      // Folia specific
      foliaBuild: '',
      foliaChannel: '',
      foliaDownloadUrl: '',

      // General config
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
      const serverIds = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

      return serverIds;
    } catch (error) {
      console.error('Error getting server IDs:', error);
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
    // Validate server ID (only allow alphanumeric characters, hyphens and underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new Error('El ID del servidor solo puede contener letras, números, guiones y guiones bajos');
    }

    // Verificar si el servidor ya existe
    const serverPath = path.join(this.BASE_DIR, id);
    if (fs.existsSync(serverPath)) {
      throw new Error(`El servidor "${id}" ya existe`);
    }

    // Crear el directorio del servidor
    await fs.ensureDir(serverPath);

    // Crear el directorio de datos de Minecraft
    await fs.ensureDir(path.join(serverPath, 'mc-data'));

    // Create default configuration and apply overrides
    const defaultConfig = this.createDefaultConfig(id);
    const serverConfig = { ...defaultConfig, ...config };

    // Generar el archivo docker-compose.yml
    await this.generateDockerComposeFile(serverConfig);

    return serverConfig;
  }

  async updateServerConfig(id: string, config: Partial<ServerConfig>): Promise<ServerConfig | null> {
    const currentConfig = await this.loadServerConfigFromDockerCompose(id);
    const updatedConfig = { ...currentConfig, ...config };

    await this.generateDockerComposeFile(updatedConfig);
    return updatedConfig;
  }

  private async generateDockerComposeFile(config: ServerConfig): Promise<void> {
    // Create server directory if it doesn't exist
    const serverDir = path.join(this.BASE_DIR, config.id);
    await fs.ensureDir(serverDir);

    // Create environment variables dictionary
    const environment: Record<string, string> = {
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
    };

    // Add seed if defined
    if (config.seed) {
      environment['SEED'] = config.seed;
    }

    // Add memory configuration
    environment['INIT_MEMORY'] = config.initMemory;
    environment['MAX_MEMORY'] = config.maxMemory;

    // Add JVM options
    if (config.useAikarFlags) {
      environment['USE_AIKAR_FLAGS'] = 'true';
    }

    if (config.enableJmx) {
      environment['ENABLE_JMX'] = 'true';
      if (config.jmxHost) {
        environment['JMX_HOST'] = config.jmxHost;
      }
    }

    if (config.jvmOpts) {
      environment['JVM_OPTS'] = config.jvmOpts;
    }

    if (config.jvmXxOpts) {
      environment['JVM_XX_OPTS'] = config.jvmXxOpts;
    }

    if (config.jvmDdOpts) {
      environment['JVM_DD_OPTS'] = config.jvmDdOpts;
    }

    if (config.extraArgs) {
      environment['EXTRA_ARGS'] = config.extraArgs;
    }

    if (config.logTimestamp) {
      environment['LOG_TIMESTAMP'] = 'true';
    }

    // Add Auto-Stop and Auto-Pause configuration
    if (config.enableAutoStop) {
      environment['ENABLE_AUTOSTOP'] = 'true';
      environment['AUTOSTOP_TIMEOUT_EST'] = config.autoStopTimeoutEst;
      environment['AUTOSTOP_TIMEOUT_INIT'] = config.autoStopTimeoutInit;
    }

    if (config.enableAutoPause) {
      environment['ENABLE_AUTOPAUSE'] = 'true';
      environment['AUTOPAUSE_TIMEOUT_EST'] = config.autoPauseTimeoutEst;
      environment['AUTOPAUSE_TIMEOUT_INIT'] = config.autoPauseTimeoutInit;
      environment['AUTOPAUSE_KNOCK_INTERFACE'] = config.autoPauseKnockInterface;
    }

    // Add RCON configuration
    if (config.enableRcon) {
      environment['ENABLE_RCON'] = 'true';
      environment['RCON_PORT'] = config.rconPort;
      if (config.rconPassword) {
        environment['RCON_PASSWORD'] = config.rconPassword;
      }
      if (config.broadcastRconToOps) {
        environment['BROADCAST_RCON_TO_OPS'] = 'true';
      }
    } else {
      environment['ENABLE_RCON'] = 'false';
    }

    // Add connectivity options
    if (config.preventProxyConnections) {
      environment['PREVENT_PROXY_CONNECTIONS'] = 'true';
    }

    if (config.opPermissionLevel) {
      environment['OP_PERMISSION_LEVEL'] = config.opPermissionLevel;
    }

    // Add type-specific environment variables
    // Set TYPE based on server type
    if (config.serverType === 'AUTO_CURSEFORGE') {
      environment['TYPE'] = 'AUTO_CURSEFORGE';
    } else if (config.serverType === 'CURSEFORGE') {
      environment['TYPE'] = 'CURSEFORGE';
    } else {
      environment['TYPE'] = config.serverType.toUpperCase();
    }

    if (config.serverType === 'FORGE' && config.forgeBuild) {
      environment['FORGE_VERSION'] = config.forgeBuild;
    }

    if (config.cfApiKey) {
      environment['CF_API_KEY'] = config.cfApiKey;
    } else if (this.configService.get('CF_API_KEY')) {
      environment['CF_API_KEY'] = this.configService.get('CF_API_KEY');
    }

    if (config.serverType === 'AUTO_CURSEFORGE') {
      if (config.cfMethod === 'url' && config.cfUrl) {
        environment['CF_PAGE_URL'] = config.cfUrl;
        environment['MODPACK_PLATFORM'] = 'AUTO_CURSEFORGE';
      } else if (config.cfMethod === 'slug' && config.cfSlug) {
        environment['CF_SLUG'] = config.cfSlug;
        environment['MODPACK_PLATFORM'] = 'AUTO_CURSEFORGE';
        if (config.cfFile) {
          environment['CF_FILE_ID'] = config.cfFile;
        }
      } else if (config.cfMethod === 'file' && config.cfFilenameMatcher) {
        environment['CF_FILENAME_MATCHER'] = config.cfFilenameMatcher;
        environment['MODPACK_PLATFORM'] = 'AUTO_CURSEFORGE';
      }

      if (config.cfApiKey) {
        environment['CF_API_KEY'] = config.cfApiKey;
      } else {
        environment['CF_API_KEY'] = process.env.CF_API_KEY;
      }

      if (config.cfSync) {
        environment['CF_FORCE_SYNCHRONIZE'] = 'true';
      }

      if (config.cfForceInclude) {
        environment['CF_FORCE_INCLUDE_MODS'] = config.cfForceInclude;
      }

      if (config.cfExclude) {
        environment['CF_EXCLUDE_MODS'] = config.cfExclude;
      }

      if (config.cfParallelDownloads) {
        environment['CF_PARALLEL_DOWNLOADS'] = config.cfParallelDownloads;
      }

      if (config.cfOverridesSkipExisting) {
        environment['CF_OVERRIDES_SKIP_EXISTING'] = 'true';
      }

      if (config.cfSetLevelFrom) {
        environment['CF_SET_LEVEL_FROM'] = config.cfSetLevelFrom;
      }
    } else if (config.serverType === 'CURSEFORGE') {
      // Manual CurseForge (deprecated)
      environment['TYPE'] = 'CURSEFORGE';
      if (config.cfServerMod) {
        environment['CF_SERVER_MOD'] = config.cfServerMod;
      }
      if (config.cfBaseDir) {
        environment['CF_BASE_DIR'] = config.cfBaseDir;
      }
      if (config.useModpackStartScript === false) {
        environment['USE_MODPACK_START_SCRIPT'] = 'false';
      }
      if (config.ftbLegacyJavaFixer) {
        environment['FTB_LEGACYJAVAFIXER'] = 'true';
      }
      if (config.cfApiKey) {
        environment['CF_API_KEY'] = config.cfApiKey;
      } else {
        environment['CF_API_KEY'] = process.env.CF_API_KEY;
      }
    } else if (config.serverType === 'SPIGOT' || config.serverType === 'PAPER' || config.serverType === 'BUKKIT' || config.serverType === 'PUFFERFISH' || config.serverType === 'PURPUR' || config.serverType === 'LEAF' || config.serverType === 'FOLIA') {
      // Plugin-based servers configuration
      environment['VERSION'] = config.minecraftVersion;

      if (config.spigetResources) {
        environment['SPIGET_RESOURCES'] = config.spigetResources;
      }

      // Paper specific
      if (config.serverType === 'PAPER') {
        if (config.paperBuild) environment['PAPER_BUILD'] = config.paperBuild;
        if (config.paperChannel) environment['PAPER_CHANNEL'] = config.paperChannel;
        if (config.paperDownloadUrl) environment['PAPER_DOWNLOAD_URL'] = config.paperDownloadUrl;
      }

      // Bukkit/Spigot specific
      if (config.serverType === 'BUKKIT' || config.serverType === 'SPIGOT') {
        if (config.bukkitDownloadUrl) environment['BUKKIT_DOWNLOAD_URL'] = config.bukkitDownloadUrl;
        if (config.spigotDownloadUrl) environment['SPIGOT_DOWNLOAD_URL'] = config.spigotDownloadUrl;
        if (config.buildFromSource) environment['BUILD_FROM_SOURCE'] = 'true';
      }

      // Pufferfish specific
      if (config.serverType === 'PUFFERFISH') {
        if (config.pufferfishBuild) environment['PUFFERFISH_BUILD'] = config.pufferfishBuild;
        if (config.useFlareFlags) environment['USE_FLARE_FLAGS'] = 'true';
      }

      // Purpur specific
      if (config.serverType === 'PURPUR') {
        if (config.purpurBuild) environment['PURPUR_BUILD'] = config.purpurBuild;
        if (config.purpurDownloadUrl) environment['PURPUR_DOWNLOAD_URL'] = config.purpurDownloadUrl;
        if (config.useFlareFlags) environment['USE_FLARE_FLAGS'] = 'true';
      }

      // Leaf specific
      if (config.serverType === 'LEAF') {
        if (config.leafBuild) environment['LEAF_BUILD'] = config.leafBuild;
      }

      // Folia specific
      if (config.serverType === 'FOLIA') {
        if (config.foliaBuild) environment['FOLIA_BUILD'] = config.foliaBuild;
        if (config.foliaChannel) environment['FOLIA_CHANNEL'] = config.foliaChannel;
        if (config.foliaDownloadUrl) environment['FOLIA_DOWNLOAD_URL'] = config.foliaDownloadUrl;
      }

      // General config
      if (config.skipDownloadDefaults) {
        environment['SKIP_DOWNLOAD_DEFAULTS'] = 'true';
      }
    } else {
      environment['VERSION'] = config.minecraftVersion;
    }

    // Add custom environment variables
    if (config.envVars) {
      const customEnvVars = config.envVars
        .split('\n')
        .filter((line) => line.trim() !== '')
        .reduce(
          (acc, line) => {
            const [key, value] = line.split('=').map((part) => part.trim());
            if (key && value) {
              acc[key] = value;
            }
            return acc;
          },
          {} as Record<string, string>,
        );

      Object.assign(environment, customEnvVars);
    }

    // Parse volumes
    const volumes = config.dockerVolumes
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => line.trim().replace('./mc-data', './mc-data')); // Keep relative path

    // Ensure the port is not already in use by another server
    const requestedPort = parseInt(config.port || '25565');
    const availablePort = await this.findAvailablePort(requestedPort, config.id);

    // Update the port if it changed
    if (availablePort !== requestedPort) {
      console.log(`Port ${requestedPort} already in use. Using port ${availablePort} for server ${config.id}`);
      config.port = availablePort.toString();
    }

    // Create Docker Compose configuration
    const dockerComposeConfig: {
      version: string;
      services: {
        mc: {
          image: string;
          tty: boolean;
          stdin_open: boolean;
          container_name: string;
          ports: string[];
          environment: Record<string, string>;
          volumes: string[];
          restart: string;
          deploy: {
            resources: {
              limits: {
                cpus: string;
                memory: string;
              };
              reservations: {
                cpus: string;
                memory: string;
              };
            };
          };
        };
        [key: string]: any;
      };
      volumes: Record<string, any>;
    } = {
      version: '3',
      services: {
        mc: {
          image: `itzg/minecraft-server:${config.dockerImage}`,
          tty: true,
          stdin_open: true,
          container_name: config.id,
          ports: [`${config.port}:25565`, ...(config.extraPorts || [])],
          environment,
          volumes,
          restart: config.restartPolicy,
          deploy: {
            resources: {
              limits: {
                cpus: config.cpuLimit,
                memory: config.maxMemory,
              },
              reservations: {
                cpus: config.cpuReservation,
                memory: config.memoryReservation,
              },
            },
          },
        },
      },
      volumes: {
        'mc-data': {},
      },
    };

    if (config.enableBackup) {
      // Create backup environment variables
      const backupEnvironment: Record<string, string> = {
        BACKUP_METHOD: config.backupMethod || 'tar',
        BACKUP_NAME: config.backupName || 'world',
        BACKUP_INTERVAL: config.backupInterval || '24h',
        INITIAL_DELAY: config.backupInitialDelay || '2m',
        RCON_HOST: 'mc',
        RCON_PORT: config.rconPort || '25575',
        PRUNE_BACKUPS_DAYS: config.backupPruneDays || '7',
        DEST_DIR: config.backupDestDir || '/backups',
      };

      // Add RCON password if present
      if (config.rconPassword) {
        backupEnvironment['RCON_PASSWORD'] = config.rconPassword;
      }

      // Add backup options if present
      if (config.pauseIfNoPlayers !== undefined) {
        backupEnvironment['PAUSE_IF_NO_PLAYERS'] = String(config.pauseIfNoPlayers);
      }

      if (config.playersOnlineCheckInterval) {
        backupEnvironment['PLAYERS_ONLINE_CHECK_INTERVAL'] = config.playersOnlineCheckInterval;
      }

      if (config.backupOnStartup !== undefined) {
        backupEnvironment['BACKUP_ON_STARTUP'] = String(config.backupOnStartup);
      }

      if (config.rconRetries) {
        backupEnvironment['RCON_RETRIES'] = config.rconRetries;
      }

      if (config.rconRetryInterval) {
        backupEnvironment['RCON_RETRY_INTERVAL'] = config.rconRetryInterval;
      }

      if (config.backupIncludes) {
        backupEnvironment['INCLUDES'] = config.backupIncludes;
      }

      if (config.backupExcludes) {
        backupEnvironment['EXCLUDES'] = config.backupExcludes;
      }

      if (config.tarCompressMethod && config.backupMethod === 'tar') {
        backupEnvironment['TAR_COMPRESS_METHOD'] = config.tarCompressMethod;
      }

      // Add backup service to docker compose
      dockerComposeConfig.services.backup = {
        image: 'itzg/mc-backup',
        container_name: `${config.id}-backup`,
        depends_on: ['mc'],
        environment: backupEnvironment,
        volumes: [
          './mc-data:/data:ro', // Read-only access to minecraft data
          './backups:/backups', // Directory for backups
        ],
        restart: 'unless-stopped',
      };

      dockerComposeConfig.volumes = {
        'mc-data': {},
        backups: {},
      };

      // Create backup volume if it doesn't exist
      await fs.ensureDir(path.join(serverDir, 'backups'));
    }

    // Save Docker Compose file
    const yamlContent = yaml.dump(dockerComposeConfig);
    await fs.writeFile(this.getDockerComposePath(config.id), yamlContent);
  }
}
