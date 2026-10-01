"use client";

import { FC, useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import { filesService, FileItem, DownloadProgress, CHUNK_SIZE } from "@/services/files/files.service";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { mcToast } from "@/lib/utils/minecraft-toast";
import { FileList, SortKey, SortState } from "./FileList";
import { Breadcrumbs } from "./Breadcrumbs";
import { FileToolbar } from "./FileToolbar";
import { FileEditor } from "./FileEditor";
import { ServerPropertiesEditor } from "./ServerPropertiesEditor";
import { DropZone } from "./DropZone";
import { UploadProgress, UploadItem } from "./UploadProgress";
import { FileStatusBar } from "./FileStatusBar";
import { isEditableFile } from "./file-types";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface FileBrowserProps {
  serverId: string;
}

// An upload whose top-level names are already in the folder waits for the user's
// choice: replace them, or keep what is there.
interface PendingUpload {
  files: File[];
  relativePaths?: string[];
  conflicts: string[];
}

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

const isCancel = (error: unknown) => (error as Error).name === "CanceledError" || (error as Error).name === "AbortError";

// The browser height, not a fixed 600px: on a tall screen the list used to scroll
// inside a box with half the window free below it.
const PANEL_HEIGHT = "h-[70vh] min-h-[480px]";

export const FileBrowser: FC<FileBrowserProps> = ({ serverId }) => {
  const { t } = useLanguage();
  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  // activePath is the cursor (keyboard, focus bar); anchorPath is where a Shift range
  // starts, and stays put while Shift extends it.
  const [activePath, setActivePath] = useState<string | null>(null);
  const [anchorPath, setAnchorPath] = useState<string | null>(null);
  // Every delete goes through this confirmation: a folder is removed recursively.
  const [deleteTargets, setDeleteTargets] = useState<FileItem[]>([]);
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "name", direction: "asc" });
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
        // A refresh keeps what is still there selected; entries that went away drop out.
        const present = new Set(data.map((file) => file.path));
        setSelectedPaths((current) => new Set([...current].filter((item) => present.has(item))));
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

  const clearSelection = useCallback(() => {
    setSelectedPaths(new Set());
    setActivePath(null);
    setAnchorPath(null);
  }, []);

  const navigateToFolder = useCallback(
    (path: string) => {
      clearSelection();
      setEditingFile(null);
      setSearch("");
      loadFiles(path);
    },
    [loadFiles, clearSelection]
  );

  const toggleSort = useCallback((key: SortKey) => {
    setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  }, []);

  // Folders always lead, whatever the column: a listing that mixes them is much
  // harder to scan than one that is a little less sorted.
  const visibleFiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matching = query ? files.filter((file) => file.name.toLowerCase().includes(query)) : files;
    const direction = sort.direction === "asc" ? 1 : -1;

    return [...matching].sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;

      if (sort.key === "size") return (a.size - b.size) * direction;
      if (sort.key === "modified") {
        return (new Date(a.modified).getTime() - new Date(b.modified).getTime()) * direction;
      }
      return a.name.localeCompare(b.name) * direction;
    });
  }, [files, search, sort]);

  // Actions only ever apply to what is on screen: a filter hides rows, and deleting
  // something the user cannot see is not something they asked for.
  const selectedFiles = useMemo(() => visibleFiles.filter((file) => selectedPaths.has(file.path)), [visibleFiles, selectedPaths]);

  // Going up lands on the folder just left, so Enter / Backspace can walk a tree.
  const navigateUp = useCallback(() => {
    if (!currentPath) return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    navigateToFolder(parts.join("/"));
    setSelectedPaths(new Set([currentPath]));
    setActivePath(currentPath);
    setAnchorPath(currentPath);
  }, [currentPath, navigateToFolder]);

  const openEditor = useCallback(
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

  const openItem = useCallback(
    (file: FileItem) => {
      if (file.isDirectory) navigateToFolder(file.path);
      else openEditor(file);
    },
    [navigateToFolder, openEditor]
  );

  const selectRange = useCallback(
    (from: string | null, to: FileItem) => {
      const paths = visibleFiles.map((file) => file.path);
      const start = from ? paths.indexOf(from) : -1;
      const end = paths.indexOf(to.path);
      if (start === -1) {
        setSelectedPaths(new Set([to.path]));
        return;
      }
      const [low, high] = start < end ? [start, end] : [end, start];
      setSelectedPaths(new Set(paths.slice(low, high + 1)));
    },
    [visibleFiles]
  );

  const toggleSelect = useCallback((file: FileItem) => {
    setSelectedPaths((current) => {
      const next = new Set(current);
      if (next.has(file.path)) next.delete(file.path);
      else next.add(file.path);
      return next;
    });
    setActivePath(file.path);
    setAnchorPath(file.path);
  }, []);

  // A plain click keeps its old meaning (open a folder, select a file); Ctrl/Cmd and
  // Shift build a selection the way every file manager does.
  const handleRowClick = useCallback(
    (file: FileItem, event: React.MouseEvent) => {
      if (event.shiftKey) {
        selectRange(anchorPath, file);
        setActivePath(file.path);
        return;
      }
      if (event.ctrlKey || event.metaKey) {
        toggleSelect(file);
        return;
      }
      if (file.isDirectory) {
        navigateToFolder(file.path);
        return;
      }
      setSelectedPaths(new Set([file.path]));
      setActivePath(file.path);
      setAnchorPath(file.path);
    },
    [anchorPath, selectRange, toggleSelect, navigateToFolder]
  );

  const toggleAll = useCallback(() => {
    const allSelected = visibleFiles.length > 0 && visibleFiles.every((file) => selectedPaths.has(file.path));
    setSelectedPaths(allSelected ? new Set() : new Set(visibleFiles.map((file) => file.path)));
  }, [visibleFiles, selectedPaths]);

  const handleSaveFile = useCallback(
    async (content: string): Promise<void> => {
      if (!editingFile) return;
      try {
        await filesService.writeFile(serverId, editingFile.path, content);
        mcToast.success(t("fileSaved"));
        // Saving is not leaving: the editor stays open on the new baseline. Only if it is
        // still open on this file, though: a save that lands after the user left must
        // not bring the editor back.
        setEditingFile((current) => (current?.path === editingFile.path ? { path: current.path, content } : current));
        loadFiles(currentPath);
      } catch (error) {
        console.error("Error saving file:", error);
        mcToast.error(t("errorSavingFile"));
        throw error;
      }
    },
    [editingFile, serverId, currentPath, loadFiles, t]
  );

  const handleDelete = useCallback(
    async (targets: FileItem[]) => {
      // One at a time, so a failure names what is left instead of aborting the rest.
      let failed = 0;
      for (const file of targets) {
        try {
          await filesService.deleteFile(serverId, file.path);
        } catch (error) {
          console.error("Error deleting file:", error);
          failed++;
        }
      }

      if (failed > 0) mcToast.error(t("errorDeletingFile"));
      else mcToast.success(t("fileDeleted"));
      clearSelection();
      loadFiles(currentPath);
    },
    [serverId, currentPath, loadFiles, clearSelection, t]
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

  const runUpload = useCallback(
    async (filesToUpload: File[], relativePaths: string[] | undefined, overwrite: boolean) => {
      // A second run would replace the abort controller, leaving the first one uncancellable.
      if (abortControllerRef.current) return;
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

      // Large files go up alone in chunks; the rest keep sharing multipart batches,
      // where one request per file would cost more than the files themselves.
      const indices = filesToUpload.map((_, index) => index);
      const small = indices.filter((index) => filesToUpload[index].size <= CHUNK_SIZE);
      const large = indices.filter((index) => filesToUpload[index].size > CHUNK_SIZE);

      const avgFileSize = small.reduce((acc, index) => acc + filesToUpload[index].size, 0) / (small.length || 1);
      const BATCH_SIZE = avgFileSize < 1024 * 1024 ? 20 : avgFileSize < 10 * 1024 * 1024 ? 10 : 5;
      const MAX_RETRIES = 2;

      let errorCount = 0;
      let skippedCount = 0;

      const uploadBatch = async (batch: number[], retryCount = 0): Promise<void> => {
        if (abortControllerRef.current?.signal.aborted) return;

        const batchFiles = batch.map((index) => filesToUpload[index]);
        const batchPaths = relativePaths && batch.map((index) => relativePaths[index]);
        const batchItems = batch.map((index) => uploadItems[index]);
        const batchIds = batchItems.map((item) => item.id);
        const batchTotalSize = batchFiles.reduce((acc, f) => acc + f.size, 0);

        setUploads((prev) => prev.map((u) => (batchIds.includes(u.id) ? { ...u, status: "uploading" as const, loaded: 0 } : u)));

        try {
          const result = await filesService.uploadMultipleFiles(serverId, currentPath, batchFiles, batchPaths, {
            signal: abortControllerRef.current!.signal,
            overwrite,
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

          // The server names what it skipped or could not save; the rest landed.
          const skipped = new Set(result.skipped ?? []);
          const failed = new Set(result.failed ?? []);
          skippedCount += skipped.size;
          errorCount += failed.size;
          setUploads((prev) =>
            prev.map((u) => {
              if (!batchIds.includes(u.id)) return u;
              if (failed.has(u.name)) return { ...u, status: "error" as const };
              return { ...u, loaded: u.size, status: skipped.has(u.name) ? ("skipped" as const) : ("completed" as const) };
            })
          );
        } catch (err) {
          if (isCancel(err)) throw err;

          if (retryCount < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, 1000 * (retryCount + 1))); // Backoff
            return uploadBatch(batch, retryCount + 1);
          }

          errorCount += batch.length;
          setUploads((prev) => prev.map((u) => (batchIds.includes(u.id) && u.status !== "completed" ? { ...u, status: "error" as const } : u)));
        }
      };

      // Retries happen per chunk inside the service, so a failure here is final.
      const uploadLarge = async (index: number) => {
        const id = uploadItems[index].id;
        setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: "uploading" as const, loaded: 0 } : u)));

        try {
          await filesService.uploadFileChunked(serverId, currentPath, filesToUpload[index], relativePaths?.[index], {
            signal: abortControllerRef.current!.signal,
            overwrite,
            onProgress: (progress) => {
              setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, loaded: progress.loaded } : u)));
            },
          });
          setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, loaded: u.size, status: "completed" as const } : u)));
        } catch (err) {
          if (isCancel(err)) throw err;
          // 409 on a kept file: the server refused to replace it, which is what was asked.
          if (!overwrite && axios.isAxiosError(err) && err.response?.status === 409) {
            skippedCount++;
            setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, loaded: u.size, status: "skipped" as const } : u)));
            return;
          }
          console.error("Error uploading file:", err);
          setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: "error" as const } : u)));
          errorCount++;
        }
      };

      try {
        for (let i = 0; i < small.length; i += BATCH_SIZE) {
          if (abortControllerRef.current?.signal.aborted) break;
          await uploadBatch(small.slice(i, i + BATCH_SIZE));
        }

        for (const index of large) {
          if (abortControllerRef.current?.signal.aborted) break;
          await uploadLarge(index);
        }

        if (errorCount > 0) {
          mcToast.error(t("filesUploadFailed").replace("{count}", errorCount.toString()));
        }
        if (skippedCount > 0) {
          mcToast.info(t("fmFilesSkipped").replace("{count}", skippedCount.toString()));
        }

        loadFiles(currentPath);
      } catch (error) {
        if (isCancel(error)) {
          setUploads((prev) => prev.map((u) => (u.status === "uploading" || u.status === "pending" ? { ...u, status: "error" as const, error: "Cancelled" } : u)));
        } else {
          console.error("Error uploading files:", error);
          setUploads((prev) => prev.map((u) => (u.status !== "completed" && u.status !== "skipped" ? { ...u, status: "error" as const } : u)));
          mcToast.error(t("errorUploadingFile"));
        }
      } finally {
        setIsUploading(false);
        abortControllerRef.current = null;
      }
    },
    [serverId, currentPath, loadFiles, t]
  );

  // Only the top level can be checked from here: a folder upload that lands on an
  // existing folder asks once, and the server applies the answer to every file inside.
  const handleUploadFiles = useCallback(
    (filesToUpload: File[], relativePaths?: string[]) => {
      if (abortControllerRef.current) return;
      const topNames = new Set(filesToUpload.map((file, index) => (relativePaths?.[index] || file.name).split("/")[0]));
      const conflicts = files.filter((file) => topNames.has(file.name)).map((file) => file.name);

      if (conflicts.length > 0) {
        setPendingUpload({ files: filesToUpload, relativePaths, conflicts });
        return;
      }
      runUpload(filesToUpload, relativePaths, true);
    },
    [files, runUpload]
  );

  const resolvePendingUpload = useCallback(
    (overwrite: boolean) => {
      if (!pendingUpload) return;
      setPendingUpload(null);
      runUpload(pendingUpload.files, pendingUpload.relativePaths, overwrite);
    },
    [pendingUpload, runUpload]
  );

  const handleCancelUpload = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleCloseUploadProgress = useCallback(() => {
    setUploads([]);
  }, []);

  const openRename = useCallback((file: FileItem) => {
    setRenameTarget(file);
    setRenameValue(file.name);
  }, []);

  const handleRename = useCallback(async () => {
    const file = renameTarget;
    const newName = renameValue.trim();
    setRenameTarget(null);
    if (!file || !newName || newName === file.name) return;

    try {
      await filesService.rename(serverId, file.path, newName);
      mcToast.success(t("fileRenamed"));
      clearSelection();
      loadFiles(currentPath);
    } catch (error) {
      console.error("Error renaming file:", error);
      mcToast.error(t("errorRenamingFile"));
    }
  }, [renameTarget, renameValue, serverId, currentPath, loadFiles, clearSelection, t]);

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
        if (isCancel(error)) {
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

  const downloadNative = useCallback(
    async (paths: string | string[], zip: boolean) => {
      try {
        await filesService.downloadNative(serverId, paths, zip);
      } catch (error) {
        console.error("Error downloading file:", error);
        mcToast.error(t("errorLoadingFiles"));
      }
    },
    [serverId, t]
  );

  const handleDownload = useCallback(
    async (file: FileItem) => {
      if (file.size > filesService.NATIVE_DOWNLOAD_BYTES) {
        await downloadNative(file.path, false);
        return;
      }
      await runDownload(file.name, file.size, (options) => filesService.downloadFile(serverId, file.path, options));
    },
    [serverId, runDownload, downloadNative]
  );

  // The archive is compressed on the fly, so its size is only known at the end: a
  // world can be many gigabytes, which a blob would hold in memory whole.
  const handleDownloadZip = useCallback(
    async (file: FileItem) => {
      if (!file.isDirectory) return;
      await downloadNative(file.path, true);
    },
    [downloadNative]
  );

  const handleDownloadSelection = useCallback(
    async (targets: FileItem[]) => {
      if (targets.length === 1) {
        await (targets[0].isDirectory ? handleDownloadZip(targets[0]) : handleDownload(targets[0]));
        return;
      }
      await downloadNative(
        targets.map((file) => file.path),
        true
      );
    },
    [handleDownload, handleDownloadZip, downloadNative]
  );

  const handleCancelDownload = useCallback(() => {
    downloadAbortRef.current?.abort();
  }, []);

  const handleCloseDownloadProgress = useCallback(() => {
    setDownloads([]);
  }, []);

  // Keys work while the list has focus, so they never fight the search box or a dialog.
  const handleListKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const index = activePath ? visibleFiles.findIndex((file) => file.path === activePath) : -1;
      const active = index >= 0 ? visibleFiles[index] : null;

      const moveTo = (next: number) => {
        const target = visibleFiles[Math.max(0, Math.min(visibleFiles.length - 1, next))];
        if (!target) return;
        if (event.shiftKey) {
          selectRange(anchorPath ?? activePath ?? target.path, target);
          if (!anchorPath) setAnchorPath(activePath ?? target.path);
        } else {
          setSelectedPaths(new Set([target.path]));
          setAnchorPath(target.path);
        }
        setActivePath(target.path);
      };

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          moveTo(index + 1);
          break;
        case "ArrowUp":
          event.preventDefault();
          moveTo(index === -1 ? visibleFiles.length - 1 : index - 1);
          break;
        case "Home":
          event.preventDefault();
          moveTo(0);
          break;
        case "End":
          event.preventDefault();
          moveTo(visibleFiles.length - 1);
          break;
        case "Enter":
          if (active) openItem(active);
          break;
        case "Backspace":
          event.preventDefault();
          navigateUp();
          break;
        case "Delete":
          if (selectedFiles.length > 0) setDeleteTargets(selectedFiles);
          break;
        case "F2":
          event.preventDefault();
          if (active) openRename(active);
          break;
        case "Escape":
          clearSelection();
          break;
        case "a":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            setSelectedPaths(new Set(visibleFiles.map((file) => file.path)));
          }
          break;
      }
    },
    [activePath, anchorPath, visibleFiles, selectedFiles, selectRange, openItem, navigateUp, openRename, clearSelection]
  );

  if (editingFile) {
    if (editingFile.path.split("/").pop() === "server.properties" && serverId !== "_root" && serverId !== ".world") {
      return <ServerPropertiesEditor serverId={serverId} path={editingFile.path} content={editingFile.content} onSave={handleSaveFile} onClose={() => setEditingFile(null)} />;
    }
    return <FileEditor path={editingFile.path} content={editingFile.content} onSave={handleSaveFile} onClose={() => setEditingFile(null)} />;
  }

  const deletingFolder = deleteTargets.some((file) => file.isDirectory);

  return (
    <DropZone onFilesDropped={handleUploadFiles} disabled={isUploading} className={PANEL_HEIGHT}>
      <div className="relative flex flex-col h-full bg-gray-900/60 border border-gray-700/50 rounded-lg overflow-hidden">
        <FileToolbar
          onCreateFolder={handleCreateFolder}
          onUploadFiles={handleUploadFiles}
          onRefresh={() => loadFiles(currentPath)}
          selectedFiles={selectedFiles}
          onRename={openRename}
          onDownload={handleDownloadSelection}
          onDelete={setDeleteTargets}
          onClearSelection={clearSelection}
          search={search}
          onSearchChange={setSearch}
          isUploading={isUploading}
        />

        <Breadcrumbs path={currentPath} onNavigate={navigateToFolder} onNavigateUp={navigateUp} />

        {/* The list stays mounted while a folder loads: replacing it with the spinner
            dropped keyboard focus on every navigation. */}
        <div className="relative flex flex-1 flex-col min-h-0">
          <FileList
            files={visibleFiles}
            selectedPaths={selectedPaths}
            activePath={activePath}
            sort={sort}
            onSortChange={toggleSort}
            searchQuery={search.trim()}
            onRowClick={handleRowClick}
            onFileDoubleClick={openItem}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
            onKeyDown={handleListKeyDown}
            onNavigateUp={currentPath ? navigateUp : undefined}
            onEdit={openEditor}
            onDownload={handleDownload}
            onDownloadZip={handleDownloadZip}
            onDelete={(file) => setDeleteTargets([file])}
            onRename={openRename}
          />
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-950/50">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          )}
        </div>

        {!loading && <FileStatusBar files={files} visible={visibleFiles} isFiltering={Boolean(search.trim())} />}

        <div className="absolute bottom-4 right-4 z-50 flex flex-col items-end gap-2">
          <UploadProgress uploads={uploads} className="relative" onCancel={handleCancelUpload} onClose={handleCloseUploadProgress} />
          <UploadProgress uploads={downloads} mode="download" className="relative" onCancel={handleCancelDownload} onClose={handleCloseDownloadProgress} />
        </div>
      </div>

      <Dialog open={deleteTargets.length > 0} onOpenChange={(open) => !open && setDeleteTargets([])}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-200">{t("confirmDelete")}</DialogTitle>
          </DialogHeader>
          {deleteTargets.length === 1 ? (
            <p className="text-gray-400">
              {t("deleteConfirmMessage")} <span className="text-gray-200 font-medium">{deleteTargets[0].name}</span>?
            </p>
          ) : (
            <p className="text-gray-400">{t("fmDeleteItemsMessage").replace("{count}", String(deleteTargets.length))}</p>
          )}
          {deletingFolder && <p className="text-sm text-red-400">{t("fmDeleteFolderWarning")}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTargets([])}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const targets = deleteTargets;
                setDeleteTargets([]);
                handleDelete(targets);
              }}
            >
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameTarget !== null} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-200">{t("rename")}</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder={t("newName")}
            className="bg-gray-800 border-gray-700 text-gray-200"
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            // Select the name without its extension, like a desktop file manager.
            onFocus={(e) => {
              const dot = renameTarget && !renameTarget.isDirectory ? renameValue.lastIndexOf(".") : -1;
              e.currentTarget.setSelectionRange(0, dot > 0 ? dot : renameValue.length);
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleRename} variant="minepanel">
              {t("rename")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pendingUpload !== null} onOpenChange={(open) => !open && setPendingUpload(null)}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-200">{t("fmUploadConflictTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-gray-400">{t("fmUploadConflictMessage").replace("{count}", String(pendingUpload?.conflicts.length ?? 0))}</p>
          <ul className="max-h-40 overflow-y-auto rounded border border-gray-700/60 bg-gray-950/40 px-3 py-2 font-mono text-xs text-gray-300">
            {pendingUpload?.conflicts.slice(0, 8).map((name) => (
              <li key={name} className="truncate">
                {name}
              </li>
            ))}
            {pendingUpload && pendingUpload.conflicts.length > 8 && (
              <li className="text-gray-500">{t("fmAndMore").replace("{count}", String(pendingUpload.conflicts.length - 8))}</li>
            )}
          </ul>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingUpload(null)}>
              {t("cancel")}
            </Button>
            <Button variant="outline" onClick={() => resolvePendingUpload(false)}>
              {t("fmSkipExisting")}
            </Button>
            <Button variant="minepanel" onClick={() => resolvePendingUpload(true)}>
              {t("fmOverwrite")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DropZone>
  );
};
