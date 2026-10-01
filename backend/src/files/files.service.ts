import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { constants } from 'fs';
import { Archiver, ZipArchive } from 'archiver';
import { assertContained } from 'src/common/fs/contained-path';

const SERVER_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export const UPLOADS_DIR = '.uploads';
export const UPLOAD_SESSIONS_DIR = '.upload-sessions';

// Half-received uploads sit inside the tree "_root" shows, and they belong to whoever is
// sending them, so the global browser keeps them from everyone but admins.
const STAGING_DIRS = new Set([UPLOADS_DIR, UPLOAD_SESSIONS_DIR]);

// server.json and the generated compose file hold secrets (the CurseForge key, RCON and
// restic passwords), so the global browser only shows them to admins.
const ADMIN_ONLY_FILES = new Set(['server.json', 'docker-compose.yml']);

function isAdminOnlyFile(serversDir: string, fullPath: string): boolean {
  const [id, file, ...rest] = path.relative(serversDir, fullPath).split(path.sep);
  if (STAGING_DIRS.has(id)) return true;
  return rest.length === 0 && SERVER_ID_PATTERN.test(id) && ADMIN_ONLY_FILES.has(file);
}

// An overwriting move removes whatever is there first, a whole folder included, so an
// upload never replaces a folder; a file only when the caller chose to overwrite.
function assertReplaceable(existing: fs.Stats | null, overwrite: boolean): void {
  if (existing?.isDirectory()) {
    throw new BadRequestException('A folder with that name already exists');
  }
  if (existing && !overwrite) {
    throw new ConflictException('A file with that name already exists');
  }
}

