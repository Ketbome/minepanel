"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Activity, HardDrive, Cpu, Play, Square, ArrowRight, Plus, Terminal, FolderOpen } from "lucide-react";
import { fetchServerList, getAllServersStatus } from "@/services/docker/fetchs";
import { getSystemStats, formatBytes, SystemStats } from "@/services/system/system.service";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { ServerQuickView } from "@/components/dashboard/ServerQuickView";
import { SystemAlerts } from "@/components/dashboard/SystemAlerts";
import { Button } from "@/components/ui/button";

type ServerInfo = {
  id: string;
  serverName?: string;
  status: "running" | "stopped" | "starting" | "not_found" | "loading";
};

export default function HomePage() {
  const { t } = useLanguage();
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [serverList, stats] = await Promise.all([fetchServerList(), getSystemStats()]);

        const formattedServers = serverList.map((server) => ({
          ...server,
          status: "loading" as const,
        }));

        if (isMounted) {
          setServers(formattedServers);
          setSystemStats(stats);
          await updateServerStatuses(formattedServers);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();

    const interval = setInterval(() => {
      if (isMounted) {
        if (servers.length > 0) {
          updateServerStatuses(servers);
        }
        // Update system stats every 30 seconds
        getSystemStats()
          .then((stats) => {
            if (isMounted) setSystemStats(stats);
          })
          .catch((error) => console.error("Error updating system stats:", error));
      }
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateServerStatuses = async (serversList: ServerInfo[]) => {
    try {
      const statusData = await getAllServersStatus();
      setServers(
        serversList.map((server) => ({
          ...server,
          status: statusData[server.id] || "not_found",
        }))
      );
    } catch (error) {
      console.error("Error updating server statuses:", error);
    }
  };

  const runningServers = servers.filter((s) => s.status === "running").length;
  const stoppedServers = servers.filter((s) => s.status === "stopped" || s.status === "not_found").length;

  const stats = [
    {
      title: t("totalServers"),
      value: servers.length,
      icon: Server,
      color: "text-blue-400",
      bgColor: "bg-blue-600/20",
      borderColor: "border-blue-600/30",
    },
    {
      title: t("runningServers"),
      value: runningServers,
      icon: Play,
      color: "text-emerald-400",
      bgColor: "bg-emerald-600/20",
      borderColor: "border-emerald-600/30",
    },
    {
      title: t("stoppedServers"),
      value: stoppedServers,
      icon: Square,
      color: "text-yellow-400",
      bgColor: "bg-yellow-600/20",
      borderColor: "border-yellow-600/30",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with quick stats inline */}
      <div className="animate-fade-in-up">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/images/grass.webp" alt="Home" width={40} height={40} />
            <div>
              <h1 className="text-2xl font-bold text-white font-minecraft">{t("homeTitle")}</h1>
              <p className="text-gray-400 text-sm">
                {t("welcomeBack")}, <span className="text-emerald-400 font-semibold">{username || t("admin")}</span>
              </p>
            </div>
          </div>

          {/* Inline Stats */}
          <div className="flex items-center gap-3 flex-wrap">
            {stats.map((stat) => (
              <div key={stat.title} className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${stat.borderColor} ${stat.bgColor}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className={`text-lg font-bold ${stat.color}`}>{isLoading ? "..." : stat.value}</span>
                <span className="text-xs text-gray-400 hidden sm:inline">{stat.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {servers.length > 0 && <SystemAlerts servers={servers} />}

      {/* Main Grid: System + Servers side by side */}
      <div className="grid gap-6 lg:grid-cols-2 animate-fade-in-up stagger-2">
        {/* System Health - Compact */}
        <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white font-minecraft text-base flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                {t("systemHealth")}
              </CardTitle>
              <Badge variant="outline" className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></div>
                {t("healthy")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {systemStats ? (
              <>
                {/* CPU */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-blue-400" /> CPU
                    </span>
                    <span className="text-blue-400 font-mono">{Math.round(systemStats.cpu.usage)}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-700" style={{ width: `${systemStats.cpu.usage}%` }} />
                  </div>
                </div>
                {/* RAM */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Activity className="w-3 h-3 text-emerald-400" /> RAM
                    </span>
                    <span className="text-emerald-400 font-mono">
                      {formatBytes(systemStats.memory.used)} / {formatBytes(systemStats.memory.total)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700" style={{ width: `${systemStats.memory.usagePercentage}%` }} />
                  </div>
                </div>
                {/* Disk */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-purple-400" /> Disk
                    </span>
                    <span className="text-purple-400 font-mono">
                      {formatBytes(systemStats.disk.used)} / {formatBytes(systemStats.disk.total)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-700" style={{ width: `${systemStats.disk.usagePercentage}%` }} />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-6">
                <div className="text-gray-400 text-sm">{t("loading")}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions - Compact Grid */}
        <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-white font-minecraft text-base flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              {t("quickActions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/dashboard/servers">
                <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1 bg-emerald-600/10 border-emerald-600/30 hover:bg-emerald-600/20 hover:border-emerald-500 group">
                  <Plus className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs text-gray-300">{t("createServer")}</span>
                </Button>
              </Link>
              <Link href="/dashboard/servers">
                <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1 bg-blue-600/10 border-blue-600/30 hover:bg-blue-600/20 hover:border-blue-500 group">
                  <Server className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs text-gray-300">{t("viewAllServers")}</span>
                </Button>
              </Link>
              <Link href="/dashboard/files">
                <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1 bg-purple-600/10 border-purple-600/30 hover:bg-purple-600/20 hover:border-purple-500 group">
                  <FolderOpen className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs text-gray-300">{t("files")}</span>
                </Button>
              </Link>
              <Link href="/dashboard/settings">
                <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1 bg-gray-600/10 border-gray-600/30 hover:bg-gray-600/20 hover:border-gray-500 group">
                  <Activity className="w-5 h-5 text-gray-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs text-gray-300">{t("settings")}</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Servers Overview - Full Width */}
      {servers.length > 0 && (
        <div className="animate-fade-in-up stagger-3">
          <ServerQuickView servers={servers} />
        </div>
      )}

      {/* Empty State */}
      {servers.length === 0 && !isLoading && (
        <Card className="border-2 border-dashed border-gray-700/60 bg-gray-900/40">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Image src="/images/chest.webp" alt="Empty" width={64} height={64} className="opacity-50 mb-4" />
            <h3 className="text-lg font-minecraft text-gray-300 mb-2">{t("noServersAvailable")}</h3>
            <p className="text-gray-500 text-sm mb-4">{t("noServersAvailableDesc")}</p>
            <Link href="/dashboard/servers">
              <Button className="bg-emerald-600 hover:bg-emerald-700 font-minecraft">
                <Plus className="w-4 h-4 mr-2" />
                {t("createFirstServer")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Decorative */}
      <div className="flex justify-center gap-8 pt-2">
        <div className="animate-float">
          <Image src="/images/diamond.webp" alt="Diamond" width={24} height={24} className="opacity-40 hover:opacity-70 transition-opacity" />
        </div>
        <div className="animate-float-delay-1">
          <Image src="/images/emerald.webp" alt="Emerald" width={24} height={24} className="opacity-40 hover:opacity-70 transition-opacity" />
        </div>
        <div className="animate-float-delay-2">
          <Image src="/images/command-block.webp" alt="Command Block" width={24} height={24} className="opacity-40 hover:opacity-70 transition-opacity" />
        </div>
      </div>
    </div>
  );
}
