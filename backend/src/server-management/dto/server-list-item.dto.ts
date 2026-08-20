import { ServerIndexEntry } from 'src/docker-compose/server-store.service';
import { ServerConfig } from './server-config.model';

export class ServerListItemDto {
  id: string;
  serverName: string;
  motd: string;
  port: string;
  serverType: 'VANILLA' | 'FORGE' | 'NEOFORGE' | 'AUTO_CURSEFORGE' | 'CURSEFORGE' | 'FTBA' | 'MODRINTH' | 'GTNH' | 'SPIGOT' | 'FABRIC' | 'MAGMA' | 'PAPER' | 'QUILT' | 'BUKKIT' | 'PUFFERFISH' | 'PURPUR' | 'LEAF' | 'FOLIA';
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

  static fromIndexEntries(entries: ServerIndexEntry[]): ServerListItemDto[] {
    return entries.map((entry) => ({
      id: entry.id,
      serverName: entry.serverName || entry.id,
      motd: entry.motd || 'A Minecraft server',
      port: entry.port || '25565',
      serverType: (entry.serverType as ServerListItemDto['serverType']) || 'VANILLA',
      active: entry.active ?? false,
    }));
  }
}
