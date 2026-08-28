import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs-extra';
import * as net from 'node:net';
import * as path from 'path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { SettingsService } from 'src/users/services/settings.service';

export interface LibraryWorld {
  /** Path relative to the library root; what a server stores as `worldSource`. */
  source: string;
  name: string;
  folder: string;
  type: 'directory' | 'archive';
  sizeBytes: number;
  modifiedAt: string;
}

export interface DiscoverWorldResult {
  provider: 'curseforge';
  projectId: string;
  name: string;
  summary: string;
  slug: string;
  downloads?: number;
  iconUrl?: string;
  fileId?: number;
  fileName?: string;
  importable: boolean;
}

export interface DiscoverWorldsResponse {
  data: DiscoverWorldResult[];
  pagination: {
    index: number;
    pageSize: number;
    resultCount: number;
    totalCount: number;
  };
}

interface CurseForgeAsset {
  url?: string;
  thumbnailUrl?: string;
}

interface CurseForgeFile {
  id: number;
  fileName: string;
  downloadUrl?: string;
}

interface CurseForgeProject {
  id: number;
  name: string;
  slug: string;
  summary?: string;
  downloadCount?: number;
  logo?: CurseForgeAsset;
  links?: {
    websiteUrl?: string;
  };
  screenshots?: Array<{
    url?: string;
    thumbnailUrl?: string;
  }>;
  latestFiles?: CurseForgeFile[];
}

interface CurseForgeSearchResponse {
  data: CurseForgeProject[];
  pagination: {
    index: number;
    pageSize: number;
    resultCount: number;
    totalCount: number;
  };
}

interface CurseForgeProjectResponse {
  data: CurseForgeProject;
}

interface CurseForgeFileResponse {
  data: CurseForgeFile;
}

@Injectable()
export class WorldDiscoveryService {
  private readonly logger = new Logger(WorldDiscoveryService.name);
  private readonly CURSEFORGE_API_BASE = 'https://api.curseforge.com/v1';
  private readonly MINECRAFT_GAME_ID = 432;
  private readonly WORLD_CLASS_ID = 17;
  private readonly WORLD_LIBRARY_PATH: string;
  private readonly MAX_WORLD_ARCHIVE_BYTES = 1024 * 1024 * 1024;
  private readonly DOWNLOAD_TIMEOUT_MS = 60_000;

  constructor(
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService,
  ) {
    const serversDir = this.configService.get<string>('serversDir');
    this.WORLD_LIBRARY_PATH = path.join(serversDir, '.world', 'worlds');
    fs.ensureDirSync(this.WORLD_LIBRARY_PATH);
  }

