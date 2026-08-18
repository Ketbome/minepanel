"use client";

import { FC, useState, useEffect, useCallback, useRef } from "react";
import { filesService, FileItem, DownloadProgress } from "@/services/files/files.service";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { mcToast } from "@/lib/utils/minecraft-toast";
import { FileList } from "./FileList";
import { Breadcrumbs } from "./Breadcrumbs";
import { FileToolbar } from "./FileToolbar";
import { FileEditor } from "./FileEditor";
import { DropZone } from "./DropZone";
import { UploadProgress, UploadItem } from "./UploadProgress";
import { Loader2 } from "lucide-react";

interface FileBrowserProps {
  serverId: string;
}

// Extensiones que se pueden editar como texto
const TEXT_EXTENSIONS = [
  // Config
  "txt",
  "json",
  "yml",
  "yaml",
  "properties",
  "cfg",
  "conf",
  "xml",
  "toml",
  "ini",
  // Scripts
  "sh",
  "bat",
  "ps1",
  "cmd",
  // Docs
  "md",
  "log",
  "csv",
  // Minecraft
  "mcmeta",
  "lang",
  "nbt",
  // Code
  "java",
  "js",
  "ts",
  "py",
  "lua",
  "sk",
  // Data
  "html",
  "css",
  "scss",
  "sql",
];

