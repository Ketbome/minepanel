"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Plus, ChevronLeft, ChevronRight, RefreshCw, Loader2, LayoutDashboard, Settings, Package } from "lucide-react";
import { fetchServerList, getAllServersStatus } from "@/services/docker/fetchs";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { cn } from "@/lib/utils";

interface SidebarProps {
  readonly isCollapsed: boolean;
  readonly onToggleCollapse: () => void;
}

type ServerInfo = {
  id: string;
  serverName?: string;
  status: "running" | "stopped" | "starting" | "not_found" | "loading";
  port?: string;
};

export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  const fetchServers = async () => {
    setIsLoading(true);
    try {
      const serverList = await fetchServerList();
      const formattedServers = serverList.map((server) => ({
        ...server,
        status: "loading" as const,
      }));
      setServers(formattedServers);
      await updateServerStatuses();
    } catch (error) {
      console.error("Error fetching servers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateServerStatuses = async () => {
    try {
      const statusData = await getAllServersStatus();
      setServers((prev) =>
        prev.map((server) => ({
          ...server,
          status: statusData[server.id] || "not_found",
        }))
      );
    } catch (error) {
      console.error("Error updating server statuses:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-emerald-500";
      case "starting":
        return "bg-orange-500";
      case "stopped":
        return "bg-yellow-500";
      case "not_found":
        return "bg-red-500";
      case "loading":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "running":
        return "border-emerald-600/30 text-emerald-400";
      case "stopped":
        return "border-yellow-600/30 text-yellow-400";
      case "starting":
        return "border-orange-600/30 text-orange-400";
      default:
        return "border-red-600/30 text-red-400";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "running":
        return t("online");
      case "stopped":
        return t("stopped");
      case "loading":
        return t("loading");
      case "starting":
        return t("starting");
      default:
        return t("error");
    }
  };

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    let isMounted = true;

    const initializeServers = async () => {
      if (isMounted) {
        await fetchServers();
      }
    };

    const timeoutId = setTimeout(() => {
      initializeServers();
    }, 100);

    const interval = setInterval(() => {
      if (isMounted && isHydrated) {
        updateServerStatuses();
      }
    }, 30000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [isHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigationItems = [
    {
      label: t("home"),
      icon: Home,
      href: "/dashboard/home",
      isActive: pathname === "/dashboard/home",
    },
    {
      label: t("dashboard"),
      icon: LayoutDashboard,
      href: "/dashboard/servers",
      isActive: pathname === "/dashboard/servers",
    },
    {
      label: t("templates"),
      icon: Package,
      href: "/dashboard/templates",
      isActive: pathname === "/dashboard/templates",
    },
    {
      label: t("settings"),
      icon: Settings,
      href: "/dashboard/settings",
      isActive: pathname === "/dashboard/settings",
    },
  ];

  if (!isHydrated) {
    return (
      <div className="fixed left-0 top-0 h-full w-64 bg-gray-900/95 backdrop-blur-md border-r border-gray-700/60 shadow-2xl z-50">
        <div className="p-4 border-b border-gray-700/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-700 rounded animate-pulse" />
            <div className="w-32 h-4 bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 bg-gray-700 rounded animate-pulse" />
              <div className="w-24 h-4 bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={false} animate={{ width: isCollapsed ? 64 : 256 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="fixed left-0 top-0 h-full bg-gray-900/95 backdrop-blur-md border-r border-gray-700/60 shadow-2xl z-50">
      <div className="p-4 border-b border-gray-700/60">
        <div className="flex items-center justify-between">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="flex items-center gap-3">
                <Image src="/images/minecraft-logo.webp" alt="Logo" width={32} height={32} className="object-contain" />
                <h2 className="font-minecraft text-lg text-white">{t("minecraftPanel")}</h2>
              </motion.div>
            )}
          </AnimatePresence>

          <Button variant="ghost" size="sm" onClick={onToggleCollapse} className="p-2 hover:bg-gray-800/60 text-gray-400 hover:text-white">
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-gray-400 uppercase tracking-wider font-minecraft mb-3">
              {t("navigation")}
            </motion.p>
          )}
        </AnimatePresence>

        {navigationItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button variant="ghost" className={cn("w-full justify-start gap-3 h-10 px-3", " text-white transition-colors", item.isActive && "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30", isCollapsed && "justify-center px-0")}>
              <item.icon size={18} />
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="font-minecraft text-sm">
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </Link>
        ))}
      </div>

      <div className="px-4 pb-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-gray-400 uppercase tracking-wider font-minecraft">
                {t("servers")}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={fetchServers} disabled={isLoading} className="p-1.5 hover:bg-gray-800/60 text-gray-400 hover:text-white">
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            </Button>

            {!isCollapsed && (
              <Link href="/dashboard/servers">
                <Button variant="ghost" size="sm" className="p-1.5 hover:bg-gray-800/60 text-emerald-400 hover:text-emerald-300">
                  <Plus size={14} />
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
          {servers.map((server) => (
            <Link key={server.id} href={`/dashboard/servers/${server.id}`}>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={cn("p-3 rounded-lg border transition-all duration-200", "bg-gray-800/40 border-gray-700/40 hover:bg-gray-700/60", pathname === `/dashboard/${server.id}` && "bg-emerald-600/20 border-emerald-600/40 text-emerald-400 shadow-lg shadow-emerald-600/10", isCollapsed && "p-2")}>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Image src="/images/grass.webp" alt="Server" width={isCollapsed ? 24 : 32} height={isCollapsed ? 24 : 32} className="object-contain" />
                    <div className={cn("absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900", getStatusColor(server.status))} />
                  </div>

                  <AnimatePresence mode="wait">
                    {!isCollapsed && (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="flex-1 min-w-0">
                        <p className="font-minecraft text-sm font-medium text-white truncate">{server.id}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={cn("text-xs px-2 py-0", getStatusBadgeClass(server.status))}>
                            {getStatusText(server.status)}
                          </Badge>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
