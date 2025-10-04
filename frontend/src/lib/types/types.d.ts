export interface ServerConfig {
  id: string;
  active: boolean;
  serverType: "VANILLA" | "FORGE" | "AUTO_CURSEFORGE" | "CURSEFORGE" | "SPIGOT" | "FABRIC" | "MAGMA" | "PAPER" | "QUILT" | "BUKKIT";

  // General configuration
  serverName: string;
  motd: string;
  port: string;
  difficulty: "peaceful" | "easy" | "normal" | "hard";
  maxPlayers: string;
  ops: string;
  onlineMode: boolean;
  pvp: boolean;
  commandBlock: boolean;
  allowFlight: boolean;
  gameMode: "survival" | "creative" | "adventure" | "spectator";
  seed?: string;
  levelType: "minecraft:default" | "minecraft:flat" | "minecraft:large_biomes" | "minecraft:amplified" | "minecraft:single_biome_surface";
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
  backupMethod: "tar" | "rsync" | "restic" | "rclone";
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
  tarCompressMethod: "gzip" | "bzip2" | "zstd";

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
  dockerVolumes: string;
  restartPolicy: "no" | "always" | "on-failure" | "unless-stopped";
  stopDelay: string;
  execDirectly: boolean;
  envVars: string;
  extraPorts: string[];

  // Forge specific
  forgeBuild?: string;

  // CurseForge specific
  cfMethod?: "url" | "slug" | "file";
  cfUrl?: string;
  cfSlug?: string;
  cfFile?: string;
  cfApiKey?: string;
  cfSync?: boolean;
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

  // Plugin specific (for SPIGOT, PAPER, BUKKIT)
  spigetResources?: string;
}
