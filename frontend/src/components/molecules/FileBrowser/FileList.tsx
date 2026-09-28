"use client";

import { FC, useState, useCallback, useEffect, useRef } from "react";
import { FileItem } from "@/services/files/files.service";
import { Folder, File, FileText, FileCode, FileImage, FileArchive, ArrowUp, ArrowDown, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { TranslationKey } from "@/lib/translations";
import { FileContextMenu } from "./FileContextMenu";

export type SortKey = "name" | "size" | "modified";
export interface SortState {
  key: SortKey;
  direction: "asc" | "desc";
}

interface FileListProps {
  files: FileItem[];
  selectedPaths: Set<string>;
  // The row the keyboard moves from and Shift-click extends from.
  activePath: string | null;
  sort: SortState;
  onSortChange: (key: SortKey) => void;
  searchQuery?: string;
  onRowClick: (file: FileItem, event: React.MouseEvent) => void;
  onFileDoubleClick: (file: FileItem) => void;
  onToggleSelect: (file: FileItem) => void;
  onToggleAll: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onNavigateUp?: () => void;
  onEdit: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
  onDownloadZip: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onRename: (file: FileItem) => void;
}

const getFileIcon = (file: FileItem) => {
  if (file.isDirectory) {
    return <Folder className="h-5 w-5 shrink-0 text-amber-400" />;
  }

  const ext = file.extension?.toLowerCase();
  const codeExts = ["json", "yml", "yaml", "xml", "properties", "cfg", "conf", "toml", "ini", "sh", "bat", "mcmeta", "lang"];
  const imageExts = ["png", "jpg", "jpeg", "gif", "webp", "svg", "ico"];
  const archiveExts = ["zip", "tar", "gz", "rar", "7z", "jar", "mrpack"];
  const textExts = ["txt", "md", "log"];

  if (ext && codeExts.includes(ext)) {
    return <FileCode className="h-5 w-5 shrink-0 text-blue-400" />;
  }
  if (ext && imageExts.includes(ext)) {
    return <FileImage className="h-5 w-5 shrink-0 text-purple-400" />;
  }
  if (ext && archiveExts.includes(ext)) {
    return <FileArchive className="h-5 w-5 shrink-0 text-orange-400" />;
  }
  if (ext && textExts.includes(ext)) {
    return <FileText className="h-5 w-5 shrink-0 text-gray-400" />;
  }

  return <File className="h-5 w-5 shrink-0 text-gray-500" />;
};

const COLUMNS: Array<{ key: SortKey; label: TranslationKey; className?: string }> = [
  { key: "name", label: "columnName" },
  { key: "size", label: "columnSize", className: "w-24 text-right" },
  // The date is the first thing to go on a narrow screen.
  { key: "modified", label: "columnModified", className: "w-44 hidden sm:table-cell" },
];

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Compact enough to stay on one line: the long form wrapped and doubled every row.
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleString(undefined, {
    ...(sameYear ? {} : { year: "numeric" }),
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const FileList: FC<FileListProps> = ({
  files,
  selectedPaths,
  activePath,
  sort,
  onSortChange,
  searchQuery,
  onRowClick,
  onFileDoubleClick,
  onToggleSelect,
  onToggleAll,
  onKeyDown,
  onNavigateUp,
  onEdit,
  onDownload,
  onDownloadZip,
  onDelete,
  onRename,
}) => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    file: FileItem;
    position: { x: number; y: number };
  } | null>(null);

  const openMenu = useCallback((file: FileItem, position: { x: number; y: number }) => {
    setContextMenu({ file, position });
  }, []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, file: FileItem) => {
      e.preventDefault();
      e.stopPropagation();
      openMenu(file, { x: e.clientX, y: e.clientY });
    },
    [openMenu]
  );

  const handleCopyPath = useCallback((file: FileItem) => {
    navigator.clipboard.writeText(file.path);
  }, []);

  // Keep the keyboard cursor visible while arrowing through a long folder.
  useEffect(() => {
    if (!activePath) return;
    containerRef.current?.querySelector(`[data-path="${CSS.escape(activePath)}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activePath]);

  const allSelected = files.length > 0 && files.every((file) => selectedPaths.has(file.path));
  const someSelected = !allSelected && files.some((file) => selectedPaths.has(file.path));

  return (
    <>
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label={t("files")}
        className="flex-1 overflow-auto select-none outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-emerald-500/60"
      >
        <table className="w-full text-sm">
          <thead className="bg-[var(--mc-stone-deep)] sticky top-0 z-10">
            <tr className="text-gray-400 text-left font-minecraft">
              <th className="w-9 pl-3 pr-0 py-2">
                <input
                  type="checkbox"
                  aria-label={t("fmSelectAll")}
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={onToggleAll}
                  disabled={files.length === 0}
                  className="h-4 w-4 cursor-pointer accent-emerald-400"
                />
              </th>
              {COLUMNS.map((column) => (
                <th key={column.key} className={cn("px-3 py-2 font-medium", column.className)}>
                  <button
                    type="button"
                    onClick={() => onSortChange(column.key)}
                    className={cn("inline-flex items-center gap-1 hover:text-gray-200 transition-colors", column.key === "size" && "flex-row-reverse")}
                  >
                    {t(column.label)}
                    {sort.key === column.key &&
                      (sort.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </button>
                </th>
              ))}
              <th className="w-10" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {onNavigateUp && (
              <tr className="hover:bg-emerald-600/10 cursor-pointer border-b border-[var(--mc-frame)]/40" onClick={onNavigateUp}>
                <td />
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-2 text-gray-300">
                    <ArrowUp className="h-5 w-5 text-gray-500" />
                    <span>..</span>
                  </div>
                </td>
                <td />
                <td className="hidden sm:table-cell" />
                <td />
              </tr>
            )}
            {files.map((file) => {
              const selected = selectedPaths.has(file.path);
              return (
                <tr
                  key={file.path}
                  data-path={file.path}
                  aria-selected={selected}
                  className={cn(
                    "group cursor-pointer border-b border-[var(--mc-frame)]/40 transition-colors",
                    selected ? "bg-[var(--mc-emerald)]/15 hover:bg-[var(--mc-emerald)]/20" : "hover:bg-emerald-600/10",
                    activePath === file.path && "shadow-[inset_3px_0_0_var(--mc-emerald)]"
                  )}
                  onClick={(e) => onRowClick(file, e)}
                  onDoubleClick={() => onFileDoubleClick(file)}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                >
                  <td className="pl-3 pr-0 py-1.5" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={file.name}
                      checked={selected}
                      onChange={() => onToggleSelect(file)}
                      className="h-4 w-4 cursor-pointer accent-emerald-400"
                    />
                  </td>
                  <td className="px-3 py-1.5 max-w-0 w-full">
                    <div className="flex items-center gap-2 min-w-0">
                      {getFileIcon(file)}
                      <span className={cn("truncate", selected ? "text-[var(--mc-emerald)]" : "text-gray-200", file.isDirectory && "font-medium")} title={file.name}>
                        {file.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right whitespace-nowrap font-mono text-xs text-gray-400">
                    {file.isDirectory ? "—" : formatFileSize(file.size)}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-xs text-gray-400 hidden sm:table-cell">{formatDate(file.modified)}</td>
                  <td className="pr-2 py-1 text-right" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                    {/* The context menu, reachable without a right click (touch, discoverability). */}
                    <button
                      type="button"
                      aria-label={t("fmMoreActions")}
                      aria-haspopup="menu"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        openMenu(file, { x: rect.right - 180, y: rect.bottom + 4 });
                      }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded text-gray-500 opacity-60 transition hover:bg-gray-700/60 hover:text-gray-100 group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {files.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  {searchQuery ? t("searchNoResults").replace("{query}", searchQuery) : t("emptyFolder")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {contextMenu && (
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
