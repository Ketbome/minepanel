/**
 * Simplified server list item returned by GET /servers
 * Contains only essential information for display in lists
 */
export interface ServerListItem {
  id: string;
  serverName: string;
  motd: string;
  port: string;
  serverType:
    | 'VANILLA'
    | 'FORGE'
    | 'AUTO_CURSEFORGE'
    | 'CURSEFORGE'
    | 'SPIGOT'
    | 'FABRIC'
    | 'MAGMA'
    | 'PAPER'
    | 'QUILT'
    | 'BUKKIT'
    | 'PUFFERFISH'
    | 'PURPUR'
    | 'LEAF'
    | 'FOLIA';
  active: boolean;
}

/**
 * Complete server configuration
 * Used for detailed server settings and configuration
 */
export interface ServerConfig {
  id: string;
  active: boolean;
  serverType:
    | 'VANILLA'
    | 'FORGE'
    | 'AUTO_CURSEFORGE'
    | 'CURSEFORGE'
    | 'SPIGOT'
    | 'FABRIC'
    | 'MAGMA'
    | 'PAPER'
    | 'QUILT'
    | 'BUKKIT'
    | 'PUFFERFISH'
    | 'PURPUR'
    | 'LEAF'
    | 'FOLIA';

  // General configuration
  serverName: string;
  motd: string;
  port: string;
  difficulty: 'peaceful' | 'easy' | 'normal' | 'hard';
  maxPlayers: string;
  ops: string;
  onlineMode: boolean;
  pvp: boolean;
  commandBlock: boolean;
  allowFlight: boolean;
  gameMode: 'survival' | 'creative' | 'adventure' | 'spectator';
  seed?: string;
  levelType:
    | 'minecraft:default'
    | 'minecraft:flat'
    | 'minecraft:large_biomes'
    | 'minecraft:amplified'
    | 'minecraft:single_biome_surface';
  hardcore: boolean;
  spawnAnimals: boolean;
  spawnMonsters: boolean;
  spawnNpcs: boolean;
  generateStructures: boolean;
  allowNether: boolean;
  entityBroadcastRange: string;

  enableAutoStop: boolean;
  autoStopTimeoutEst: string;
  autoStopTimeoutInit: string;

  enableAutoPause: boolean;
  autoPauseTimeoutEst: string;
  autoPauseTimeoutInit: string;
  autoPauseKnockInterface: string;

  playerIdleTimeout: string;
  preventProxyConnections: boolean;
  opPermissionLevel: string;

  // RCON
  enableRcon: boolean;
  rconPort: string;
  rconPassword: string;
  broadcastRconToOps: boolean;

  // Resources
  initMemory: string;
  maxMemory: string;
  cpuLimit: string;
  cpuReservation: string;
  memoryReservation: string;
  viewDistance: string;
  simulationDistance: string;
  uid: string;
  gid: string;

  // Backup configuration
  enableBackup: boolean;
  backupInterval: string;
  backupMethod: 'tar' | 'rsync' | 'restic' | 'rclone';
  backupInitialDelay: string;
  backupPruneDays: string;
  backupDestDir: string;
  backupName: string;
  backupOnStartup: boolean;
  pauseIfNoPlayers: boolean;
  playersOnlineCheckInterval: string;
  rconRetries: string;
  rconRetryInterval: string;
  backupIncludes: string;
  backupExcludes: string;
  tarCompressMethod: 'gzip' | 'bzip2' | 'zstd';
  enableSaveAll: boolean;
  enableSync: boolean;

  useAikarFlags: boolean;
  enableJmx: boolean;
  jmxHost: string;
  jvmOpts: string;
  jvmXxOpts: string;
  jvmDdOpts: string;
  extraArgs: string;
  tz: string;
  enableRollingLogs: boolean;
  logTimestamp: boolean | undefined;

  // Docker
  dockerImage: string;
  minecraftVersion: string;
  dockerVolumes?: string;
  restartPolicy: 'no' | 'always' | 'on-failure' | 'unless-stopped';
  stopDelay: string;
  execDirectly: boolean;
  envVars: string;
  dockerLabels?: string;
  extraPorts: string[];

  // Forge specific
  forgeBuild?: string;

  // Fabric specific
  fabricLoaderVersion?: string;
  fabricLauncherVersion?: string;
  fabricLauncher?: string;
  fabricLauncherUrl?: string;
  fabricForceReinstall?: boolean;

  // Modrinth specific
  modrinthProjects?: string;
  modrinthDownloadDependencies?: 'none' | 'required' | 'optional';
  modrinthDefaultVersionType?: 'release' | 'beta' | 'alpha';
  modrinthLoader?: string;

  // CurseForge specific
  cfMethod?: 'url' | 'slug' | 'file';
  cfUrl?: string;
  cfSlug?: string;
  cfFile?: string;
  cfApiKey?: string;
  cfSync?: boolean;
  cfFiles?: string;
  cfForceInclude?: string;
  cfExclude?: string;
  cfFilenameMatcher?: string;
  cfParallelDownloads?: string;
  cfOverridesSkipExisting?: boolean;
  cfSetLevelFrom?: string;

  // Manual CurseForge (deprecated) specific
  cfServerMod?: string;
  cfBaseDir?: string;
  useModpackStartScript?: boolean;
  ftbLegacyJavaFixer?: boolean;

  // Plugin specific (for SPIGOT, PAPER, BUKKIT, PUFFERFISH, PURPUR, LEAF, FOLIA)
  spigetResources?: string;

  // Paper specific
  paperBuild?: string;
  paperChannel?: string;
  paperDownloadUrl?: string;

  // Bukkit/Spigot specific
  bukkitDownloadUrl?: string;
  spigotDownloadUrl?: string;
  buildFromSource?: boolean;

  // Pufferfish specific
  pufferfishBuild?: string;
  useFlareFlags?: boolean;

  // Purpur specific
  purpurBuild?: string;
  purpurDownloadUrl?: string;

  // Leaf specific
  leafBuild?: string;

  // Folia specific
  foliaBuild?: string;
  foliaChannel?: string;
  foliaDownloadUrl?: string;

  // General Paper/Bukkit/Spigot config
  skipDownloadDefaults?: boolean;

  // Proxy configuration
  proxyHostname?: string;
  useProxy?: boolean;
}
