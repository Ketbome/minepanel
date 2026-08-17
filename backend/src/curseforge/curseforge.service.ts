import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface CurseForgeModpack {
  id: number;
  gameId: number;
  name: string;
  slug: string;
  links: {
    websiteUrl: string;
  };
  summary: string;
  status: number;
  downloadCount: number;
  isFeatured: boolean;
  primaryCategoryId: number;
  categories: Array<{
    id: number;
    gameId: number;
    name: string;
    slug: string;
    url: string;
    iconUrl: string;
    dateModified: string;
    isClass: boolean;
    classId: number;
    parentCategoryId: number;
  }>;
  authors: Array<{
    id: number;
    name: string;
    url: string;
  }>;
  logo: {
    id: number;
    modId: number;
    title: string;
    description: string;
    thumbnailUrl: string;
    url: string;
  };
  screenshots: Array<{
    id: number;
    modId: number;
    title: string;
    description: string;
    thumbnailUrl: string;
    url: string;
  }>;
  mainFileId: number;
  latestFiles: Array<{
    id: number;
    gameId: number;
    modId: number;
    isAvailable: boolean;
    displayName: string;
    fileName: string;
    releaseType: number;
    fileStatus: number;
    hashes: Array<{
      value: string;
      algo: number;
    }>;
    fileDate: string;
    fileLength: number;
    downloadCount: number;
    downloadUrl: string;
    gameVersions: string[];
    sortableGameVersions: Array<{
      gameVersionName: string;
      gameVersionPadded: string;
      gameVersion: string;
      gameVersionReleaseDate: string;
      gameVersionTypeId: number;
    }>;
    dependencies: Array<{
      modId: number;
      relationType: number;
    }>;
    alternateFileId: number;
    isServerPack: boolean;
    fileFingerprint: number;
    modules: Array<{
      name: string;
      fingerprint: number;
    }>;
  }>;
  latestFilesIndexes: Array<{
    gameVersion: string;
    fileId: number;
    filename: string;
    releaseType: number;
    gameVersionTypeId: number;
    modLoader: number;
  }>;
  dateCreated: string;
  dateModified: string;
  dateReleased: string;
  allowModDistribution: boolean;
  gamePopularityRank: number;
  isAvailable: boolean;
  thumbsUpCount: number;
}

export interface CurseForgeSearchResponse {
  data: CurseForgeModpack[];
  pagination: {
    index: number;
    pageSize: number;
    resultCount: number;
    totalCount: number;
  };
}

export interface CurseForgeModResponse {
  data: CurseForgeModpack;
}

export interface NormalizedModSearchResult {
  provider: 'curseforge' | 'modrinth';
  projectId: string;
  slug: string;
  name: string;
  summary: string;
  iconUrl?: string;
  downloads?: number;
  lastUpdated?: string;
  supportedVersions: string[];
  supportedLoaders: string[];
}

export interface NormalizedModSearchResponse {
  data: NormalizedModSearchResult[];
  pagination: {
    index: number;
    pageSize: number;
    resultCount: number;
    totalCount: number;
  };
}

export interface NormalizedModVersion {
  provider: 'curseforge' | 'modrinth';
  versionId: string;
  name: string;
  versionNumber?: string;
  releaseType: 'release' | 'beta' | 'alpha';
  fileName?: string;
  datePublished?: string;
  gameVersions: string[];
  loaders: string[];
}

type ModLoaderName = 'forge' | 'neoforge' | 'fabric' | 'quilt';

@Injectable()
export class CurseforgeService {
  private readonly apiClient: AxiosInstance;
  private readonly CURSEFORGE_API_BASE = 'https://api.curseforge.com/v1';
  private readonly MINECRAFT_GAME_ID = 432;
  private readonly MODS_CLASS_ID = 6;
  private readonly MODPACK_CLASS_ID = 4471;
  private readonly MAX_RESOLVE_REFS = 50;
  // CurseForge modLoaderType enum
  private readonly LOADER_TYPE: Record<ModLoaderName, number> = {
    forge: 1,
    fabric: 4,
    quilt: 5,
    neoforge: 6,
  };
  private readonly RELEASE_TYPE: Record<number, 'release' | 'beta' | 'alpha'> = {
    1: 'release',
    2: 'beta',
    3: 'alpha',
  };

  constructor() {
    this.apiClient = axios.create({
      baseURL: this.CURSEFORGE_API_BASE,
      timeout: 10000,
    });
  }

