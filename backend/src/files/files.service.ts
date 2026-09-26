import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Archiver, ZipArchive } from 'archiver';
import { assertContained } from 'src/common/fs/contained-path';

const SERVER_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export const UPLOADS_DIR = '.uploads';

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: Date;
  extension?: string;
}

@Injectable()
export class FilesService {
  private readonly SERVERS_DIR: string;

  constructor(private readonly configService: ConfigService) {
    this.SERVERS_DIR = this.configService.get('serversDir');
    fs.ensureDirSync(path.join(this.SERVERS_DIR, '.world', 'worlds'));
    // Leftovers from uploads cut short by a restart.
    fs.emptyDirSync(path.join(this.SERVERS_DIR, UPLOADS_DIR));
  }

  private getBasePath(serverId: string): string {
    // "_root" means the servers directory itself
    if (serverId === '_root') {
      return this.SERVERS_DIR;
    }

    // ".world" means global world library directory
    if (serverId === '.world') {
      return path.join(this.SERVERS_DIR, '.world', 'worlds');
    }

    // serverId is a decoded route param ("..%2F" arrives as "../"), so it must never shape the base path
    if (!SERVER_ID_PATTERN.test(serverId)) {
      throw new BadRequestException('Invalid server id');
    }

    return path.join(this.SERVERS_DIR, serverId, 'mc-data');
  }

  // `followLast` is off for operations on the entry itself (delete, rename), so
  // a link planted by the container can still be removed without following it.
  private async validatePath(serverId: string, filePath: string, write = false, followLast = true, admin = false): Promise<string> {
    const basePath = this.getBasePath(serverId);
    const fullPath = path.join(basePath, filePath || '');
    const normalized = path.normalize(fullPath);

    // Prevent path traversal attacks; the separator keeps siblings like "servers-old" out
    if (normalized !== basePath && !normalized.startsWith(basePath + path.sep)) {
      throw new BadRequestException('Invalid path');
    }

    await assertContained(write && !admin ? this.getWritableRoot(serverId, normalized) : basePath, followLast ? normalized : path.dirname(normalized));
    return normalized;
  }

  // "_root" can read the whole servers directory, but non-admin writes stay inside a
  // server's mc-data or the world library: server.json, compose files and
  // .env there are compiled into host mounts and the panel's own environment.
  private getWritableRoot(serverId: string, fullPath: string): string {
    if (serverId !== '_root') {
      return this.getBasePath(serverId);
    }

    const [first, second] = path.relative(this.SERVERS_DIR, fullPath).split(path.sep);
    const root = first === '.world' ? path.join(this.SERVERS_DIR, '.world') : second === 'mc-data' && SERVER_ID_PATTERN.test(first) ? path.join(this.SERVERS_DIR, first, 'mc-data') : null;

    if (!root || fullPath === root) {
      throw new BadRequestException('Only server data and the world library can be modified here');
    }

    return root;
  }

  async listFiles(serverId: string, dirPath: string = ''): Promise<FileItem[]> {
    const fullPath = await this.validatePath(serverId, dirPath);

    if (!(await fs.pathExists(fullPath))) {
      throw new NotFoundException('Directory not found');
    }

    const stats = await fs.stat(fullPath);
    if (!stats.isDirectory()) {
      throw new BadRequestException('Path is not a directory');
    }

    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const files: FileItem[] = [];

    for (const entry of entries) {
      const entryPath = path.join(fullPath, entry.name);
      const relativePath = path.join(dirPath, entry.name);

      try {
        const stat = await fs.stat(entryPath);
        files.push({
          name: entry.name,
          path: relativePath,
          isDirectory: entry.isDirectory(),
          size: stat.size,
          modified: stat.mtime,
          extension: entry.isDirectory() ? undefined : path.extname(entry.name).slice(1) || undefined,
        });
      } catch {
        // Skip files we can't stat
      }
    }

    // Sort: directories first, then by name
    return files.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  async readFile(serverId: string, filePath: string): Promise<{ content: string; encoding: string }> {
    const fullPath = await this.validatePath(serverId, filePath);

    if (!(await fs.pathExists(fullPath))) {
      throw new NotFoundException('File not found');
    }

    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      throw new BadRequestException('Path is a directory');
    }

    // Limit file size to 5MB for text reading
    if (stats.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File too large to read (max 5MB)');
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    return { content, encoding: 'utf-8' };
  }

  async writeFile(serverId: string, filePath: string, content: string, admin = false): Promise<void> {
    const fullPath = await this.validatePath(serverId, filePath, true, true, admin);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  // Multer stages complete uploads under UPLOADS_DIR; only then are they moved into place.
  async saveUpload(serverId: string, filePath: string, stagedPath: string, admin = false): Promise<void> {
    const fullPath = await this.validatePath(serverId, filePath, true, true, admin);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.move(stagedPath, fullPath, { overwrite: true });
  }

  async deleteFile(serverId: string, filePath: string, admin = false): Promise<void> {
    const fullPath = await this.validatePath(serverId, filePath, true, false, admin);

    if (!(await fs.lstat(fullPath).catch(() => null))) {
      throw new NotFoundException('File not found');
    }

    await fs.remove(fullPath);
  }

  async createDirectory(serverId: string, dirPath: string, admin = false): Promise<void> {
    const fullPath = await this.validatePath(serverId, dirPath, true, true, admin);
    await fs.ensureDir(fullPath);
  }

  async rename(serverId: string, oldPath: string, newName: string, admin = false): Promise<void> {
    const fullOldPath = await this.validatePath(serverId, oldPath, true, false, admin);
    const newPath = path.join(path.dirname(fullOldPath), newName);

    // Validate new path is still within server directory
    await this.validatePath(serverId, path.join(path.dirname(oldPath), newName), true, false, admin);

    if (!(await fs.lstat(fullOldPath).catch(() => null))) {
      throw new NotFoundException('File not found');
    }

    if (await fs.pathExists(newPath)) {
      throw new BadRequestException('A file with that name already exists');
    }

    await fs.rename(fullOldPath, newPath);
  }

  async getFileInfo(serverId: string, filePath: string): Promise<FileItem> {
    const fullPath = await this.validatePath(serverId, filePath);

    if (!(await fs.pathExists(fullPath))) {
      throw new NotFoundException('File not found');
    }

    const stats = await fs.stat(fullPath);
    const name = path.basename(fullPath);

    return {
      name,
      path: filePath,
      isDirectory: stats.isDirectory(),
      size: stats.size,
      modified: stats.mtime,
      extension: stats.isDirectory() ? undefined : path.extname(name).slice(1) || undefined,
    };
  }

  getFullPath(serverId: string, filePath: string): Promise<string> {
    return this.validatePath(serverId, filePath);
  }

  async createZipStream(serverId: string, dirPath: string): Promise<{ stream: Archiver; name: string }> {
    const fullPath = await this.validatePath(serverId, dirPath);

    if (!(await fs.pathExists(fullPath))) {
      throw new NotFoundException('Directory not found');
    }

    const stats = await fs.stat(fullPath);
    if (!stats.isDirectory()) {
      throw new BadRequestException('Path is not a directory');
    }

    const folderName = path.basename(fullPath);
    const archive = new ZipArchive({ zlib: { level: 6 } });

    archive.directory(fullPath, folderName);
    archive.finalize();

    return { stream: archive, name: `${folderName}.zip` };
  }
}
