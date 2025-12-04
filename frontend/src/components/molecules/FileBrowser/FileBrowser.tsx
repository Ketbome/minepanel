"use client";

import { FC, useState, useEffect, useCallback } from "react";
import { filesService, FileItem } from "@/services/files/files.service";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { toast } from "sonner";
import { FileList } from "./FileList";
import { Breadcrumbs } from "./Breadcrumbs";
import { FileToolbar } from "./FileToolbar";
import { FileEditor } from "./FileEditor";
import { Loader2 } from "lucide-react";

interface FileBrowserProps {
  serverId: string;
}

export const FileBrowser: FC<FileBrowserProps> = ({ serverId }) => {
  const { t } = useLanguage();
  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [editingFile, setEditingFile] = useState<{ path: string; content: string } | null>(null);

  const loadFiles = useCallback(async (path: string = "") => {
    setLoading(true);
    try {
      const data = await filesService.listFiles(serverId, path);
      setFiles(data);
      setCurrentPath(path);
    } catch (error) {
      console.error("Error loading files:", error);
      toast.error(t("errorLoadingFiles"));
    } finally {
      setLoading(false);
    }
  }, [serverId, t]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const navigateToFolder = (path: string) => {
    setSelectedFile(null);
    setEditingFile(null);
    loadFiles(path);
  };

  const navigateUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    navigateToFolder(parts.join("/"));
  };

  const handleFileClick = (file: FileItem) => {
    if (file.isDirectory) {
      navigateToFolder(file.path);
    } else {
      setSelectedFile(file);
    }
  };

  const handleFileDoubleClick = async (file: FileItem) => {
    if (file.isDirectory) {
      navigateToFolder(file.path);
      return;
    }

    // Check if it's an editable text file
    const textExtensions = ["txt", "json", "yml", "yaml", "properties", "cfg", "conf", "xml", "md", "log", "sh", "bat", "toml", "ini"];
    if (file.extension && textExtensions.includes(file.extension.toLowerCase())) {
      try {
        const { content } = await filesService.readFile(serverId, file.path);
        setEditingFile({ path: file.path, content });
      } catch (error) {
        console.error("Error reading file:", error);
        toast.error(t("errorReadingFile"));
      }
    }
  };

  const handleSaveFile = async (content: string) => {
    if (!editingFile) return;
    try {
      await filesService.writeFile(serverId, editingFile.path, content);
      toast.success(t("fileSaved"));
      setEditingFile(null);
      loadFiles(currentPath);
    } catch (error) {
      console.error("Error saving file:", error);
      toast.error(t("errorSavingFile"));
    }
  };

  const handleDelete = async (file: FileItem) => {
    try {
      await filesService.deleteFile(serverId, file.path);
      toast.success(t("fileDeleted"));
      setSelectedFile(null);
      loadFiles(currentPath);
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error(t("errorDeletingFile"));
    }
  };

  const handleCreateFolder = async (name: string) => {
    try {
      const path = currentPath ? `${currentPath}/${name}` : name;
      await filesService.createDirectory(serverId, path);
      toast.success(t("folderCreated"));
      loadFiles(currentPath);
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error(t("errorCreatingFolder"));
    }
  };

  const handleUpload = async (file: File) => {
    try {
      await filesService.uploadFile(serverId, currentPath, file);
      toast.success(t("fileUploaded"));
      loadFiles(currentPath);
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error(t("errorUploadingFile"));
    }
  };

  const handleRename = async (file: FileItem, newName: string) => {
    try {
      await filesService.rename(serverId, file.path, newName);
      toast.success(t("fileRenamed"));
      setSelectedFile(null);
      loadFiles(currentPath);
    } catch (error) {
      console.error("Error renaming file:", error);
      toast.error(t("errorRenamingFile"));
    }
  };

  const handleDownload = (file: FileItem) => {
    const url = filesService.getDownloadUrl(serverId, file.path);
    const token = localStorage.getItem("token");
    
    // Create a temporary link with auth header
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => toast.error(t("errorDownloadingFile")));
  };

  if (editingFile) {
    return (
      <FileEditor
        path={editingFile.path}
        content={editingFile.content}
        onSave={handleSaveFile}
        onClose={() => setEditingFile(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-gray-900/60 border border-gray-700/50 rounded-lg overflow-hidden">
      <FileToolbar
        onCreateFolder={handleCreateFolder}
        onUpload={handleUpload}
        onRefresh={() => loadFiles(currentPath)}
        selectedFile={selectedFile}
        onDelete={handleDelete}
        onRename={handleRename}
        onDownload={handleDownload}
      />

      <Breadcrumbs
        path={currentPath}
        onNavigate={navigateToFolder}
        onNavigateUp={navigateUp}
      />

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
        />
      )}
    </div>
  );
};

