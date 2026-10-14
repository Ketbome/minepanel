import api from "./axios.service";

export interface LogPreset {
  name: string;
  searchTerm: string;
  levelFilter: string;
  regex: boolean;
  lines: number;
  sinceMinutes: number;
}

export async function listLogPresets(serverId: string): Promise<LogPreset[]> {
  return (await api.get("/log-presets", { params: { serverId } })).data;
}

export async function saveLogPreset(serverId: string, preset: LogPreset): Promise<LogPreset> {
  return (await api.put("/log-presets", { serverId, ...preset })).data;
}

export async function deleteLogPreset(serverId: string, name: string): Promise<void> {
  await api.delete("/log-presets", { params: { serverId, name } });
}
