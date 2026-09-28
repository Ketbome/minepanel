"use client";

import { FC, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FileItem } from "@/services/files/files.service";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { Download, Pencil, Trash2, FolderOpen, Copy, FileText, Archive } from "lucide-react";
import { isEditableFile } from "./file-types";

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

  // Keyboard users land in the menu and go back to whatever opened it (the row's
  // menu button, or the list for a right click) when it closes.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const current = items.indexOf(document.activeElement as HTMLElement);
    const focusAt = (index: number) => items[(index + items.length) % items.length]?.focus();

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusAt(current + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusAt(current - 1);
        break;
      case "Home":
        e.preventDefault();
        focusAt(0);
        break;
      case "End":
        e.preventDefault();
        focusAt(items.length - 1);
        break;
      // A menu is not part of the tab order: Tab leaves it, like a native one.
      case "Tab":
        e.preventDefault();
        onClose();
        break;
    }
  };

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

  // Measured after mount: during the first render the ref is still empty, so a menu
  // opened near the bottom or right edge used to spill out of the viewport.
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  useLayoutEffect(() => {
    const rect = menuRef.current?.getBoundingClientRect();
    if (!rect) return;
    setAdjustedPosition({
      x: Math.max(8, Math.min(position.x, window.innerWidth - rect.width - 8)),
      y: Math.max(8, Math.min(position.y, window.innerHeight - rect.height - 8)),
    });
  }, [position]);

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
      role="menu"
      aria-label={file.name}
      onKeyDown={handleMenuKeyDown}
      className="fixed z-50 min-w-[180px] bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 animate-in fade-in-0 zoom-in-95 select-none"
      style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
    >
      {menuItems.map((item, index) =>
        item.type === "separator" ? (
          <div key={index} className="h-px bg-gray-700 my-1" />
        ) : (
          <button
            key={index}
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              item.action?.();
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors outline-none ${
              item.danger
                ? "text-red-400 hover:bg-red-900/30 focus-visible:bg-red-900/30"
                : "text-gray-200 hover:bg-gray-800 focus-visible:bg-gray-800"
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

