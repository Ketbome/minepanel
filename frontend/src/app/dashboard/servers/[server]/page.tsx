"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { isAuthenticated } from "@/services/auth/auth.service";
import { useServerStatus } from "@/lib/hooks/useServerStatus";
import { useServerConfig } from "@/lib/hooks/useServerConfig";
import { ServerPageHeader } from "@/components/organisms/ServerPageHeader";
import { ServerConfigTabs } from "@/components/organisms/ServerConfigTabs";
import { ServerLoadingSkeleton } from "@/components/organisms/ServerLoadingSkeleton";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { TranslationKey } from "@/lib/translations";

export default function ServerConfig() {
  const router = useRouter();
  const params = useParams();
  const serverId = params.server as string;
  const [refreshToken, setRefreshToken] = useState(0);

  const { config, loading: configLoading, updateConfig, saveConfig, restartServer, clearServerData, isSaving } = useServerConfig(serverId);
  const { status, isProcessingAction, startServer, stopServer, forceStopServer } = useServerStatus(serverId);
  const { t } = useLanguage();

  useEffect(() => {
    isAuthenticated().then((authenticated) => {
      if (!authenticated) router.push("/");
    });
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
        <ServerPageHeader serverId={serverId} serverName={config.serverName} serverStatus={status} serverPort={config.port || "25565"} serverEdition={config.edition} isProcessing={isProcessingAction} onStartServer={startServer} onStopServer={stopServer} onForceStopServer={forceStopServer} onRestartServer={restartServer} onClearData={handleClearServerData} />
      </div>

      <div className="animate-fade-in stagger-1">
        <ServerConfigTabs serverId={serverId} config={config} updateConfig={updateConfig} saveConfig={saveConfig} serverStatus={status} isSaving={isSaving} refreshToken={refreshToken} />
      </div>
    </div>
  );
}
