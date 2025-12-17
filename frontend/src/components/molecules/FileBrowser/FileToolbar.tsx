"use client";

import { FC, useState, useRef } from "react";
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
import { FolderPlus, Upload, RefreshCw, Trash2, Download, Pencil, Loader2 } from "lucide-react";

interface FileToolbarProps {
  onCreateFolder: (name: string) => void;
  onUploadFiles: (files: File[], relativePaths?: string[]) => void;
  onRefresh: () => void;
  selectedFile: FileItem | null;
  onDelete: (file: FileItem) => void;
  onRename: (file: FileItem, newName: string) => void;
  onDownload: (file: FileItem) => void;
  isUploading?: boolean;
}

export const FileToolbar: FC<FileToolbarProps> = ({
  onCreateFolder,
  onUploadFiles,
  onRefresh,
  selectedFile,
  onDelete,
  onRename,
  onDownload,
  isUploading = false,
}) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameName, setRenameName] = useState("");

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setShowNewFolderDialog(false);
    }
  };

  const handleRename = () => {
    if (selectedFile && renameName.trim()) {
      onRename(selectedFile, renameName.trim());
      setRenameName("");
      setShowRenameDialog(false);
    }
  };

  const handleDelete = () => {
    if (selectedFile) {
      onDelete(selectedFile);
      setShowDeleteDialog(false);
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

  const openRenameDialog = () => {
    if (selectedFile) {
      setRenameName(selectedFile.name);
      setShowRenameDialog(true);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border-b border-gray-700/50 select-none">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-gray-300 hover:text-white hover:bg-gray-700/50"
          onClick={() => setShowNewFolderDialog(true)}
        >
          <FolderPlus className="h-4 w-4" />
          {t("newFolder")}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-gray-300 hover:text-white hover:bg-gray-700/50"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {isUploading ? t("uploading") : t("uploadFiles")}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-gray-300 hover:text-white hover:bg-gray-700/50"
          onClick={() => folderInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
          {t("uploadFolder")}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          multiple
        />
        <input
          ref={folderInputRef}
          type="file"
          className="hidden"
          onChange={handleFolderSelect}
          {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
        />

        <div className="flex-1" />

        {selectedFile && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-gray-300 hover:text-white hover:bg-gray-700/50"
              onClick={openRenameDialog}
            >
              <Pencil className="h-4 w-4" />
              {t("rename")}
            </Button>

            {!selectedFile.isDirectory && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-gray-300 hover:text-white hover:bg-gray-700/50"
                onClick={() => onDownload(selectedFile)}
              >
                <Download className="h-4 w-4" />
                {t("download")}
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-red-400 hover:text-red-300 hover:bg-red-900/20"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
              {t("delete")}
            </Button>
          </>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700/50"
          onClick={onRefresh}
        >
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
            <Button onClick={handleCreateFolder} className="bg-emerald-600 hover:bg-emerald-700">
              {t("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-200">{t("rename")}</DialogTitle>
          </DialogHeader>
          <Input
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            placeholder={t("newName")}
            className="bg-gray-800 border-gray-700 text-gray-200"
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRenameDialog(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleRename} className="bg-emerald-600 hover:bg-emerald-700">
              {t("rename")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-200">{t("confirmDelete")}</DialogTitle>
          </DialogHeader>
          <p className="text-gray-400">
            {t("deleteConfirmMessage")} <span className="text-gray-200 font-medium">{selectedFile?.name}</span>?
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

