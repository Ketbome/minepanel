"use client";

import { FC, useEffect, useRef } from "react";
import { FileItem } from "@/services/files/files.service";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { Download, Pencil, Trash2, FolderOpen, Copy, FileText, Archive } from "lucide-react";

interface FileContextMenuProps {
  file: FileItem;
  position: { x: number; y: number };
  onClose: () => void;
  onEdit: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
  onDownloadZip: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onRename: (file: FileItem) => void;
  onOpen: (file: FileItem) => void;
  onCopyPath: (file: FileItem) => void;
}

const isEditableFile = (file: FileItem): boolean => {
  if (file.isDirectory) return false;
  const textExtensions = ["txt", "json", "yml", "yaml", "properties", "cfg", "conf", "xml", "md", "log", "sh", "bat", "toml", "ini", "mcmeta", "lang"];
  return file.extension ? textExtensions.includes(file.extension.toLowerCase()) : false;
};

export const FileContextMenu: FC<FileContextMenuProps> = ({
  file,
  position,
  onClose,
  onEdit,
  onDownload,
  onDownloadZip,
  onDelete,
  onRename,
  onOpen,
  onCopyPath,
}) => {
  const { t } = useLanguage();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  const adjustedPosition = { ...position };
  if (menuRef.current) {
    const rect = menuRef.current.getBoundingClientRect();
    if (position.x + rect.width > window.innerWidth) {
      adjustedPosition.x = window.innerWidth - rect.width - 10;
    }
    if (position.y + rect.height > window.innerHeight) {
      adjustedPosition.y = window.innerHeight - rect.height - 10;
    }
  }

  const menuItems = [
    ...(file.isDirectory
      ? [{ icon: FolderOpen, label: t("open"), action: () => onOpen(file) }]
      : []),
    ...(isEditableFile(file)
      ? [{ icon: FileText, label: t("edit"), action: () => onEdit(file) }]
      : []),
    ...(!file.isDirectory
      ? [{ icon: Download, label: t("download"), action: () => onDownload(file) }]
      : []),
    ...(file.isDirectory
      ? [{ icon: Archive, label: t("downloadAsZip"), action: () => onDownloadZip(file) }]
      : []),
    { icon: Pencil, label: t("rename"), action: () => onRename(file) },
    { icon: Copy, label: t("copyPath"), action: () => onCopyPath(file) },
    { type: "separator" as const },
    { icon: Trash2, label: t("delete"), action: () => onDelete(file), danger: true },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 animate-in fade-in-0 zoom-in-95 select-none"
      style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
    >
      {menuItems.map((item, index) =>
        item.type === "separator" ? (
          <div key={index} className="h-px bg-gray-700 my-1" />
        ) : (
          <button
            key={index}
            onClick={() => {
              item.action?.();
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
              item.danger
                ? "text-red-400 hover:bg-red-900/30"
                : "text-gray-200 hover:bg-gray-800"
            }`}
          >
            {item.icon && <item.icon className="h-4 w-4" />}
            {item.label}
          </button>
        )
      )}
    </div>
  );
};

