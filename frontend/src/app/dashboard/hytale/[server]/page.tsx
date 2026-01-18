"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { isAuthenticated } from "@/services/auth/auth.service";
import { useHytaleServerStatus } from "@/lib/hooks/useHytaleServerStatus";
import { useHytaleServerConfig } from "@/lib/hooks/useHytaleServerConfig";
import { HytaleServerHeader } from "@/components/hytale/HytaleServerHeader";
import { HytaleConfigTabs } from "@/components/hytale/HytaleConfigTabs";
import { Loader2, Gamepad2 } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";

export default function HytaleServerConfig() {
  const router = useRouter();
  const params = useParams();
  const serverId = params.server as string;

  const {
    config,
    loading: configLoading,
    updateConfig,
    saveConfig,
    restartServer,
    isSaving,
  } = useHytaleServerConfig(serverId);
  
  const { status, isProcessingAction, startServer, stopServer } = useHytaleServerStatus(serverId);
  const { t } = useLanguage();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/");
    }
  }, [router]);

  if (configLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto" />
          <p className="text-gray-400">{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <HytaleServerHeader
          serverId={serverId}
          serverName={config.serverName}
          serverStatus={status}
          serverPort={config.port || "5520"}
          isProcessing={isProcessingAction}
          onStartServer={startServer}
          onStopServer={stopServer}
          onRestartServer={restartServer}
        />
      </div>

      <div className="animate-fade-in-up stagger-1">
        <HytaleConfigTabs
          serverId={serverId}
          config={config}
          updateConfig={updateConfig}
          saveConfig={saveConfig}
          serverStatus={status}
          isSaving={isSaving}
        />
      </div>

      <div className="bg-gray-900/60 backdrop-blur-md rounded-lg border border-gray-700/40 p-6 animate-fade-in-up stagger-3">
        <div className="flex items-center gap-3 mb-4">
          <Gamepad2 className="h-6 w-6 text-purple-400" />
          <h3 className="text-lg font-bold text-white">{t("serverInformation")}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
            <p className="text-gray-400 mb-1">{t("serverId")}</p>
            <p className="text-white font-medium">{serverId}</p>
          </div>
          <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
            <p className="text-gray-400 mb-1">{t("currentStatus")}</p>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  status === "running"
                    ? "bg-emerald-500"
                    : status === "stopped"
                    ? "bg-yellow-500"
                    : status === "starting"
                    ? "bg-orange-500"
                    : "bg-red-500"
                }`}
              />
              <p className="text-white font-medium capitalize">{status}</p>
            </div>
          </div>
          <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
            <p className="text-gray-400 mb-1">{t("port")} (UDP)</p>
            <p className="text-white font-medium">{config.port || "5520"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
