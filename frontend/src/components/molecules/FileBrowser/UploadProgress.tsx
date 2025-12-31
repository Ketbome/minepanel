"use client";

import { FC, useEffect, useRef, useState } from "react";
import { X, Upload, CheckCircle, AlertCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/lib/hooks/useLanguage";

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  loaded: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
}

interface UploadProgressProps {
  uploads: UploadItem[];
  onCancel?: () => void;
  onClose?: () => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

export const UploadProgress: FC<UploadProgressProps> = ({ uploads, onCancel, onClose }) => {
  const { t } = useLanguage();
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState<number | null>(null);
  const lastLoadedRef = useRef(0);
  const lastTimeRef = useRef(Date.now());

  const totalSize = uploads.reduce((acc, u) => acc + u.size, 0);
  const totalLoaded = uploads.reduce((acc, u) => acc + u.loaded, 0);
  const overallProgress = totalSize > 0 ? Math.round((totalLoaded * 100) / totalSize) : 0;

  const completedCount = uploads.filter((u) => u.status === "completed").length;
  const errorCount = uploads.filter((u) => u.status === "error").length;
  const isFinished = completedCount + errorCount === uploads.length;
  const hasErrors = errorCount > 0;

  useEffect(() => {
    if (isFinished || uploads.length === 0) {
      setSpeed(0);
      setEta(null);
      return;
    }

    const now = Date.now();
    const timeDiff = (now - lastTimeRef.current) / 1000;
    const bytesDiff = totalLoaded - lastLoadedRef.current;

    if (timeDiff >= 0.5) {
      const currentSpeed = bytesDiff / timeDiff;
      setSpeed(currentSpeed);

      const remaining = totalSize - totalLoaded;
      if (currentSpeed > 0) {
        setEta(remaining / currentSpeed);
      }

      lastLoadedRef.current = totalLoaded;
      lastTimeRef.current = now;
    }
  }, [totalLoaded, totalSize, isFinished, uploads.length]);

  useEffect(() => {
    lastLoadedRef.current = 0;
    lastTimeRef.current = Date.now();
  }, [uploads.length]);

  if (uploads.length === 0) return null;

  return (
    <div className="absolute bottom-4 right-4 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800/80 border-b border-gray-700">
        <div className="flex items-center gap-2">
          {isFinished ? (
            hasErrors ? (
              <AlertCircle className="h-4 w-4 text-amber-400" />
            ) : (
              <CheckCircle className="h-4 w-4 text-emerald-400" />
            )
          ) : (
            <Upload className="h-4 w-4 text-emerald-400 animate-pulse" />
          )}
          <span className="text-sm font-medium text-gray-200">
            {isFinished
              ? hasErrors
                ? t("uploadCompleteWithErrors")
                : t("uploadComplete")
              : t("uploadingFiles")}
          </span>
        </div>
        {isFinished ? (
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-gray-700" onClick={onClose}>
            <X className="h-4 w-4 text-gray-400" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20"
            onClick={onCancel}
          >
            {t("cancel")}
          </Button>
        )}
      </div>

      {/* Overall Progress */}
      <div className="px-4 py-3 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">
            {completedCount}/{uploads.length} {t("files")}
          </span>
          <span className="text-xs font-mono text-emerald-400">
            {formatBytes(totalLoaded)} / {formatBytes(totalSize)}
          </span>
        </div>
        <Progress value={overallProgress} className="h-2" />
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">{overallProgress}%</span>
          {!isFinished && speed > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-400" />
                {formatBytes(speed)}/s
              </span>
              {eta !== null && eta > 0 && (
                <span className="text-gray-600">• {formatTime(eta)}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* File List (scrollable) */}
      <div className="max-h-40 overflow-y-auto">
        {uploads.map((upload) => (
          <div
            key={upload.id}
            className="flex items-center gap-3 px-4 py-2 border-b border-gray-800 last:border-b-0"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-300 truncate">{upload.name}</p>
              <div className="flex items-center gap-2 mt-1">
                {upload.status === "uploading" && (
                  <>
                    <Progress
                      value={upload.size > 0 ? (upload.loaded * 100) / upload.size : 0}
                      className="h-1 flex-1"
                    />
                    <span className="text-[10px] text-gray-500 font-mono w-8">
                      {upload.size > 0 ? Math.round((upload.loaded * 100) / upload.size) : 0}%
                    </span>
                  </>
                )}
                {upload.status === "completed" && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {formatBytes(upload.size)}
                  </span>
                )}
                {upload.status === "error" && (
                  <span className="text-[10px] text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {t("error")}
                  </span>
                )}
                {upload.status === "pending" && (
                  <span className="text-[10px] text-gray-500">{t("waiting")}...</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

