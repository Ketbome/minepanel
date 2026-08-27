import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import { ServerConfig } from 'src/server-management/dto/server-config.model';

export interface ServerIndexEntry {
  id: string;
  serverName?: string;
  motd?: string;
  port?: string;
  serverType?: string;
  edition?: string;
  useProxy?: boolean;
  proxyHostname?: string;
  useAutoScale?: boolean;
  active?: boolean;
}

const INDEX_FILE = 'servers.json';
const CONFIG_FILE = 'server.json';
const RESERVED_DIRS = new Set(['.world']);

@Injectable()
export class ServerStoreService {
  private readonly logger = new Logger(ServerStoreService.name);
  private readonly SERVERS_DIR: string;
  private indexWrites: Promise<unknown> = Promise.resolve();
  private tempWrites = 0;

  constructor(private readonly configService: ConfigService) {
    this.SERVERS_DIR = this.configService.get('serversDir');
  }

  getConfigPath(serverId: string): string {
    return path.join(this.SERVERS_DIR, serverId, CONFIG_FILE);
  }

  private getIndexPath(): string {
    return path.join(this.SERVERS_DIR, INDEX_FILE);
  }

  async readConfig(serverId: string): Promise<ServerConfig | null> {
    const configPath = this.getConfigPath(serverId);

    try {
      if (!(await fs.pathExists(configPath))) {
        return null;
      }
      return (await fs.readJson(configPath)) as ServerConfig;
    } catch (error) {
      this.logger.error(`Unreadable ${CONFIG_FILE} for ${serverId}`, error);
      throw error;
    }
  }

  async writeConfig(config: ServerConfig): Promise<void> {
    if (!config?.id) {
      throw new Error(`Refusing to write ${CONFIG_FILE} without a server id`);
    }
    await fs.ensureDir(path.join(this.SERVERS_DIR, config.id));
    await this.writeJsonAtomic(this.getConfigPath(config.id), this.stripDerived(config));
    await this.upsertIndexEntry(config);
  }

  private stripDerived(config: ServerConfig): Omit<ServerConfig, 'active' | 'serverExists'> {
    const { active: _active, serverExists: _serverExists, ...rest } = config;
    return rest;
  }

  toIndexEntry(config: ServerConfig): ServerIndexEntry {
    return {
      id: config.id,
      serverName: config.serverName,
      motd: config.motd,
      port: config.port,
      serverType: config.serverType,
      edition: config.edition,
      useProxy: config.useProxy,
      proxyHostname: config.proxyHostname,
      useAutoScale: config.useAutoScale,
    };
  }

  async listServerDirs(): Promise<string[]> {
    try {
      if (!(await fs.pathExists(this.SERVERS_DIR))) {
        await fs.ensureDir(this.SERVERS_DIR);
        return [];
      }

      const entries = await fs.readdir(this.SERVERS_DIR, { withFileTypes: true });
      const directories = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .filter((name) => !RESERVED_DIRS.has(name) && !name.startsWith('.'));

      const ids = await Promise.all(
        directories.map(async (dir) => {
          const [hasConfig, hasCompose] = await Promise.all([
            fs.pathExists(path.join(this.SERVERS_DIR, dir, CONFIG_FILE)),
            fs.pathExists(path.join(this.SERVERS_DIR, dir, 'docker-compose.yml')),
          ]);
          return hasConfig || hasCompose ? dir : null;
        }),
      );

      return ids.filter((id): id is string => id !== null);
    } catch (error) {
      this.logger.error('Error listing server directories', error);
      return [];
    }
  }

  async readIndex(): Promise<ServerIndexEntry[] | null> {
    try {
      const indexPath = this.getIndexPath();
      if (!(await fs.pathExists(indexPath))) {
        return null;
      }

      const data = await fs.readJson(indexPath);
      return Array.isArray(data?.servers) ? (data.servers as ServerIndexEntry[]) : null;
    } catch (error) {
      this.logger.warn(`Unreadable ${INDEX_FILE}, it will be rebuilt`, error);
      return null;
    }
  }

  async writeIndex(entries: ServerIndexEntry[]): Promise<void> {
    const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id));
    await this.serializeIndexWrite(() => this.writeJsonAtomic(this.getIndexPath(), { servers: sorted }));
  }

  private async upsertIndexEntry(config: ServerConfig): Promise<void> {
    await this.serializeIndexWrite(async () => {
      const current = (await this.readIndex()) ?? [];
      const next = current.filter((entry) => entry.id !== config.id);
      next.push(this.toIndexEntry(config));
      next.sort((a, b) => a.id.localeCompare(b.id));
      await this.writeJsonAtomic(this.getIndexPath(), { servers: next });
    });
  }

  async removeFromIndex(serverId: string): Promise<void> {
    await this.serializeIndexWrite(async () => {
      const current = await this.readIndex();
      if (!current) return;
      await this.writeJsonAtomic(this.getIndexPath(), { servers: current.filter((entry) => entry.id !== serverId) });
    });
  }

  private serializeIndexWrite<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.indexWrites.then(operation, operation);
    this.indexWrites = next.catch(() => undefined);
    return next;
  }

  private async writeJsonAtomic(target: string, data: unknown): Promise<void> {
    const contents = `${JSON.stringify(data, null, 2)}\n`;
    const temp = `${target}.${process.pid}.${++this.tempWrites}.tmp`;

    try {
      const handle = await fs.open(temp, 'w');
      try {
        await fs.writeFile(handle, contents, 'utf8');
        await fs.fsync(handle);
      } finally {
        await fs.close(handle);
      }

      await fs.rename(temp, target);
      await this.fsyncDirectory(path.dirname(target));
    } catch (error) {
      await fs.remove(temp).catch(() => undefined);
      throw error;
    }
  }

  private async fsyncDirectory(dir: string): Promise<void> {
    try {
      const handle = await fs.open(dir, 'r');
      try {
        await fs.fsync(handle);
      } finally {
        await fs.close(handle);
      }
    } catch (error) {
      this.logger.debug(`Could not fsync ${dir}: ${error.message}`);
    }
  }
}
