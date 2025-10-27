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

@Injectable()
export class CurseforgeService {
  private readonly apiClient: AxiosInstance;
  private readonly CURSEFORGE_API_BASE = 'https://api.curseforge.com/v1';
  private readonly MINECRAFT_GAME_ID = 432;
  private readonly MODPACK_CLASS_ID = 4471;

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
}

