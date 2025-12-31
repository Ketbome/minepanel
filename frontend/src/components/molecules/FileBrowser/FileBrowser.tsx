"use client";

import { FC, useState, useEffect, useCallback, useRef } from "react";
import { filesService, FileItem } from "@/services/files/files.service";
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
  "txt", "json", "yml", "yaml", "properties", "cfg", "conf", "xml", "toml", "ini",
  // Scripts
  "sh", "bat", "ps1", "cmd",
  // Docs
  "md", "log", "csv",
  // Minecraft
  "mcmeta", "lang", "nbt",
  // Code
  "java", "js", "ts", "py", "lua", "sk",
  // Data
  "html", "css", "scss", "sql",
];

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
  const abortControllerRef = useRef<AbortController | null>(null);

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

      // Crear items de upload
      const uploadItems: UploadItem[] = filesToUpload.map((file, index) => ({
        id: `${Date.now()}-${index}`,
        name: relativePaths?.[index] || file.name,
        size: file.size,
        loaded: 0,
        status: "pending" as const,
      }));
      setUploads(uploadItems);

      const BATCH_SIZE = 10; // Subir en lotes de 10 archivos para evitar timeout
      let completedCount = 0;
      let errorCount = 0;

      try {
        // Dividir en lotes
        for (let i = 0; i < filesToUpload.length; i += BATCH_SIZE) {
          if (abortControllerRef.current?.signal.aborted) break;

          const batchFiles = filesToUpload.slice(i, i + BATCH_SIZE);
          const batchPaths = relativePaths?.slice(i, i + BATCH_SIZE);
          const batchIds = uploadItems.slice(i, i + BATCH_SIZE).map((u) => u.id);

          // Marcar lote actual como uploading
          setUploads((prev) =>
            prev.map((u) =>
              batchIds.includes(u.id) ? { ...u, status: "uploading" as const } : u
            )
          );

          const batchTotalSize = batchFiles.reduce((acc, f) => acc + f.size, 0);

          try {
            if (batchFiles.length === 1 && !batchPaths) {
              // Single file
              await filesService.uploadFile(serverId, currentPath, batchFiles[0], undefined, {
                signal: abortControllerRef.current.signal,
                onProgress: (progress) => {
                  setUploads((prev) =>
                    prev.map((u) =>
                      u.id === batchIds[0] ? { ...u, loaded: progress.loaded } : u
                    )
                  );
                },
              });
            } else {
              // Multiple files in batch
              await filesService.uploadMultipleFiles(
                serverId,
                currentPath,
                batchFiles,
                batchPaths,
                {
                  signal: abortControllerRef.current.signal,
                  onProgress: (progress) => {
                    // Distribuir progreso proporcionalmente en el lote
                    setUploads((prev) =>
                      prev.map((u) => {
                        if (!batchIds.includes(u.id)) return u;
                        const fileRatio = u.size / batchTotalSize;
                        return { ...u, loaded: Math.round(fileRatio * progress.loaded) };
                      })
                    );
                  },
                }
              );
            }

            // Marcar lote como completado
            setUploads((prev) =>
              prev.map((u) =>
                batchIds.includes(u.id) ? { ...u, loaded: u.size, status: "completed" as const } : u
              )
            );
            completedCount += batchFiles.length;
          } catch (batchError) {
            if ((batchError as Error).name === "CanceledError" || (batchError as Error).name === "AbortError") {
              throw batchError; // Re-throw para manejar cancelación
            }
            // Marcar lote con error pero continuar con el siguiente
            setUploads((prev) =>
              prev.map((u) =>
                batchIds.includes(u.id) && u.status !== "completed"
                  ? { ...u, status: "error" as const }
                  : u
              )
            );
            errorCount += batchFiles.length;
          }
        }

        if (errorCount > 0) {
          mcToast.error(t("filesUploadFailed").replace("{count}", errorCount.toString()));
        }

        loadFiles(currentPath);
      } catch (error) {
        if ((error as Error).name === "CanceledError" || (error as Error).name === "AbortError") {
          setUploads((prev) =>
            prev.map((u) =>
              u.status === "uploading" || u.status === "pending"
                ? { ...u, status: "error" as const, error: "Cancelled" }
                : u
            )
          );
        } else {
          console.error("Error uploading files:", error);
          setUploads((prev) =>
            prev.map((u) => (u.status !== "completed" ? { ...u, status: "error" as const } : u))
          );
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

  const handleDownload = useCallback(
    (file: FileItem) => {
      const token = localStorage.getItem("token");
      // Use direct download with token in query param (supports large files)
      const url = `${filesService.getDownloadUrl(serverId, file.path)}&token=${encodeURIComponent(token || "")}`;

      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    [serverId]
  );

  const handleDownloadZip = useCallback(
    (file: FileItem) => {
      if (!file.isDirectory) return;

      const token = localStorage.getItem("token");
      // Use direct download with token in query param (supports large files)
      const url = `${filesService.getDownloadZipUrl(serverId, file.path)}&token=${encodeURIComponent(token || "")}`;

      mcToast.success(t("zipDownloaded"));

      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    [serverId, t]
  );

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

        <UploadProgress
          uploads={uploads}
          onCancel={handleCancelUpload}
          onClose={handleCloseUploadProgress}
        />
      </div>
    </DropZone>
  );
};
