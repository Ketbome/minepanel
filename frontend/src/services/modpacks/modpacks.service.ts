import api from "../axios.service";

export interface ModpackFile {
  name: string;
  size: number;
  modified: string;
  containerPath: string;
}

export const modpacksService = {
  async list(serverId: string): Promise<ModpackFile[]> {
    const { data } = await api.get(`/servers/${serverId}/modpacks`);
    return data;
  },

  async upload(serverId: string, file: File, onProgress?: (percentage: number) => void): Promise<ModpackFile> {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await api.post(`/servers/${serverId}/modpacks`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded * 100) / event.total));
        }
      },
    });

    return data;
  },

  async remove(serverId: string, fileName: string): Promise<void> {
    await api.delete(`/servers/${serverId}/modpacks/${encodeURIComponent(fileName)}`);
  },
};