// link() fails with EEXIST when the name is taken, in one step. Checking first and renaming
// after leaves a gap (fs-extra's move does exactly that) in which a file made by someone else
// is replaced: 24 uploads racing for one name all "won".
async function moveWithoutReplacing(stagedPath: string, fullPath: string): Promise<void> {
  try {
    await fs.link(stagedPath, fullPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new ConflictException('A file with that name already exists');
    }

    // No hard link between these two places (another device, a filesystem without them,
    // as on some Docker Desktop mounts): move it, whose own name check is not atomic.
    try {
      await fs.move(stagedPath, fullPath, { overwrite: false });
    } catch (moveError) {
      if (/dest already exists/.test((moveError as Error).message)) {
        throw new ConflictException('A file with that name already exists');
      }
      throw moveError;
    }
    return;
  }
  await fs.remove(stagedPath);
}

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
    if (!write && !admin && serverId === '_root') await this.assertNotAdminOnly(normalized);
    return normalized;
  }

  // The resolved path counts too: the container can leave a link to ../server.json in mc-data.
  private async assertNotAdminOnly(fullPath: string): Promise<void> {
    const [root, real] = await Promise.all([fs.realpath(this.SERVERS_DIR), fs.realpath(fullPath).catch(() => fullPath)]);
    if (isAdminOnlyFile(this.SERVERS_DIR, fullPath) || isAdminOnlyFile(root, real)) {
      throw new ForbiddenException('Only admins can read this file');
    }
  }

  // "_root" can read the whole servers directory, but non-admin writes stay inside a
  // server's mc-data and the world libraries (shared and per server): server.json,
  // compose files and .env there are compiled into host mounts and the panel's own
  // environment. The folders themselves cannot be deleted or renamed.
  private getWritableRoot(serverId: string, fullPath: string): string {
    if (serverId !== '_root') {
      return this.getBasePath(serverId);
    }

    const [first, second] = path.relative(this.SERVERS_DIR, fullPath).split(path.sep);
    const shared = first === '.world' && second === 'worlds';
    const own = SERVER_ID_PATTERN.test(first) && (second === 'mc-data' || second === 'worlds');
    const root = shared || own ? path.join(this.SERVERS_DIR, first, second) : null;

    if (!root || fullPath === root) {
      throw new BadRequestException('Only server data and the world library can be modified here');
    }

    return root;
  }

  async listFiles(serverId: string, dirPath: string = '', admin = false): Promise<FileItem[]> {
    const fullPath = await this.validatePath(serverId, dirPath, false, true, admin);

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
      if (!admin && serverId === '_root' && isAdminOnlyFile(this.SERVERS_DIR, entryPath)) continue;

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

  async readFile(serverId: string, filePath: string, admin = false): Promise<{ content: string; encoding: string }> {
    const fullPath = await this.validatePath(serverId, filePath, false, true, admin);

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
    if (path.basename(fullPath) === 'server.properties' && await fs.pathExists(fullPath)) {
      const backupPath = `${fullPath}.${new Date().toISOString().replace(/[:.]/g, '-')}.${randomUUID()}.bak`;
      await fs.copyFile(fullPath, backupPath, constants.COPYFILE_EXCL);
    }
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  // Checked before a chunked upload starts, so a refused target costs no transfer.
  async assertUploadTarget(serverId: string, filePath: string, admin = false, overwrite = true): Promise<void> {
    const fullPath = await this.validatePath(serverId, filePath, true, true, admin);
    assertReplaceable(await fs.stat(fullPath).catch(() => null), overwrite);
  }

  // Multer stages complete uploads under UPLOADS_DIR; only then are they moved into place.
  async saveUpload(serverId: string, filePath: string, stagedPath: string, admin = false, overwrite = true): Promise<void> {
    const fullPath = await this.validatePath(serverId, filePath, true, true, admin);
    await fs.ensureDir(path.dirname(fullPath));
    // The move replaces the inode, so a replaced file would end up owned by the panel
    // and the server could no longer rewrite it.
    const existing = await fs.stat(fullPath).catch(() => null);
    assertReplaceable(existing, overwrite);
    if (existing) {
      await fs.chown(stagedPath, existing.uid, existing.gid);
      await fs.chmod(stagedPath, existing.mode);
    }
    // The stat above is stale by now (chown, chmod and ensureDir are awaits), so keeping
    // a file that appeared meanwhile is decided by the move itself.
    if (overwrite) {
      await fs.move(stagedPath, fullPath, { overwrite: true });
    } else {
      await moveWithoutReplacing(stagedPath, fullPath);
    }
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

  async getFileInfo(serverId: string, filePath: string, admin = false): Promise<FileItem> {
    const fullPath = await this.validatePath(serverId, filePath, false, true, admin);

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

  getFullPath(serverId: string, filePath: string, admin = false): Promise<string> {
    return this.validatePath(serverId, filePath, false, true, admin);
  }

  // One folder, or a selection of files and folders, streamed as a single archive.
  async createZipStream(serverId: string, paths: string[], admin = false): Promise<{ stream: Archiver; name: string }> {
    if (paths.length === 0) {
      throw new BadRequestException('Path is required');
    }

    const entries: Array<{ fullPath: string; isDirectory: boolean }> = [];
    for (const entryPath of paths) {
      const fullPath = await this.validatePath(serverId, entryPath, false, true, admin);
      const stats = await fs.stat(fullPath).catch(() => null);
      if (!stats) {
        throw new NotFoundException('Path not found');
      }
      entries.push({ fullPath, isDirectory: stats.isDirectory() });
    }

    if (entries.length === 1 && !entries[0].isDirectory) {
      throw new BadRequestException('Path is not a directory');
    }

    const archive = new ZipArchive({ zlib: { level: 6 } });
    const hidden = !admin && serverId === '_root';

    for (const { fullPath, isDirectory } of entries) {
      const name = path.basename(fullPath);
      if (isDirectory) {
        archive.directory(fullPath, name, (entry) => (hidden && isAdminOnlyFile(this.SERVERS_DIR, path.join(fullPath, entry.name)) ? false : entry));
      } else {
        archive.file(fullPath, { name });
      }
    }
    archive.finalize();

    // A selection is named after the folder it was made in.
    const base = entries.length === 1 ? entries[0].fullPath : path.dirname(entries[0].fullPath);
    return { stream: archive, name: `${path.basename(base) || 'files'}.zip` };
  }
}
