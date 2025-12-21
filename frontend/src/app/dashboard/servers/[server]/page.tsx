"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { isAuthenticated } from "@/services/auth/auth.service";
import { useServerStatus } from "@/lib/hooks/useServerStatus";
import { useServerConfig } from "@/lib/hooks/useServerConfig";
import { ServerPageHeader } from "@/components/organisms/ServerPageHeader";
import { ServerConfigTabs } from "@/components/organisms/ServerConfigTabs";
import { ServerLoadingSkeleton } from "@/components/organisms/ServerLoadingSkeleton";
import Image from "next/image";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { TranslationKey } from "@/lib/translations";

export default function ServerConfig() {
  const router = useRouter();
  const params = useParams();
  const serverId = params.server as string;

  const { config, loading: configLoading, updateConfig, saveConfig, restartServer, clearServerData, isSaving } = useServerConfig(serverId);
  const { status, isProcessingAction, startServer, stopServer } = useServerStatus(serverId);
  const { t } = useLanguage();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/");
    }
  }, [router]);

  if (configLoading) {
    return <ServerLoadingSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <ServerPageHeader serverId={serverId} serverName={config.serverName} serverStatus={status} serverPort={config.port || "25565"} isProcessing={isProcessingAction} onStartServer={startServer} onStopServer={stopServer} onRestartServer={restartServer} onClearData={clearServerData} />
      </div>

      <div className="animate-fade-in-up stagger-1">
        <ServerConfigTabs serverId={serverId} config={config} updateConfig={updateConfig} saveConfig={saveConfig} serverStatus={status} isSaving={isSaving} />
      </div>

      <div className="flex justify-center gap-8 pt-8 animate-fade-in stagger-2">
        <div className="animate-float opacity-40 hover:opacity-70 transition-opacity">
          <Image src="/images/ender-pearl.webp" alt="Ender Pearl" width={32} height={32} className="drop-shadow-md" />
        </div>
        <div className="animate-float-delay-1 opacity-40 hover:opacity-70 transition-opacity">
          <Image src="/images/enchanted-book.webp" alt="Enchanted Book" width={32} height={32} className="drop-shadow-md" />
        </div>
        <div className="animate-float-delay-2 opacity-40 hover:opacity-70 transition-opacity">
          <Image src="/images/iron-pick.webp" alt="Iron Pickaxe" width={32} height={32} className="drop-shadow-md" />
        </div>
        <div className="animate-float opacity-40 hover:opacity-70 transition-opacity">
          <Image src="/images/diamond-pickaxe.webp" alt="Diamond Pickaxe" width={32} height={32} className="drop-shadow-md" />
        </div>
      </div>

      <div className="bg-gray-900/60 backdrop-blur-md rounded-lg border border-gray-700/40 p-6 animate-fade-in-up stagger-3">
        <div className="flex items-center gap-3 mb-4">
          <Image src="/images/command-block.webp" alt="Command Block" width={24} height={24} />
          <h3 className="text-lg font-minecraft text-white">{t("serverInformation")}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
            <p className="text-gray-400 mb-1">{t("serverId")}</p>
            <p className="text-white font-medium font-minecraft">{serverId}</p>
          </div>
          <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
            <p className="text-gray-400 mb-1">{t("currentStatus")} </p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${status === "running" ? "bg-emerald-500" : status === "stopped" ? "bg-yellow-500" : status === "starting" ? "bg-orange-500" : "bg-red-500"}`} />
              <p className="text-white font-medium capitalize">{t(status as TranslationKey)}</p>
            </div>
          </div>
          <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
            <p className="text-gray-400 mb-1">{t("port")} </p>
            <p className="text-white font-medium">{config.port || "25565"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
