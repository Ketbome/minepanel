"use client";

import type { LucideIcon } from "lucide-react";
import { Activity, Clock, Cpu, Tag, Users } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { useServerRuntimeStats } from "@/lib/hooks/useServerRuntimeStats";
import { formatPercent, formatPlayers, getCpuPercent, getMemoryPercent, getUsageColor } from "@/lib/utils/server-runtime-stats";
import { formatUptime } from "@/services/system/system.service";

interface RuntimeChipProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: string;
  readonly className?: string;
  readonly color?: string;
}

// The label lives in the tooltip so the strip stays one line tall.
export function RuntimeChip({ icon: Icon, label, value, className = "", color }: RuntimeChipProps) {
  return (
    <span className={`mc-tag bg-gray-800/60 flex items-center gap-1.5 px-2 py-0.5 text-[11px] ${className}`} title={label} aria-label={`${label}: ${value}`}>
      <Icon className="h-3 w-3 shrink-0" style={color ? { color } : undefined} />
      <span className="font-mono text-gray-100 whitespace-nowrap">{value}</span>
    </span>
  );
}

interface ServerRuntimeChipsProps {
  readonly serverId: string;
  readonly serverStatus: string;
}

export function ServerRuntimeChips({ serverId, serverStatus }: ServerRuntimeChipsProps) {
  const { t } = useLanguage();
  const stats = useServerRuntimeStats(serverId, serverStatus);

  const cpuPercent = stats ? getCpuPercent(stats) : null;
  const memoryPercent = stats ? getMemoryPercent(stats) : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <RuntimeChip icon={Tag} label={t("version")} value={stats?.version || "—"} color="#7fb2ff" />
      <RuntimeChip icon={Users} label={t("players")} value={formatPlayers(stats)} color="#9dff3f" />
      <RuntimeChip icon={Clock} label={t("uptime")} value={stats?.uptimeSeconds === null || stats?.uptimeSeconds === undefined ? "—" : formatUptime(stats.uptimeSeconds)} color="#6fe3d4" />
      <RuntimeChip icon={Cpu} label={t("cpu")} value={formatPercent(cpuPercent)} color={cpuPercent === null ? undefined : getUsageColor(cpuPercent)} />
      <RuntimeChip icon={Activity} label={t("memory")} value={formatPercent(memoryPercent)} color={memoryPercent === null ? undefined : getUsageColor(memoryPercent)} />
    </div>
  );
}
