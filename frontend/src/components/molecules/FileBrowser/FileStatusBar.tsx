"use client";

import { FC } from "react";
import { FileItem } from "@/services/files/files.service";
import { useLanguage } from "@/lib/hooks/useLanguage";

interface FileStatusBarProps {
  files: FileItem[];
  visible: FileItem[];
  isFiltering: boolean;
}

const formatSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${parseFloat((bytes / Math.pow(1024, index)).toFixed(1))} ${units[index]}`;
};

export const FileStatusBar: FC<FileStatusBarProps> = ({ files, visible, isFiltering }) => {
  const { t } = useLanguage();

  const folders = visible.filter((file) => file.isDirectory).length;
  const documents = visible.length - folders;
  // Directory sizes are the entry size, not the tree size, so only files count.
  const size = visible.reduce((total, file) => (file.isDirectory ? total : total + file.size), 0);

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 text-[11px] text-gray-400 select-none"
      style={{ borderTop: "2px solid var(--mc-frame)" }}
    >
      <span className="font-minecraft uppercase tracking-wide">{t("foldersCount").replace("{count}", String(folders))}</span>
      <span className="font-minecraft uppercase tracking-wide">{t("filesCount").replace("{count}", String(documents))}</span>
      <span>{formatSize(size)}</span>
      {isFiltering && (
        <span className="text-emerald-400">
          {t("filteredCount").replace("{visible}", String(visible.length)).replace("{total}", String(files.length))}
        </span>
      )}
    </div>
  );
};
