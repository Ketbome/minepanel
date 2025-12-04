"use client";

import { FC, useState, useCallback, DragEvent } from "react";
import { Upload } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  onFilesDropped: (files: File[]) => void;
  children: React.ReactNode;
  className?: string;
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
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDragCounter(0);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFilesDropped(files);
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
