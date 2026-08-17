import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

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

interface ModrinthSearchHit {
  project_id: string;
  slug: string;
  title: string;
  description: string;
  icon_url?: string;
  downloads: number;
  date_modified?: string;
  versions: string[];
  categories: string[];
}

interface ModrinthSearchResponse {
  hits: ModrinthSearchHit[];
  offset: number;
  limit: number;
  total_hits: number;
}

interface ModrinthProject {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon_url?: string;
  downloads: number;
  updated?: string;
  game_versions?: string[];
  loaders?: string[];
}

interface ModrinthVersion {
  id: string;
  name: string;
  version_number: string;
  version_type: 'release' | 'beta' | 'alpha';
  date_published?: string;
  game_versions: string[];
  loaders: string[];
  files: Array<{ filename: string; primary: boolean }>;
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
export class ModrinthService {
  private readonly apiClient: AxiosInstance;
  private readonly MODRINTH_API_BASE = 'https://api.modrinth.com/v2';
  private readonly KNOWN_LOADERS = ['forge', 'neoforge', 'fabric', 'quilt'];
  private readonly MAX_RESOLVE_REFS = 50;

  constructor() {
    this.apiClient = axios.create({
      baseURL: this.MODRINTH_API_BASE,
      timeout: 10000,
      headers: {
        Accept: 'application/json',
      },
    });
  }

  async searchMods(query: {
    q?: string;
    limit?: number;
    offset?: number;
    minecraftVersion: string;
    loader?: 'forge' | 'neoforge' | 'fabric' | 'quilt';
  }): Promise<NormalizedModSearchResponse> {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 50);
    const offset = Math.max(query.offset ?? 0, 0);

    const versionFilter = this.resolveVersionFilter(query.minecraftVersion);
    const facets: string[][] = [['project_type:mod']];

    if (versionFilter) {
      facets.push([`versions:${versionFilter}`]);
    }

    if (query.loader) {
      facets.push([`categories:${query.loader}`]);
    }

    try {
      const response = await this.apiClient.get<ModrinthSearchResponse>('/search', {
        params: {
          query: query.q,
          limit,
          offset,
          index: 'relevance',
          facets: JSON.stringify(facets),
        },
      });

      const normalized = response.data.hits
        .map((hit) => this.normalizeHit(hit))
        .filter((mod) => this.isCompatibleResult(mod, versionFilter, query.loader));

      return {
        data: normalized,
        pagination: {
          index: offset,
          pageSize: limit,
          resultCount: normalized.length,
          totalCount: response.data.total_hits,
        },
      };
    } catch (error) {
      console.error('Error searching Modrinth mods:', error);

      if (axios.isAxiosError(error)) {
        throw new HttpException(
          error.response?.data?.description || 'Error searching mods',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException('Error searching mods', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async resolveProjects(refs: string[]): Promise<NormalizedModSearchResult[]> {
    const unique = Array.from(new Set(refs.map((ref) => ref.trim()).filter(Boolean))).slice(
      0,
      this.MAX_RESOLVE_REFS,
    );
    if (unique.length === 0) return [];

    try {
      const response = await this.apiClient.get<ModrinthProject[]>('/projects', {
        params: { ids: JSON.stringify(unique) },
      });
      return response.data.map((project) => this.normalizeProject(project));
    } catch (error) {
      console.error('Error resolving Modrinth projects:', error);
      return [];
    }
  }

  async getLatestVersions(
    refs: string[],
    query: { minecraftVersion?: string; loader?: ModLoaderName },
  ): Promise<Array<{ ref: string; version: NormalizedModVersion | null }>> {
    const unique = Array.from(new Set(refs.map((ref) => ref.trim()).filter(Boolean))).slice(
      0,
      this.MAX_RESOLVE_REFS,
    );

    return Promise.all(
      unique.map(async (ref) => {
        try {
          const versions = await this.getProjectVersions(ref, query);
          const release = versions.find((version) => version.releaseType === 'release');
          return { ref, version: release ?? versions[0] ?? null };
        } catch (error) {
          console.error(`Error resolving latest Modrinth version for "${ref}":`, error);
          return { ref, version: null };
        }
      }),
    );
  }

  async resolveVersions(ids: string[]): Promise<NormalizedModVersion[]> {
    const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean))).slice(
      0,
      this.MAX_RESOLVE_REFS,
    );
    if (unique.length === 0) return [];

    try {
      const response = await this.apiClient.get<ModrinthVersion[]>('/versions', {
        params: { ids: JSON.stringify(unique) },
      });
      return response.data.map((version) => this.normalizeVersion(version));
    } catch (error) {
      console.error('Error resolving Modrinth versions:', error);
      return [];
    }
  }

  async getProjectVersions(
    ref: string,
    query: { minecraftVersion?: string; loader?: ModLoaderName },
  ): Promise<NormalizedModVersion[]> {
    const params: Record<string, string> = {};
    if (query.minecraftVersion) params.game_versions = JSON.stringify([query.minecraftVersion]);
    if (query.loader) params.loaders = JSON.stringify([query.loader]);

    try {
      const response = await this.apiClient.get<ModrinthVersion[]>(
        `/project/${encodeURIComponent(ref.trim())}/version`,
        { params },
      );
      return response.data.map((version) => this.normalizeVersion(version));
    } catch (error) {
      console.error('Error fetching Modrinth project versions:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new HttpException(`Project "${ref}" not found on Modrinth`, HttpStatus.NOT_FOUND);
        }
        throw new HttpException(
          error.response?.data?.description || 'Error fetching mod versions',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException('Error fetching mod versions', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private normalizeProject(project: ModrinthProject): NormalizedModSearchResult {
    const supportedLoaders = (project.loaders ?? []).filter((loader) =>
      this.KNOWN_LOADERS.includes(loader.toLowerCase()),
    );

    return {
      provider: 'modrinth',
      projectId: project.id,
      slug: project.slug,
      name: project.title,
      summary: project.description ?? '',
      iconUrl: project.icon_url,
      downloads: project.downloads,
      lastUpdated: project.updated,
      supportedVersions: project.game_versions ?? [],
      supportedLoaders,
    };
  }

  private normalizeVersion(version: ModrinthVersion): NormalizedModVersion {
    const primaryFile = version.files?.find((file) => file.primary) ?? version.files?.[0];

    return {
      provider: 'modrinth',
      versionId: version.id,
      name: version.name,
      versionNumber: version.version_number,
      releaseType: version.version_type,
      fileName: primaryFile?.filename,
      datePublished: version.date_published,
      gameVersions: version.game_versions ?? [],
      loaders: version.loaders ?? [],
    };
  }

  private normalizeHit(hit: ModrinthSearchHit): NormalizedModSearchResult {
    const supportedLoaders = (hit.categories ?? []).filter((category) =>
      this.KNOWN_LOADERS.includes(category.toLowerCase()),
    );

    return {
      provider: 'modrinth',
      projectId: hit.project_id,
      slug: hit.slug,
      name: hit.title,
      summary: hit.description ?? '',
      iconUrl: hit.icon_url,
      downloads: hit.downloads,
      lastUpdated: hit.date_modified,
      supportedVersions: hit.versions ?? [],
      supportedLoaders,
    };
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
