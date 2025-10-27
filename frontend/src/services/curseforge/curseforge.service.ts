import api from "../axios.service";

export interface CurseForgeAuthor {
  id: number;
  name: string;
  url: string;
}

export interface CurseForgeCategory {
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
}

export interface CurseForgeAsset {
  id: number;
  modId: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  url: string;
}

export interface CurseForgeFile {
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
}

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
  categories: CurseForgeCategory[];
  authors: CurseForgeAuthor[];
  logo: CurseForgeAsset;
  screenshots: CurseForgeAsset[];
  mainFileId: number;
  latestFiles: CurseForgeFile[];
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

export const searchModpacks = async (
  searchFilter?: string,
  pageSize: number = 20,
  index: number = 0,
  sortField: number = 2,
  sortOrder: "asc" | "desc" = "desc"
): Promise<CurseForgeSearchResponse> => {
  try {
    const response = await api.get("/curseforge/search", {
      params: {
        searchFilter,
        pageSize,
        index,
        sortField,
        sortOrder,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error searching modpacks:", error);
    throw error;
  }
};

export const getFeaturedModpacks = async (limit: number = 10): Promise<CurseForgeSearchResponse> => {
  try {
    const response = await api.get("/curseforge/featured", {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching featured modpacks:", error);
    throw error;
  }
};

export const getPopularModpacks = async (limit: number = 10): Promise<CurseForgeSearchResponse> => {
  try {
    const response = await api.get("/curseforge/popular", {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching popular modpacks:", error);
    throw error;
  }
};

export const getModpack = async (id: number): Promise<CurseForgeModpack> => {
  try {
    const response = await api.get<CurseForgeModResponse>(`/curseforge/${id}`);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching modpack:", error);
    throw error;
  }
};

export const formatDownloadCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

