import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as AdmZip from 'adm-zip';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import { DockerComposeService } from 'src/docker-compose/docker-compose.service';
import { SettingsService } from 'src/users/services/settings.service';
import { ImportBedrockAddonDto } from './dto/import-bedrock-addon.dto';

type AddonPackKind = 'behavior' | 'resource';
type AddonSource = 'upload' | 'curseforge';

export interface BedrockAddonPack {
  uuid: string;
  version: number[];
  kind: AddonPackKind;
  name: string;
  relativePath: string;
}

export interface BedrockAddonRecord {
  id: string;
  name: string;
  source: AddonSource;
  fileName: string;
  enabled: boolean;
  createdAt: string;
  downloadPath: string;
  packs: BedrockAddonPack[];
  providerProjectId?: string;
  providerFileId?: number;
}

export interface BedrockAddonRegistry {
  addons: BedrockAddonRecord[];
}

export const MAX_BEDROCK_ADDON_SIZE = 128 * 1024 * 1024;

export interface AddonSearchResult {
  projectId: string;
  fileId?: number;
  name: string;
  slug: string;
  summary: string;
  iconUrl?: string;
  downloads?: number;
  fileName?: string;
  importable: boolean;
}

@Injectable()
export class BedrockAddonsService {
  private readonly logger = new Logger(BedrockAddonsService.name);
  private readonly SERVERS_DIR: string;
  private readonly CURSEFORGE_API_BASE = 'https://api.curseforge.com/v1';
  private readonly MAX_SCAN_DEPTH = 4;
  private curseForgeBedrockGameId?: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly settingsService: SettingsService,
    private readonly dockerComposeService: DockerComposeService,
  ) {
    this.SERVERS_DIR = this.configService.get<string>('serversDir');
    fs.ensureDirSync(this.SERVERS_DIR);
  }

  async listAddons(serverId: string) {
    await this.ensureServerDirectories(serverId);
    const registry = await this.readRegistry(serverId);
    const levelName = await this.resolveLevelName(serverId);

    if (registry.addons.some((addon) => addon.enabled) && await this.shouldSyncWorldPacks(serverId, levelName)) {
      await this.syncAddonState(serverId, registry);
    }

    return {
      levelName,
      // Registry array order is the priority order (index 0 = highest priority)
      addons: registry.addons,
    };
  }

  async importUploadedAddon(serverId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    await this.ensureServerDirectories(serverId);
    const downloadsDir = this.getDownloadsPath(serverId);
    const safeFileName = await this.resolveAvailableFileName(downloadsDir, this.sanitizeFileName(file.originalname || 'addon.zip'));
    const downloadPath = path.join(downloadsDir, safeFileName);
    await fs.writeFile(downloadPath, file.buffer);

    return this.importStoredArchive(serverId, {
      source: 'upload',
      fileName: safeFileName,
      downloadPath,
      displayName: path.parse(safeFileName).name,
    });
  }

  async searchCurseForgeAddons(
    userId: number,
    serverId: string,
    query: { q?: string; pageSize?: number; index?: number },
  ) {
    await this.ensureServerDirectories(serverId);
    const apiKey = await this.getCurseForgeApiKey(userId);
    const client = this.getCurseForgeClient(apiKey);
    const gameId = await this.getCurseForgeBedrockGameId(client);
    const pageSize = Math.min(Math.max(query.pageSize ?? 12, 1), 50);
    const index = Math.max(query.index ?? 0, 0);

    try {
      const response = await client.get('/mods/search', {
        params: {
          gameId,
          searchFilter: query.q,
          pageSize,
          index,
          sortField: 2,
          sortOrder: 'desc',
        },
      });

      return {
        data: (response.data.data || []).map((item: any) => {
          const importableFile = this.pickImportableFile(item.latestFiles || []);
          return {
            projectId: String(item.id),
            fileId: importableFile?.id,
            name: item.name,
            slug: item.slug,
            summary: item.summary || '',
            iconUrl: item.logo?.thumbnailUrl || item.logo?.url,
            downloads: item.downloadCount,
            fileName: importableFile?.fileName,
            importable: !!importableFile,
          } satisfies AddonSearchResult;
        }),
        pagination: {
          index,
          pageSize,
          resultCount: response.data.pagination?.resultCount ?? 0,
          totalCount: response.data.pagination?.totalCount ?? 0,
        },
      };
    } catch (error) {
      this.handleCurseForgeError(error, 'Error searching Bedrock addons in CurseForge');
    }
  }

  async importCurseForgeAddon(userId: number, serverId: string, payload: ImportBedrockAddonDto, enable = false) {
    await this.ensureServerDirectories(serverId);
    const apiKey = await this.getCurseForgeApiKey(userId);
    const client = this.getCurseForgeClient(apiKey);
    const projectId = Number.parseInt(payload.projectId, 10);

    if (!Number.isFinite(projectId) || projectId <= 0) {
      throw new BadRequestException('Invalid projectId');
    }

    try {
      const file = payload.fileId
        ? await this.getCurseForgeFile(client, projectId, payload.fileId)
        : await this.getLatestCurseForgeImportableFile(client, projectId);

      if (!file?.downloadUrl) {
        throw new BadRequestException('CurseForge did not provide a downloadable addon file');
      }

      const downloadsDir = this.getDownloadsPath(serverId);
      const safeFileName = await this.resolveAvailableFileName(downloadsDir, this.sanitizeFileName(file.fileName || `curseforge-addon-${projectId}.zip`));
      const destinationPath = path.join(downloadsDir, safeFileName);

      const response = await axios.get(file.downloadUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
        maxRedirects: 5,
        maxContentLength: MAX_BEDROCK_ADDON_SIZE,
        maxBodyLength: MAX_BEDROCK_ADDON_SIZE,
        validateStatus: (status) => status >= 200 && status < 300,
      });

      await fs.writeFile(destinationPath, response.data);
      const imported = await this.importStoredArchive(serverId, {
        source: 'curseforge',
        fileName: safeFileName,
        downloadPath: destinationPath,
        displayName: path.parse(safeFileName).name,
        providerProjectId: String(projectId),
        providerFileId: file.id,
      });

      if (enable) {
        await this.setAddonEnabled(serverId, imported.addon.id, true);
      }

      return imported;
    } catch (error) {
      this.handleCurseForgeError(error, 'Error importing Bedrock addon from CurseForge');
    }
  }

  async setAddonEnabled(serverId: string, addonId: string, enabled: boolean) {
    await this.ensureServerDirectories(serverId);
    const registry = await this.readRegistry(serverId);
    const addon = registry.addons.find((item) => item.id === addonId);

    if (!addon) {
      throw new NotFoundException('Addon not found');
    }

    if (enabled) {
      this.ensureNoUuidConflict(registry.addons, addon);
    }

    addon.enabled = enabled;
    await this.writeRegistry(serverId, registry);
    const levelName = await this.syncAddonState(serverId, registry);

    return { success: true, addon, levelName };
  }

  async deleteAddon(serverId: string, addonId: string) {
    await this.ensureServerDirectories(serverId);
    const registry = await this.readRegistry(serverId);
    const addon = registry.addons.find((item) => item.id === addonId);

    if (!addon) {
      throw new NotFoundException('Addon not found');
    }

    await fs.remove(path.join(this.getExtractedPath(serverId), addonId));

    const addonsPath = this.getAddonsPath(serverId);
    const downloadFile = path.resolve(addonsPath, addon.downloadPath ?? '');
    if (downloadFile.startsWith(addonsPath + path.sep)) {
      await fs.remove(downloadFile);
    } else {
      this.logger.warn(`Skipping unsafe addon download path for ${addonId}: ${addon.downloadPath}`);
    }

    registry.addons = registry.addons.filter((item) => item.id !== addonId);
    await this.writeRegistry(serverId, registry);
    const levelName = await this.syncAddonState(serverId, registry);

    return { success: true, levelName };
  }

  async reorderAddons(serverId: string, addonIds: string[]) {
    await this.ensureServerDirectories(serverId);
    const registry = await this.readRegistry(serverId);

    const byId = new Map(registry.addons.map((addon) => [addon.id, addon]));
    const uniqueIds = new Set(addonIds);
    const coversRegistry = addonIds.length === registry.addons.length && uniqueIds.size === addonIds.length && addonIds.every((id) => byId.has(id));

    if (!coversRegistry) {
      throw new BadRequestException('Addon order must include every installed addon exactly once');
    }

    registry.addons = addonIds.map((id) => byId.get(id));
    await this.writeRegistry(serverId, registry);
    const levelName = await this.syncAddonState(serverId, registry);

    return { success: true, levelName, addons: registry.addons };
  }

  async clearAddonRuntimeState(serverId: string) {
    await this.ensureServerDirectories(serverId);
    const registry = await this.readRegistry(serverId);
    let changed = false;

    for (const addon of registry.addons) {
      if (!addon.enabled) {
        continue;
      }

      addon.enabled = false;
      changed = true;
    }

    if (!changed) {
      return { success: true, changed: false };
    }

    await this.writeRegistry(serverId, registry);
    return { success: true, changed: true };
  }

  private async importStoredArchive(
    serverId: string,
    payload: {
      source: AddonSource;
      fileName: string;
      downloadPath: string;
      displayName: string;
      providerProjectId?: string;
      providerFileId?: number;
    },
  ) {
    this.ensureArchiveExtension(payload.fileName);

    const addonId = this.createAddonId();
    const extractedDir = path.join(this.getExtractedPath(serverId), addonId);
    const unpackedDir = path.join(extractedDir, 'unpacked');
    await fs.ensureDir(unpackedDir);

    try {
      const zip = new AdmZip(payload.downloadPath);
      zip.extractAllTo(unpackedDir, true);
      await this.expandNestedArchives(unpackedDir);
      const manifests = await this.findAddonManifests(unpackedDir);

      if (manifests.length === 0) {
        throw new BadRequestException('The addon does not contain a valid Bedrock manifest.json');
      }

      const packs = await this.persistAddonPacks(extractedDir, unpackedDir, manifests);
      if (packs.length === 0) {
        throw new BadRequestException('No behavior or resource packs were found in the addon');
      }

      const registry = await this.readRegistry(serverId);
      const addon: BedrockAddonRecord = {
        id: addonId,
        name: this.resolveAddonName(payload.displayName, packs),
        source: payload.source,
        fileName: payload.fileName,
        enabled: false,
        createdAt: new Date().toISOString(),
        downloadPath: path.relative(this.getAddonsPath(serverId), payload.downloadPath),
        packs,
        providerProjectId: payload.providerProjectId,
        providerFileId: payload.providerFileId,
      };

      registry.addons.push(addon);
      await this.writeRegistry(serverId, registry);

      return { success: true, addon };
    } catch (error) {
      await fs.remove(extractedDir);
      throw error;
    }
  }

  private async persistAddonPacks(
    extractedDir: string,
    unpackedDir: string,
    manifests: Array<{ manifestPath: string; manifestDir: string; kind: AddonPackKind; name: string; uuid: string; version: number[] }>,
  ): Promise<BedrockAddonPack[]> {
    const packs: BedrockAddonPack[] = [];
    const seen = new Set<string>();

    for (const manifest of manifests) {
      const key = `${manifest.kind}:${manifest.uuid}`;
      if (seen.has(key)) {
        continue;
      }

      const targetDirName = manifest.kind === 'behavior' ? 'behavior_packs' : 'resource_packs';
      const destinationDir = path.join(extractedDir, targetDirName, manifest.uuid);
      await fs.ensureDir(path.dirname(destinationDir));
      await fs.copy(manifest.manifestDir, destinationDir, { overwrite: true, errorOnExist: false });

      packs.push({
        uuid: manifest.uuid,
        version: manifest.version,
        kind: manifest.kind,
        name: manifest.name,
        relativePath: path.relative(extractedDir, destinationDir),
      });
      seen.add(key);
    }

    await fs.remove(unpackedDir);
    return packs;
  }

  private async findAddonManifests(rootDir: string) {
    const manifests: Array<{ manifestPath: string; manifestDir: string; kind: AddonPackKind; name: string; uuid: string; version: number[] }> = [];
    await this.walkForManifests(rootDir, 0, manifests);
    return manifests;
  }

  private async expandNestedArchives(rootDir: string) {
    const archives = await this.findNestedArchives(rootDir);

    for (const archivePath of archives) {
      const archiveName = path.basename(archivePath, path.extname(archivePath));
      const destinationDir = path.join(path.dirname(archivePath), archiveName);

      if (await fs.pathExists(destinationDir)) {
        continue;
      }

      try {
        await fs.ensureDir(destinationDir);
        const zip = new AdmZip(archivePath);
        zip.extractAllTo(destinationDir, true);
      } catch (error) {
        this.logger.warn(`Could not extract nested Bedrock archive: ${archivePath}`);
        this.logger.debug(String(error));
        await fs.remove(destinationDir);
      }
    }
  }

  private async findNestedArchives(rootDir: string) {
    const archives: string[] = [];
    await this.walkForArchives(rootDir, 0, archives);
    return archives;
  }

  private async walkForArchives(currentDir: string, depth: number, archives: string[]): Promise<void> {
    if (depth > this.MAX_SCAN_DEPTH) {
      return;
    }

    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);

      if (entry.isFile() && this.isSupportedArchive(entry.name)) {
        archives.push(entryPath);
        continue;
      }

      if (entry.isDirectory()) {
        await this.walkForArchives(entryPath, depth + 1, archives);
      }
    }
  }

  private async walkForManifests(
    currentDir: string,
    depth: number,
    manifests: Array<{ manifestPath: string; manifestDir: string; kind: AddonPackKind; name: string; uuid: string; version: number[] }>,
  ): Promise<void> {
    if (depth > this.MAX_SCAN_DEPTH) {
      return;
    }

    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    const manifestEntry = entries.find((entry) => entry.isFile() && entry.name === 'manifest.json');
    if (manifestEntry) {
      const manifestPath = path.join(currentDir, manifestEntry.name);
      const parsed = await this.parseManifest(manifestPath);
      if (parsed) {
        manifests.push({
          manifestPath,
          manifestDir: currentDir,
          kind: parsed.kind,
          name: parsed.name,
          uuid: parsed.uuid,
          version: parsed.version,
        });
      }
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      await this.walkForManifests(path.join(currentDir, entry.name), depth + 1, manifests);
    }
  }

  private async parseManifest(manifestPath: string): Promise<{ kind: AddonPackKind; name: string; uuid: string; version: number[] } | null> {
    try {
      const content = await fs.readJson(manifestPath);
      const header = content?.header;
      const modules = Array.isArray(content?.modules) ? content.modules : [];
      const uuid = typeof header?.uuid === 'string' ? header.uuid.trim() : '';
      const version = this.normalizePackVersion(header?.version);
      const name = typeof header?.name === 'string' && header.name.trim() ? header.name.trim() : path.basename(path.dirname(manifestPath));

      if (!uuid || version.length === 0) {
        return null;
      }

      const types = modules
        .map((module: any) => module?.type)
        .filter((value: unknown): value is string => typeof value === 'string');

      if (types.some((type) => type === 'resources')) {
        return { kind: 'resource', name, uuid, version };
      }

      if (types.some((type) => type === 'data' || type === 'script' || type === 'client_data')) {
        return { kind: 'behavior', name, uuid, version };
      }

      return null;
    } catch {
      return null;
    }
  }

  private normalizePackVersion(version: unknown): number[] {
    if (Array.isArray(version)) {
      const normalized = version
        .map((value) => Number.parseInt(String(value), 10))
        .filter((value) => Number.isFinite(value));
      return normalized.length === 3 ? normalized : [];
    }

    if (typeof version === 'string') {
      const normalized = version
        .split('.')
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isFinite(value));
      return normalized.length === 3 ? normalized : [];
    }

    return [];
  }

  private async syncAddonState(serverId: string, registry: BedrockAddonRegistry): Promise<string> {
    const mcDataPath = this.getMcDataPath(serverId);
    const behaviorPath = path.join(mcDataPath, 'behavior_packs');
    const resourcePath = path.join(mcDataPath, 'resource_packs');
    await fs.ensureDir(behaviorPath);
    await fs.ensureDir(resourcePath);

    const managedBehaviorUuids = new Set<string>();
    const managedResourceUuids = new Set<string>();

    for (const addon of registry.addons) {
      for (const pack of addon.packs) {
        if (pack.kind === 'behavior') {
          managedBehaviorUuids.add(pack.uuid);
        } else {
          managedResourceUuids.add(pack.uuid);
        }
      }
    }

    await this.removeManagedPackDirs(behaviorPath, managedBehaviorUuids);
    await this.removeManagedPackDirs(resourcePath, managedResourceUuids);

    const enabledAddons = registry.addons.filter((addon) => addon.enabled);
    for (const addon of enabledAddons) {
      for (const pack of addon.packs) {
        const sourcePath = path.join(this.getExtractedPath(serverId), addon.id, pack.relativePath);
        const targetBase = pack.kind === 'behavior' ? behaviorPath : resourcePath;
        const targetPath = path.join(targetBase, pack.uuid);
        await fs.copy(sourcePath, targetPath, { overwrite: true, errorOnExist: false });
      }
    }

    const levelName = await this.resolveLevelName(serverId);
    const worldPath = path.join(mcDataPath, 'worlds', levelName);
    await fs.ensureDir(worldPath);

    const behaviorEntries = enabledAddons.flatMap((addon) => addon.packs.filter((pack) => pack.kind === 'behavior').map((pack) => this.createPackReference(pack)));
    const resourceEntries = enabledAddons.flatMap((addon) => addon.packs.filter((pack) => pack.kind === 'resource').map((pack) => this.createPackReference(pack)));

    await this.mergeManagedWorldPackFile(path.join(worldPath, 'world_behavior_packs.json'), managedBehaviorUuids, behaviorEntries);
    await this.mergeManagedWorldPackFile(path.join(worldPath, 'world_resource_packs.json'), managedResourceUuids, resourceEntries);

    return levelName;
  }

  private async shouldSyncWorldPacks(serverId: string, levelName: string) {
    const worldPath = path.join(this.getMcDataPath(serverId), 'worlds', levelName);
    const behaviorFile = path.join(worldPath, 'world_behavior_packs.json');
    const resourceFile = path.join(worldPath, 'world_resource_packs.json');

    return !await fs.pathExists(behaviorFile) || !await fs.pathExists(resourceFile);
  }

  private createPackReference(pack: BedrockAddonPack) {
    return {
      pack_id: pack.uuid,
      version: pack.version,
    };
  }

  private async mergeManagedWorldPackFile(
    filePath: string,
    managedUuids: Set<string>,
    nextEntries: Array<{ pack_id: string; version: number[] }>,
  ) {
    const existing = await this.readWorldPackEntries(filePath);
    const preserved = existing.filter((entry) => !managedUuids.has(entry.pack_id));
    // Managed packs first, in registry priority order; manually installed packs keep lower priority
    const merged = [...nextEntries, ...preserved];
    await fs.writeJson(filePath, merged, { spaces: 2 });
  }

  private async readWorldPackEntries(filePath: string): Promise<Array<{ pack_id: string; version: number[] }>> {
    if (!await fs.pathExists(filePath)) {
      return [];
    }

    try {
      const content = await fs.readJson(filePath);
      if (!Array.isArray(content)) {
        return [];
      }

      return content
        .filter((entry) => typeof entry?.pack_id === 'string' && Array.isArray(entry?.version))
        .map((entry) => ({ pack_id: entry.pack_id, version: this.normalizePackVersion(entry.version) }));
    } catch {
      return [];
    }
  }

  private async removeManagedPackDirs(basePath: string, uuids: Set<string>) {
    for (const uuid of uuids) {
      await fs.remove(path.join(basePath, uuid));
    }
  }

  private ensureNoUuidConflict(addons: BedrockAddonRecord[], targetAddon: BedrockAddonRecord) {
    const targetUuids = new Set(targetAddon.packs.map((pack) => `${pack.kind}:${pack.uuid}`));
    const conflictingAddon = addons.find((addon) => {
      if (addon.id === targetAddon.id || !addon.enabled) {
        return false;
      }
      return addon.packs.some((pack) => targetUuids.has(`${pack.kind}:${pack.uuid}`));
    });

    if (conflictingAddon) {
      throw new BadRequestException(`Addon UUID conflict with already enabled addon "${conflictingAddon.name}"`);
    }
  }

  private async readRegistry(serverId: string): Promise<BedrockAddonRegistry> {
    const registryPath = this.getRegistryPath(serverId);
    if (!await fs.pathExists(registryPath)) {
      return { addons: [] };
    }

    try {
      const content = await fs.readJson(registryPath);
      if (!Array.isArray(content?.addons)) {
        return { addons: [] };
      }
      return { addons: content.addons };
    } catch {
      return { addons: [] };
    }
  }

  private async writeRegistry(serverId: string, registry: BedrockAddonRegistry) {
    await fs.writeJson(this.getRegistryPath(serverId), registry, { spaces: 2 });
  }

  private async ensureServerDirectories(serverId: string) {
    this.validateServerId(serverId);
    await this.ensureBedrockServer(serverId);

    const serverPath = this.getServerPath(serverId);
    if (!await fs.pathExists(serverPath)) {
      throw new NotFoundException('Server not found');
    }

    await fs.ensureDir(this.getAddonsPath(serverId));
    await fs.ensureDir(this.getDownloadsPath(serverId));
    await fs.ensureDir(this.getExtractedPath(serverId));
    await fs.ensureDir(this.getMcDataPath(serverId));
  }

  private async ensureBedrockServer(serverId: string) {
    const config = await this.dockerComposeService.getServerConfig(serverId);

    if (!config) {
      throw new NotFoundException('Server not found');
    }

    if (config.edition !== 'BEDROCK') {
      throw new BadRequestException('Bedrock addons are only available for Bedrock servers');
    }
  }

  private getCurseForgeClient(apiKey: string): AxiosInstance {
    return axios.create({
      baseURL: this.CURSEFORGE_API_BASE,
      timeout: 10000,
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json',
      },
    });
  }

  private async getCurseForgeApiKey(userId: number) {
    const cfApiKey = await this.settingsService.getCfApiKey(userId);
    if (!cfApiKey) {
      throw new BadRequestException('CurseForge API key not configured. Please add it in settings.');
    }
    return cfApiKey;
  }

  private async getCurseForgeBedrockGameId(client: AxiosInstance) {
    if (this.curseForgeBedrockGameId) {
      return this.curseForgeBedrockGameId;
    }

    for (let page = 0; page < 6; page++) {
      const response = await client.get('/games', {
        params: {
          index: page * 50,
          pageSize: 50,
        },
      });

      const game = (response.data.data || []).find((item: any) => {
        const slug = String(item.slug || '').toLowerCase();
        const name = String(item.name || '').toLowerCase();
        return slug.includes('minecraft-bedrock') || name.includes('minecraft bedrock');
      });

      if (game?.id) {
        this.curseForgeBedrockGameId = game.id;
        return game.id;
      }

      if ((response.data.data || []).length < 50) {
        break;
      }
    }

    throw new BadRequestException('Could not resolve the CurseForge Minecraft Bedrock game ID');
  }

  private async getCurseForgeFile(client: AxiosInstance, projectId: number, fileId: number) {
    const response = await client.get(`/mods/${projectId}/files/${fileId}`);
    const file = response.data?.data;
    if (!file) {
      throw new NotFoundException('CurseForge file not found');
    }

    if (!file.downloadUrl) {
      const downloadResponse = await client.get(`/mods/${projectId}/files/${fileId}/download-url`);
      file.downloadUrl = downloadResponse.data?.data;
    }

    return file;
  }

  private async getLatestCurseForgeImportableFile(client: AxiosInstance, projectId: number) {
    const response = await client.get(`/mods/${projectId}`);
    const project = response.data?.data;
    const latest = this.pickImportableFile(project?.latestFiles || []);

    if (latest) {
      return latest;
    }

    const filesResponse = await client.get(`/mods/${projectId}/files`, {
      params: { pageSize: 50, index: 0 },
    });
    const file = this.pickImportableFile(filesResponse.data?.data || []);
    if (!file) {
      throw new BadRequestException('No importable addon archive was found in CurseForge');
    }

    return file;
  }

  private pickImportableFile(files: any[]) {
    return files.find((file) => {
      if (!file?.downloadUrl && !file?.id) {
        return false;
      }
      return this.isSupportedArchive(file.fileName);
    });
  }

  private handleCurseForgeError(error: unknown, message: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    this.logger.error(message, error as Error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 403) {
        throw new HttpException('Invalid CurseForge API key', HttpStatus.FORBIDDEN);
      }

      throw new HttpException(
        error.response?.data?.message || message,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  private validateServerId(serverId: string) {
    if (!/^[a-zA-Z0-9_-]+$/.test(serverId)) {
      throw new BadRequestException('Invalid server ID');
    }
  }

  private async resolveLevelName(serverId: string) {
    const serverPropertiesPath = path.join(this.getMcDataPath(serverId), 'server.properties');
    if (!await fs.pathExists(serverPropertiesPath)) {
      return this.resolveFallbackLevelName(serverId);
    }

    const content = await fs.readFile(serverPropertiesPath, 'utf8');
    const levelLine = content
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('level-name='));

    if (!levelLine) {
      return this.resolveFallbackLevelName(serverId);
    }

    const value = levelLine.slice('level-name='.length).trim();
    return value || this.resolveFallbackLevelName(serverId);
  }

  private async resolveFallbackLevelName(serverId: string) {
    const worldsPath = path.join(this.getMcDataPath(serverId), 'worlds');

    if (await fs.pathExists(worldsPath)) {
      const entries = await fs.readdir(worldsPath, { withFileTypes: true });
      const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

      if (directories.includes('world')) {
        return 'world';
      }

      if (directories.length === 1) {
        return directories[0];
      }

      if (directories.includes('Bedrock level')) {
        return 'Bedrock level';
      }
    }

    return 'world';
  }

  private getServerPath(serverId: string) {
    return path.join(this.SERVERS_DIR, serverId);
  }

  private getAddonsPath(serverId: string) {
    return path.join(this.getServerPath(serverId), 'addons');
  }

  private getDownloadsPath(serverId: string) {
    return path.join(this.getAddonsPath(serverId), 'downloads');
  }

  private getExtractedPath(serverId: string) {
    return path.join(this.getAddonsPath(serverId), 'extracted');
  }

  private getRegistryPath(serverId: string) {
    return path.join(this.getAddonsPath(serverId), 'registry.json');
  }

  private getMcDataPath(serverId: string) {
    return path.join(this.getServerPath(serverId), 'mc-data');
  }

  private ensureArchiveExtension(fileName: string) {
    if (!this.isSupportedArchive(fileName)) {
      throw new BadRequestException('Only .mcaddon, .mcpack and .zip files are supported');
    }
  }

  private isSupportedArchive(fileName: string) {
    return /\.(mcaddon|mcpack|zip)$/i.test(fileName);
  }

  private sanitizeFileName(fileName: string) {
    const sanitized = fileName.replaceAll(/[^a-zA-Z0-9._-]/g, '-');
    return sanitized || 'addon.zip';
  }

  private async resolveAvailableFileName(dirPath: string, fileName: string) {
    const parsed = path.parse(fileName);
    let candidate = `${parsed.name}${parsed.ext}`;
    let counter = 1;

    while (await fs.pathExists(path.join(dirPath, candidate))) {
      candidate = `${parsed.name}-${counter}${parsed.ext}`;
      counter += 1;
    }

    return candidate;
  }

  private resolveAddonName(displayName: string, packs: BedrockAddonPack[]) {
    const firstNamedPack = packs.find((pack) => pack.name?.trim());
    return firstNamedPack?.name || displayName;
  }

  private createAddonId() {
    return `addon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
