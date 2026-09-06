import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import { inspectModpackArchive, ModpackInspection } from './modpack-inspector';
import { copyArchiveWithout, ModpackModScan, scanModpackMods } from './modpack-mods';

export interface ModpackFile {
  name: string;
  size: number;
  modified: Date;
  // Path to use in the server config; `modpacks/` is mounted read-only at /modpacks.
  containerPath: string;
}

export interface InspectedModpackFile extends ModpackFile {
  inspection: ModpackInspection;
}

export const MAX_MODPACK_SIZE = 256 * 1024 * 1024;

const SERVER_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const MODPACK_FILE_PATTERN = /^[\w .()[\]-]+\.(zip|mrpack)$/i;

@Injectable()
export class ModpacksService {
  private readonly logger = new Logger(ModpacksService.name);
  private readonly SERVERS_DIR: string;

  constructor(private readonly configService: ConfigService) {
    this.SERVERS_DIR = this.configService.get('serversDir');
  }

  async list(serverId: string): Promise<ModpackFile[]> {
    const dir = await this.getModpacksDir(serverId);
    const entries = await fs.readdir(dir, { withFileTypes: true });

    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && MODPACK_FILE_PATTERN.test(entry.name))
        .map(async (entry) => {
          const stats = await fs.stat(path.join(dir, entry.name));
          return {
            name: entry.name,
            size: stats.size,
            modified: stats.mtime,
            containerPath: `/modpacks/${entry.name}`,
          };
        }),
    );

    return files.sort((a, b) => a.name.localeCompare(b.name));
  }

  async save(serverId: string, file: Express.Multer.File): Promise<InspectedModpackFile> {
    const name = this.validateFileName(file.originalname);
    const dir = await this.getModpacksDir(serverId);

    await fs.writeFile(path.join(dir, name), file.buffer);
    this.logger.log(`Stored modpack ${name} for server ${serverId}`);

    const stats = await fs.stat(path.join(dir, name));
    return {
      name,
      size: stats.size,
      modified: stats.mtime,
      containerPath: `/modpacks/${name}`,
      // The buffer is still in memory here, so the upload response already carries
      // what the UI needs to pick the install method.
      inspection: inspectModpackArchive(file.buffer),
    };
  }

  // Reading a modpack archive means loading it whole, so `list` stays cheap and
  // inspection is only done for the file the user actually picked.
  async inspect(serverId: string, fileName: string): Promise<ModpackInspection> {
    return inspectModpackArchive(await this.resolveFilePath(serverId, fileName));
  }

  async remove(serverId: string, fileName: string): Promise<void> {
    const name = this.validateFileName(fileName);
    const filePath = path.join(await this.getModpacksDir(serverId), name);

    if (!(await fs.pathExists(filePath))) {
      throw new NotFoundException(`Modpack ${name} not found`);
    }

    await fs.remove(filePath);
    this.logger.log(`Removed modpack ${name} from server ${serverId}`);
  }

  // Reading every mod jar is the slowest thing this service does, so it only
  // happens when the user asks to review a specific archive.
  async scanMods(serverId: string, fileName: string): Promise<ModpackModScan> {
    return scanModpackMods(await this.resolveFilePath(serverId, fileName));
  }

  /**
   * Writes a sibling archive without the given entries and returns it. The
   * original stays put, so a wrong call about a mod's side is one click back.
   */
  async stripMods(serverId: string, fileName: string, entries: string[]): Promise<InspectedModpackFile> {
    if (entries.length === 0) {
      throw new BadRequestException('No mods selected');
    }

    const source = await this.resolveFilePath(serverId, fileName);
    const strippedName = this.validateFileName(fileName.replace(/\.zip$/i, '-server.zip'));
    const buffer = copyArchiveWithout(source, new Set(entries));

    const dir = await this.getModpacksDir(serverId);
    await fs.writeFile(path.join(dir, strippedName), buffer);
    this.logger.log(`Wrote ${strippedName} for server ${serverId} without ${entries.length} mods`);

    const stats = await fs.stat(path.join(dir, strippedName));
    return {
      name: strippedName,
      size: stats.size,
      modified: stats.mtime,
      containerPath: `/modpacks/${strippedName}`,
      inspection: inspectModpackArchive(buffer),
    };
  }

  private async resolveFilePath(serverId: string, fileName: string): Promise<string> {
    const name = this.validateFileName(fileName);
    const filePath = path.join(await this.getModpacksDir(serverId), name);

    if (!(await fs.pathExists(filePath))) {
      throw new NotFoundException(`Modpack ${name} not found`);
    }

    return filePath;
  }

  private async getModpacksDir(serverId: string): Promise<string> {
    if (!SERVER_ID_PATTERN.test(serverId)) {
      throw new BadRequestException('Invalid server ID');
    }

    // A folder name is not a server: require the compose file so reserved ids like
    // "_root" can't be used to scatter directories through the servers dir.
    const serverDir = path.join(this.SERVERS_DIR, serverId);
    if (!(await fs.pathExists(path.join(serverDir, 'docker-compose.yml')))) {
      throw new NotFoundException(`Server ${serverId} not found`);
    }

    const dir = path.join(serverDir, 'modpacks');
    await fs.ensureDir(dir);
    return dir;
  }

  private validateFileName(fileName: string): string {
    const name = path.basename(fileName ?? '');

    if (!MODPACK_FILE_PATTERN.test(name)) {
      throw new BadRequestException('Only .zip (CurseForge) and .mrpack (Modrinth) files are allowed');
    }

    return name;
  }
}
