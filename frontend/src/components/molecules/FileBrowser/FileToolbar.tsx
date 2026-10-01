"use client";

import { FC, useState, useRef, useEffect } from "react";
import { FileItem } from "@/services/files/files.service";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FolderPlus, FolderUp, Upload, RefreshCw, Trash2, Download, Pencil, Loader2, Search, X } from "lucide-react";

interface FileToolbarProps {
  onCreateFolder: (name: string) => void;
  onUploadFiles: (files: File[], relativePaths?: string[]) => void;
  onRefresh: () => void;
  selectedFiles: FileItem[];
  onRename: (file: FileItem) => void;
  onDownload: (files: FileItem[]) => void;
  onDelete: (files: FileItem[]) => void;
  onClearSelection: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  isUploading?: boolean;
}

const actionClass = "gap-2 text-gray-300 hover:text-white hover:bg-gray-700/50";

export const FileToolbar: FC<FileToolbarProps> = ({
  onCreateFolder,
  onUploadFiles,
  onRefresh,
  selectedFiles,
  onRename,
  onDownload,
  onDelete,
  onClearSelection,
  search,
  onSearchChange,
  isUploading = false,
}) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Ctrl/Cmd+F is the reflex for "find in this list", and the browser's own find
  // only matches what is currently scrolled into view.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setShowNewFolderDialog(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUploadFiles(Array.from(files));
      e.target.value = "";
    }
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      // webkitRelativePath contiene la ruta relativa desde la carpeta seleccionada
      const relativePaths = fileList.map((f) => (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name);
      onUploadFiles(fileList, relativePaths);
      e.target.value = "";
    }
  };

  const single = selectedFiles.length === 1 ? selectedFiles[0] : null;

  return (
    <>
      <div className="mc-titlebar flex flex-wrap items-center gap-2 px-3 py-2 select-none">
        {selectedFiles.length > 0 ? (
          // A selection swaps the creation actions for what can be done with it, so the
          // bar never has to fit both.
          <>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700/50" onClick={onClearSelection} aria-label={t("fmClearSelection")}>
              <X className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-[var(--mc-emerald)]">{t("fmSelectedCount").replace("{count}", String(selectedFiles.length))}</span>

            {single && (
              <Button variant="ghost" size="sm" className={actionClass} onClick={() => onRename(single)}>
                <Pencil className="h-4 w-4" />
                {t("rename")}
              </Button>
            )}

            <Button variant="ghost" size="sm" className={actionClass} onClick={() => onDownload(selectedFiles)}>
              <Download className="h-4 w-4" />
              {single && !single.isDirectory ? t("download") : t("downloadAsZip")}
            </Button>

            <Button variant="ghost" size="sm" className="gap-2 text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={() => onDelete(selectedFiles)}>
              <Trash2 className="h-4 w-4" />
              {t("delete")}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" className={actionClass} onClick={() => setShowNewFolderDialog(true)}>
              <FolderPlus className="h-4 w-4" />
              {t("newFolder")}
            </Button>

            <Button variant="ghost" size="sm" className={actionClass} onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {isUploading ? t("uploading") : t("uploadFiles")}
            </Button>

            <Button variant="ghost" size="sm" className={actionClass} onClick={() => folderInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderUp className="h-4 w-4" />}
              {t("uploadFolder")}
            </Button>
          </>
        )}

        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} multiple />
        <input
          ref={folderInputRef}
          type="file"
          className="hidden"
          onChange={handleFolderSelect}
          {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
        />

        <div className="relative ml-auto min-w-[140px] flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onSearchChange("");
            }}
            placeholder={t("searchFiles")}
            aria-label={t("searchFiles")}
            className="h-8 bg-gray-800/70 pl-7 pr-7 text-xs text-gray-200 border-gray-700/50"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label={t("clearSearch")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700/50" onClick={onRefresh} aria-label={t("refresh")}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-200">{t("newFolder")}</DialogTitle>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder={t("folderName")}
            className="bg-gray-800 border-gray-700 text-gray-200"
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewFolderDialog(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleCreateFolder} variant="minepanel">
              {t("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
