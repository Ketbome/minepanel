import { IsString, IsOptional, IsBoolean, IsEnum, IsNotEmpty } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class ServerConfigDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsEnum(['VANILLA', 'FORGE', 'AUTO_CURSEFORGE', 'CURSEFORGE', 'SPIGOT', 'FABRIC', 'MAGMA', 'PAPER', 'QUILT', 'BUKKIT', 'PUFFERFISH', 'PURPUR', 'LEAF', 'FOLIA'])
  @IsOptional()
  serverType?: 'VANILLA' | 'FORGE' | 'AUTO_CURSEFORGE' | 'CURSEFORGE' | 'SPIGOT' | 'FABRIC' | 'MAGMA' | 'PAPER' | 'QUILT' | 'BUKKIT' | 'PUFFERFISH' | 'PURPUR' | 'LEAF' | 'FOLIA';

  // General configuration
  @IsString()
  @IsOptional()
  serverName?: string;

  @IsString()
  @IsOptional()
  motd?: string;

  @IsString()
  @IsOptional()
  port?: string;

  @IsEnum(['peaceful', 'easy', 'normal', 'hard'])
  @IsOptional()
  difficulty?: 'peaceful' | 'easy' | 'normal' | 'hard';

  @IsString()
  @IsOptional()
  maxPlayers?: string;

  @IsString()
  @IsOptional()
  ops?: string;

  @IsBoolean()
  @IsOptional()
  onlineMode?: boolean;

  @IsBoolean()
  @IsOptional()
  pvp?: boolean;

  @IsBoolean()
  @IsOptional()
  commandBlock?: boolean;

  @IsBoolean()
  @IsOptional()
  allowFlight?: boolean;

  @IsEnum(['survival', 'creative', 'adventure', 'spectator'])
  @IsOptional()
  gameMode?: 'survival' | 'creative' | 'adventure' | 'spectator';

  @IsString()
  @IsOptional()
  seed?: string;

  @IsEnum(['minecraft:default', 'minecraft:flat', 'minecraft:large_biomes', 'minecraft:amplified', 'minecraft:single_biome_surface'])
  @IsOptional()
  levelType?: 'minecraft:default' | 'minecraft:flat' | 'minecraft:large_biomes' | 'minecraft:amplified' | 'minecraft:single_biome_surface';

  @IsBoolean()
  @IsOptional()
  hardcore?: boolean;

  @IsBoolean()
  @IsOptional()
  spawnAnimals?: boolean;

  @IsBoolean()
  @IsOptional()
  spawnMonsters?: boolean;

  @IsBoolean()
  @IsOptional()
  spawnNpcs?: boolean;

  @IsBoolean()
  @IsOptional()
  generateStructures?: boolean;

  @IsBoolean()
  @IsOptional()
  allowNether?: boolean;

  @IsString()
  @IsOptional()
  entityBroadcastRange?: string;

  @IsBoolean()
  @IsOptional()
  enableAutoStop?: boolean;

  @IsString()
  @IsOptional()
  autoStopTimeoutEst?: string;

  @IsString()
  @IsOptional()
  autoStopTimeoutInit?: string;

  @IsBoolean()
  @IsOptional()
  enableAutoPause?: boolean;

  @IsString()
  @IsOptional()
  autoPauseTimeoutEst?: string;

  @IsString()
  @IsOptional()
  autoPauseTimeoutInit?: string;

  @IsString()
  @IsOptional()
  autoPauseKnockInterface?: string;

  @IsString()
  @IsOptional()
  playerIdleTimeout?: string;

  @IsBoolean()
  @IsOptional()
  preventProxyConnections?: boolean;

  @IsString()
  @IsOptional()
  opPermissionLevel?: string;

  // RCON
  @IsBoolean()
  @IsOptional()
  enableRcon?: boolean;

  @IsString()
  @IsOptional()
  rconPort?: string;

  @IsString()
  @IsOptional()
  rconPassword?: string;

  @IsBoolean()
  @IsOptional()
  broadcastRconToOps?: boolean;

  // Resources
  @IsString()
  @IsOptional()
  initMemory?: string;

  @IsString()
  @IsOptional()
  maxMemory?: string;

  @IsString()
  @IsOptional()
  cpuLimit?: string;

  @IsString()
  @IsOptional()
  cpuReservation?: string;

  @IsString()
  @IsOptional()
  memoryReservation?: string;

  @IsString()
  @IsOptional()
  viewDistance?: string;

  @IsString()
  @IsOptional()
  simulationDistance?: string;

  @IsString()
  @IsOptional()
  uid?: string;

  @IsString()
  @IsOptional()
  gid?: string;

  // Backup configuration
  @IsBoolean()
  @IsOptional()
  enableBackup?: boolean;

  @IsString()
  @IsOptional()
  backupInterval?: string;

  @IsString()
  @IsOptional()
  backupMethod?: string;

  @IsString()
  @IsOptional()
  backupInitialDelay?: string;

  @IsString()
  @IsOptional()
  backupPruneDays?: string;

  @IsString()
  @IsOptional()
  backupDestDir?: string;

  @IsString()
  @IsOptional()
  backupName?: string;

  @IsBoolean()
  @IsOptional()
  useAikarFlags?: boolean;

  @IsBoolean()
  @IsOptional()
  enableJmx?: boolean;

  @IsString()
  @IsOptional()
  jmxHost?: string;

  @IsString()
  @IsOptional()
  jvmOpts?: string;

  @IsString()
  @IsOptional()
  jvmXxOpts?: string;

  @IsString()
  @IsOptional()
  jvmDdOpts?: string;

  @IsString()
  @IsOptional()
  extraArgs?: string;

  @IsString()
  @IsOptional()
  tz?: string;

  @IsBoolean()
  @IsOptional()
  enableRollingLogs?: boolean;

  @IsBoolean()
  @IsOptional()
  logTimestamp?: boolean;

  // Docker
  @IsString()
  @IsOptional()
  dockerImage?: string;

  @IsString()
  @IsOptional()
  minecraftVersion?: string;

  @IsString()
  @IsOptional()
  dockerVolumes?: string;

  @IsEnum(['no', 'always', 'on-failure', 'unless-stopped'])
  @IsOptional()
  restartPolicy?: 'no' | 'always' | 'on-failure' | 'unless-stopped';

  @IsString()
  @IsOptional()
  stopDelay?: string;

  @IsBoolean()
  @IsOptional()
  execDirectly?: boolean;

  @IsString()
  @IsOptional()
  envVars?: string;

  @IsString()
  @IsOptional()
  dockerLabels?: string;

  // Backup includes/excludes
  @IsString()
  @IsOptional()
  backupIncludes?: string;

  @IsString()
  @IsOptional()
  backupExcludes?: string;

  @IsEnum(['gzip', 'bzip2', 'zstd'])
  @IsOptional()
  tarCompressMethod?: 'gzip' | 'bzip2' | 'zstd';

  @IsBoolean()
  @IsOptional()
  backupOnStartup?: boolean;

  @IsBoolean()
  @IsOptional()
  pauseIfNoPlayers?: boolean;

  @IsString()
  @IsOptional()
  playersOnlineCheckInterval?: string;

  @IsString()
  @IsOptional()
  rconRetries?: string;

  @IsString()
  @IsOptional()
  rconRetryInterval?: string;

  @IsBoolean()
  @IsOptional()
  enableSaveAll?: boolean;

  @IsBoolean()
  @IsOptional()
  enableSync?: boolean;

  // Forge specific
  @IsString()
  @IsOptional()
  forgeBuild?: string;

  // Fabric specific
  @IsString()
  @IsOptional()
  fabricLoaderVersion?: string;

  @IsString()
  @IsOptional()
  fabricLauncherVersion?: string;

  @IsString()
  @IsOptional()
  fabricLauncher?: string;

  @IsString()
  @IsOptional()
  fabricLauncherUrl?: string;

  @IsBoolean()
  @IsOptional()
  fabricForceReinstall?: boolean;

  // Modrinth specific
  @IsString()
  @IsOptional()
  modrinthProjects?: string;

  @IsEnum(['none', 'required', 'optional'])
  @IsOptional()
  modrinthDownloadDependencies?: 'none' | 'required' | 'optional';

  @IsEnum(['release', 'beta', 'alpha'])
  @IsOptional()
  modrinthDefaultVersionType?: 'release' | 'beta' | 'alpha';

  @IsString()
  @IsOptional()
  modrinthLoader?: string;

  // Ports
  @IsString({ each: true })
  @IsOptional()
  extraPorts: string[];

  // CurseForge specific
  @IsEnum(['url', 'slug', 'file'])
  @IsOptional()
  cfMethod?: 'url' | 'slug' | 'file';

  @IsString()
  @IsOptional()
  cfUrl?: string;

  @IsString()
  @IsOptional()
  cfSlug?: string;

  @IsString()
  @IsOptional()
  cfFile?: string;

  @IsString()
  @IsOptional()
  cfApiKey?: string;

  @IsBoolean()
  @IsOptional()
  cfSync?: boolean;

  @IsString()
  @IsOptional()
  cfFiles?: string;

  @IsString()
  @IsOptional()
  cfForceInclude?: string;

  @IsString()
  @IsOptional()
  cfExclude?: string;

  @IsString()
  @IsOptional()
  cfFilenameMatcher?: string;

  @IsString()
  @IsOptional()
  cfParallelDownloads?: string;

  @IsBoolean()
  @IsOptional()
  cfOverridesSkipExisting?: boolean;

  @IsString()
  @IsOptional()
  cfSetLevelFrom?: string;

  // Manual CurseForge (deprecated) specific
  @IsString()
  @IsOptional()
  cfServerMod?: string;

  @IsString()
  @IsOptional()
  cfBaseDir?: string;

  @IsBoolean()
  @IsOptional()
  useModpackStartScript?: boolean;

  @IsBoolean()
  @IsOptional()
  ftbLegacyJavaFixer?: boolean;

  // Plugin specific (for SPIGOT, PAPER, BUKKIT, PUFFERFISH, PURPUR, LEAF, FOLIA)
  @IsString()
  @IsOptional()
  spigetResources?: string;

  // Paper specific
  @IsString()
  @IsOptional()
  paperBuild?: string;

  @IsString()
  @IsOptional()
  paperChannel?: string;

  @IsString()
  @IsOptional()
  paperDownloadUrl?: string;

  // Bukkit/Spigot specific
  @IsString()
  @IsOptional()
  bukkitDownloadUrl?: string;

  @IsString()
  @IsOptional()
  spigotDownloadUrl?: string;

  @IsBoolean()
  @IsOptional()
  buildFromSource?: boolean;

  // Pufferfish specific
  @IsString()
  @IsOptional()
  pufferfishBuild?: string;

  @IsBoolean()
  @IsOptional()
  useFlareFlags?: boolean;

  // Purpur specific
  @IsString()
  @IsOptional()
  purpurBuild?: string;

  @IsString()
  @IsOptional()
  purpurDownloadUrl?: string;

  // Leaf specific
  @IsString()
  @IsOptional()
  leafBuild?: string;

  // Folia specific
  @IsString()
  @IsOptional()
  foliaBuild?: string;

  @IsString()
  @IsOptional()
  foliaChannel?: string;

  @IsString()
  @IsOptional()
  foliaDownloadUrl?: string;

  // General Paper/Bukkit/Spigot config
  @IsBoolean()
  @IsOptional()
  skipDownloadDefaults?: boolean;

  // Proxy configuration
  @IsString()
  @IsOptional()
  proxyHostname?: string;

  @IsBoolean()
  @IsOptional()
  useProxy?: boolean;
}

export class UpdateServerConfigDto extends PartialType(ServerConfigDto) {}

export type ServerConfig = ServerConfigDto;
export type UpdateServerConfig = UpdateServerConfigDto;
