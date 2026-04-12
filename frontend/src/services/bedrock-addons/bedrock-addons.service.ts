import api from "../axios.service";

export type BedrockAddonSource = "upload" | "curseforge";
export type BedrockAddonPackKind = "behavior" | "resource";

export interface BedrockAddonPack {
  uuid: string;
  version: number[];
  kind: BedrockAddonPackKind;
  name: string;
  relativePath: string;
}

export interface BedrockAddon {
  id: string;
  name: string;
  source: BedrockAddonSource;
  fileName: string;
  enabled: boolean;
  createdAt: string;
  downloadPath: string;
  packs: BedrockAddonPack[];
  providerProjectId?: string;
  providerFileId?: number;
}

export interface BedrockAddonsResponse {
  levelName: string;
  addons: BedrockAddon[];
}

export interface BedrockAddonSearchItem {
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

export interface BedrockAddonSearchResponse {
  data: BedrockAddonSearchItem[];
  pagination: {
    index: number;
    pageSize: number;
    resultCount: number;
    totalCount: number;
  };
}

export const bedrockAddonsService = {
  async list(serverId: string): Promise<BedrockAddonsResponse> {
    const { data } = await api.get(`/bedrock-addons/${serverId}`);
    return data;
  },

  async upload(serverId: string, file: File): Promise<void> {
    const formData = new FormData();
    formData.append("file", file);
    await api.post(`/bedrock-addons/${serverId}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  async searchCurseForge(serverId: string, params: { q?: string; pageSize?: number; index?: number }): Promise<BedrockAddonSearchResponse> {
    const { data } = await api.get(`/bedrock-addons/${serverId}/curseforge/search`, {
      params,
    });
    return data;
  },

  async importCurseForge(serverId: string, payload: { projectId: string; fileId?: number; enable?: boolean }): Promise<void> {
    await api.post(`/bedrock-addons/${serverId}/curseforge/import`, {
      projectId: payload.projectId,
      fileId: payload.fileId,
    }, {
      params: {
        enable: payload.enable ? "true" : "false",
      },
    });
  },

  async enable(serverId: string, addonId: string): Promise<void> {
    await api.post(`/bedrock-addons/${serverId}/${addonId}/enable`);
  },

  async disable(serverId: string, addonId: string): Promise<void> {
    await api.post(`/bedrock-addons/${serverId}/${addonId}/disable`);
  },

  async remove(serverId: string, addonId: string): Promise<void> {
    await api.delete(`/bedrock-addons/${serverId}/${addonId}`);
  },
};
