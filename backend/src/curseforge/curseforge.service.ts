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

export interface ModCategory {
  value: string;
  label: string;
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
type ModSortField = 'relevance' | 'downloads' | 'updated';

@Injectable()
export class CurseforgeService {
  private readonly apiClient: AxiosInstance;
  private readonly CURSEFORGE_API_BASE = 'https://api.curseforge.com/v1';
  private readonly MINECRAFT_GAME_ID = 432;
  private readonly MODS_CLASS_ID = 6;
  private readonly MODPACK_CLASS_ID = 4471;
  private readonly MAX_RESOLVE_REFS = 50;
  private readonly CATEGORIES_TTL_MS = 24 * 60 * 60 * 1000;

  // 2 = Popularity, 3 = LastUpdated, 6 = TotalDownloads. CurseForge has no
  // relevance sort, so popularity stands in for it.
  private readonly SORT_FIELD: Record<ModSortField, number> = {
    relevance: 2,
    downloads: 6,
    updated: 3,
  };

  private modCategories?: { data: ModCategory[]; expiresAt: number };
  // CurseForge modLoaderType enum
  private readonly LOADER_TYPE: Record<ModLoaderName, number> = {
    forge: 1,
    fabric: 4,
    quilt: 5,
    neoforge: 6,
  };
  private readonly LOADER_NAME: Record<number, ModLoaderName> = {
    1: 'forge',
    4: 'fabric',
    5: 'quilt',
    6: 'neoforge',
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
      sort?: ModSortField;
      category?: string;
    },
  ): Promise<NormalizedModSearchResponse> {
    if (!apiKey) {
      throw new HttpException(
        'CurseForge API key not configured',
        HttpStatus.BAD_REQUEST,
      );
    }

    const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 50);
    const index = Math.max(query.index ?? 0, 0);
    const versionFilter = this.resolveVersionFilter(query.minecraftVersion);
    // CurseForge only honours modLoaderType when it comes with a game version.
    const loaderType = versionFilter && query.loader ? this.LOADER_TYPE[query.loader] : undefined;
    const categoryFilter = query.category ? Number.parseInt(query.category, 10) : undefined;

