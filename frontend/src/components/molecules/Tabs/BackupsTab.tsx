import { FC, useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { mcToast } from "@/lib/utils/minecraft-toast";
import { BackupFile, listBackups, triggerBackup, restoreBackup, deleteBackup, downloadBackup } from "@/services/docker/backups";
import { Archive, Download, RotateCcw, Trash2, Plus, Loader2, RefreshCw } from "lucide-react";

interface BackupsTabProps {
  serverId: string;
  serverStatus: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const BackupsTab: FC<BackupsTabProps> = ({ serverId, serverStatus }) => {
  const { t } = useLanguage();
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  const fetchBackups = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listBackups(serverId);
      setBackups(data);
    } catch (err) {
      mcToast.error(t("backupLoadError"));
    } finally {
      setLoading(false);
    }
  }, [serverId, t]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleTriggerBackup = async () => {
    try {
      setTriggering(true);
      await triggerBackup(serverId);
      mcToast.success(t("backupTriggered"));
      setTimeout(fetchBackups, 3000);
    } catch (err) {
      mcToast.error(t("backupTriggerError"));
    } finally {
      setTriggering(false);
    }
  };

  const handleRestore = async (filename: string) => {
    try {
      setRestoringFile(filename);
      await restoreBackup(serverId, filename);
      mcToast.success(t("backupRestored"));
    } catch (err) {
      mcToast.error(t("backupRestoreError"));
    } finally {
      setRestoringFile(null);
    }
  };

  const handleDownload = (filename: string) => {
    const url = downloadBackup(serverId, filename);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    
    // Use fetch with auth header since the endpoint requires JWT
    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error("Download failed");
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => {
        mcToast.error(t("backupDownloadError"));
      });
  };

  const handleDelete = async (filename: string) => {
    try {
      setDeletingFile(filename);
      await deleteBackup(serverId, filename);
      mcToast.success(t("backupDeleted"));
      setBackups((prev) => prev.filter((b) => b.filename !== filename));
    } catch (err) {
      mcToast.error(t("backupDeleteError"));
    } finally {
      setDeletingFile(null);
    }
  };

  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
              <Archive className="h-5 w-5" />
              {t("backups")}
            </CardTitle>
            <CardDescription className="text-gray-300">{t("backupsDesc")}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBackups}
              disabled={loading}
              className="border-gray-600 hover:bg-gray-800"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              onClick={handleTriggerBackup}
              disabled={triggering || serverStatus !== "running"}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {triggering ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              {t("backupCreate")}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading && backups.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            {t("loading")}
          </div>
        ) : backups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Archive className="h-12 w-12 mb-3 opacity-50" />
            <p className="font-minecraft text-sm">{t("backupNoBackups")}</p>
            <p className="text-xs mt-1">{t("backupNoBackupsDesc")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {backups.map((backup) => (
              <div
                key={backup.filename}
                className="flex items-center justify-between p-3 bg-gray-800/60 rounded-lg border border-gray-700/40 hover:border-gray-600/60 transition-colors"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-minecraft text-gray-200 truncate">{backup.filename}</p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs text-gray-400">{formatFileSize(backup.size)}</span>
                    <span className="text-xs text-gray-400">{formatDate(backup.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(backup.filename)}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-blue-400 hover:bg-blue-900/20"
                    title={t("backupDownload")}
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={restoringFile === backup.filename}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-amber-400 hover:bg-amber-900/20"
                        title={t("backupRestore")}
                      >
                        {restoringFile === backup.filename ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-gray-900 border-gray-700">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-amber-400 font-minecraft">
                          {t("backupRestoreConfirmTitle")}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-300">
                          {t("backupRestoreConfirmDesc")}
                          <br />
                          <span className="text-amber-400 font-semibold mt-2 block">{backup.filename}</span>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-gray-600 hover:bg-gray-800">
                          {t("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRestore(backup.filename)}
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          {t("backupRestore")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingFile === backup.filename}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-900/20"
                        title={t("backupDelete")}
                      >
                        {deletingFile === backup.filename ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-gray-900 border-gray-700">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-400 font-minecraft">
                          {t("backupDeleteConfirmTitle")}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-300">
                          {t("backupDeleteConfirmDesc")}
                          <br />
                          <span className="text-red-400 font-semibold mt-2 block">{backup.filename}</span>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-gray-600 hover:bg-gray-800">
                          {t("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(backup.filename)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {t("backupDelete")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
