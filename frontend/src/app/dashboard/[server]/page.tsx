"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { isAuthenticated } from "@/services/auth/auth.service";
import { useServerStatus } from "@/lib/hooks/useServerStatus";
import { useServerConfig } from "@/lib/hooks/useServerConfig";
import { ServerPageHeader } from "@/components/organisms/ServerPageHeader";
import { ServerConfigTabs } from "@/components/organisms/ServerConfigTabs";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import Image from "next/image";
import { useLanguage } from "@/lib/hooks/useLanguage";


export default function ServerConfig() {
  const router = useRouter();
  const params = useParams();
  const serverId = params.server as string;

  const { config, loading: configLoading, updateConfig, saveConfig, restartServer, clearServerData } = useServerConfig(serverId);
  const { status, isProcessingAction, startServer, stopServer } = useServerStatus(serverId);
  const { t } = useLanguage();

  // Auth check
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/");
    }
  }, [router]);

  if (configLoading) {
    return (
      <div className="space-y-8">
        {/* Header skeleton */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="bg-gray-900/80 backdrop-blur-md p-6 rounded-lg border border-gray-700/60 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-md bg-gray-700/50" />
            <div className="flex-1">
              <Skeleton className="h-8 w-48 bg-gray-700/50 mb-2" />
              <Skeleton className="h-4 w-32 bg-gray-700/50" />
            </div>
            <Skeleton className="h-8 w-20 rounded-full bg-gray-700/50" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-20 w-full rounded-lg bg-gray-700/50" />
            <Skeleton className="h-20 w-full rounded-lg bg-gray-700/50" />
            <Skeleton className="h-20 w-full rounded-lg bg-gray-700/50" />
          </div>
        </motion.div>

        {/* Tabs skeleton */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-gray-900/80 backdrop-blur-md rounded-lg border border-gray-700/60 overflow-hidden">
          <div className="flex gap-1 border-b border-gray-700/60 px-6 pt-6">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-t-md bg-gray-700/50" />
            ))}
          </div>

          <div className="flex flex-col items-center justify-center py-20 px-6 space-y-6">
            <div className="relative h-20 w-20">
              <motion.div
                animate={{
                  rotate: 360,
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                  scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                }}
              >
                <Image src="/images/loading-cube.webp" alt="Loading" width={80} height={80} className="object-contain drop-shadow-lg" />
              </motion.div>
            </div>

            <div className="text-center space-y-3">
              <h3 className="text-xl font-medium text-white font-minecraft">Cargando configuración del servidor</h3>
              <p className="text-gray-400">Preparando los bloques... Esto puede tomar unos segundos</p>
            </div>

            <div className="w-80 h-3 bg-gray-800/60 rounded-full overflow-hidden border border-gray-700/40">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-blue-500"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>

            <div className="flex gap-4 opacity-60">
              <motion.div animate={{ y: [-3, 3, -3] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                <Image src="/images/redstone.webp" alt="Redstone" width={24} height={24} />
              </motion.div>
              <motion.div animate={{ y: [-3, 3, -3] }} transition={{ repeat: Infinity, duration: 2, delay: 0.3, ease: "easeInOut" }}>
                <Image src="/images/gold.webp" alt="Gold" width={24} height={24} />
              </motion.div>
              <motion.div animate={{ y: [-3, 3, -3] }} transition={{ repeat: Infinity, duration: 2, delay: 0.6, ease: "easeInOut" }}>
                <Image src="/images/emerald.webp" alt="Emerald" width={24} height={24} />
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Server Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <ServerPageHeader serverId={serverId} serverName={config.serverName} serverStatus={status} isProcessing={isProcessingAction} onStartServer={startServer} onStopServer={stopServer} onRestartServer={restartServer} />
      </motion.div>

      {/* Server Configuration Tabs */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
        <ServerConfigTabs serverId={serverId} config={config} updateConfig={updateConfig} saveConfig={saveConfig} serverStatus={status} onClearData={clearServerData} />
      </motion.div>

      {/* Decorative Elements */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }} className="flex justify-center gap-8 pt-8">
        <motion.div animate={{ y: [-4, 4, -4], rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="opacity-40 hover:opacity-70 transition-opacity">
          <Image src="/images/ender-pearl.webp" alt="Ender Pearl" width={32} height={32} className="drop-shadow-md" />
        </motion.div>
        <motion.div animate={{ y: [-4, 4, -4], rotate: [0, -5, 5, 0] }} transition={{ repeat: Infinity, duration: 4, delay: 1, ease: "easeInOut" }} className="opacity-40 hover:opacity-70 transition-opacity">
          <Image src="/images/enchanted-book.webp" alt="Enchanted Book" width={32} height={32} className="drop-shadow-md" />
        </motion.div>
        <motion.div animate={{ y: [-4, 4, -4], rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 4, delay: 2, ease: "easeInOut" }} className="opacity-40 hover:opacity-70 transition-opacity">
          <Image src="/images/iron-pick.webp" alt="Iron Pickaxe" width={32} height={32} className="drop-shadow-md" />
        </motion.div>
        <motion.div animate={{ y: [-4, 4, -4], rotate: [0, -5, 5, 0] }} transition={{ repeat: Infinity, duration: 4, delay: 3, ease: "easeInOut" }} className="opacity-40 hover:opacity-70 transition-opacity">
          <Image src="/images/diamond-pickaxe.webp" alt="Diamond Pickaxe" width={32} height={32} className="drop-shadow-md" />
        </motion.div>
      </motion.div>

      {/* Additional Server Info Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8 }} className="bg-gray-900/60 backdrop-blur-md rounded-lg border border-gray-700/40 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Image src="/images/command-block.webp" alt="Command Block" width={24} height={24} />
          <h3 className="text-lg font-minecraft text-white">{ t("serverInformation") }</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
            <p className="text-gray-400 mb-1">{ t("serverId")}</p>
            <p className="text-white font-medium font-minecraft">{serverId}</p>
          </div>
          <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
            <p className="text-gray-400 mb-1">{ t("currentStatus")} </p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${status === "running" ? "bg-emerald-500" : status === "stopped" ? "bg-yellow-500" : status === "starting" ? "bg-orange-500" : "bg-red-500"}`} />
              <p className="text-white font-medium capitalize">{status}</p>
            </div>
          </div>
          <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
            <p className="text-gray-400 mb-1">{ t('port')} </p>
            <p className="text-white font-medium">{config.port || "25565"}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
