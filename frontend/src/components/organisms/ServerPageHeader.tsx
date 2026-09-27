import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, PowerIcon, RefreshCw, FolderOpen, Trash2, Zap } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { ServerConnectionInfo } from "@/components/molecules/ServerConnectionInfo";
import { getStatusIcon, getStatusBadgeClass } from "@/lib/utils/server-status";
import { ServerEdition } from "@/lib/types/types";
import { ServerRuntimeChips } from "@/components/molecules/ServerRuntimeChips";

interface ServerPageHeaderProps {
  readonly serverId: string;
  readonly serverName: string;
  readonly serverStatus: string;
  readonly serverPort: string;
  readonly serverEdition?: ServerEdition;
  readonly isProcessing: boolean;
  readonly onStartServer: () => Promise<boolean>;
  readonly onStopServer: () => Promise<boolean>;
  readonly onForceStopServer: () => Promise<boolean>;
  readonly onRestartServer: () => Promise<boolean>;
  readonly onClearData: () => Promise<boolean>;
  readonly onOpenFiles?: () => void;
}

export function ServerPageHeader({ serverId, serverName, serverStatus, serverPort, serverEdition, isProcessing, onStartServer, onStopServer, onForceStopServer, onRestartServer, onClearData, onOpenFiles }: ServerPageHeaderProps) {
  const { t } = useLanguage();
  const [isClearing, setIsClearing] = useState(false);

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      await onClearData();
    } finally {
      setIsClearing(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "running":
        return t("active");
      case "starting":
        return t("starting2");
      case "stopped":
        return t("stopped2");
      case "not_found":
        return t("notFound");
      default:
        return t("unknown");
    }
  };

  const isUp = serverStatus === "running" || serverStatus === "starting";

  return (
    <div className="mc-panel px-4 py-3 space-y-2.5 text-gray-200">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link href="/dashboard/servers" className="mc-iconbtn shrink-0" aria-label={t("dashboard")} title={t("dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="mc-slot size-9 shrink-0 flex items-center justify-center">
          <Image src={getStatusIcon(serverStatus)} alt="" width={26} height={26} className="pixelated object-contain" />
        </div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white font-minecraft truncate">{serverId}</h1>
        <Badge variant="outline" className={`px-2.5 py-0.5 ${getStatusBadgeClass(serverStatus)}`}>
          {serverStatus === "starting" ? (
            <span className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              {getStatusText(serverStatus)}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-current" />
              {getStatusText(serverStatus)}
            </span>
          )}
        </Badge>
        {serverName && serverName !== serverId && <span className="text-sm text-gray-400 truncate min-w-0">{serverName}</span>}

        <div className="ml-auto flex flex-wrap gap-2">
          {isUp ? (
            <Button type="button" size="sm" variant="destructive" onClick={onStopServer} className="gap-2 bg-red-600 hover:bg-red-700 font-minecraft text-white">
              <PowerIcon className="h-4 w-4" />
              {t("stopServer")}
            </Button>
          ) : (
            <Button type="button" size="sm" variant="default" onClick={onStartServer} className="gap-2 bg-emerald-400 hover:bg-emerald-300 text-gray-950 font-minecraft">
              <PowerIcon className="h-4 w-4" />
              {t("startServer")}
            </Button>
          )}

          {(serverStatus === "running" || serverStatus === "starting") && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" size="icon" disabled={isProcessing} title={t("forceStopServer")} aria-label={t("forceStopServer")} className="border-amber-700/50 bg-gray-800/40 text-amber-300 hover:bg-amber-600/20 hover:text-amber-200 hover:border-amber-600/50 font-minecraft">
                  <Zap className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-gray-900 border-gray-700">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-amber-400 font-minecraft">{t("forceStopConfirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-300">{t("forceStopConfirmDesc")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600">{t("cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={onForceStopServer} disabled={isProcessing} className="bg-amber-700 hover:bg-amber-800 text-white border-amber-900/50 font-minecraft">
                    {t("forceStopServer")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Button type="button" size="sm" variant="outline" onClick={onRestartServer} disabled={isProcessing || serverStatus !== "running"} title={t("restart2")} className="gap-2 border-gray-700/50 bg-gray-800/40 text-gray-200 hover:bg-orange-600/20 hover:text-orange-400 hover:border-orange-600/50">
            <RefreshCw className={`h-4 w-4 ${isProcessing ? "animate-spin" : ""}`} />
            <span className="hidden md:inline">{isProcessing ? t("restarting") : t("restart2")}</span>
          </Button>

          {onOpenFiles && (
            <Button type="button" size="sm" variant="outline" onClick={onOpenFiles} title={t("files")} className="gap-2 border-gray-700/50 bg-gray-800/40 text-gray-200 hover:bg-blue-600/20 hover:text-blue-400 hover:border-blue-600/50">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden md:inline">{t("files")}</span>
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" size="icon" disabled={serverStatus === "running" || serverStatus === "starting"} title={t("deleteConfirmTitle")} aria-label={t("deleteConfirmTitle")} className="border-red-700/50 bg-red-900/20 text-red-400 hover:bg-red-600/30 hover:text-red-300 hover:border-red-600/50 disabled:opacity-50 disabled:cursor-not-allowed">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-gray-900 border-gray-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-red-400 font-minecraft">{t("deleteConfirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-300">{t("deleteConfirmDesc")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600">{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearData} disabled={isClearing} className="bg-red-700 hover:bg-red-800 text-white border-red-900/50 font-minecraft">
                  {isClearing ? t("deleting") : t("yesDeleteAll")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {serverStatus === "running" && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <ServerRuntimeChips serverId={serverId} serverStatus={serverStatus} />
          <ServerConnectionInfo port={serverPort} serverId={serverId} edition={serverEdition} />
        </div>
      )}
    </div>
  );
}
