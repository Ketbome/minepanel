"use client";

import { FC, useState, useCallback } from "react";
import { FileItem } from "@/services/files/files.service";
import { Folder, File, FileText, FileCode, FileImage, FileArchive, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileContextMenu } from "./FileContextMenu";

interface FileListProps {
  files: FileItem[];
  selectedFile: FileItem | null;
  onFileClick: (file: FileItem) => void;
  onFileDoubleClick: (file: FileItem) => void;
  onNavigateUp?: () => void;
  onEdit?: (file: FileItem) => void;
  onDownload?: (file: FileItem) => void;
  onDownloadZip?: (file: FileItem) => void;
  onDelete?: (file: FileItem) => void;
  onRename?: (file: FileItem) => void;
}

const getFileIcon = (file: FileItem) => {
  if (file.isDirectory) {
    return <Folder className="h-5 w-5 text-amber-400" />;
  }

  const ext = file.extension?.toLowerCase();
  const codeExts = ["json", "yml", "yaml", "xml", "properties", "cfg", "conf", "toml", "ini", "sh", "bat", "mcmeta", "lang"];
  const imageExts = ["png", "jpg", "jpeg", "gif", "webp", "svg", "ico"];
  const archiveExts = ["zip", "tar", "gz", "rar", "7z", "jar"];
  const textExts = ["txt", "md", "log"];

  if (ext && codeExts.includes(ext)) {
    return <FileCode className="h-5 w-5 text-blue-400" />;
  }
  if (ext && imageExts.includes(ext)) {
    return <FileImage className="h-5 w-5 text-purple-400" />;
  }
  if (ext && archiveExts.includes(ext)) {
    return <FileArchive className="h-5 w-5 text-orange-400" />;
  }
  if (ext && textExts.includes(ext)) {
    return <FileText className="h-5 w-5 text-gray-400" />;
  }

  return <File className="h-5 w-5 text-gray-500" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "-";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const FileList: FC<FileListProps> = ({
  files,
  selectedFile,
  onFileClick,
  onFileDoubleClick,
  onNavigateUp,
  onEdit,
  onDownload,
  onDownloadZip,
  onDelete,
  onRename,
}) => {
  const [contextMenu, setContextMenu] = useState<{
    file: FileItem;
    position: { x: number; y: number };
  } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, file: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      file,
      position: { x: e.clientX, y: e.clientY },
    });
  }, []);

  const handleCopyPath = useCallback((file: FileItem) => {
    navigator.clipboard.writeText(file.path);
  }, []);

  return (
    <>
    <div className="flex-1 overflow-auto select-none">
      <table className="w-full text-sm">
          <thead className="bg-gray-800/50 sticky top-0 z-10">
            <tr className="text-gray-400 text-left">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium w-24">Size</th>
              <th className="px-4 py-2 font-medium w-44">Modified</th>
            </tr>
          </thead>
          <tbody>
            {onNavigateUp && (
              <tr
                className="hover:bg-gray-800/40 cursor-pointer border-b border-gray-800/30"
                onClick={onNavigateUp}
              >
                <td className="px-4 py-2 flex items-center gap-2 text-gray-300">
                  <ArrowUp className="h-5 w-5 text-gray-500" />
                  <span>..</span>
                </td>
                <td className="px-4 py-2 text-gray-500">-</td>
                <td className="px-4 py-2 text-gray-500">-</td>
              </tr>
            )}
            {files.map((file) => (
              <tr
                key={file.path}
                className={cn(
                  "hover:bg-gray-800/40 cursor-pointer border-b border-gray-800/30 transition-colors",
                  selectedFile?.path === file.path && "bg-emerald-900/20 hover:bg-emerald-900/30"
                )}
                onClick={() => onFileClick(file)}
                onDoubleClick={() => onFileDoubleClick(file)}
                onContextMenu={(e) => handleContextMenu(e, file)}
              >
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {getFileIcon(file)}
                    <span className={cn("text-gray-200", file.isDirectory && "font-medium")}>
                      {file.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2 text-gray-400">
                  {file.isDirectory ? "-" : formatFileSize(file.size)}
                </td>
                <td className="px-4 py-2 text-gray-400">{formatDate(file.modified)}</td>
              </tr>
            ))}
            {files.length === 0 && !onNavigateUp && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                  Empty folder
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {contextMenu && onEdit && onDownload && onDownloadZip && onDelete && onRename && (
        <FileContextMenu
          file={contextMenu.file}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onEdit={onEdit}
          onDownload={onDownload}
          onDownloadZip={onDownloadZip}
          onDelete={onDelete}
          onRename={onRename}
          onOpen={onFileDoubleClick}
          onCopyPath={handleCopyPath}
        />
      )}
    </>
  );
};
