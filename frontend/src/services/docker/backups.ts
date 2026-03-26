import api from "../axios.service";

export interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
}

export const listBackups = async (serverId: string): Promise<BackupFile[]> => {
  const response = await api.get(`/servers/${serverId}/backups`);
  return response.data;
};

export const triggerBackup = async (serverId: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.post(`/servers/${serverId}/backups/trigger`);
  return response.data;
};

export const restoreBackup = async (serverId: string, filename: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.post(`/servers/${serverId}/backups/${encodeURIComponent(filename)}/restore`);
  return response.data;
};

export const downloadBackup = (serverId: string, filename: string): string => {
  const baseUrl = api.defaults.baseURL || '';
  return `${baseUrl}/servers/${serverId}/backups/${encodeURIComponent(filename)}/download`;
};

export const deleteBackup = async (serverId: string, filename: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/servers/${serverId}/backups/${encodeURIComponent(filename)}`);
  return response.data;
};
