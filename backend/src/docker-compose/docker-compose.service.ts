import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import * as path from 'node:path';
import { ServerConfig, ServerEdition, UpdateServerConfig } from 'src/server-management/dto/server-config.model';
import { ServerStrategyFactory } from 'src/server-management/strategies';

interface DockerComposeConfig {
  services?: {
    mc?: any;
    backup?: any;
  };
}

type DockerLabels = Record<string, string> | string[] | undefined;

@Injectable()
export class DockerComposeService {
  private readonly logger = new Logger(DockerComposeService.name);
  private readonly SERVERS_DIR: string;
  private readonly BASE_DIR: string;

  constructor(private readonly configService: ConfigService) {
    this.SERVERS_DIR = this.configService.get('serversDir');
    this.BASE_DIR = this.configService.get('baseDir');
    fs.ensureDirSync(this.SERVERS_DIR);
  }

  private validateServerId(serverId: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(serverId);
  }

  private getDockerComposePath(serverId: string): string {
    return path.join(this.SERVERS_DIR, serverId, 'docker-compose.yml');
  }

  private getMcDataPath(serverId: string): string {
    return path.join(this.SERVERS_DIR, serverId, 'mc-data');
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

      // Detect edition from docker image
      const image = mcService.image ?? '';
      const edition: ServerEdition = image.includes('bedrock') ? 'BEDROCK' : 'JAVA';
      const strategy = ServerStrategyFactory.create(edition);

      const defaultPort = strategy.getDefaultPort();
      const port = mcService.ports?.[0]?.split(':')[0] ?? defaultPort;
      const extraPorts = mcService.ports?.slice(1) || [];
      const defaultVersion = edition === 'BEDROCK' ? 'LATEST' : 'latest';

      const serverConfig: ServerConfig = {
        id: env.ID_MANAGER ?? serverId,
        active: fs.existsSync(this.getMcDataPath(serverId)),
        serverExists: true,
        edition,
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
        levelType: this.parseLevelType(env.LEVEL_TYPE, edition),
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
        enableSaveAll: backupEnv.ENABLE_SAVE_ALL !== 'false',
        enableSync: backupEnv.ENABLE_SYNC !== 'false',

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
        minecraftVersion: env.VERSION ? String(env.VERSION) : defaultVersion,
        dockerVolumes: Array.isArray(mcService.volumes) ? mcService.volumes.join('\n') : undefined,
        restartPolicy: mcService.restart ?? 'unless-stopped',
        stopDelay: env.STOP_SERVER_ANNOUNCE_DELAY ?? '60',
        execDirectly: env.EXEC_DIRECTLY === 'true',
        envVars: this.extractCustomEnvVars(env),
        dockerLabels: this.extractDockerLabels(mcService.labels),
        extraPorts: extraPorts,
        forgeBuild: '',
        neoforgeBuild: '',
        fabricLoaderVersion: '',
        fabricLauncherVersion: '',
        fabricLauncher: '',
        fabricLauncherUrl: '',
        fabricForceReinstall: false,
        modrinthProjects: '',
        modrinthDownloadDependencies: 'none',
        modrinthDefaultVersionType: 'release',
        modrinthLoader: '',

        // Proxy config from labels or env
        proxyHostname: this.extractProxyHostname(mcService.labels),
        useProxy: this.extractUseProxy(mcService.labels),

        // Bedrock-specific
        allowCheats: env.ALLOW_CHEATS === 'true',
        tickDistance: env.TICK_DISTANCE ?? '4',
        maxThreads: env.MAX_THREADS ?? '8',
        defaultPlayerPermissionLevel: (env.DEFAULT_PLAYER_PERMISSION_LEVEL as 'visitor' | 'member' | 'operator') ?? 'member',
        texturepackRequired: env.TEXTUREPACK_REQUIRED === 'true',
        serverPortV6: env.SERVER_PORT_V6 ?? '',
        whiteList: env.WHITE_LIST === 'true',
      };

      if (edition === 'JAVA') {
        this.parseServerTypeSpecificConfig(serverConfig, env);
      }
      return serverConfig;
    } catch (error) {
      this.logger.error(`Error loading config for server ${serverId}`, error);
      return this.createDefaultConfig(serverId);
    }
  }

  private parseLevelType(
    levelType: string | undefined,
    edition: ServerEdition,
  ): 'minecraft:default' | 'minecraft:flat' | 'minecraft:large_biomes' | 'minecraft:amplified' | 'minecraft:single_biome_surface' {
    const validTypes = ['minecraft:default', 'minecraft:flat', 'minecraft:large_biomes', 'minecraft:amplified', 'minecraft:single_biome_surface'] as const;

    if (!levelType) return 'minecraft:default';

    // Bedrock uses uppercase values (DEFAULT, FLAT), map them back to minecraft: format
    if (edition === 'BEDROCK') {
      const bedrockMapping: Record<string, typeof validTypes[number]> = {
        DEFAULT: 'minecraft:default',
        FLAT: 'minecraft:flat',
        LEGACY: 'minecraft:default',
      };
      return bedrockMapping[levelType] || 'minecraft:default';
    }

    // Java already uses minecraft: format, validate it
    if (validTypes.includes(levelType as typeof validTypes[number])) {
      return levelType as typeof validTypes[number];
    }
    return 'minecraft:default';
  }

  private extractCustomEnvVars(env: any): string {
    const knownEnvVars = new Set(['ID_MANAGER', 'EULA', 'MOTD', 'SERVER_NAME', 'DIFFICULTY', 'MAX_PLAYERS', 'OPS', 'TZ', 'ONLINE_MODE', 'PVP', 'ENABLE_COMMAND_BLOCK', 'ALLOW_FLIGHT', 'VIEW_DISTANCE', 'SIMULATION_DISTANCE', 'STOP_SERVER_ANNOUNCE_DELAY', 'ENABLE_ROLLING_LOGS', 'EXEC_DIRECTLY', 'PLAYER_IDLE_TIMEOUT', 'ENTITY_BROADCAST_RANGE_PERCENTAGE', 'LEVEL_TYPE', 'MODE', 'HARDCORE', 'SPAWN_ANIMALS', 'SPAWN_MONSTERS', 'SPAWN_NPCS', 'GENERATE_STRUCTURES', 'ALLOW_NETHER', 'UID', 'GID', 'INIT_MEMORY', 'MAX_MEMORY', 'SEED', 'VERSION', 'TYPE', 'ENABLE_AUTOSTOP', 'AUTOSTOP_TIMEOUT_EST', 'AUTOSTOP_TIMEOUT_INIT', 'ENABLE_AUTOPAUSE', 'AUTOPAUSE_TIMEOUT_EST', 'AUTOPAUSE_TIMEOUT_INIT', 'AUTOPAUSE_KNOCK_INTERFACE', 'PREVENT_PROXY_CONNECTIONS', 'OP_PERMISSION_LEVEL', 'ENABLE_RCON', 'RCON_PORT', 'RCON_PASSWORD', 'BROADCAST_RCON_TO_OPS', 'USE_AIKAR_FLAGS', 'ENABLE_JMX', 'JMX_HOST', 'JVM_OPTS', 'JVM_XX_OPTS', 'JVM_DD_OPTS', 'EXTRA_ARGS', 'LOG_TIMESTAMP', 'FORGE_VERSION', 'NEOFORGE_VERSION', 'FABRIC_LOADER_VERSION', 'FABRIC_LAUNCHER_VERSION', 'FABRIC_LAUNCHER', 'FABRIC_LAUNCHER_URL', 'FABRIC_FORCE_REINSTALL', 'MODRINTH_PROJECTS', 'MODRINTH_DOWNLOAD_DEPENDENCIES', 'MODRINTH_PROJECTS_DEFAULT_VERSION_TYPE', 'MODRINTH_LOADER', 'CF_API_KEY', 'CURSEFORGE_FILES', 'CF_PAGE_URL', 'CF_SLUG', 'CF_FILE_ID', 'CF_FORCE_SYNCHRONIZE', 'CF_FORCE_INCLUDE_MODS', 'CF_EXCLUDE_MODS', 'CF_FILENAME_MATCHER', 'CF_PARALLEL_DOWNLOADS', 'CF_OVERRIDES_SKIP_EXISTING', 'CF_SET_LEVEL_FROM', 'MODPACK_PLATFORM', 'CF_SERVER_MOD', 'CF_BASE_DIR', 'USE_MODPACK_START_SCRIPT', 'FTB_LEGACYJAVAFIXER', 'SPIGET_RESOURCES', 'SKIP_DOWNLOAD_DEFAULTS', 'PAPER_BUILD', 'PAPER_CHANNEL', 'PAPER_DOWNLOAD_URL', 'BUKKIT_DOWNLOAD_URL', 'BUILD_FROM_SOURCE', 'SPIGOT_DOWNLOAD_URL', 'PUFFERFISH_BUILD', 'USE_FLARE_FLAGS', 'PURPUR_BUILD', 'PURPUR_DOWNLOAD_URL', 'LEAF_BUILD', 'FOLIA_BUILD', 'FOLIA_CHANNEL', 'FOLIA_DOWNLOAD_URL', 'GAMEMODE', 'WHITE_LIST', 'ALLOW_CHEATS', 'TICK_DISTANCE', 'MAX_THREADS', 'DEFAULT_PLAYER_PERMISSION_LEVEL', 'TEXTUREPACK_REQUIRED']);

    const customVars: string[] = [];
    for (const [key, value] of Object.entries(env)) {
      if (!knownEnvVars.has(key) && value !== undefined && value !== null) {
        customVars.push(`${key}=${value}`);
      }
    }

    return customVars.join('\n');
  }

  private extractDockerLabels(labels: DockerLabels): string {
    if (!labels) return '';

    if (Array.isArray(labels)) {
      return labels.filter((l) => !l.startsWith('minepanel.')).join('\n');
    }

    if (typeof labels === 'object') {
      return Object.entries(labels)
        .filter(([key]) => !key.startsWith('minepanel.'))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    }

    return '';
  }

  private extractProxyHostname(labels: DockerLabels): string | undefined {
    if (!labels) return undefined;

    if (Array.isArray(labels)) {
      const label = labels.find((l) => l.startsWith('minepanel.proxy.hostname='));
      return label?.split('=')[1];
    }

    if (typeof labels === 'object') {
      return labels['minepanel.proxy.hostname'];
    }

    return undefined;
  }

  private extractUseProxy(labels: DockerLabels): boolean {
    if (!labels) return true; // Default to true when proxy is enabled globally

    if (Array.isArray(labels)) {
      const label = labels.find((l) => l.startsWith('minepanel.proxy.enabled='));
      if (label) return label.split('=')[1] === 'true';
    }

    if (typeof labels === 'object' && 'minepanel.proxy.enabled' in labels) {
      return labels['minepanel.proxy.enabled'] === 'true';
    }

    return true;
  }

  private parseDockerLabels(labelsString: string): string[] | undefined {
    if (!labelsString?.trim()) return undefined;

    const labels = labelsString
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        let trimmed = line.trim();
        // Strip surrounding quotes (user might copy from other compose files)
        if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
          trimmed = trimmed.slice(1, -1);
        }
        // Also handle - 'label=value' format from compose files
        if (trimmed.startsWith('- ')) {
          trimmed = trimmed.slice(2).trim();
          if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
            trimmed = trimmed.slice(1, -1);
          }
        }
        return trimmed;
      })
      .filter((line) => line.includes('='));

    return labels.length > 0 ? labels : undefined;
  }

  private parseServerTypeSpecificConfig(serverConfig: ServerConfig, env: any): void {
    const typeHandlers = {
      FORGE: () => {
        if (env.FORGE_VERSION) {
          serverConfig.forgeBuild = env.FORGE_VERSION;
        }
      },
      NEOFORGE: () => {
        if (env.NEOFORGE_VERSION) {
          serverConfig.neoforgeBuild = env.NEOFORGE_VERSION;
        }
      },
      FABRIC: () => {
        serverConfig.fabricLoaderVersion = env.FABRIC_LOADER_VERSION ?? '';
        serverConfig.fabricLauncherVersion = env.FABRIC_LAUNCHER_VERSION ?? '';
        serverConfig.fabricLauncher = env.FABRIC_LAUNCHER ?? '';
        serverConfig.fabricLauncherUrl = env.FABRIC_LAUNCHER_URL ?? '';
        serverConfig.fabricForceReinstall = env.FABRIC_FORCE_REINSTALL === 'true';
      },
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
      },
      CURSEFORGE: () => {
        serverConfig.cfServerMod = env.CF_SERVER_MOD ?? '';
        serverConfig.cfBaseDir = env.CF_BASE_DIR ?? '/data';
        serverConfig.useModpackStartScript = env.USE_MODPACK_START_SCRIPT !== 'false';
        serverConfig.ftbLegacyJavaFixer = env.FTB_LEGACYJAVAFIXER === 'true';
      },
    };

    // Parse Modrinth config for compatible server types
    this.parseModrinthConfig(serverConfig, env);

    // Parse CurseForge files config for mod-compatible server types
    this.parseCurseForgeFilesConfig(serverConfig, env);

    const pluginServers = ['SPIGOT', 'PAPER', 'BUKKIT', 'PUFFERFISH', 'PURPUR', 'LEAF', 'FOLIA'];
    if (pluginServers.includes(serverConfig.serverType)) {
      this.parsePluginServerConfig(serverConfig, env);
    } else {
      const handler = typeHandlers[serverConfig.serverType];
      if (handler) handler();
    }
  }

  private parseCurseForgeFilesConfig(serverConfig: ServerConfig, env: any): void {
    const compatibleTypes = ['FORGE', 'NEOFORGE', 'FABRIC', 'QUILT', 'AUTO_CURSEFORGE'];
    if (!compatibleTypes.includes(serverConfig.serverType)) return;

    serverConfig.cfFiles = env.CURSEFORGE_FILES ?? '';
    const apiKey = env.CF_API_KEY;
    serverConfig.cfApiKey = apiKey ? apiKey.split('$$').join('$') : '';
  }

  private parseModrinthConfig(serverConfig: ServerConfig, env: any): void {
    serverConfig.modrinthProjects = env.MODRINTH_PROJECTS ?? '';
    serverConfig.modrinthDownloadDependencies = env.MODRINTH_DOWNLOAD_DEPENDENCIES ?? 'none';
    serverConfig.modrinthDefaultVersionType = env.MODRINTH_PROJECTS_DEFAULT_VERSION_TYPE ?? 'release';
    serverConfig.modrinthLoader = env.MODRINTH_LOADER ?? '';
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

  private createDefaultConfig(id: string, edition: ServerEdition = 'JAVA'): ServerConfig {
    const strategy = ServerStrategyFactory.create(edition);
    const strategyDefaults = strategy.getDefaultConfig(id);

    return {
      id,
      active: false,
      serverExists: false,
      edition,
      serverType: 'VANILLA',

      serverName: id,
      motd: 'Un servidor de Minecraft increíble',
      port: strategy.getDefaultPort(),
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
      enableSaveAll: true,
      enableSync: true,

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
      dockerLabels: '',
      extraPorts: [],

      cfMethod: 'url',
      cfUrl: '',
      cfSlug: '',
      cfFile: '',
      cfApiKey: '',
      cfSync: false,
      cfFiles: '',
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

      forgeBuild: '',
      neoforgeBuild: '',

      fabricLoaderVersion: '',
      fabricLauncherVersion: '',
      fabricLauncher: '',
      fabricLauncherUrl: '',
      fabricForceReinstall: false,

      modrinthProjects: '',
      modrinthDownloadDependencies: 'none',
      modrinthDefaultVersionType: 'release',
      modrinthLoader: '',

      proxyHostname: undefined,
      useProxy: true,

      // Bedrock-specific defaults
      allowCheats: false,
      tickDistance: '4',
      maxThreads: '8',
      defaultPlayerPermissionLevel: 'member',
      texturepackRequired: false,
      serverPortV6: '',
      whiteList: false,
      ...strategyDefaults,
    };
  }

  async getAllServerIds(): Promise<string[]> {
    try {
      if (!fs.existsSync(this.SERVERS_DIR)) {
        await fs.ensureDir(this.SERVERS_DIR);
        return [];
      }

      const entries = await fs.readdir(this.SERVERS_DIR, { withFileTypes: true });
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
    const serverPath = path.join(this.SERVERS_DIR, id);
    if (!fs.existsSync(serverPath)) {
      return null;
    }

    return this.loadServerConfigFromDockerCompose(id);
  }

  async saveServerConfigs(configs: ServerConfig[], proxyEnabled = false): Promise<void> {
    for (const config of configs) {
      await this.generateDockerComposeFile(config, proxyEnabled);
    }
  }

  async regenerateAllDockerCompose(proxyEnabled: boolean): Promise<{ updated: string[]; errors: string[] }> {
    const serverIds = await this.getAllServerIds();
    const updated: string[] = [];
    const errors: string[] = [];

    for (const id of serverIds) {
      try {
        const config = await this.loadServerConfigFromDockerCompose(id);
        if (config) {
          await this.generateDockerComposeFile(config, proxyEnabled);
          updated.push(id);
          this.logger.log(`Regenerated docker-compose for ${id}`);
        }
      } catch (error) {
        this.logger.error(`Failed to regenerate docker-compose for ${id}`, error);
        errors.push(id);
      }
    }

    return { updated, errors };
  }

  async createServer(id: string, config: UpdateServerConfig = {}, proxyEnabled = false): Promise<ServerConfig> {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new Error('El ID del servidor solo puede contener letras, números, guiones y guiones bajos');
    }

    const serverPath = path.join(this.SERVERS_DIR, id);
    const dockerComposePath = this.getDockerComposePath(id);

    // Check if server already exists (has docker-compose.yml)
    if (await fs.pathExists(dockerComposePath)) {
      throw new Error(`El servidor "${id}" ya existe`);
    }

    const serverExists = await fs.pathExists(serverPath);

    await fs.ensureDir(serverPath);
    const mcDataPath = path.join(serverPath, 'mc-data');
    await fs.ensureDir(mcDataPath);

    if (serverExists) {
      this.logger.log(`Server directory "${id}" already exists, checking for uploaded data...`);
      await this.detectAndMigrateMisplacedData(serverPath, mcDataPath);
    }

    const edition = config.edition ?? 'JAVA';
    const defaultConfig = this.createDefaultConfig(id, edition);
    const serverConfig = { ...defaultConfig, ...config };

    await this.generateDockerComposeFile(serverConfig, proxyEnabled);
    return serverConfig;
  }

  private async detectAndMigrateMisplacedData(serverPath: string, mcDataPath: string): Promise<void> {
    try {
      // Check for common minecraft server files in the root server directory
      const minecraftFiles = ['world', 'server.properties', 'eula.txt', 'ops.json', 'whitelist.json'];
      const foundFiles = [];

      for (const file of minecraftFiles) {
        const filePath = path.join(serverPath, file);
        if (await fs.pathExists(filePath)) {
          foundFiles.push(file);
        }
      }

      // If we found minecraft files in root, move them to mc-data
      if (foundFiles.length > 0) {
        this.logger.log(`Detected ${foundFiles.length} minecraft files in root directory. Migrating to mc-data...`);

        const entries = await fs.readdir(serverPath, { withFileTypes: true });
        for (const entry of entries) {
          // Skip mc-data folder itself and docker-compose.yml
          if (entry.name === 'mc-data' || entry.name === 'docker-compose.yml' || entry.name === 'backups' || entry.name === 'modpacks') {
            continue;
          }

          const sourcePath = path.join(serverPath, entry.name);
          const destPath = path.join(mcDataPath, entry.name);

          await fs.move(sourcePath, destPath, { overwrite: false });
          this.logger.log(`Migrated: ${entry.name} -> mc-data/${entry.name}`);
        }

        this.logger.log(`Successfully migrated server data from root to mc-data folder`);
      }
    } catch (error) {
      this.logger.warn('Error during misplaced data detection/migration', error);
      // Don't throw - let server creation continue
    }
  }

  async updateServerConfig(id: string, config: Partial<ServerConfig>, proxyEnabled = false): Promise<ServerConfig | null> {
    const currentConfig = await this.loadServerConfigFromDockerCompose(id);
    const updatedConfig = { ...currentConfig, ...config };

    await this.generateDockerComposeFile(updatedConfig, proxyEnabled);
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

    if (config.serverType === 'NEOFORGE' && config.neoforgeBuild) {
      env['NEOFORGE_VERSION'] = config.neoforgeBuild;
    }

    if (config.serverType === 'FABRIC') {
      if (config.fabricLoaderVersion) env['FABRIC_LOADER_VERSION'] = config.fabricLoaderVersion;
      if (config.fabricLauncherVersion) env['FABRIC_LAUNCHER_VERSION'] = config.fabricLauncherVersion;
      if (config.fabricLauncher) env['FABRIC_LAUNCHER'] = config.fabricLauncher;
      if (config.fabricLauncherUrl) env['FABRIC_LAUNCHER_URL'] = config.fabricLauncherUrl;
      if (config.fabricForceReinstall) env['FABRIC_FORCE_REINSTALL'] = 'true';
      env['VERSION'] = String(config.minecraftVersion);
    }

    // Add Modrinth config for compatible server types
    this.addModrinthConfig(env, config);

    // Add CurseForge files config for mod-compatible server types (FORGE, FABRIC, QUILT, AUTO_CURSEFORGE)
    this.addCurseForgeFilesConfig(env, config);

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
    } else if (config.serverType !== 'FABRIC') {
      env['VERSION'] = String(config.minecraftVersion);
    }
  }

  private addModrinthConfig(env: Record<string, string>, config: ServerConfig): void {
    const compatibleTypes = ['FORGE', 'NEOFORGE', 'FABRIC', 'AUTO_CURSEFORGE'];
    if (!compatibleTypes.includes(config.serverType)) return;

    if (config.modrinthProjects) env['MODRINTH_PROJECTS'] = config.modrinthProjects;
    if (config.modrinthDownloadDependencies && config.modrinthDownloadDependencies !== 'none') {
      env['MODRINTH_DOWNLOAD_DEPENDENCIES'] = config.modrinthDownloadDependencies;
    }
    if (config.modrinthDefaultVersionType && config.modrinthDefaultVersionType !== 'release') {
      env['MODRINTH_PROJECTS_DEFAULT_VERSION_TYPE'] = config.modrinthDefaultVersionType;
    }
    if (config.modrinthLoader) env['MODRINTH_LOADER'] = config.modrinthLoader;
  }

  private addCurseForgeFilesConfig(env: Record<string, string>, config: ServerConfig): void {
    // CURSEFORGE_FILES works with FORGE, FABRIC, QUILT, AUTO_CURSEFORGE, and NeoForge
    const compatibleTypes = ['FORGE', 'NEOFORGE', 'FABRIC', 'QUILT', 'AUTO_CURSEFORGE'];
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
    // cfFiles and cfApiKey are handled by addCurseForgeFilesConfig
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
      .map((line) => {
        const volume = line.trim();
        if (volume.startsWith('./')) {
          const [hostPath, ...containerParts] = volume.split(':');
          const containerPath = containerParts.join(':');
          const absoluteHostPath = path.join(this.BASE_DIR, 'servers', config.id, hostPath.substring(2));
          return `${absoluteHostPath}:${containerPath}`;
        }
        return volume;
      });
  }

  private async ensurePortAvailable(config: ServerConfig): Promise<string> {
    const strategy = ServerStrategyFactory.create(config.edition ?? 'JAVA');
    const defaultPort = strategy.getDefaultPort();
    const requestedPort = Number.parseInt(config.port || defaultPort);
    const availablePort = await this.findAvailablePort(requestedPort, config.id);
    if (availablePort !== requestedPort) {
      config.port = availablePort.toString();
    }
    return config.port;
  }

  private buildDockerComposeConfig(
    config: ServerConfig,
    environment: Record<string, string>,
    volumes: string[],
    port: string,
    proxyEnabled: boolean,
    strategy: import('src/server-management/strategies').IServerStrategy,
  ): any {
    const edition = config.edition ?? 'JAVA';
    // Proxy only works with Java edition
    const useProxy = proxyEnabled && config.useProxy !== false && edition === 'JAVA';

    const internalPort = strategy.getInternalPort();
    const protocol = strategy.getProtocol();
    const portMapping = protocol === 'udp' ? `${port}:${internalPort}/udp` : `${port}:${internalPort}`;

    const mcService: any = {
      image: strategy.getDockerImage(config.dockerImage),
      tty: true,
      stdin_open: true,
      container_name: config.id,
      environment,
      volumes,
      restart: config.restartPolicy,
    };

    // Only add resource limits for Java (Bedrock doesn't use JVM)
    if (edition === 'JAVA') {
      mcService.deploy = {
        resources: {
          limits: { cpus: config.cpuLimit, memory: config.maxMemory },
          reservations: { cpus: config.cpuReservation, memory: config.memoryReservation },
        },
      };
    }

    // Si usa proxy, no exponer puerto al host; si no, exponer como siempre
    if (useProxy) {
      mcService.expose = [internalPort];
      mcService.networks = ['minepanel-network'];
      if (config.extraPorts?.length) {
        mcService.ports = config.extraPorts;
      }
    } else {
      mcService.ports = [portMapping, ...(config.extraPorts || [])];
    }

    // Build labels
    const userLabels = this.parseDockerLabels(config.dockerLabels) || [];
    const proxyLabels: string[] = [];

    // Proxy labels only for Java (mc-router doesn't support Bedrock UDP)
    if (edition === 'JAVA') {
      if (config.useProxy !== undefined) {
        proxyLabels.push(`minepanel.proxy.enabled=${config.useProxy}`);
      }
      if (config.proxyHostname) {
        proxyLabels.push(`minepanel.proxy.hostname=${config.proxyHostname}`);
      }
    }

    const allLabels = [...userLabels, ...proxyLabels];
    if (allLabels.length > 0) {
      mcService.labels = allLabels;
    }

    const result: any = {
      services: { mc: mcService },
      volumes: { 'mc-data': {} },
    };

    // Add network definition if using proxy
    if (useProxy) {
      result.networks = {
        'minepanel-network': {
          external: true,
        },
      };
    }

    return result;
  }

  private buildBackupEnvironment(config: ServerConfig): Record<string, string> {
    const strategy = ServerStrategyFactory.create(config.edition ?? 'JAVA');

    const env: Record<string, string> = {
      BACKUP_METHOD: config.backupMethod || 'tar',
      BACKUP_NAME: config.backupName || 'world',
      BACKUP_INTERVAL: config.backupInterval || '24h',
      INITIAL_DELAY: config.backupInitialDelay || '2m',
      PRUNE_BACKUPS_DAYS: config.backupPruneDays || '7',
      DEST_DIR: config.backupDestDir || '/backups',
    };

    if (strategy.supportsRcon()) {
      env.RCON_HOST = 'mc';
      env.RCON_PORT = config.rconPort || '25575';
      if (config.rconPassword) env.RCON_PASSWORD = config.rconPassword;
      if (config.rconRetries) env.RCON_RETRIES = config.rconRetries;
      if (config.rconRetryInterval) env.RCON_RETRY_INTERVAL = config.rconRetryInterval;
      if (config.enableSaveAll === false) env.ENABLE_SAVE_ALL = 'false';
    } else {
      env.ENABLE_SAVE_ALL = 'false';
    }

    return env;
  }

  private addOptionalBackupEnv(env: Record<string, string>, config: ServerConfig): void {
    if (config.pauseIfNoPlayers !== undefined) env.PAUSE_IF_NO_PLAYERS = String(config.pauseIfNoPlayers);
    if (config.playersOnlineCheckInterval) env.PLAYERS_ONLINE_CHECK_INTERVAL = config.playersOnlineCheckInterval;
    if (config.backupOnStartup !== undefined) env.BACKUP_ON_STARTUP = String(config.backupOnStartup);
    if (config.backupIncludes) env.INCLUDES = config.backupIncludes;
    if (config.backupExcludes) env.EXCLUDES = config.backupExcludes;
    if (config.tarCompressMethod && config.backupMethod === 'tar') env.TAR_COMPRESS_METHOD = config.tarCompressMethod;
    if (config.enableSync === false) env.ENABLE_SYNC = 'false';
  }

  private async addBackupService(dockerComposeConfig: any, config: ServerConfig, serverDir: string): Promise<void> {
    const backupEnv = this.buildBackupEnvironment(config);
    this.addOptionalBackupEnv(backupEnv, config);

    const mcDataPath = path.join(this.BASE_DIR, 'servers', config.id, 'mc-data');
    const backupsPath = path.join(this.BASE_DIR, 'servers', config.id, 'backups');

    dockerComposeConfig.services.backup = {
      image: 'itzg/mc-backup',
      container_name: `${config.id}-backup`,
      depends_on: ['mc'],
      environment: backupEnv,
      volumes: [`${mcDataPath}:/data:ro`, `${backupsPath}:/backups`],
      restart: 'unless-stopped',
    };

    dockerComposeConfig.volumes.backups = {};
    await fs.ensureDir(path.join(serverDir, 'backups'));
  }

  async generateDockerComposeFile(config: ServerConfig, proxyEnabled: boolean = false): Promise<void> {
    const serverDir = path.join(this.SERVERS_DIR, config.id);
    await fs.ensureDir(serverDir);

    const edition = config.edition ?? 'JAVA';
    const strategy = ServerStrategyFactory.create(edition);

    // Use strategy to build environment
    const environment = strategy.buildEnvironment(config);

    // When proxy is enabled, servers don't expose ports to host, so no need to find available port
    // Note: Proxy only works with Java edition (mc-router doesn't support Bedrock)
    const useProxy = proxyEnabled && config.useProxy !== false && edition === 'JAVA';
    const availablePort = useProxy ? strategy.getInternalPort() : await this.ensurePortAvailable(config);
    const volumes = this.parseVolumes(config);
    const dockerComposeConfig = this.buildDockerComposeConfig(config, environment, volumes, availablePort, proxyEnabled, strategy);

    if (config.enableBackup) {
      await this.addBackupService(dockerComposeConfig, config, serverDir);
    }

    let yamlContent = yaml.dump(dockerComposeConfig);

    // Wrap label values in single quotes to handle special characters (backticks, etc.)
    yamlContent = yamlContent.replaceAll(/^(\s+labels:\n)((?:\s+-\s+.+\n)+)/gm, (match, labelsHeader, labelsBlock) => {
      const quotedLabels = labelsBlock.replaceAll(/^(\s+-\s+)(.+)$/gm, (_, prefix, value) => {
        // Skip if already quoted
        if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
          return `${prefix}${value}`;
        }
        // Escape single quotes in value and wrap
        const escaped = value.replaceAll('\'', "''");
        return `${prefix}'${escaped}'`;
      });
      return labelsHeader + quotedLabels;
    });

    await fs.writeFile(this.getDockerComposePath(config.id), yamlContent);
  }
}
