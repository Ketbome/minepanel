"use client";

import { FC, useState, useCallback, DragEvent } from "react";
import { Upload } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  onFilesDropped: (files: File[], relativePaths?: string[]) => void;
  children: React.ReactNode;
  className?: string;
}

// Recorre recursivamente un directorio usando la File System API
async function traverseDirectory(entry: FileSystemEntry, basePath: string = ""): Promise<{ file: File; path: string }[]> {
  const results: { file: File; path: string }[] = [];

  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    const file = await new Promise<File>((resolve, reject) => {
      fileEntry.file(resolve, reject);
    });
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
    results.push({ file, path: relativePath });
  } else if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    const reader = dirEntry.createReader();
    const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    const newBasePath = basePath ? `${basePath}/${entry.name}` : entry.name;
    for (const childEntry of entries) {
      const childResults = await traverseDirectory(childEntry, newBasePath);
      results.push(...childResults);
    }
  }

  return results;
}

export const DropZone: FC<DropZoneProps> = ({ onFilesDropped, children, className }) => {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDragging(false);
      }
      return newCount;
    });
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDragCounter(0);

      const items = e.dataTransfer.items;
      const allFiles: File[] = [];
      const allPaths: string[] = [];

      // Usar webkitGetAsEntry para detectar carpetas
      const entries: FileSystemEntry[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry) {
          entries.push(entry);
        }
      }

      if (entries.length > 0) {
        for (const entry of entries) {
          const results = await traverseDirectory(entry);
          for (const { file, path } of results) {
            allFiles.push(file);
            allPaths.push(path);
          }
        }
      } else {
        // Fallback para navegadores sin soporte
        const files = Array.from(e.dataTransfer.files);
        allFiles.push(...files);
      }

      if (allFiles.length > 0) {
        onFilesDropped(allFiles, allPaths.length > 0 ? allPaths : undefined);
      }
    },
    [onFilesDropped]
  );

  return (
    <div className={cn("relative", className)} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
      {children}

      {isDragging && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-emerald-900/80 backdrop-blur-sm border-2 border-dashed border-emerald-400 rounded-lg select-none">
          <div className="flex flex-col items-center gap-3 text-emerald-300">
            <Upload className="h-12 w-12 animate-bounce" />
            <p className="text-lg font-minecraft">{t("dropFilesHere")}</p>
            <p className="text-sm text-emerald-400/70">{t("releaseToUpload")}</p>
          </div>
        </div>
      )}
    </div>
  );
};
