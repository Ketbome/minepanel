"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cpu, Activity, Server, AlertTriangle, ArrowRight } from "lucide-react";
import { getAllServersResources, ServerResourceInfo } from "@/services/docker/fetchs";
import { useLanguage } from "@/lib/hooks/useLanguage";

interface ServerQuickViewProps {
  servers: Array<{ id: string; serverName?: string }>;
}

type ServerWithResources = {
  id: string;
  name: string;
  status: "running" | "stopped" | "starting" | "not_found";
  cpuUsage: number;
  cpuLimit: number;
  cpuPercent: number;
  memoryUsage: string;
  memoryPercent: number;
};

function parsePercentage(value: string): number {
  const match = value.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function parseCpuLimit(limit: string): number {
  const value = parseFloat(limit);
  return isNaN(value) ? 1 : value;
}

function parseMemorySize(str: string): number {
  const match = str.match(/([\d.]+)\s*([KMGT]?i?B?)/i);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const multipliers: Record<string, number> = {
    "": 1,
    B: 1,
    K: 1024,
    KB: 1024,
    KIB: 1024,
    M: 1024 ** 2,
    MB: 1024 ** 2,
    MIB: 1024 ** 2,
    G: 1024 ** 3,
    GB: 1024 ** 3,
    GIB: 1024 ** 3,
    T: 1024 ** 4,
    TB: 1024 ** 4,
    TIB: 1024 ** 4,
  };
  return value * (multipliers[unit] || 1);
}

function parseMemoryToPercent(usage: string, configLimit: string): number {
  if (usage === "N/A" || !configLimit) return 0;
  const usedBytes = parseMemorySize(usage);
  const limitBytes = parseMemorySize(configLimit);
  return limitBytes > 0 ? (usedBytes / limitBytes) * 100 : 0;
}

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
      const resources = await getAllServersResources();

      const data: ServerWithResources[] = servers.map((server) => {
        const res: ServerResourceInfo = resources[server.id] || {
          status: "not_found",
          cpuUsage: "N/A",
          memoryUsage: "N/A",
          memoryLimit: "N/A",
          cpuLimit: "1",
          memoryConfigLimit: "4G",
        };

        const cpuUsage = parsePercentage(res.cpuUsage);
        const cpuLimit = parseCpuLimit(res.cpuLimit);
        // CPU usage is relative to system, limit is number of cores
        // 100% per core, so cpuLimit=2 means max 200%
        const cpuPercent = cpuLimit > 0 ? (cpuUsage / (cpuLimit * 100)) * 100 : 0;

        return {
          id: server.id,
          name: server.serverName || server.id,
          status: res.status,
          cpuUsage,
          cpuLimit,
          cpuPercent,
          memoryUsage: res.memoryUsage,
          memoryPercent: parseMemoryToPercent(res.memoryUsage, res.memoryConfigLimit),
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
        return "bg-emerald-600/20 text-emerald-400 border-emerald-600/30";
      case "starting":
        return "bg-yellow-600/20 text-yellow-400 border-yellow-600/30";
      case "stopped":
        return "bg-gray-600/20 text-gray-400 border-gray-600/30";
      default:
        return "bg-red-600/20 text-red-400 border-red-600/30";
    }
  };

  // Colors based on percentage of configured limit
  const getUsageColor = (percent: number) => {
    if (percent >= 90) return "from-red-600 to-red-400";
    if (percent >= 70) return "from-yellow-600 to-yellow-400";
    return "from-emerald-600 to-emerald-400";
  };

  const hasHighUsage = (server: ServerWithResources) => server.status === "running" && (server.cpuPercent >= 80 || server.memoryPercent >= 80);

  if (servers.length === 0) return null;

  return (
    <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white font-minecraft flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-400" />
            {t("serversOverview")}
          </CardTitle>
          <Link href="/dashboard/servers" className="text-sm text-gray-400 hover:text-emerald-400 flex items-center gap-1 transition-colors">
            {t("viewAll")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-400">{t("loading")}</div>
          </div>
        ) : (
          <div className="space-y-3">
            {serversData.map((server) => (
              <Link key={server.id} href={`/dashboard/servers/${server.id}`} className="block">
                <div className="p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600/50 transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white group-hover:text-emerald-400 transition-colors truncate max-w-[200px]">{server.name}</span>
                      {hasHighUsage(server) && <AlertTriangle className="w-4 h-4 text-yellow-400 animate-pulse" />}
                    </div>
                    <Badge variant="outline" className={getStatusColor(server.status)}>
                      {t(server.status)}
                    </Badge>
                  </div>

                  {server.status === "running" && (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Cpu className="w-3 h-3" />
                          <span>CPU</span>
                          <span className="ml-auto font-mono">{server.cpuPercent.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full bg-linear-to-r ${getUsageColor(server.cpuPercent)} transition-all duration-500`} style={{ width: `${Math.min(server.cpuPercent, 100)}%` }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Activity className="w-3 h-3" />
                          <span>RAM</span>
                          <span className="ml-auto font-mono">{server.memoryPercent.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full bg-linear-to-r ${getUsageColor(server.memoryPercent)} transition-all duration-500`} style={{ width: `${Math.min(server.memoryPercent, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
