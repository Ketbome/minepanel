"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Activity, HardDrive, Cpu, Play, Square, ArrowRight } from "lucide-react";
import { fetchServerList, getAllServersStatus } from "@/services/docker/fetchs";
import { getSystemStats, formatBytes, SystemStats } from "@/services/system/system.service";
import { useLanguage } from "@/lib/hooks/useLanguage";

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

  const quickActions = [
    {
      title: t("createServer"),
      description: t("createNewServer"),
      icon: Server,
      href: "/dashboard/servers",
      color: "emerald",
    },
    {
      title: t("viewAllServers"),
      description: t("manageServer"),
      icon: Activity,
      href: "/dashboard/servers",
      color: "blue",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <Image src="/images/grass.webp" alt="Home" width={40} height={40} />
          <h1 className="text-3xl font-bold text-white font-minecraft">{t("homeTitle")}</h1>
        </div>
        <p className="text-gray-400">
          {t("welcomeBack")}, <span className="text-emerald-400 font-semibold">{username || t("admin")}</span>
        </p>
      </div>

      <div>
        <h2 className="text-xl font-minecraft text-white mb-4">{t("quickStats")}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {stats.map((stat, index) => (
            <div key={stat.title} className={`animate-fade-in-up stagger-${index + 1}`}>
              <Card className={`border-2 ${stat.borderColor} bg-gray-900/80 backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-300`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-300">{stat.title}</CardTitle>
                    <div className={`w-10 h-10 rounded-full ${stat.bgColor} flex items-center justify-center`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-4xl font-bold ${stat.color}`}>{isLoading ? "..." : stat.value}</div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
      <div className="animate-fade-in-up stagger-4">
        <h2 className="text-xl font-minecraft text-white mb-4">{t("systemStatus")}</h2>
        <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white font-minecraft">{t("systemHealth")}</CardTitle>
                <CardDescription className="text-gray-400">{t("systemActive")}</CardDescription>
              </div>
              <Badge variant="outline" className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30 px-3 py-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400 mr-2"></div>
                {t("healthy")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {systemStats ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Cpu className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">{t("cpuUsage")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-700" 
                        style={{ width: `${systemStats.cpu.usage}%` }} 
                      />
                    </div>
                    <span className="text-sm text-blue-400 font-semibold">{Math.round(systemStats.cpu.usage)}%</span>
                  </div>
                  <p className="text-xs text-gray-500">{systemStats.cpu.cores} cores</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm">{t("memoryUsage")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700" 
                        style={{ width: `${systemStats.memory.usagePercentage}%` }} 
                      />
                    </div>
                    <span className="text-sm text-emerald-400 font-semibold">{systemStats.memory.usagePercentage}%</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatBytes(systemStats.memory.used)} / {formatBytes(systemStats.memory.total)}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-300">
                    <HardDrive className="w-4 h-4 text-purple-400" />
                    <span className="text-sm">{t("diskUsage")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-700" 
                        style={{ width: `${systemStats.disk.usagePercentage}%` }} 
                      />
                    </div>
                    <span className="text-sm text-purple-400 font-semibold">{systemStats.disk.usagePercentage}%</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatBytes(systemStats.disk.used)} / {formatBytes(systemStats.disk.total)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-400">{t("loading")}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="animate-fade-in-up stagger-5">
        <h2 className="text-xl font-minecraft text-white mb-4">{t("quickActions")}</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href}>
              <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-emerald-600/30 group cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg bg-${action.color}-600/20 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <action.icon className={`w-6 h-6 text-${action.color}-400`} />
                      </div>
                      <div>
                        <CardTitle className="text-white font-minecraft group-hover:text-emerald-400 transition-colors">{action.title}</CardTitle>
                        <CardDescription className="text-gray-400 text-sm">{action.description}</CardDescription>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="animate-fade-in-up stagger-6">
        <h2 className="text-xl font-minecraft text-white mb-4">{t("recentActivity")}</h2>
        <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Image src="/images/chest.webp" alt="No activity" width={64} height={64} className="mx-auto mb-4 opacity-60" />
              <p className="text-gray-400">{t("noRecentActivity")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Decorative floating icons - CSS animations instead of framer-motion */}
      <div className="flex justify-center gap-8 pt-4">
        <div className="animate-float">
          <Image src="/images/diamond.webp" alt="Diamond" width={32} height={32} className="opacity-50 hover:opacity-80 transition-opacity" />
        </div>
        <div className="animate-float-delay-1">
          <Image src="/images/emerald.webp" alt="Emerald" width={32} height={32} className="opacity-50 hover:opacity-80 transition-opacity" />
        </div>
        <div className="animate-float-delay-2">
          <Image src="/images/command-block.webp" alt="Command Block" width={32} height={32} className="opacity-50 hover:opacity-80 transition-opacity" />
        </div>
      </div>
    </div>
  );
}
