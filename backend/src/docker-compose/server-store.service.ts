import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import { ServerConfig } from 'src/server-management/dto/server-config.model';

// Light per-server record used by the two paths that would otherwise open every
// server: the dashboard list and the mc-router routes regeneration.
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
  // Probed from disk when the index is read; never written to servers.json.
  active?: boolean;
}

const INDEX_FILE = 'servers.json';
const CONFIG_FILE = 'server.json';
const RESERVED_DIRS = new Set(['.world']);

/**
 * Owns the two files that describe servers on disk.
 *
 * `servers/<id>/server.json` is the source of truth for one server: the folder
 * stays self-contained, so copying it moves the server.
 *
 * `servers/servers.json` is a derived index and never authoritative. Folders can
 * appear or disappear without going through the panel, so anything that reads
 * the index must tolerate it being stale, and reconciling always lets the
 * per-server file win.
 */
@Injectable()
export class ServerStoreService {
  private readonly logger = new Logger(ServerStoreService.name);
  private readonly SERVERS_DIR: string;
  // The panel is the only writer, but two requests can still race, so index
  // writes are serialised through this chain.
  private indexWrites: Promise<unknown> = Promise.resolve();
  // Only to keep two temp files in the same directory apart.
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
      // A damaged server.json must not read as "no config", or the caller would
      // silently re-import from the compose file and overwrite it.
      this.logger.error(`Unreadable ${CONFIG_FILE} for ${serverId}`, error);
      throw error;
    }
  }

  async writeConfig(config: ServerConfig): Promise<void> {
    // Without an id this lands in `servers/undefined/server.json`, where the next
    // reconcile reads it back as a server called "undefined".
    if (!config?.id) {
      throw new Error(`Refusing to write ${CONFIG_FILE} without a server id`);
    }
    await fs.ensureDir(path.join(this.SERVERS_DIR, config.id));
    await this.writeJsonAtomic(this.getConfigPath(config.id), this.stripDerived(config));
    await this.upsertIndexEntry(config);
  }

  // `active` and `serverExists` are probed from the filesystem on every read, so
  // persisting them would only create a second, staler answer.
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
          // A compose file still counts: servers created before 1.12 have no
          // server.json until they are imported.
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
      // A corrupt index is recoverable: it gets rebuilt from the folders.
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

  /**
   * Write to a temp file, then rename it over the target, so a reader never sees a
   * half-written file and a crash leaves the previous contents rather than nothing.
   *
   * The details matter more here than they look. Losing a `server.json` is not a
   * recoverable "file is missing": `readConfig` cannot tell an empty one from a
   * server that never had one, so the caller re-imports from the generated
   * `docker-compose.yml` and silently drops everything compose does not round-trip.
   */
  private async writeJsonAtomic(target: string, data: unknown): Promise<void> {
    // Serialise up front: a value that cannot be stringified has to fail before
    // anything on disk has been touched.
    const contents = `${JSON.stringify(data, null, 2)}\n`;
    const temp = `${target}.${process.pid}.${++this.tempWrites}.tmp`;

    try {
      const handle = await fs.open(temp, 'w');
      try {
        await fs.writeFile(handle, contents, 'utf8');
        // The rename below can otherwise reach the disk before the bytes do,
        // leaving a renamed but empty file after a power cut.
        await fs.fsync(handle);
      } finally {
        await fs.close(handle);
      }

      // rename(2), not fs-extra's move(): move with overwrite unlinks the
      // destination first (lib/move/move.js, `doRename`), which opens a window
      // where the server has no config at all. rename replaces it in a single
      // step, and is atomic on the same filesystem — which temp always is, being
      // a sibling of the target.
      await fs.rename(temp, target);
      await this.fsyncDirectory(path.dirname(target));
    } catch (error) {
      await fs.remove(temp).catch(() => undefined);
      throw error;
    }
  }

  // A rename only becomes durable once the directory entry itself is flushed.
  private async fsyncDirectory(dir: string): Promise<void> {
    try {
      const handle = await fs.open(dir, 'r');
      try {
        await fs.fsync(handle);
      } finally {
        await fs.close(handle);
      }
    } catch (error) {
      // Not supported on every platform or filesystem (Windows most notably). The
      // rename stays atomic either way; only its durability across a power cut is
      // weaker, so this is worth a log line and not an error.
      this.logger.debug(`Could not fsync ${dir}: ${error.message}`);
    }
  }
}