const saveBlob = (blob: Blob, name: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

const isEditableFile = (file: FileItem): boolean => {
  if (file.isDirectory) return false;
  if (!file.extension) return false;
  return TEXT_EXTENSIONS.includes(file.extension.toLowerCase());
};

export const FileBrowser: FC<FileBrowserProps> = ({ serverId }) => {
  const { t } = useLanguage();
  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [editingFile, setEditingFile] = useState<{ path: string; content: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [downloads, setDownloads] = useState<UploadItem[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const downloadAbortRef = useRef<AbortController | null>(null);

  const loadFiles = useCallback(
    async (path: string = "") => {
      setLoading(true);
      try {
        const data = await filesService.listFiles(serverId, path);
        setFiles(data);
        setCurrentPath(path);
      } catch (error) {
        console.error("Error loading files:", error);
        mcToast.error(t("errorLoadingFiles"));
      } finally {
        setLoading(false);
      }
    },
    [serverId, t]
  );

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const navigateToFolder = useCallback(
    (path: string) => {
      setSelectedFile(null);
      setEditingFile(null);
      loadFiles(path);
    },
    [loadFiles]
  );

  const navigateUp = useCallback(() => {
    if (!currentPath) return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    navigateToFolder(parts.join("/"));
  }, [currentPath, navigateToFolder]);

  const handleFileClick = useCallback(
    (file: FileItem) => {
      if (file.isDirectory) {
        navigateToFolder(file.path);
      } else {
        setSelectedFile(file);
      }
    },
    [navigateToFolder]
  );

  const handleFileDoubleClick = useCallback(
    async (file: FileItem) => {
      if (file.isDirectory) {
        navigateToFolder(file.path);
        return;
      }

      if (isEditableFile(file)) {
        try {
          const { content } = await filesService.readFile(serverId, file.path);
          setEditingFile({ path: file.path, content });
        } catch (error) {
          console.error("Error reading file:", error);
          mcToast.error(t("errorReadingFile"));
        }
      }
    },
    [serverId, navigateToFolder, t]
  );

  const handleEdit = useCallback(
    async (file: FileItem) => {
      if (!isEditableFile(file)) return;
      try {
        const { content } = await filesService.readFile(serverId, file.path);
        setEditingFile({ path: file.path, content });
      } catch (error) {
        console.error("Error reading file:", error);
        mcToast.error(t("errorReadingFile"));
      }
    },
    [serverId, t]
  );

  const handleSaveFile = useCallback(
    async (content: string) => {
      if (!editingFile) return;
      try {
        await filesService.writeFile(serverId, editingFile.path, content);
        mcToast.success(t("fileSaved"));
        setEditingFile(null);
        loadFiles(currentPath);
      } catch (error) {
        console.error("Error saving file:", error);
        mcToast.error(t("errorSavingFile"));
      }
    },
    [editingFile, serverId, currentPath, loadFiles, t]
  );

  const handleDelete = useCallback(
    async (file: FileItem) => {
      try {
        await filesService.deleteFile(serverId, file.path);
        mcToast.success(t("fileDeleted"));
        setSelectedFile(null);
        loadFiles(currentPath);
      } catch (error) {
        console.error("Error deleting file:", error);
        mcToast.error(t("errorDeletingFile"));
      }
    },
    [serverId, currentPath, loadFiles, t]
  );

  const handleCreateFolder = useCallback(
    async (name: string) => {
      try {
        const path = currentPath ? `${currentPath}/${name}` : name;
        await filesService.createDirectory(serverId, path);
        mcToast.success(t("folderCreated"));
        loadFiles(currentPath);
      } catch (error) {
        console.error("Error creating folder:", error);
        mcToast.error(t("errorCreatingFolder"));
      }
    },
    [serverId, currentPath, loadFiles, t]
  );

  const handleUploadFiles = useCallback(
    async (filesToUpload: File[], relativePaths?: string[]) => {
      setIsUploading(true);
      abortControllerRef.current = new AbortController();

      const uploadItems: UploadItem[] = filesToUpload.map((file, index) => ({
        id: `${Date.now()}-${index}`,
        name: relativePaths?.[index] || file.name,
        size: file.size,
        loaded: 0,
        status: "pending" as const,
      }));
      setUploads(uploadItems);

      const avgFileSize = filesToUpload.reduce((acc, f) => acc + f.size, 0) / filesToUpload.length;
      const BATCH_SIZE = avgFileSize < 1024 * 1024 ? 20 : avgFileSize < 10 * 1024 * 1024 ? 10 : 5;
      const MAX_RETRIES = 2;

      let errorCount = 0;

      const uploadBatch = async (batchFiles: File[], batchPaths: string[] | undefined, batchIds: string[], retryCount = 0): Promise<boolean> => {
        if (abortControllerRef.current?.signal.aborted) return false;

        const batchTotalSize = batchFiles.reduce((acc, f) => acc + f.size, 0);

        // Marcar lote como uploading
        setUploads((prev) => prev.map((u) => (batchIds.includes(u.id) ? { ...u, status: "uploading" as const, loaded: 0 } : u)));

        try {
          if (batchFiles.length === 1 && !batchPaths) {
            await filesService.uploadFile(serverId, currentPath, batchFiles[0], undefined, {
              signal: abortControllerRef.current!.signal,
              onProgress: (progress) => {
                setUploads((prev) => prev.map((u) => (u.id === batchIds[0] ? { ...u, loaded: progress.loaded } : u)));
              },
            });
          } else {
            await filesService.uploadMultipleFiles(serverId, currentPath, batchFiles, batchPaths, {
              signal: abortControllerRef.current!.signal,
              onProgress: (progress) => {
                setUploads((prev) =>
                  prev.map((u) => {
                    if (!batchIds.includes(u.id)) return u;
                    const fileRatio = u.size / batchTotalSize;
                    return { ...u, loaded: Math.round(fileRatio * progress.loaded) };
                  })
                );
              },
            });
          }

          setUploads((prev) => prev.map((u) => (batchIds.includes(u.id) ? { ...u, loaded: u.size, status: "completed" as const } : u)));
          return true;
        } catch (err) {
          if ((err as Error).name === "CanceledError" || (err as Error).name === "AbortError") {
            throw err;
          }

          if (retryCount < MAX_RETRIES) {
            console.log(`Retry ${retryCount + 1}/${MAX_RETRIES} for batch`);
            await new Promise((r) => setTimeout(r, 1000 * (retryCount + 1))); // Backoff
            return uploadBatch(batchFiles, batchPaths, batchIds, retryCount + 1);
          }

          setUploads((prev) => prev.map((u) => (batchIds.includes(u.id) && u.status !== "completed" ? { ...u, status: "error" as const } : u)));
          return false;
        }
      };

      try {
        for (let i = 0; i < filesToUpload.length; i += BATCH_SIZE) {
          if (abortControllerRef.current?.signal.aborted) break;

          const batchFiles = filesToUpload.slice(i, i + BATCH_SIZE);
          const batchPaths = relativePaths?.slice(i, i + BATCH_SIZE);
          const batchIds = uploadItems.slice(i, i + BATCH_SIZE).map((u) => u.id);

          const success = await uploadBatch(batchFiles, batchPaths, batchIds);
          if (!success) {
            errorCount += batchFiles.length;
          }
        }

        if (errorCount > 0) {
          mcToast.error(t("filesUploadFailed").replace("{count}", errorCount.toString()));
        }

        loadFiles(currentPath);
      } catch (error) {
        if ((error as Error).name === "CanceledError" || (error as Error).name === "AbortError") {
          setUploads((prev) => prev.map((u) => (u.status === "uploading" || u.status === "pending" ? { ...u, status: "error" as const, error: "Cancelled" } : u)));
        } else {
          console.error("Error uploading files:", error);
          setUploads((prev) => prev.map((u) => (u.status !== "completed" ? { ...u, status: "error" as const } : u)));
          mcToast.error(t("errorUploadingFile"));
        }
      } finally {
        setIsUploading(false);
        abortControllerRef.current = null;
      }
    },
    [serverId, currentPath, loadFiles, t]
  );

  const handleCancelUpload = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleCloseUploadProgress = useCallback(() => {
    setUploads([]);
  }, []);

  const handleRename = useCallback(
    async (file: FileItem, newName: string) => {
      try {
        await filesService.rename(serverId, file.path, newName);
        mcToast.success(t("fileRenamed"));
        setSelectedFile(null);
        loadFiles(currentPath);
      } catch (error) {
        console.error("Error renaming file:", error);
        mcToast.error(t("errorRenamingFile"));
      }
    },
    [serverId, currentPath, loadFiles, t]
  );

  // A big folder takes a while to zip and stream, so the transfer is tracked in
  // the same panel used by uploads instead of leaving the UI silent.
  const runDownload = useCallback(
    async (name: string, size: number, download: (options: { onProgress: (progress: DownloadProgress) => void; signal: AbortSignal }) => Promise<Blob>) => {
      const id = `${Date.now()}-${name}`;
      downloadAbortRef.current = new AbortController();
      setDownloads([{ id, name, size, loaded: 0, status: "downloading" }]);

      try {
        const blob = await download({
          signal: downloadAbortRef.current.signal,
          onProgress: (progress) => {
            setDownloads((prev) => prev.map((item) => (item.id === id ? { ...item, loaded: progress.loaded, size: progress.total ?? item.size } : item)));
          },
        });

        setDownloads((prev) => prev.map((item) => (item.id === id ? { ...item, loaded: blob.size, size: blob.size, status: "completed" } : item)));
        saveBlob(blob, name);
        return true;
      } catch (error) {
        if ((error as Error).name === "CanceledError" || (error as Error).name === "AbortError") {
          setDownloads([]);
          return false;
        }

        console.error("Error downloading file:", error);
        setDownloads((prev) => prev.map((item) => (item.id === id ? { ...item, status: "error" } : item)));
        mcToast.error(t("errorLoadingFiles"));
        return false;
      } finally {
        downloadAbortRef.current = null;
      }
    },
    [t]
  );

  const handleDownload = useCallback(
    async (file: FileItem) => {
      await runDownload(file.name, file.size, (options) => filesService.downloadFile(serverId, file.path, options));
    },
    [serverId, runDownload]
  );

  const handleDownloadZip = useCallback(
    async (file: FileItem) => {
      if (!file.isDirectory) return;

      // The archive is compressed on the fly, so its size is only known at the end.
      const done = await runDownload(`${file.name}.zip`, 0, (options) => filesService.downloadZip(serverId, file.path, options));
      if (done) mcToast.success(t("zipDownloaded"));
    },
    [serverId, runDownload, t]
  );

  const handleCancelDownload = useCallback(() => {
    downloadAbortRef.current?.abort();
  }, []);

  const handleCloseDownloadProgress = useCallback(() => {
    setDownloads([]);
  }, []);

  if (editingFile) {
    return <FileEditor path={editingFile.path} content={editingFile.content} onSave={handleSaveFile} onClose={() => setEditingFile(null)} />;
  }

  return (
    <DropZone onFilesDropped={handleUploadFiles} className="h-[600px]">
      <div className="relative flex flex-col h-full bg-gray-900/60 border border-gray-700/50 rounded-lg overflow-hidden">
        <FileToolbar onCreateFolder={handleCreateFolder} onUploadFiles={handleUploadFiles} onRefresh={() => loadFiles(currentPath)} selectedFile={selectedFile} onDelete={handleDelete} onRename={handleRename} onDownload={handleDownload} isUploading={isUploading} />

        <Breadcrumbs path={currentPath} onNavigate={navigateToFolder} onNavigateUp={navigateUp} />

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <FileList
            files={files}
            selectedFile={selectedFile}
            onFileClick={handleFileClick}
            onFileDoubleClick={handleFileDoubleClick}
            onNavigateUp={currentPath ? navigateUp : undefined}
            onEdit={handleEdit}
            onDownload={handleDownload}
            onDownloadZip={handleDownloadZip}
            onDelete={handleDelete}
            onRename={(file) => {
              const newName = prompt(t("enterNewName"), file.name);
              if (newName && newName !== file.name) {
                handleRename(file, newName);
              }
            }}
          />
        )}

        <div className="absolute bottom-4 right-4 z-50 flex flex-col items-end gap-2">
          <UploadProgress uploads={uploads} className="relative" onCancel={handleCancelUpload} onClose={handleCloseUploadProgress} />
          <UploadProgress uploads={downloads} mode="download" className="relative" onCancel={handleCancelDownload} onClose={handleCloseDownloadProgress} />
        </div>
      </div>
    </DropZone>
  );
};
