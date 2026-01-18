"use client";

import { FC } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Square, RotateCcw, Loader2, Gamepad2 } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { getStatusBadgeClass, getStatusIcon } from "@/lib/utils/server-status";
import { HytaleServerStatus } from "@/lib/types/hytale";

interface HytaleServerHeaderProps {
  serverId: string;
  serverName: string;
  serverStatus: HytaleServerStatus;
  serverPort: string;
  isProcessing: boolean;
  onStartServer: () => Promise<boolean>;
  onStopServer: () => Promise<boolean>;
  onRestartServer: () => Promise<boolean>;
}

export const HytaleServerHeader: FC<HytaleServerHeaderProps> = ({
  serverId,
  serverName,
  serverStatus,
  serverPort,
  isProcessing,
  onStartServer,
  onStopServer,
  onRestartServer,
}) => {
  const { t } = useLanguage();

  const getStatusText = (status: HytaleServerStatus) => {
    switch (status) {
      case "running":
        return t("active");
      case "starting":
        return t("starting2");
      case "stopped":
        return t("stopped2");
      case "not_found":
        return t("notFound");
      case "loading":
        return t("loading");
      default:
        return t("unknown");
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/hytale">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>

        <div>
          <div className="flex items-center gap-3">
            <Gamepad2 className="h-8 w-8 text-purple-400" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {serverName || serverId}
            </h1>
            <Badge className={getStatusBadgeClass(serverStatus)}>
              {serverStatus === "loading" ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                getStatusIcon(serverStatus)
              )}
              {getStatusText(serverStatus)}
            </Badge>
          </div>
          <p className="text-gray-400 mt-1">
            {t("port")}: {serverPort}/UDP
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {serverStatus === "running" ? (
          <>
            <Button
              variant="outline"
              className="border-yellow-600/50 text-yellow-400 hover:bg-yellow-900/20"
              onClick={onRestartServer}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              {t("restart")}
            </Button>
            <Button
              variant="outline"
              className="border-red-600/50 text-red-400 hover:bg-red-900/20"
              onClick={onStopServer}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Square className="h-4 w-4 mr-2" />
              )}
              {t("stop")}
            </Button>
          </>
        ) : (
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={onStartServer}
            disabled={isProcessing || serverStatus === "starting"}
          >
            {isProcessing || serverStatus === "starting" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {serverStatus === "starting" ? t("starting2") : t("start")}
          </Button>
        )}
      </div>
    </div>
  );
};
