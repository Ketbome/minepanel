"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Cpu, Activity, Server, AlertTriangle, ArrowRight, Clock, Users } from "lucide-react";
import { getAllServersRuntimeStats, ServerRuntimeStats } from "@/services/docker/fetchs";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { RuntimeChip } from "@/components/molecules/ServerRuntimeChips";
import { formatPlayers, getCpuPercent, getMemoryPercent, getUsageColor } from "@/lib/utils/server-runtime-stats";
import { formatUptime } from "@/services/system/system.service";

interface ServerQuickViewProps {
  servers: Array<{ id: string; serverName?: string }>;
}

type ServerWithResources = {
  id: string;
  name: string;
  status: "running" | "stopped" | "starting" | "not_found";
  cpuPercent: number;
  memoryPercent: number;
  stats: ServerRuntimeStats;
};

export function ServerQuickView({ servers }: ServerQuickViewProps) {
  const { t } = useLanguage();
  const [serversData, setServersData] = useState<ServerWithResources[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchResources = useCallback(async () => {
    if (servers.length === 0) {
      setServersData([]);
      setIsLoading(false);
      return;
    }

    try {
      const resources = await getAllServersRuntimeStats();

      const data: ServerWithResources[] = servers.map((server) => {
        const res: ServerRuntimeStats = resources[server.id] || {
          status: "not_found",
          cpuUsage: "N/A",
          memoryUsage: "N/A",
          memoryLimit: "N/A",
          cpuLimit: "1",
          memoryConfigLimit: "4G",
          playersOnline: null,
          playersMax: null,
          uptimeSeconds: null,
          version: null,
          gameReachable: false,
        };

        return {
          id: server.id,
          name: server.serverName || server.id,
          status: res.status,
          cpuPercent: getCpuPercent(res) ?? 0,
          memoryPercent: getMemoryPercent(res) ?? 0,
          stats: res,
        };
      });

      setServersData(data);
    } catch (error) {
      console.error("Error fetching server resources:", error);
    } finally {
      setIsLoading(false);
    }
  }, [servers]);

  useEffect(() => {
    fetchResources();
    const interval = setInterval(fetchResources, 15000);
    return () => clearInterval(interval);
  }, [fetchResources]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-emerald-700/70 text-emerald-200";
      case "starting":
        return "bg-yellow-700/70 text-yellow-200";
      case "stopped":
        return "bg-gray-700/70 text-gray-200";
      default:
        return "bg-red-800/70 text-red-200";
    }
  };

  const hasHighUsage = (server: ServerWithResources) => server.status === "running" && (server.cpuPercent >= 80 || server.memoryPercent >= 80);

  if (servers.length === 0) return null;

  return (
    <div className="mc-panel">
      <div className="mc-titlebar flex items-center justify-between px-4 py-2.5">
        <span className="font-minecraft text-sm text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-300" />
          {t("serversOverview")}
        </span>
        <Link href="/dashboard/servers" className="text-xs font-minecraft text-gray-300 hover:text-emerald-400 flex items-center gap-1 transition-colors">
          {t("viewAll")}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-400 font-minecraft">{t("loading")}</div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {serversData.map((server) => (
              <Link key={server.id} href={`/dashboard/servers/${server.id}`} className="block group">
                <div className="mc-slot p-3 transition-transform group-hover:translate-x-0.5">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="mc-slot w-10 h-10 shrink-0 flex items-center justify-center">
                        <Image src={server.status === "running" ? "/images/grass.webp" : "/images/barrier.webp"} alt="" width={26} height={26} className="pixelated" />
                      </div>
                      <span className="font-minecraft text-sm text-white group-hover:text-emerald-400 transition-colors truncate">{server.name}</span>
                      {hasHighUsage(server) && <AlertTriangle className="w-4 h-4 text-yellow-400 animate-pulse shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {server.status === "running" && (
                        <>
                          <RuntimeChip icon={Users} label={t("players")} value={formatPlayers(server.stats)} color="#9dff3f" className="hidden sm:flex" />
                          <RuntimeChip icon={Clock} label={t("uptime")} value={server.stats.uptimeSeconds === null ? "—" : formatUptime(server.stats.uptimeSeconds)} color="#6fe3d4" className="hidden md:flex" />
                        </>
                      )}
                      <span className={`mc-tag ${getStatusColor(server.status)} text-[10px] px-2 py-0.5 shrink-0`}>{t(server.status)}</span>
                    </div>
                  </div>

                  {server.status === "running" && (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-gray-400 font-minecraft">
                          <Cpu className="w-3 h-3" />
                          <span>CPU</span>
                          <span className="ml-auto font-mono">{server.cpuPercent.toFixed(0)}%</span>
                        </div>
                        <div className="mc-bar h-2.5">
                          <div className="mc-bar__fill" style={{ width: `${Math.min(server.cpuPercent, 100)}%`, backgroundColor: getUsageColor(server.cpuPercent) }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-gray-400 font-minecraft">
                          <Activity className="w-3 h-3" />
                          <span>RAM</span>
                          <span className="ml-auto font-mono">{server.memoryPercent.toFixed(0)}%</span>
                        </div>
                        <div className="mc-bar h-2.5">
                          <div className="mc-bar__fill" style={{ width: `${Math.min(server.memoryPercent, 100)}%`, backgroundColor: getUsageColor(server.memoryPercent) }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
