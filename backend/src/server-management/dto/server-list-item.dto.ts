import { ServerConfig } from './server-config.model';

export class ServerListItemDto {
  id: string;
  serverName: string;
  motd: string;
  port: string;
  serverType: 'VANILLA' | 'FORGE' | 'NEOFORGE' | 'AUTO_CURSEFORGE' | 'CURSEFORGE' | 'MODRINTH' | 'SPIGOT' | 'FABRIC' | 'MAGMA' | 'PAPER' | 'QUILT' | 'BUKKIT' | 'PUFFERFISH' | 'PURPUR' | 'LEAF' | 'FOLIA';
  active: boolean;

  static fromServerConfig(config: ServerConfig): ServerListItemDto {
    return {
      id: config.id,
      serverName: config.serverName || config.id,
      motd: config.motd || 'A Minecraft server',
      port: config.port || '25565',
      serverType: config.serverType || 'VANILLA',
      active: config.active ?? false,
    };
  }

  static fromServerConfigs(configs: ServerConfig[]): ServerListItemDto[] {
    return configs.map((config) => this.fromServerConfig(config));
  }
}