  private getApiClient(apiKey: string): AxiosInstance {
    return axios.create({
      baseURL: this.CURSEFORGE_API_BASE,
      timeout: 10000,
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
      },
    });
  }

  async searchModpacks(
    apiKey: string,
    searchFilter?: string,
    pageSize: number = 20,
    index: number = 0,
    sortField: number = 2, // 1 = Featured, 2 = Popularity, 3 = LastUpdated, 4 = Name, 5 = Author, 6 = TotalDownloads
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<CurseForgeSearchResponse> {
    if (!apiKey) {
      throw new HttpException(
        'CurseForge API key not configured',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const client = this.getApiClient(apiKey);
      const response = await client.get<CurseForgeSearchResponse>('/mods/search', {
        params: {
          gameId: this.MINECRAFT_GAME_ID,
          classId: this.MODPACK_CLASS_ID,
          searchFilter,
          pageSize,
          index,
          sortField,
          sortOrder,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error searching CurseForge modpacks:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          throw new HttpException(
            'Invalid CurseForge API key',
            HttpStatus.FORBIDDEN,
          );
        }
        throw new HttpException(
          error.response?.data?.message || 'Error searching modpacks',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        'Error searching modpacks',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getModpack(apiKey: string, modId: number): Promise<CurseForgeModpack> {
    if (!apiKey) {
      throw new HttpException(
        'CurseForge API key not configured',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const client = this.getApiClient(apiKey);
      const response = await client.get<CurseForgeModResponse>(`/mods/${modId}`);

      return response.data.data;
    } catch (error) {
      console.error('Error fetching CurseForge modpack:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          throw new HttpException(
            'Invalid CurseForge API key',
            HttpStatus.FORBIDDEN,
          );
        }
        if (error.response?.status === 404) {
          throw new HttpException(
            'Modpack not found',
            HttpStatus.NOT_FOUND,
          );
        }
        throw new HttpException(
          error.response?.data?.message || 'Error fetching modpack',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        'Error fetching modpack',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getFeaturedModpacks(apiKey: string, limit: number = 10): Promise<CurseForgeSearchResponse> {
    return this.searchModpacks(apiKey, undefined, limit, 0, 1, 'desc');
  }

  async getPopularModpacks(apiKey: string, limit: number = 10): Promise<CurseForgeSearchResponse> {
    return this.searchModpacks(apiKey, undefined, limit, 0, 2, 'desc');
  }

  async searchMods(
    apiKey: string,
    query: {
      q?: string;
      pageSize?: number;
      index?: number;
      minecraftVersion: string;
      loader?: 'forge' | 'neoforge' | 'fabric' | 'quilt';
    },
  ): Promise<NormalizedModSearchResponse> {
    if (!apiKey) {
      throw new HttpException(
        'CurseForge API key not configured',
        HttpStatus.BAD_REQUEST,
      );
    }

    const requestedPageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 50);
    const pageSize = requestedPageSize % 2 === 0
      ? requestedPageSize
      : Math.min(requestedPageSize + 1, 50);
    const index = Math.max(query.index ?? 0, 0);
    const maxBatches = 8;
    const versionFilter = this.resolveVersionFilter(query.minecraftVersion);

    try {
      const client = this.getApiClient(apiKey);
      const normalized: NormalizedModSearchResult[] = [];
      const seen = new Set<string>();
      let totalCount = 0;
      let batchIndex = index;
      let batches = 0;

      while (normalized.length < pageSize && batches < maxBatches) {
        const response = await client.get<CurseForgeSearchResponse>('/mods/search', {
          params: {
            gameId: this.MINECRAFT_GAME_ID,
            classId: this.MODS_CLASS_ID,
            searchFilter: query.q,
            pageSize,
            index: batchIndex,
            sortField: 2,
            sortOrder: 'desc',
            gameVersion: versionFilter,
          },
        });

        totalCount = response.data.pagination.totalCount;
        const compatibleBatch = response.data.data
          .map((mod) => this.normalizeMod(mod))
          .filter((mod) => this.isCompatibleResult(mod, versionFilter, query.loader));

        for (const mod of compatibleBatch) {
          if (normalized.length >= pageSize) break;
          if (seen.has(mod.projectId)) continue;
          normalized.push(mod);
          seen.add(mod.projectId);
        }

        batchIndex += pageSize;
        batches += 1;

        if (batchIndex >= totalCount) break;
        if (response.data.data.length === 0) break;
      }

      return {
        data: normalized,
        pagination: {
          index,
          pageSize,
          resultCount: normalized.length,
          totalCount,
        },
      };
    } catch (error) {
      console.error('Error searching CurseForge mods:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          throw new HttpException(
            'Invalid CurseForge API key',
            HttpStatus.FORBIDDEN,
          );
        }
        throw new HttpException(
          error.response?.data?.message || 'Error searching mods',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        'Error searching mods',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async resolveMods(apiKey: string, refs: string[]): Promise<NormalizedModSearchResult[]> {
    const mods = await this.fetchModsByRefs(apiKey, refs);
    return Array.from(mods.values()).map((mod) => this.normalizeMod(mod));
  }

  async getLatestVersions(
    apiKey: string,
    refs: string[],
    query: { minecraftVersion?: string; loader?: ModLoaderName },
  ): Promise<Array<{ ref: string; version: NormalizedModVersion | null }>> {
    const mods = await this.fetchModsByRefs(apiKey, refs);
    const versionFilter = this.resolveVersionFilter(query.minecraftVersion);
    const loaderType = query.loader ? this.LOADER_TYPE[query.loader] : undefined;

    // latestFilesIndexes already carries the newest file per version/loader,
    // so the whole list costs one extra request instead of one per mod.
    const latestFileByRef = new Map<string, number>();
    for (const [ref, mod] of mods) {
      const candidates = (mod.latestFilesIndexes ?? []).filter((index) => {
        if (versionFilter && index.gameVersion !== versionFilter) return false;
        if (loaderType !== undefined && index.modLoader !== undefined && index.modLoader !== loaderType) return false;
        return true;
      });

      const newest = candidates.reduce<number | null>(
        (best, index) => (best === null || index.fileId > best ? index.fileId : best),
        null,
      );
      if (newest !== null) latestFileByRef.set(ref, newest);
    }

    const files = await this.resolveModFiles(
      apiKey,
      Array.from(new Set(latestFileByRef.values())).map((fileId) => fileId.toString()),
    );
    const fileById = new Map(files.map((file) => [file.versionId, file]));

    return Array.from(latestFileByRef.entries()).map(([ref, fileId]) => ({
      ref,
      version: fileById.get(fileId.toString()) ?? null,
    }));
  }

  private async fetchModsByRefs(apiKey: string, refs: string[]): Promise<Map<string, CurseForgeModpack>> {
    if (!apiKey) {
      throw new HttpException('CurseForge API key not configured', HttpStatus.BAD_REQUEST);
    }

    const unique = Array.from(new Set(refs.map((ref) => ref.trim()).filter(Boolean))).slice(
      0,
      this.MAX_RESOLVE_REFS,
    );
    const resolved = new Map<string, CurseForgeModpack>();
    if (unique.length === 0) return resolved;

    const client = this.getApiClient(apiKey);
    const ids = unique.filter((ref) => /^\d+$/.test(ref));
    const slugs = unique.filter((ref) => !/^\d+$/.test(ref));

    if (ids.length > 0) {
      try {
        const response = await client.post<CurseForgeSearchResponse>('/mods', {
          modIds: ids.map((id) => Number.parseInt(id, 10)),
        });
        for (const mod of response.data.data) {
          resolved.set(mod.id.toString(), mod);
        }
      } catch (error) {
        console.error('Error resolving CurseForge mods by id:', error);
      }
    }

    const bySlug = await Promise.all(
      slugs.map(async (slug) => {
        try {
          const response = await client.get<CurseForgeSearchResponse>('/mods/search', {
            params: {
              gameId: this.MINECRAFT_GAME_ID,
              classId: this.MODS_CLASS_ID,
              slug,
              pageSize: 1,
            },
          });
          return { slug, mod: response.data.data[0] ?? null };
        } catch (error) {
          console.error(`Error resolving CurseForge mod "${slug}":`, error);
          return { slug, mod: null };
        }
      }),
    );

    for (const { slug, mod } of bySlug) {
      if (mod) resolved.set(slug, mod);
    }

    return resolved;
  }

  async resolveModFiles(apiKey: string, fileIds: string[]): Promise<NormalizedModVersion[]> {
    if (!apiKey) {
      throw new HttpException('CurseForge API key not configured', HttpStatus.BAD_REQUEST);
    }

    const unique = Array.from(new Set(fileIds.map((id) => id.trim()).filter((id) => /^\d+$/.test(id)))).slice(
      0,
      this.MAX_RESOLVE_REFS,
    );
    if (unique.length === 0) return [];

    try {
      const client = this.getApiClient(apiKey);
      const response = await client.post<{ data: CurseForgeModpack['latestFiles'] }>('/mods/files', {
        fileIds: unique.map((id) => Number.parseInt(id, 10)),
      });
      return (response.data.data ?? []).map((file) => this.normalizeFile(file));
    } catch (error) {
      console.error('Error resolving CurseForge files:', error);
      return [];
    }
  }

  async getModVersions(
    apiKey: string,
    ref: string,
    query: { minecraftVersion?: string; loader?: ModLoaderName },
  ): Promise<NormalizedModVersion[]> {
    if (!apiKey) {
      throw new HttpException('CurseForge API key not configured', HttpStatus.BAD_REQUEST);
    }

    const client = this.getApiClient(apiKey);
    const modId = await this.resolveModId(client, ref);

    const fetchFiles = async (loaderType?: number) => {
      const response = await client.get<{ data: CurseForgeModpack['latestFiles'] }>(
        `/mods/${modId}/files`,
        {
          params: {
            gameVersion: query.minecraftVersion,
            modLoaderType: loaderType,
            pageSize: 50,
          },
        },
      );
      return response.data.data ?? [];
    };

    try {
      const loaderType = query.loader ? this.LOADER_TYPE[query.loader] : undefined;
      let files = await fetchFiles(loaderType);

      // Older mods often ship files without loader tags; without this fallback
      // the picker would look empty for them.
      if (files.length === 0 && loaderType !== undefined) {
        files = await fetchFiles(undefined);
      }

      return files.map((file) => this.normalizeFile(file));
    } catch (error) {
      console.error('Error fetching CurseForge mod files:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          throw new HttpException('Invalid CurseForge API key', HttpStatus.FORBIDDEN);
        }
        throw new HttpException(
          error.response?.data?.message || 'Error fetching mod versions',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException('Error fetching mod versions', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async resolveModId(client: AxiosInstance, ref: string): Promise<number> {
    const trimmed = ref.trim();
    if (/^\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);

    const response = await client.get<CurseForgeSearchResponse>('/mods/search', {
      params: {
        gameId: this.MINECRAFT_GAME_ID,
        classId: this.MODS_CLASS_ID,
        slug: trimmed,
        pageSize: 1,
      },
    });

    const mod = response.data.data[0];
    if (!mod) {
      throw new HttpException(`Mod "${trimmed}" not found on CurseForge`, HttpStatus.NOT_FOUND);
    }
    return mod.id;
  }

  private normalizeFile(file: CurseForgeModpack['latestFiles'][number]): NormalizedModVersion {
    const rawVersions = file.gameVersions ?? [];
    const loaders = new Set<string>();
    const gameVersions: string[] = [];

    for (const version of rawVersions) {
      const versionLoaders = this.extractLoadersFromGameVersion(version);
      if (versionLoaders.length > 0) {
        versionLoaders.forEach((loader) => loaders.add(loader));
        continue;
      }
      if (/^\d/.test(version)) gameVersions.push(version);
    }

    return {
      provider: 'curseforge',
      versionId: file.id.toString(),
      name: file.displayName,
      releaseType: this.RELEASE_TYPE[file.releaseType] ?? 'release',
      fileName: file.fileName,
      datePublished: file.fileDate,
      gameVersions,
      loaders: Array.from(loaders),
    };
  }

  private normalizeMod(mod: CurseForgeModpack): NormalizedModSearchResult {
    const versions = new Set<string>();
    const loaders = new Set<string>();

    for (const file of mod.latestFiles ?? []) {
      for (const version of file.gameVersions ?? []) {
        versions.add(version);
        this.extractLoadersFromGameVersion(version).forEach((loader) => loaders.add(loader));
      }
    }

    return {
      provider: 'curseforge',
      projectId: mod.id.toString(),
      slug: mod.slug,
      name: mod.name,
      summary: mod.summary ?? '',
      iconUrl: mod.logo?.thumbnailUrl || mod.logo?.url,
      downloads: mod.downloadCount,
      lastUpdated: mod.dateModified,
      supportedVersions: Array.from(versions),
      supportedLoaders: Array.from(loaders),
    };
  }

  private extractLoadersFromGameVersion(version: string): string[] {
    const normalized = version.toLowerCase();
    const loaders: string[] = [];
    if (normalized.includes('neoforge')) loaders.push('neoforge');
    if (normalized.includes('forge') && !normalized.includes('neoforge')) loaders.push('forge');
    if (normalized.includes('fabric')) loaders.push('fabric');
    if (normalized.includes('quilt')) loaders.push('quilt');
    return loaders;
  }

  // "latest" (and an empty value) mean "whatever version the image resolves at
  // runtime", so filtering by it would always return zero results.
  private resolveVersionFilter(minecraftVersion?: string): string | undefined {
    const trimmed = (minecraftVersion ?? '').trim();
    if (!trimmed || trimmed.toLowerCase() === 'latest') return undefined;
    return trimmed;
  }

  private isCompatibleResult(
    mod: NormalizedModSearchResult,
    minecraftVersion?: string,
    loader?: 'forge' | 'neoforge' | 'fabric' | 'quilt',
  ): boolean {
    if (minecraftVersion) {
      const hasVersion = mod.supportedVersions.some((version) => version === minecraftVersion);
      if (!hasVersion) return false;
    }

    if (!loader) return true;
    if (mod.supportedLoaders.length === 0) return true;
    return mod.supportedLoaders.includes(loader);
  }
}
