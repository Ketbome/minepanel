import api from "../axios.service";
import { ModProvider } from "../mods/mods-browser.service";

export interface PendingModChange {
  provider: ModProvider;
  ref: string;
  action: "add" | "remove";
  version?: string;
  label: string;
}

export interface ModMetadata {
  desiredMcVersion: string | null;
  notes: Record<string, string>;
  pendingChanges: PendingModChange[];
}

export const fetchModMetadata = async (serverId: string): Promise<ModMetadata> => {
  const response = await api.get<ModMetadata>(`/mod-metadata/${serverId}`);
  return response.data;
};

export const updateDesiredVersion = async (serverId: string, desiredMcVersion: string | null): Promise<ModMetadata> => {
  const response = await api.put<ModMetadata>(`/mod-metadata/${serverId}/desired-version`, { desiredMcVersion });
  return response.data;
};

export const updateModNote = async (serverId: string, ref: string, note: string): Promise<ModMetadata> => {
  const response = await api.put<ModMetadata>(`/mod-metadata/${serverId}/notes/${encodeURIComponent(ref)}`, { note });
  return response.data;
};

export const fetchCurseforgeChangelog = async (ref: string, fileId: string): Promise<string | null> => {
  const response = await api.get<{ changelog: string | null }>(`/curseforge/mods/${encodeURIComponent(ref)}/files/${encodeURIComponent(fileId)}/changelog`);
  return response.data.changelog;
};

export const queueModChange = async (serverId: string, change: PendingModChange): Promise<ModMetadata> => {
  const response = await api.post<ModMetadata>(`/mod-metadata/${serverId}/queue`, change);
  return response.data;
};

export const cancelQueuedModChange = async (serverId: string, provider: ModProvider, ref: string): Promise<ModMetadata> => {
  const response = await api.delete<ModMetadata>(`/mod-metadata/${serverId}/queue/${provider}/${encodeURIComponent(ref)}`);
  return response.data;
};
