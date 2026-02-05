import { ServerConfig } from '../dto/server-config.model';
import { IServerStrategy, ServerEdition } from './server-strategy.interface';

export class BedrockServerStrategy implements IServerStrategy {
  readonly edition: ServerEdition = 'BEDROCK';

  getDockerImage(tag = 'latest'): string {
    return `itzg/minecraft-bedrock-server:${tag}`;
  }

  getDefaultPort(): string {
    return '19132';
  }

  getProtocol(): 'tcp' | 'udp' {
    return 'udp';
  }

  getInternalPort(): string {
    return '19132';
  }

  supportsRcon(): boolean {
    return false;
  }

  supportsBackup(): boolean {
    // mc-backup supports Bedrock but uses filesystem watch instead of RCON
    return true;
  }

  getServerTypes(): string[] {
    return ['VANILLA'];
  }

  buildEnvironment(config: ServerConfig): Record<string, string> {
    const env: Record<string, string> = {
      EULA: 'TRUE',
      SERVER_NAME: config.serverName || config.id,
      GAMEMODE: this.mapGameMode(config.gameMode),
      DIFFICULTY: config.difficulty,
      MAX_PLAYERS: config.maxPlayers,
      ONLINE_MODE: String(config.onlineMode),
      WHITE_LIST: String(config.whiteList ?? false),
      VIEW_DISTANCE: config.viewDistance,
      PLAYER_IDLE_TIMEOUT: config.playerIdleTimeout || '0',
    };

    // Version handling
    if (config.minecraftVersion) {
      env['VERSION'] = config.minecraftVersion;
    }

    // Bedrock-specific options
    if (config.allowCheats !== undefined) {
      env['ALLOW_CHEATS'] = String(config.allowCheats);
    }

    if (config.tickDistance) {
      env['TICK_DISTANCE'] = config.tickDistance;
    }

    if (config.maxThreads) {
      env['MAX_THREADS'] = config.maxThreads;
    }

    if (config.defaultPlayerPermissionLevel) {
      env['DEFAULT_PLAYER_PERMISSION_LEVEL'] = config.defaultPlayerPermissionLevel;
    }

    if (config.texturepackRequired !== undefined) {
      env['TEXTUREPACK_REQUIRED'] = String(config.texturepackRequired);
    }

    if (config.serverPortV6) {
      env['SERVER_PORT_V6'] = config.serverPortV6;
    }

    // Level settings
    if (config.seed) {
      env['LEVEL_SEED'] = config.seed;
    }

    if (config.levelType) {
      env['LEVEL_TYPE'] = this.mapLevelType(config.levelType);
    }

    // OPS uses XUIDs in Bedrock
    if (config.ops) {
      env['OPS'] = config.ops;
    }

    // UID/GID
    if (config.uid) env['UID'] = config.uid;
    if (config.gid) env['GID'] = config.gid;

    // Custom env vars
    this.addCustomEnvVars(env, config);

    return env;
  }

  private mapGameMode(gameMode: string): string {
    // Bedrock uses same gamemode names
    return gameMode || 'survival';
  }

  private mapLevelType(levelType: string): string {
    // Bedrock level types: FLAT, LEGACY, DEFAULT
    const mapping: Record<string, string> = {
      'minecraft:default': 'DEFAULT',
      'minecraft:flat': 'FLAT',
      'minecraft:large_biomes': 'DEFAULT',
      'minecraft:amplified': 'DEFAULT',
      'minecraft:single_biome_surface': 'DEFAULT',
    };
    return mapping[levelType] || 'DEFAULT';
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
      edition: 'BEDROCK',
      serverType: 'VANILLA',
      port: '19132',
      enableRcon: false,
      allowCheats: false,
      tickDistance: '4',
      maxThreads: '8',
      defaultPlayerPermissionLevel: 'member',
      texturepackRequired: false,
    };
  }
}