    try {
      const client = this.getApiClient(apiKey);
      const search = async (params: Record<string, unknown>) => {
        const response = await client.get<CurseForgeSearchResponse>('/mods/search', {
          params: {
            gameId: this.MINECRAFT_GAME_ID,
            classId: this.MODS_CLASS_ID,
            sortField: this.SORT_FIELD[query.sort ?? 'relevance'],
            sortOrder: 'desc',
            ...params,
          },
        });
        return response.data;
      };

      let payload = await search({
        searchFilter: query.q,
        pageSize,
        index,
        gameVersion: versionFilter,
        modLoaderType: loaderType,
        categoryId: categoryFilter,
      });

      // searchFilter matches display names, so a pasted slug ("moogs-end-structures")
      // finds nothing. Retry it as an exact slug lookup before giving up.
      if (payload.data.length === 0 && index === 0 && this.looksLikeSlug(query.q)) {
        payload = await search({ slug: query.q?.trim().toLowerCase(), pageSize: 1 });
      }

      const data = payload.data
        .map((mod) => this.normalizeMod(mod))
        .filter((mod) => this.isCompatibleResult(mod, versionFilter, query.loader));

      return {
        data,
        pagination: {
          index,
          pageSize,
          resultCount: data.length,
          totalCount: payload.pagination?.totalCount ?? data.length,
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

  async getModCategories(apiKey: string): Promise<ModCategory[]> {
    if (this.modCategories && this.modCategories.expiresAt > Date.now()) {
      return this.modCategories.data;
    }

    try {
      const client = this.getApiClient(apiKey);
      const response = await client.get<{ data: Array<{ id: number; name: string; isClass?: boolean }> }>(
        '/categories',
        { params: { gameId: this.MINECRAFT_GAME_ID, classId: this.MODS_CLASS_ID } },
      );

      const data = response.data.data
        .filter((category) => !category.isClass)
        .map((category) => ({ value: String(category.id), label: category.name }))
        .sort((a, b) => a.label.localeCompare(b.label));

      this.modCategories = { data, expiresAt: Date.now() + this.CATEGORIES_TTL_MS };
      return data;
    } catch (error) {
      console.error('Error fetching CurseForge categories:', error);
      return [];
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
        // modLoader 0 (or missing) means the upload is untagged, not incompatible.
        if (loaderType !== undefined && index.modLoader && index.modLoader !== loaderType) return false;
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

  async resolveModpack(apiKey: string, ref: string): Promise<CurseForgeModpack> {
    if (!apiKey) {
      throw new HttpException('CurseForge API key not configured', HttpStatus.BAD_REQUEST);
    }

    const client = this.getApiClient(apiKey);
    const trimmed = ref.trim();

    try {
      if (/^\d+$/.test(trimmed)) {
        const response = await client.get<CurseForgeModResponse>(`/mods/${trimmed}`);
        return response.data.data;
      }

      const response = await client.get<CurseForgeSearchResponse>('/mods/search', {
        params: {
          gameId: this.MINECRAFT_GAME_ID,
          classId: this.MODPACK_CLASS_ID,
          slug: trimmed,
          pageSize: 1,
        },
      });

      const modpack = response.data.data[0];
      if (!modpack) {
        throw new HttpException(`Modpack "${trimmed}" not found on CurseForge`, HttpStatus.NOT_FOUND);
      }
      return modpack;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Error resolving CurseForge modpack:', error);

      if (axios.isAxiosError(error) && error.response?.status === 403) {
        throw new HttpException('Invalid CurseForge API key', HttpStatus.FORBIDDEN);
      }
      throw new HttpException('Error resolving modpack', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getModpackFiles(apiKey: string, ref: string): Promise<NormalizedModVersion[]> {
    const modpack = await this.resolveModpack(apiKey, ref);
    const client = this.getApiClient(apiKey);

    try {
      const response = await client.get<{ data: CurseForgeModpack['latestFiles'] }>(
        `/mods/${modpack.id}/files`,
        { params: { pageSize: 50 } },
      );
      return (response.data.data ?? []).map((file) => this.normalizeFile(file));
    } catch (error) {
      console.error('Error fetching CurseForge modpack files:', error);
      throw new HttpException('Error fetching modpack files', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getFileChangelogByRef(apiKey: string, ref: string, fileId: string): Promise<string | null> {
    if (!apiKey) {
      throw new HttpException('CurseForge API key not configured', HttpStatus.BAD_REQUEST);
    }
    if (!/^\d+$/.test(fileId)) {
      return null;
    }

    try {
      const client = this.getApiClient(apiKey);
      const modId = await this.resolveModId(client, ref);
      const response = await client.get<{ data: string }>(`/mods/${modId}/files/${fileId}/changelog`);
      return response.data.data ?? null;
    } catch (error) {
      console.error(`Error fetching CurseForge changelog for "${ref}" file ${fileId}:`, error);
      return null;
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

    // latestFilesIndexes holds one entry per game version/loader pair, so it is
    // the only field that shows the full compatibility range. latestFiles only
    // carries the newest uploads, which hides older game versions the mod still
    // supports (a 1.20.1 mod updated for 1.21 looked incompatible).
    for (const index of mod.latestFilesIndexes ?? []) {
      if (index.gameVersion) versions.add(index.gameVersion);
      const loader = this.LOADER_NAME[index.modLoader];
      if (loader) loaders.add(loader);
    }

    if (versions.size === 0) {
      for (const file of mod.latestFiles ?? []) {
        for (const version of file.gameVersions ?? []) {
          const fileLoaders = this.extractLoadersFromGameVersion(version);
          if (fileLoaders.length > 0) {
            fileLoaders.forEach((loader) => loaders.add(loader));
            continue;
          }
          if (/^\d/.test(version)) versions.add(version);
        }
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

  private looksLikeSlug(query?: string): boolean {
    const trimmed = (query ?? '').trim();
    return trimmed.length > 0 && /^[a-z0-9]+(?:[-_][a-z0-9]+)+$/i.test(trimmed);
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
