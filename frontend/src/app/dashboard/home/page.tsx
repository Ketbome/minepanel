"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Activity, HardDrive, Cpu, Plus, Server, FolderOpen, Settings } from "lucide-react";
import { fetchServerList, getAllServersStatus } from "@/services/docker/fetchs";
import { getSystemStats, formatBytes, SystemStats } from "@/services/system/system.service";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { ServerQuickView } from "@/components/dashboard/ServerQuickView";
import { SystemAlerts } from "@/components/dashboard/SystemAlerts";
import { getSessionUser } from "@/services/auth/auth.service";

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
    getSessionUser()
      .then((user) => setUsername(user.username))
      .catch((error) => {
        console.error("Error loading session user:", error);
      });
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

  // Stat slots rendered as inventory item stacks
  const statSlots = [
    {
      title: t("totalServers"),
      value: servers.length,
      img: "/images/command-block.webp",
      countColor: "text-cyan-300",
      active: false,
    },
    {
      title: t("runningServers"),
      value: runningServers,
      img: "/images/emerald.webp",
      countColor: "text-emerald-300",
      active: runningServers > 0,
    },
    {
      title: t("stoppedServers"),
      value: stoppedServers,
      img: "/images/barrier.webp",
      countColor: "text-red-300",
      active: false,
    },
  ];

  const resourceBars = systemStats
    ? [
        {
          label: "CPU",
          img: "/images/diamond.webp",
          icon: Cpu,
          color: "#5eead4",
          text: "text-[#5eead4]",
          percent: systemStats.cpu.usage,
          value: `${Math.round(systemStats.cpu.usage)}%`,
        },
        {
          label: "RAM",
          img: "/images/emerald.webp",
          icon: Activity,
          color: "#9dff3f",
          text: "text-emerald-300",
          percent: systemStats.memory.usagePercentage,
          value: `${formatBytes(systemStats.memory.used)} / ${formatBytes(systemStats.memory.total)}`,
        },
        {
          label: "DISK",
          img: "/images/gold.webp",
          icon: HardDrive,
          color: "#f5c542",
          text: "text-amber-300",
          percent: systemStats.disk.usagePercentage,
          value: `${formatBytes(systemStats.disk.used)} / ${formatBytes(systemStats.disk.total)}`,
        },
      ]
    : [];

  const quickActions = [
    { href: "/dashboard/servers", img: "/images/crafting-table.webp", icon: Plus, label: t("createServer"), btn: "mc-btn-emerald" },
    { href: "/dashboard/servers", img: "/images/command-block.webp", icon: Server, label: t("viewAllServers"), btn: "mc-btn-lapis" },
    { href: "/dashboard/files", img: "/images/chest.webp", icon: FolderOpen, label: t("files"), btn: "mc-btn-gold" },
    { href: "/dashboard/settings", img: "/images/redstone.webp", icon: Settings, label: t("settings"), btn: "mc-btn-amethyst" },
  ];

  return (
    <div className="space-y-6">
      {/* Inventory window header */}
      <div className="mc-panel animate-fade-in-up">
        <div className="mc-titlebar flex items-center gap-3 px-4 py-3">
          <Image src="/images/grass.webp" alt="Home" width={32} height={32} className="pixelated animate-float" />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-minecraft text-white drop-shadow-glow leading-tight">{t("homeTitle")}</h1>
            <p className="text-gray-300 text-xs">
              {t("welcomeBack")}, <span className="text-emerald-400 font-semibold">{username || t("admin")}</span>
            </p>
          </div>
        </div>

        {/* Stat hotbar */}
        <div className="flex flex-wrap items-stretch gap-3 p-4">
          {statSlots.map((slot) => (
            <div key={slot.title} className="flex items-center gap-3">
              <div className={`mc-slot ${slot.active ? "mc-slot--active animate-slot-glint" : ""} relative w-16 h-16 flex items-center justify-center`}>
                <Image src={slot.img} alt={slot.title} width={36} height={36} className="pixelated" />
                <span className={`mc-count ${slot.countColor} absolute bottom-0.5 right-1 text-lg`}>{isLoading ? "…" : slot.value}</span>
              </div>
              <span className="font-minecraft text-[10px] uppercase tracking-wider text-gray-400 max-w-[5.5rem] leading-tight">{slot.title}</span>
            </div>
          ))}
        </div>
      </div>

      {servers.length > 0 && <SystemAlerts servers={servers} />}

      {/* System + Quick actions */}
      <div className="grid gap-6 lg:grid-cols-2 animate-fade-in-up stagger-2">
        {/* System Health */}
        <div className="mc-panel">
          <div className="mc-titlebar flex items-center justify-between px-4 py-2.5">
            <span className="font-minecraft text-sm text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-300" />
              {t("systemHealth")}
            </span>
            <span className="mc-tag bg-emerald-700/70 text-emerald-200 text-[10px] px-2 py-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse" />
              {t("healthy")}
            </span>
          </div>
          <div className="p-4 space-y-4">
            {systemStats ? (
              resourceBars.map((bar) => (
                <div key={bar.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-minecraft text-gray-300">
                      <Image src={bar.img} alt={bar.label} width={18} height={18} className="pixelated" />
                      {bar.label}
                    </span>
                    <span className={`font-mono ${bar.text}`}>{bar.value}</span>
                  </div>
                  <div className="mc-bar">
                    <div className="mc-bar__fill" style={{ width: `${Math.min(bar.percent, 100)}%`, backgroundColor: bar.color }} />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center py-6">
                <div className="text-gray-400 text-sm font-minecraft">{t("loading")}</div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mc-panel">
          <div className="mc-titlebar flex items-center px-4 py-2.5">
            <span className="font-minecraft text-sm text-white flex items-center gap-2">
              <Image src="/images/crafting-table.webp" alt="" width={18} height={18} className="pixelated" />
              {t("quickActions")}
            </span>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href}>
                <button className={`mc-btn ${action.btn} w-full h-full py-4 flex-col gap-2`}>
                  <Image src={action.img} alt="" width={32} height={32} className="pixelated" />
                  <span className="text-[11px] leading-tight text-center px-1">{action.label}</span>
                </button>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Servers Overview */}
      {servers.length > 0 && (
        <div className="animate-fade-in-up stagger-3">
          <ServerQuickView servers={servers} />
        </div>
      )}

      {/* Empty State */}
      {servers.length === 0 && !isLoading && (
        <div className="mc-panel">
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <Image src="/images/chest.webp" alt="Empty" width={64} height={64} className="pixelated opacity-70 mb-4 animate-float" />
            <h3 className="text-lg font-minecraft text-gray-200 mb-2">{t("noServersAvailable")}</h3>
            <p className="text-gray-400 text-sm mb-5">{t("noServersAvailableDesc")}</p>
            <Link href="/dashboard/servers">
              <button className="mc-btn mc-btn-emerald px-6 py-3">
                <Plus className="w-4 h-4" />
                {t("createFirstServer")}
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Decorative */}
      <div className="flex justify-center gap-8 pt-2">
        <div className="animate-float">
          <Image src="/images/diamond.webp" alt="Diamond" width={24} height={24} className="pixelated opacity-40 hover:opacity-80 transition-opacity" />
        </div>
        <div className="animate-float-delay-1">
          <Image src="/images/emerald.webp" alt="Emerald" width={24} height={24} className="pixelated opacity-40 hover:opacity-80 transition-opacity" />
        </div>
        <div className="animate-float-delay-2">
          <Image src="/images/command-block.webp" alt="Command Block" width={24} height={24} className="pixelated opacity-40 hover:opacity-80 transition-opacity" />
        </div>
      </div>
    </div>
  );
}