  async searchCurseForgeWorlds(
    userId: number,
    query: { q?: string; pageSize?: number; index?: number },
  ): Promise<DiscoverWorldsResponse> {
    const apiKey = await this.getCurseForgeApiKey(userId);
    const client = this.getCurseForgeClient(apiKey);

    try {
      const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 30);
      const index = Math.max(query.index ?? 0, 0);
      const response = await client.get<CurseForgeSearchResponse>('/mods/search', {
        params: {
          gameId: this.MINECRAFT_GAME_ID,
          classId: this.WORLD_CLASS_ID,
          searchFilter: query.q,
          pageSize,
          index,
          sortField: 2,
          sortOrder: 'desc',
        },
      });

      const results = response.data.data.map((project) => {
        const latestFile = this.pickLatestImportableFile(project.latestFiles ?? []);
        return {
          provider: 'curseforge' as const,
          projectId: project.id.toString(),
          name: project.name,
          summary: project.summary ?? '',
          slug: project.slug,
          downloads: project.downloadCount,
          iconUrl: project.logo?.thumbnailUrl || project.logo?.url,
          fileId: latestFile?.id,
          fileName: latestFile?.fileName,
          importable: !!latestFile,
        };
      });

      return {
        data: results,
        pagination: {
          index,
          pageSize,
          resultCount: results.length,
          totalCount: response.data.pagination.totalCount,
        },
      };
    } catch (error) {
      this.handleCurseForgeError(error, 'Error searching CurseForge worlds');
    }
  }

  async importFromCurseForge(userId: number, payload: { projectId: string; fileId?: number; targetFolder?: string }) {
    const apiKey = await this.getCurseForgeApiKey(userId);
    const client = this.getCurseForgeClient(apiKey);
    const projectId = Number.parseInt(payload.projectId, 10);

    if (!Number.isFinite(projectId) || projectId <= 0) {
      throw new BadRequestException('Invalid projectId');
    }

    try {
      let file: CurseForgeFile | null = null;

      if (payload.fileId) {
        const fileResponse = await client.get<CurseForgeFileResponse>(`/mods/${projectId}/files/${payload.fileId}`);
        file = fileResponse.data.data;
      } else {
        const projectResponse = await client.get<CurseForgeProjectResponse>(`/mods/${projectId}`);
        file = this.pickLatestImportableFile(projectResponse.data.data.latestFiles ?? []) || null;
      }

      if (!file) {
        throw new BadRequestException('No importable archive file found for this world');
      }
      if (!file.downloadUrl) {
        throw new BadRequestException('CurseForge did not provide a downloadable file URL');
      }

      const fileName = this.sanitizeFileName(file.fileName || `curseforge-world-${projectId}.zip`);
      const saved = await this.downloadWorldArchive({
        provider: 'curseforge',
        downloadUrl: file.downloadUrl,
        fileName,
        targetFolder: payload.targetFolder,
      });

      return {
        success: true,
        provider: 'curseforge' as const,
        source: 'remote',
        projectId: payload.projectId,
        fileId: file.id,
        ...saved,
      };
    } catch (error) {
      this.handleCurseForgeError(error, 'Error importing world from CurseForge');
    }
  }

  async importFromUrl(payload: { downloadUrl: string; fileName?: string; targetFolder?: string }) {
    if (!payload.downloadUrl) {
      throw new BadRequestException('downloadUrl is required');
    }

    const inferredName = this.inferFileNameFromUrl(payload.downloadUrl);
    const safeName = this.sanitizeFileName(payload.fileName || inferredName || 'downloaded-world.zip');

    const saved = await this.downloadWorldArchive({
      provider: 'url',
      downloadUrl: payload.downloadUrl,
      fileName: safeName,
      targetFolder: payload.targetFolder,
    });

    return {
      success: true,
      provider: 'url' as const,
      source: 'remote',
      ...saved,
    };
  }

  async getCurseForgeWorldDetails(userId: number, projectId: string) {
    const apiKey = await this.getCurseForgeApiKey(userId);
    const client = this.getCurseForgeClient(apiKey);
    const parsedProjectId = Number.parseInt(projectId, 10);

    if (!Number.isFinite(parsedProjectId) || parsedProjectId <= 0) {
      throw new BadRequestException('Invalid projectId');
    }

    try {
      const response = await client.get<CurseForgeProjectResponse>(`/mods/${parsedProjectId}`);
      const project = response.data.data;

      return {
        provider: 'curseforge' as const,
        projectId: project.id.toString(),
        name: project.name,
        summary: project.summary ?? '',
        slug: project.slug,
        downloads: project.downloadCount,
        iconUrl: project.logo?.thumbnailUrl || project.logo?.url,
        websiteUrl: project.links?.websiteUrl,
        screenshots: (project.screenshots ?? [])
          .map((item) => item.thumbnailUrl || item.url)
          .filter((value): value is string => !!value),
      };
    } catch (error) {
      this.handleCurseForgeError(error, 'Error loading CurseForge world details');
    }
  }

  private async downloadWorldArchive(payload: {
    provider: 'curseforge' | 'url';
    downloadUrl: string;
    fileName: string;
    targetFolder?: string;
  }) {
    this.validateRemoteUrl(payload.downloadUrl, payload.provider);
    this.ensureSupportedArchive(payload.fileName);

    const destinationDir = this.resolveDestinationDir(payload.provider, payload.targetFolder);
    await fs.ensureDir(destinationDir);

    const destinationPath = await this.resolveAvailablePath(destinationDir, payload.fileName);
    const tempPath = `${destinationPath}.part`;

    try {
      const response = await axios.get<Readable>(payload.downloadUrl, {
        responseType: 'stream',
        timeout: this.DOWNLOAD_TIMEOUT_MS,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 300,
      });

      const contentLength = Number(response.headers['content-length'] ?? 0);
      if (contentLength > this.MAX_WORLD_ARCHIVE_BYTES) {
        throw new PayloadTooLargeException('World archive is too large');
      }

      const stream = response.data;
      let downloaded = 0;

      stream.on('data', (chunk: Buffer) => {
        downloaded += chunk.length;
        if (downloaded > this.MAX_WORLD_ARCHIVE_BYTES) {
          stream.destroy(new PayloadTooLargeException('World archive is too large'));
        }
      });

      await pipeline(stream, fs.createWriteStream(tempPath));
      await fs.move(tempPath, destinationPath, { overwrite: false });

      const relativePath = path.relative(this.WORLD_LIBRARY_PATH, destinationPath).split(path.sep).join('/');
      return {
        fileName: path.basename(destinationPath),
        filePath: relativePath,
        bytes: downloaded || contentLength,
      };
    } catch (error) {
      await fs.remove(tempPath).catch(() => undefined);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException('Failed to download world archive');
    }
  }

  private getCurseForgeClient(apiKey: string): AxiosInstance {
    return axios.create({
      baseURL: this.CURSEFORGE_API_BASE,
      timeout: this.DOWNLOAD_TIMEOUT_MS,
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json',
      },
    });
  }

  private async getCurseForgeApiKey(userId: number): Promise<string> {
    // Must go through getCfApiKey: the column holds the encrypted value, and
    // reading it off the entity sends ciphertext to CurseForge as the key.
    const apiKey = await this.settingsService.getCfApiKey(userId);
    if (!apiKey) {
      throw new BadRequestException('CurseForge API key not configured. Please add it in settings.');
    }
    return apiKey;
  }

  private pickLatestImportableFile(files: CurseForgeFile[]): CurseForgeFile | undefined {
    return files.find((file) => !!file.downloadUrl && this.isSupportedArchive(file.fileName));
  }

  private inferFileNameFromUrl(downloadUrl: string): string | undefined {
    try {
      const url = new URL(downloadUrl);
      const pathname = decodeURIComponent(url.pathname || '');
      return pathname.split('/').filter(Boolean).pop();
    } catch {
      return undefined;
    }
  }

  /**
   * Everything sitting in the shared world library.
   *
   * A world is a folder holding a `level.dat` or a supported archive, the same
   * rule the per-server world picker uses, so both lists agree on what counts.
   * Folders are walked into, which is how imports land: they are grouped under
   * `curseforge/` or `url/`.
   */
  async listLibraryWorlds(): Promise<LibraryWorld[]> {
    await fs.ensureDir(this.WORLD_LIBRARY_PATH);
    const worlds = await this.collectLibraryWorlds(this.WORLD_LIBRARY_PATH);
    worlds.sort((a, b) => a.source.localeCompare(b.source));
    return worlds;
  }

  private async collectLibraryWorlds(basePath: string, relativePath = '', depth = 0): Promise<LibraryWorld[]> {
    if (depth > 8) return [];

    const entries = await fs.readdir(basePath, { withFileTypes: true });
    const worlds: LibraryWorld[] = [];

    for (const entry of entries) {
      const source = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      const fullPath = path.join(basePath, entry.name);

      if (entry.isDirectory()) {
        if (await fs.pathExists(path.join(fullPath, 'level.dat'))) {
          worlds.push(await this.describeLibraryWorld(fullPath, source, entry.name, 'directory'));
          continue;
        }

        worlds.push(...(await this.collectLibraryWorlds(fullPath, source, depth + 1)));
        continue;
      }

      if (entry.isFile() && this.isSupportedArchive(entry.name)) {
        worlds.push(await this.describeLibraryWorld(fullPath, source, entry.name, 'archive'));
      }
    }

    return worlds;
  }

  private async describeLibraryWorld(
    fullPath: string,
    source: string,
    name: string,
    type: 'directory' | 'archive',
  ): Promise<LibraryWorld> {
    const stats = await fs.stat(fullPath);
    const separator = source.lastIndexOf('/');

    return {
      source,
      name,
      folder: separator === -1 ? '' : source.slice(0, separator),
      type,
      // Directory sizes would mean walking every region file on every request,
      // which is the expensive part of a world. Only archives report a size.
      sizeBytes: type === 'archive' ? stats.size : 0,
      modifiedAt: stats.mtime.toISOString(),
    };
  }

  private sanitizeFileName(fileName: string): string {
    const cleaned = fileName
      .trim()
      .replaceAll(/[^a-zA-Z0-9._()\-\s]/g, '-')
      .replaceAll(/\s+/g, ' ')
      .replace(/^\.+/, '')
      .trim();
    if (!cleaned) return `world-${Date.now()}.zip`;
    return cleaned;
  }

  private resolveDestinationDir(provider: 'curseforge' | 'url', targetFolder?: string): string {
    const providerFolder = provider === 'curseforge' ? 'curseforge' : 'url';
    const root = path.join(this.WORLD_LIBRARY_PATH, providerFolder);
    if (!targetFolder?.trim()) return root;

    const cleanedSegments = targetFolder
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean)
      .map((segment) => segment.replaceAll(/[^a-zA-Z0-9._()\-\s]/g, '-'));

    const destination = path.normalize(path.join(root, ...cleanedSegments));
    if (!destination.startsWith(root)) {
      throw new BadRequestException('Invalid target folder');
    }
    return destination;
  }

  private async resolveAvailablePath(dir: string, fileName: string): Promise<string> {
    const parsed = path.parse(fileName);
    const ext = parsed.ext;
    const baseName = parsed.name || 'world';
    let candidate = path.join(dir, `${baseName}${ext}`);
    let counter = 1;

    while (await fs.pathExists(candidate)) {
      candidate = path.join(dir, `${baseName} (${counter})${ext}`);
      counter += 1;
    }

    return candidate;
  }

  private isSupportedArchive(fileName: string): boolean {
    return /\.(zip|tar|tar\.gz|tgz)$/i.test(fileName);
  }

  private ensureSupportedArchive(fileName: string): void {
    if (!this.isSupportedArchive(fileName)) {
      throw new BadRequestException('Only ZIP/TAR/TGZ world archives are supported');
    }
  }

  private validateRemoteUrl(downloadUrl: string, provider: 'curseforge' | 'url'): void {
    let parsed: URL;
    try {
      parsed = new URL(downloadUrl);
    } catch {
      throw new BadRequestException('Invalid download URL');
    }

    if (parsed.protocol !== 'https:') {
      throw new BadRequestException('Only HTTPS download URLs are allowed');
    }

    // WHATWG URL keeps the brackets on IPv6 literals, which would hide ::1 from the private-host check.
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (!host) {
      throw new BadRequestException('Invalid download URL host');
    }

    if (provider === 'curseforge') {
      const allowed =
        host === 'mediafiles.forgecdn.net' ||
        host.endsWith('.forgecdn.net') ||
        host === 'edge.forgecdn.net' ||
        host.endsWith('.curseforge.com');
      if (!allowed) {
        throw new BadRequestException('Download URL host is not allowed for CurseForge provider');
      }
    }

    if (this.isLocalOrPrivateHost(host)) {
      throw new BadRequestException('Download URL host is not allowed');
    }
  }

  private isLocalOrPrivateHost(host: string): boolean {
    if (host === 'localhost' || host.endsWith('.local')) return true;

    const ipType = net.isIP(host);
    if (ipType === 0) return false;
    if (ipType === 6) return this.isLocalOrPrivateIpv6(host);

    return this.isPrivateIpv4(host);
  }

  private isLocalOrPrivateIpv6(host: string): boolean {
    // Loopback, unspecified, unique-local (fc00::/7) and link-local (fe80::/10).
    if (host === '::1' || host === '::' || /^f[cd]/.test(host) || /^fe[89ab]/.test(host)) return true;

    // An IPv4-mapped address reaches the IPv4 host, so apply the same rules. WHATWG URL
    // serializes ::ffff:10.0.0.1 as ::ffff:a00:1, so accept both spellings.
    const dotted = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(host);
    if (dotted) return this.isPrivateIpv4(dotted[1]);
    const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(host);
    if (hex) {
      const [high, low] = [Number.parseInt(hex[1], 16), Number.parseInt(hex[2], 16)];
      return this.isPrivateIpv4([high >> 8, high & 0xff, low >> 8, low & 0xff].join('.'));
    }
    return false;
  }

  private isPrivateIpv4(host: string): boolean {
    const octets = host.split('.').map((part) => Number.parseInt(part, 10));
    if (octets.length !== 4 || octets.some((value) => Number.isNaN(value))) return false;

    if (octets[0] === 10) return true;
    if (octets[0] === 127) return true;
    if (octets[0] === 192 && octets[1] === 168) return true;
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
    return false;
  }

  private handleCurseForgeError(error: unknown, fallbackMessage: string): never {
    this.logger.error(fallbackMessage, error instanceof Error ? error.stack : undefined);

    if (error instanceof HttpException) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 403) {
        throw new HttpException('Invalid CurseForge API key', HttpStatus.FORBIDDEN);
      }
      throw new HttpException(
        (error.response?.data as { message?: string })?.message || fallbackMessage,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    throw new HttpException(fallbackMessage, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
