import api from "../axios.service";

export interface DiscoverWorldItem {
  provider: "curseforge";
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
  data: DiscoverWorldItem[];
  pagination: {
    index: number;
    pageSize: number;
    resultCount: number;
    totalCount: number;
  };
}

export interface DiscoverWorldDetails {
  provider: "curseforge";
  projectId: string;
  name: string;
  summary: string;
  slug: string;
  downloads?: number;
  iconUrl?: string;
  websiteUrl?: string;
  screenshots: string[];
}

export interface ImportWorldResponse {
  success: boolean;
  provider: "curseforge" | "url";
  fileName: string;
  filePath: string;
  bytes: number;
}

export interface LibraryWorld {
  /** Path relative to the library root; what a server stores as `worldSource`. */
  source: string;
  name: string;
  folder: string;
  type: "directory" | "archive";
  sizeBytes: number;
  modifiedAt: string;
}

export const worldDiscoveryService = {
  async listLibraryWorlds(): Promise<LibraryWorld[]> {
    const { data } = await api.get("/world-discovery/library");
    return data;
  },

  async searchCurseforgeWorlds(params: { q?: string; pageSize?: number; index?: number }): Promise<DiscoverWorldsResponse> {
    const { data } = await api.get("/world-discovery/search", {
      params: {
        provider: "curseforge",
        q: params.q,
        pageSize: params.pageSize,
        index: params.index,
      },
    });
    return data;
  },

  async importCurseforgeWorld(payload: { projectId: string; fileId?: number; targetFolder?: string }): Promise<ImportWorldResponse> {
    const { data } = await api.post("/world-discovery/import", {
      provider: "curseforge",
      projectId: payload.projectId,
      fileId: payload.fileId,
      targetFolder: payload.targetFolder,
    });
    return data;
  },

  async importWorldFromUrl(payload: { downloadUrl: string; fileName?: string; targetFolder?: string }): Promise<ImportWorldResponse> {
    const { data } = await api.post("/world-discovery/import", {
      provider: "url",
      downloadUrl: payload.downloadUrl,
      fileName: payload.fileName,
      targetFolder: payload.targetFolder,
    });
    return data;
  },

  async getCurseforgeWorldDetails(projectId: string): Promise<DiscoverWorldDetails> {
    const { data } = await api.get(`/world-discovery/curseforge/${projectId}`);
    return data;
  },
};
