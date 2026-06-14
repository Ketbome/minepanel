"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AlertTriangle, Cpu, Activity, X } from "lucide-react";
import { getAllServersResources, ServerResourceInfo } from "@/services/docker/fetchs";
import { useLanguage } from "@/lib/hooks/useLanguage";

interface SystemAlertsProps {
  servers: Array<{ id: string; serverName?: string }>;
}

type Alert = {
  id: string;
  type: "high_cpu" | "high_memory";
  serverId: string;
  serverName: string;
  value?: number;
};

const WARNING_THRESHOLD = 80;

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

export function SystemAlerts({ servers }: SystemAlertsProps) {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const checkAlerts = useCallback(async () => {
    if (servers.length === 0) {
      setAlerts([]);
      return;
    }

    try {
      const resources = await getAllServersResources();
      const newAlerts: Alert[] = [];

      servers.forEach((server) => {
        const res: ServerResourceInfo = resources[server.id] || {
          status: "not_found",
          cpuUsage: "N/A",
          memoryUsage: "N/A",
          memoryLimit: "N/A",
          cpuLimit: "1",
          memoryConfigLimit: "4G",
        };

        const serverName = server.serverName || server.id;

        if (res.status === "running") {
          const cpuUsage = parsePercentage(res.cpuUsage);
          const cpuLimit = parseCpuLimit(res.cpuLimit);
          const cpuPercent = cpuLimit > 0 ? (cpuUsage / (cpuLimit * 100)) * 100 : 0;

          const memoryUsed = parseMemorySize(res.memoryUsage);
          const memoryLimit = parseMemorySize(res.memoryConfigLimit);
          const memoryPercent = memoryLimit > 0 ? (memoryUsed / memoryLimit) * 100 : 0;

          if (cpuPercent >= WARNING_THRESHOLD) {
            newAlerts.push({
              id: `cpu-${server.id}`,
              type: "high_cpu",
              serverId: server.id,
              serverName,
              value: cpuPercent,
            });
          }

          if (memoryPercent >= WARNING_THRESHOLD) {
            newAlerts.push({
              id: `mem-${server.id}`,
              type: "high_memory",
              serverId: server.id,
              serverName,
              value: memoryPercent,
            });
          }
        }
      });

      setAlerts(newAlerts);
    } catch (error) {
      console.error("Error checking alerts:", error);
    }
  }, [servers]);

  useEffect(() => {
    checkAlerts();
    const interval = setInterval(checkAlerts, 30000);
    return () => clearInterval(interval);
  }, [checkAlerts]);

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts((prev) => new Set([...prev, alertId]));
  };

  const visibleAlerts = alerts.filter((alert) => !dismissedAlerts.has(alert.id));

  if (visibleAlerts.length === 0) return null;

  const getAlertConfig = (alert: Alert) => {
    switch (alert.type) {
      case "high_cpu":
        return {
          icon: Cpu,
          accent: "#f5c542",
          textColor: "text-yellow-300",
          message: t("alertHighCPU")
            .replace("{server}", alert.serverName)
            .replace("{value}", alert.value?.toFixed(0) || "0"),
        };
      case "high_memory":
        return {
          icon: Activity,
          accent: "#f0843c",
          textColor: "text-orange-300",
          message: t("alertHighMemory")
            .replace("{server}", alert.serverName)
            .replace("{value}", alert.value?.toFixed(0) || "0"),
        };
    }
  };

  return (
    <div className="space-y-2 animate-fade-in-up">
      {visibleAlerts.map((alert) => {
        const config = getAlertConfig(alert);
        const Icon = config.icon;

        return (
          <Link key={alert.id} href={`/dashboard/servers/${alert.serverId}`} className="block group">
            <div className="mc-slot flex items-center gap-3 p-3 transition-transform group-hover:translate-x-0.5" style={{ borderColor: config.accent }}>
              <AlertTriangle className={`w-5 h-5 ${config.textColor} shrink-0 animate-pulse`} />
              <Icon className={`w-4 h-4 ${config.textColor} shrink-0`} />
              <span className={`text-sm font-minecraft ${config.textColor} flex-1`}>{config.message}</span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dismissAlert(alert.id);
                }}
                className="p-1 hover:bg-black/40 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
