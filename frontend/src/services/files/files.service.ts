import api from "../axios.service";

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: string;
  extension?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
}

export const filesService = {
  async listFiles(serverId: string, path: string = ""): Promise<FileItem[]> {
    const { data } = await api.get(`/files/${serverId}/list`, {
      params: { path },
    });
    return data;
  },

  async readFile(serverId: string, path: string): Promise<{ content: string; encoding: string }> {
    const { data } = await api.get(`/files/${serverId}/read`, {
      params: { path },
    });
    return data;
  },

  async writeFile(serverId: string, path: string, content: string): Promise<void> {
    await api.post(`/files/${serverId}/write`, { path, content });
  },

  async deleteFile(serverId: string, path: string): Promise<void> {
    await api.delete(`/files/${serverId}/delete`, {
      params: { path },
    });
  },

  async createDirectory(serverId: string, path: string): Promise<void> {
    await api.post(`/files/${serverId}/mkdir`, { path });
  },

  async rename(serverId: string, path: string, newName: string): Promise<void> {
    await api.put(`/files/${serverId}/rename`, { path, newName });
  },

  async uploadFile(
    serverId: string,
    path: string,
    file: File,
    relativePath?: string,
    options?: UploadOptions
  ): Promise<void> {
    const formData = new FormData();
    formData.append("file", file);
    await api.post(`/files/${serverId}/upload`, formData, {
      params: { path, relativePath },
      headers: { "Content-Type": "multipart/form-data" },
      signal: options?.signal,
      onUploadProgress: (progressEvent) => {
        if (options?.onProgress && progressEvent.total) {
          options.onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
          });
        }
      },
    });
  },

  async uploadMultipleFiles(
    serverId: string,
    path: string,
    files: File[],
    relativePaths?: string[],
    options?: UploadOptions
  ): Promise<{ uploaded: number; errors: number }> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    if (relativePaths) {
      formData.append("relativePaths", JSON.stringify(relativePaths));
    }
    const { data } = await api.post(`/files/${serverId}/upload-multiple`, formData, {
      params: { path },
      headers: { "Content-Type": "multipart/form-data" },
      signal: options?.signal,
      onUploadProgress: (progressEvent) => {
        if (options?.onProgress && progressEvent.total) {
          options.onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
          });
        }
      },
    });
    return data;
  },

  getDownloadUrl(serverId: string, path: string): string {
    return `${api.defaults.baseURL}/files/${serverId}/download?path=${encodeURIComponent(path)}`;
  },

  getDownloadZipUrl(serverId: string, path: string): string {
    return `${api.defaults.baseURL}/files/${serverId}/download-zip?path=${encodeURIComponent(path)}`;
  },
};

