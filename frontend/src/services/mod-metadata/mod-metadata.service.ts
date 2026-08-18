import api from "../axios.service";

export interface ModMetadata {
  desiredMcVersion: string | null;
  notes: Record<string, string>;
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
