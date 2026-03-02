import api from "../axios.service";

export type ModProvider = "curseforge" | "modrinth";
export type ModLoader = "forge" | "neoforge" | "fabric" | "quilt";

export interface ModSearchItem {
  provider: ModProvider;
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

export interface ModSearchResponse {
  data: ModSearchItem[];
  pagination: {
    index: number;
    pageSize: number;
    resultCount: number;
    totalCount: number;
  };
}

interface BaseSearchParams {
  q?: string;
  minecraftVersion: string;
  loader?: ModLoader;
}

export const searchCurseforgeMods = async (
  params: BaseSearchParams & { pageSize?: number; index?: number },
): Promise<ModSearchResponse> => {
  const response = await api.get<ModSearchResponse>("/curseforge/mods/search", {
    params,
  });
  return response.data;
};

export const searchModrinthMods = async (
  params: BaseSearchParams & { limit?: number; offset?: number },
): Promise<ModSearchResponse> => {
  const response = await api.get<ModSearchResponse>("/modrinth/mods/search", {
    params,
  });
  return response.data;
};

export const searchModsByProvider = async (
  provider: ModProvider,
  params: BaseSearchParams & { pageSize?: number; index?: number; limit?: number; offset?: number },
): Promise<ModSearchResponse> => {
  if (provider === "curseforge") {
    return searchCurseforgeMods({
      q: params.q,
      minecraftVersion: params.minecraftVersion,
      loader: params.loader,
      pageSize: params.pageSize,
      index: params.index,
    });
  }

  return searchModrinthMods({
    q: params.q,
    minecraftVersion: params.minecraftVersion,
    loader: params.loader,
    limit: params.limit,
    offset: params.offset,
  });
};
