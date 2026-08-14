import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import * as path from 'node:path';

export interface ModpackFile {
  name: string;
  size: number;
  modified: Date;
  // Path to use in the server config; `modpacks/` is mounted read-only at /modpacks.
  containerPath: string;
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

  async save(serverId: string, file: Express.Multer.File): Promise<ModpackFile> {
    const name = this.validateFileName(file.originalname);
    const dir = await this.getModpacksDir(serverId);

    await fs.writeFile(path.join(dir, name), file.buffer);
    this.logger.log(`Stored modpack ${name} for server ${serverId}`);

    const stats = await fs.stat(path.join(dir, name));
    return { name, size: stats.size, modified: stats.mtime, containerPath: `/modpacks/${name}` };
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
