"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Plus, ChevronLeft, ChevronRight, RefreshCw, Loader2, LayoutDashboard, Settings, Package, FolderOpen } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { useUIStore, useServersStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { getStatusColor, getStatusBadgeClassCompact } from "@/lib/utils/server-status";

export function Sidebar() {
  const isSidebarCollapsed = useUIStore((state) => state.isSidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const isCollapsed = isSidebarCollapsed;
  const { t } = useLanguage();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);

  // Use global servers store
  const servers = useServersStore((state) => state.servers);
  const isLoading = useServersStore((state) => state.isLoading);
  const fetchServers = useServersStore((state) => state.fetchServers);
  const updateStatuses = useServersStore((state) => state.updateStatuses);

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

    // Initial fetch only if servers are empty
    if (servers.length === 0) {
      fetchServers();
    }

    // Update statuses every 10 seconds
    const interval = setInterval(updateStatuses, 10000);
    return () => clearInterval(interval);
  }, [isHydrated, servers.length, fetchServers, updateStatuses]);

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
      label: t("files"),
      icon: FolderOpen,
      href: "/dashboard/files",
      isActive: pathname === "/dashboard/files",
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
    <div className="fixed left-0 top-0 h-full bg-gray-900/95 backdrop-blur-md border-r border-gray-700/60 shadow-2xl z-50 transition-[width] duration-300 ease-in-out" style={{ width: isCollapsed ? 64 : 256 }}>
      <div className="p-4 border-b border-gray-700/60">
        <div className="flex items-center justify-between">
          <div className={cn("flex items-center gap-3 transition-all duration-200 overflow-hidden", isCollapsed ? "opacity-0 w-0" : "opacity-100")}>
            <Image src="/images/minecraft-logo.webp" alt="Logo" width={32} height={32} className="object-contain shrink-0" />
            <h2 className="font-minecraft text-lg text-white whitespace-nowrap">{t("minecraftPanel")}</h2>
          </div>

          <Button variant="ghost" size="sm" onClick={toggleSidebar} className="p-2 hover:bg-gray-800/60 text-gray-400 hover:text-white shrink-0">
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <p className={cn("text-xs text-gray-400 uppercase tracking-wider font-minecraft mb-3 transition-opacity duration-200", isCollapsed ? "opacity-0" : "opacity-100")}>{t("navigation")}</p>

        {navigationItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button variant="ghost" className={cn("w-full justify-start gap-3 h-10 px-3 hover:bg-gray-800/60 hover:text-white text-white transition-colors", item.isActive && "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30", isCollapsed && "justify-center px-0")}>
              <item.icon size={18} className="text-gray-400 hover:text-white shrink-0" />
              <span className={cn("font-minecraft text-sm transition-all duration-200 overflow-hidden whitespace-nowrap", isCollapsed ? "opacity-0 w-0" : "opacity-100")}>{item.label}</span>
            </Button>
          </Link>
        ))}
      </div>

      <div className="px-4 pb-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <p className={cn("text-xs text-gray-400 uppercase tracking-wider font-minecraft transition-opacity duration-200", isCollapsed ? "opacity-0" : "opacity-100")}>{t("servers")}</p>

          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => fetchServers()} disabled={isLoading} className="p-1.5 hover:bg-gray-800/60 text-gray-400 hover:text-white">
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
              <div className={cn("p-3 rounded-lg border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]", "bg-gray-800/40 border-gray-700/40 hover:bg-gray-700/60", pathname === `/dashboard/servers/${server.id}` && "bg-emerald-600/20 border-emerald-600/40 text-emerald-400 shadow-lg shadow-emerald-600/10", isCollapsed && "p-2")}>
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <Image src="/images/grass.webp" alt="Server" width={isCollapsed ? 24 : 32} height={isCollapsed ? 24 : 32} className="object-contain" />
                    <div className={cn("absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900", getStatusColor(server.status))} />
                  </div>

                  <div className={cn("flex-1 min-w-0 transition-all duration-200 overflow-hidden", isCollapsed ? "opacity-0 w-0" : "opacity-100")}>
                    <p className="font-minecraft text-sm font-medium text-white truncate">{server.serverName || server.id}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={cn("text-xs px-2 py-0", getStatusBadgeClassCompact(server.status))}>
                        {getStatusText(server.status)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
          shrink-0
          {servers.length === 0 && !isLoading && <div className={cn("text-center py-4 text-gray-500 text-sm", isCollapsed && "hidden")}>{t("noServers")}</div>}
        </div>
      </div>
    </div>
  );
}
