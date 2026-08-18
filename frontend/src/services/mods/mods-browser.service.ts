import api from "../axios.service";

export type ModProvider = "curseforge" | "modrinth";
export type ModLoader = "forge" | "neoforge" | "fabric" | "quilt";
// itzg installs Modrinth datapacks through the "datapack:" prefix, which maps to
// the datapack loader on Modrinth's side.
export type ModProjectType = "mod" | "datapack";
export type ModVersionLoader = ModLoader | "datapack";

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

export interface ModVersionItem {
  provider: ModProvider;
  versionId: string;
  name: string;
  versionNumber?: string;
  releaseType: "release" | "beta" | "alpha";
  fileName?: string;
  datePublished?: string;
  gameVersions: string[];
  loaders: string[];
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
  params: BaseSearchParams & { limit?: number; offset?: number; projectType?: ModProjectType },
): Promise<ModSearchResponse> => {
  const response = await api.get<ModSearchResponse>("/modrinth/mods/search", {
    params,
  });
  return response.data;
};

export const resolveModsByProvider = async (
  provider: ModProvider,
  refs: string[],
): Promise<ModSearchItem[]> => {
  if (refs.length === 0) return [];

  const path = provider === "curseforge" ? "/curseforge/mods/resolve" : "/modrinth/projects/resolve";
  const response = await api.get<{ data: ModSearchItem[] }>(path, {
    params: { refs: refs.join(",") },
  });
  return response.data.data;
};

export interface LatestModVersion {
  ref: string;
  version: ModVersionItem | null;
}

export const fetchLatestModVersions = async (
  provider: ModProvider,
  refs: string[],
  params: { minecraftVersion?: string; loader?: ModVersionLoader },
): Promise<LatestModVersion[]> => {
  if (refs.length === 0) return [];

  const path = provider === "curseforge" ? "/curseforge/mods/latest" : "/modrinth/projects/latest";
  const response = await api.get<{ data: LatestModVersion[] }>(path, {
    params: { ...params, refs: refs.join(",") },
  });
  return response.data.data;
};

export const resolveModVersionsByProvider = async (
  provider: ModProvider,
  versionIds: string[],
): Promise<ModVersionItem[]> => {
  if (versionIds.length === 0) return [];

  const path =
    provider === "curseforge" ? "/curseforge/mods/files/resolve" : "/modrinth/versions/resolve";
  const response = await api.get<{ data: ModVersionItem[] }>(path, {
    params: { ids: versionIds.join(",") },
  });
  return response.data.data;
};

export const fetchModVersions = async (
  provider: ModProvider,
  ref: string,
  params: { minecraftVersion?: string; loader?: ModVersionLoader },
): Promise<ModVersionItem[]> => {
  const path =
    provider === "curseforge"
      ? `/curseforge/mods/${encodeURIComponent(ref)}/versions`
      : `/modrinth/projects/${encodeURIComponent(ref)}/versions`;

  const response = await api.get<{ data: ModVersionItem[] }>(path, { params });
  return response.data.data;
};

export const searchModsByProvider = async (
  provider: ModProvider,
  params: BaseSearchParams & {
    pageSize?: number;
    index?: number;
    limit?: number;
    offset?: number;
    projectType?: ModProjectType;
  },
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
    projectType: params.projectType,
  });
};
