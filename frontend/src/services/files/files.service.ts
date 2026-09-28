import axios from "axios";
import api from "../axios.service";
import { getPublicEnv } from "@/lib/public-env";

// Files above this go up in chunks, so no request has to carry the whole file past a
// proxy body limit (Cloudflare: 100 MB) or Node's 5-minute request timeout.
// Must stay at or below the backend's MAX_CHUNK_BYTES.
export const CHUNK_SIZE = 8 * 1024 * 1024;
const CHUNK_RETRIES = 5;

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });

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
  // false keeps files that already exist; the server skips them instead of replacing.
  overwrite?: boolean;
}

// Names as sent (relative path or file name).
export interface BatchUploadResult {
  uploaded: number;
  skipped: string[];
  failed: string[];
}

// total is missing when the response carries no Content-Length.
export interface DownloadProgress {
  loaded: number;
  total?: number;
}

export interface DownloadOptions {
  onProgress?: (progress: DownloadProgress) => void;
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

  // A dropped chunk is retried from the offset the server reports, so a flaky link
  // costs at most one chunk instead of the whole file.
  async uploadFileChunked(serverId: string, path: string, file: File, relativePath?: string, options?: UploadOptions): Promise<void> {
    const { data } = await api.post(`/files/${serverId}/uploads`, { path, name: relativePath || file.name, size: file.size, overwrite: options?.overwrite ?? true }, { signal: options?.signal });
    const url = `/files/${serverId}/uploads/${data.id}`;

    try {
      let offset = 0;
      let failures = 0;

      while (offset < file.size) {
        const start = offset;
        try {
          const { data: next } = await api.put(url, file.slice(start, start + CHUNK_SIZE), {
            params: { offset: start },
            headers: { "Content-Type": "application/octet-stream" },
            signal: options?.signal,
            onUploadProgress: (event) => {
              const loaded = start + event.loaded;
              options?.onProgress?.({ loaded, total: file.size, percentage: Math.round((loaded * 100) / file.size) });
            },
          });
          offset = next.offset;
          failures = 0;
        } catch (error) {
          if (axios.isCancel(error) || ++failures > CHUNK_RETRIES) throw error;
          // 400/403/404/413/507 will not get better by retrying.
          const status = axios.isAxiosError(error) ? error.response?.status : undefined;
          if (status && status !== 409 && status < 500) throw error;

          await wait(Math.min(1000 * 2 ** (failures - 1), 15000), options?.signal);
          offset = await api.get(url, { signal: options?.signal }).then((res) => res.data.offset, () => offset);
        }
      }

      await api.post(`${url}/complete`, {}, { signal: options?.signal });
    } catch (error) {
      // Best effort: the server sweeps sessions left idle anyway.
      api.delete(url).catch(() => undefined);
      throw error;
    }
  },

  async uploadMultipleFiles(serverId: string, path: string, files: File[], relativePaths?: string[], options?: UploadOptions): Promise<BatchUploadResult> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    if (relativePaths) {
      formData.append("relativePaths", JSON.stringify(relativePaths));
    }
    const { data } = await api.post(`/files/${serverId}/upload-multiple`, formData, {
      params: { path, overwrite: options?.overwrite ?? true },
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

  // Up to this size a download goes through a blob, which feeds the in-panel progress
  // but holds the whole file in the tab's memory. Past it the browser saves to disk.
  // ponytail: a folder ZIP has no size up front, so it always goes to the browser.
  NATIVE_DOWNLOAD_BYTES: 256 * 1024 * 1024,

  // Hands the transfer to the browser, which writes to disk as bytes arrive and shows
  // its own progress and cancel. A navigation cannot refresh an expired session, so the
  // info request goes first: the axios interceptor refreshes the cookie if needed, and a
  // missing path fails here as an error instead of a JSON page.
  // Several paths make one ZIP of the selection.
  async downloadNative(serverId: string, paths: string | string[], zip = false): Promise<void> {
    const list = [paths].flat();
    await api.get(`/files/${serverId}/info`, { params: { path: list[0] } });

    const query = new URLSearchParams(list.map((path) => ["path", path]));
    const link = document.createElement("a");
    link.href = `${getPublicEnv("NEXT_PUBLIC_BACKEND_URL")}/files/${serverId}/${zip ? "download-zip" : "download"}?${query}`;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async downloadFile(serverId: string, path: string, options?: DownloadOptions): Promise<Blob> {
    const { data } = await api.get(`/files/${serverId}/download`, {
      params: { path },
      responseType: "blob",
      signal: options?.signal,
      onDownloadProgress: (progressEvent) => {
        options?.onProgress?.({ loaded: progressEvent.loaded, total: progressEvent.total });
      },
    });
    return data;
  },

};
