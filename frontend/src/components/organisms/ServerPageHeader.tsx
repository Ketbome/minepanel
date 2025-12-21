import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, PowerIcon, RefreshCw, Server, FolderOpen, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { ServerConnectionInfo } from "@/components/molecules/ServerConnectionInfo";
import { getStatusIcon, getStatusBadgeClass } from "@/lib/utils/server-status";

interface ServerPageHeaderProps {
  readonly serverId: string;
  readonly serverName: string;
  readonly serverStatus: string;
  readonly serverPort: string;
  readonly isProcessing: boolean;
  readonly onStartServer: () => Promise<boolean>;
  readonly onStopServer: () => Promise<boolean>;
  readonly onRestartServer: () => Promise<boolean>;
  readonly onClearData: () => Promise<boolean>;
  readonly onOpenFiles?: () => void;
}

export function ServerPageHeader({ serverId, serverName, serverStatus, serverPort, isProcessing, onStartServer, onStopServer, onRestartServer, onClearData, onOpenFiles }: ServerPageHeaderProps) {
  const { t } = useLanguage();
  const containerName = serverId;
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

  return (
    <div className="bg-gray-900/80 backdrop-blur-md p-6 rounded-lg border border-gray-700/60 space-y-4 text-gray-200">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/servers">
          <Button variant="outline" size="icon" type="button" className="border-gray-700/50 bg-gray-800/40 text-gray-200 hover:bg-emerald-600/20 hover:text-emerald-400 hover:border-emerald-600/50">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-minecraft">{serverId}</h1>
        <Badge variant="outline" className={`px-3 py-1 ${getStatusBadgeClass(serverStatus)}`}>
          {serverStatus === "starting" ? (
            <span className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              {getStatusText(serverStatus)}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-current"></div>
              {getStatusText(serverStatus)}
            </span>
          )}
        </Badge>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-lg border border-gray-700/40 bg-gray-800/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-12 h-12 relative">
            <Image src={getStatusIcon(serverStatus)} alt="Server Status" width={48} height={48} className="object-contain" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-100 font-minecraft">{serverName || "Minecraft Server"}</p>
            <div className="flex items-center gap-1 mt-1">
              <Server className="h-3 w-3 text-gray-400" />
              <p className="text-xs text-gray-400">{containerName}</p>
            </div>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap gap-2 mt-3 md:mt-0">
          {serverStatus === "running" || serverStatus === "starting" ? (
            <Button type="button" variant="destructive" onClick={onStopServer} className="gap-2 bg-red-600 hover:bg-red-700 font-minecraft text-white">
              <PowerIcon className="h-4 w-4" />
              {t("stopServer")}
            </Button>
          ) : (
            <Button type="button" variant="default" onClick={onStartServer} className="gap-2 bg-emerald-600 hover:bg-emerald-700 font-minecraft text-white">
              <PowerIcon className="h-4 w-4" />
              {t("startServer")}
            </Button>
          )}

          <Button type="button" variant="outline" onClick={onRestartServer} disabled={isProcessing || serverStatus !== "running"} className="gap-2 border-gray-700/50 bg-gray-800/40 text-gray-200 hover:bg-orange-600/20 hover:text-orange-400 hover:border-orange-600/50">
            <RefreshCw className={`h-4 w-4 ${isProcessing ? "animate-spin" : ""}`} />
            {isProcessing ? t("restarting") : t("restart2")}
          </Button>

          {onOpenFiles && (
            <Button type="button" variant="outline" onClick={onOpenFiles} className="gap-2 border-gray-700/50 bg-gray-800/40 text-gray-200 hover:bg-blue-600/20 hover:text-blue-400 hover:border-blue-600/50">
              <FolderOpen className="h-4 w-4" />
              {t("files")}
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" disabled={serverStatus === "running" || serverStatus === "starting"} className="gap-2 border-red-700/50 bg-red-900/20 text-red-400 hover:bg-red-600/30 hover:text-red-300 hover:border-red-600/50 disabled:opacity-50 disabled:cursor-not-allowed">
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
        <div className="animate-fade-in-up">
          <ServerConnectionInfo port={serverPort} serverId={serverId} />
        </div>
      )}

      <div className="text-xs text-gray-300 px-2">
        <span className="font-medium">{t("tip")}</span> {t("configureServerTip")}
        {serverStatus === "running" && ` ${t("changesRequireRestart")}`}
      </div>
    </div>
  );
}
