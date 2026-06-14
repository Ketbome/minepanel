"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [refreshToken, setRefreshToken] = useState(0);

  const { config, loading: configLoading, updateConfig, saveConfig, restartServer, clearServerData, isSaving } = useServerConfig(serverId);
  const { status, isProcessingAction, startServer, stopServer } = useServerStatus(serverId);
  const { t } = useLanguage();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/");
    }
  }, [router]);

  const handleClearServerData = useCallback(async () => {
    const success = await clearServerData();
    if (success) {
      setRefreshToken((current) => current + 1);
    }
    return success;
  }, [clearServerData]);

  if (configLoading) {
    return <ServerLoadingSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <ServerPageHeader serverId={serverId} serverName={config.serverName} serverStatus={status} serverPort={config.port || "25565"} serverEdition={config.edition} isProcessing={isProcessingAction} onStartServer={startServer} onStopServer={stopServer} onRestartServer={restartServer} onClearData={handleClearServerData} />
      </div>

      <div className="animate-fade-in stagger-1">
        <ServerConfigTabs serverId={serverId} config={config} updateConfig={updateConfig} saveConfig={saveConfig} serverStatus={status} isSaving={isSaving} refreshToken={refreshToken} />
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
    </div>
  );
}
