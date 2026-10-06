"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, RefreshCw, Cpu, MemoryStick, Users, Timer, Gauge } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { TranslationKey } from "@/lib/translations";
import { getServerMetrics, getServerMonitoring, getServerUptime, MetricPoint, MonitoringSnapshot, TickStatus, UptimeWindow } from "@/services/metrics/metrics.service";
import { MonitoringAlerts } from "../monitoring/monitoring-alerts";
import { MonitoringChart } from "../monitoring/monitoring-chart";
import { TickCommandCard } from "../monitoring/tick-command-card";
import { LINK_TPS } from "@/lib/providers/constants";
import { ServerConfig } from "@/lib/types/types";

// The states a change on the server can fix, as opposed to offline or Bedrock.
const SETUP_STATUSES: TickStatus[] = ["rcon_disabled", "spark_missing", "unavailable"];

const STATUS_KEYS: Record<TickStatus, TranslationKey> = {
  available: "monitoringConnected",
  offline: "monitoringOffline",
  unsupported: "monitoringUnsupported",
  rcon_disabled: "monitoringRconDisabled",
  spark_missing: "monitoringSparkMissing",
  custom_paused: "monitoringCustomPaused",
  unavailable: "monitoringUnavailable",
};

const number = (value: number | null | undefined, digits = 1) => value == null ? "—" : value.toFixed(digits);

// Reset view state when switching servers, including pending requests.
export interface MetricsTabProps {
  serverId: string;
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export function MetricsTab({ serverId, config, updateConfig }: MetricsTabProps) {
  return <MonitoringView key={serverId} serverId={serverId} config={config} updateConfig={updateConfig} />;
}

function MonitoringView({ serverId, config, updateConfig }: MetricsTabProps) {
  const { t, language } = useLanguage();
  const [hours, setHours] = useState(24);
  const [refresh, setRefresh] = useState(0);
  const [live, setLive] = useState<MonitoringSnapshot | null>(null);
  const [points, setPoints] = useState<MetricPoint[]>([]);
  const [liveError, setLiveError] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uptime, setUptime] = useState<UptimeWindow[]>([]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = await getServerMonitoring(serverId);
        if (active) { setLive(result); setLiveError(false); }
      } catch {
        if (active) { setLive(null); setLiveError(true); }
      } finally {
        if (active) timer = setTimeout(poll, 10_000);
      }
    };
    void poll();
    return () => { active = false; clearTimeout(timer); };
  }, [serverId, refresh]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    setPoints([]);
    setLoading(true);
    const poll = async () => {
      try {
        const result = await getServerMetrics(serverId, hours);
        if (active) { setPoints(result.points); setHistoryError(false); }
      } catch {
        if (active) setHistoryError(true);
      } finally {
        if (active) { setLoading(false); timer = setTimeout(poll, 60_000); }
      }
    };
    void poll();
    return () => { active = false; clearTimeout(timer); };
  }, [serverId, hours, refresh]);

  useEffect(() => {
    let active = true;
    getServerUptime(serverId).then((windows) => { if (active) setUptime(windows); }).catch(() => { if (active) setUptime([]); });
    return () => { active = false; };
  }, [serverId, refresh]);

  // Every source except spark reports a mean MSPT; only NeoForge's TPS is an estimate from it.
  const meanBased = live?.tickSource != null && live.tickSource !== "spark";
  const native = live?.tickSource === "neoforge";
  const meanHistory = meanBased || points.some((point) => point.tickSource != null && point.tickSource !== "spark");
  // A window spanning a source change mixes statistics: spark has no mean, so its P95 fills the gap.
  const mixedHistory = meanHistory && points.some((point) => point.tickSource === "spark");
  const msptPoints = useMemo(() => mixedHistory ? points.map((point) => point.tickSource === "spark" ? { ...point, msptMean: point.msptP95 } : point) : points, [mixedHistory, points]);
  const nativeHistory = native || points.some((point) => point.tickSource === "neoforge");
  const cards = [
    { icon: Gauge, label: native ? t("monitoringEstimatedTps") : "TPS", value: number(live?.tps), help: native ? t("monitoringNativeHelp") : live?.tickSource === "spark" ? t("monitoringTpsWindow") : t("monitoringTpsDefault") },
    { icon: Timer, label: "MSPT", value: `${number(meanBased ? live?.msptMean : live?.msptMedian)} ms`, help: meanBased ? t("monitoringMeanHelp") : `${t("monitoringMsptWindow")} · P95 ${number(live?.msptP95)} ms` },
    { icon: Cpu, label: t("metricsCpu"), value: `${number(live?.cpuPercent)}%`, help: t("monitoringCpuHelp") },
    { icon: MemoryStick, label: t("metricsMemory"), value: `${number(live?.memoryMb == null ? null : live.memoryMb / 1024, 2)} GiB`, help: t("monitoringMemoryHelp") },
    { icon: Users, label: t("players"), value: `${number(live?.playersOnline, 0)} / ${number(live?.playersMax, 0)}`, help: `${t("uptime")}: ${live?.uptimeSeconds == null ? "—" : `${Math.floor(live.uptimeSeconds / 3600)}h ${Math.floor((live.uptimeSeconds % 3600) / 60)}m`}` },
  ];

  return (
    <div className="flex flex-col gap-6 text-gray-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 font-minecraft text-xl"><Activity className="size-5" />{t("monitoringTitle")}</h2>
          <p className="max-w-2xl text-sm text-gray-400">{t("monitoringDescription")}</p>
          <p className="text-xs text-gray-400">{t("monitoringCadence")}{live ? ` · ${new Date(live.timestamp).toLocaleTimeString(language)}` : ""}</p>
        </div>
        <Button variant="outline" size="sm" className="bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-gray-100" onClick={() => setRefresh((value) => value + 1)} disabled={loading}><RefreshCw className="size-4" />{t("refresh")}</Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label} className="gap-3 py-4">
            <CardHeader className="gap-3 px-4"><CardDescription className="flex items-center gap-2 text-xs text-gray-300"><card.icon className="size-4 shrink-0 text-emerald-400" />{card.label}</CardDescription><CardTitle className="break-words font-mono text-3xl tracking-tight tabular-nums">{card.value}</CardTitle></CardHeader>
            <CardContent className="px-4"><p className="text-xs leading-5 text-gray-400">{card.help}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card className="gap-3 py-4">
        <CardHeader className="gap-2"><CardTitle className="text-sm">{t("uptimeTitle")}</CardTitle><CardDescription className="text-gray-400">{uptime.some((w) => w.uptimePercent != null) ? t("uptimeHelp") : t("uptimeNoData")}</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          {uptime.map((w) => (
            <div key={w.hours} className="flex flex-col gap-1">
              <span className="text-xs text-gray-400">{w.hours === 24 ? "24h" : `${w.hours / 24}d`}</span>
              <span className="font-mono text-2xl tabular-nums">{w.uptimePercent == null ? "—" : `${w.uptimePercent}%`}</span>
              <span className="text-xs text-gray-500">{Math.round(w.observedMinutes / 60)}h {t("uptimeObserved")}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="gap-3 py-4">
        <CardHeader className="gap-2"><CardTitle className="text-sm">{t("monitoringSource")}{live?.tickSource ? ` · ${live.tickSource}` : ""}</CardTitle><CardDescription role="status" className="text-gray-400">{liveError ? t("monitoringFetchError") : live ? t(STATUS_KEYS[live.tickStatus]) : t("loading")}</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p className="text-gray-400">{t("monitoringTickHelp")}</p>
          {live && SETUP_STATUSES.includes(live.tickStatus) && (
            <p>{live.tickStatus === "spark_missing" && `${t("monitoringSetup")} `}<a href={LINK_TPS} target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">{t("monitoringTpsDocs")}</a></p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-minecraft">{t("monitoringHistory")}</h3>
        <label className="flex items-center gap-2 text-sm text-gray-400">{t("monitoringRange")}
          <select className="mc-input px-3 py-2" value={hours} onChange={(event) => setHours(Number(event.target.value))}>
            {[1, 6, 24, 72, 168].map((range) => <option key={range} value={range}>{range}h</option>)}
          </select>
        </label>
      </div>
      {historyError && <p role="alert" className="text-sm text-destructive">{t("monitoringHistoryError")}</p>}
      {loading ? <p role="status" className="py-8 text-center text-gray-400">{t("loading")}</p> : (
        <div key={hours} className="grid gap-4 lg:grid-cols-2">
          <MonitoringChart title={nativeHistory ? t("monitoringEstimatedTps") : "TPS"} description={t(nativeHistory ? "monitoringNativeHelp" : "monitoringTpsWindow")} points={points} metric="tps" reference={20} />
          <MonitoringChart title={mixedHistory ? "MSPT · mean / P95" : meanHistory ? "MSPT" : "MSPT · P95"} description={mixedHistory ? `${t("monitoringMeanHelp")} · ${t("monitoringP95Help")}` : t(meanHistory ? "monitoringMeanHelp" : "monitoringP95Help")} points={msptPoints} metric={meanHistory ? "msptMean" : "msptP95"} unit=" ms" reference={50} />
          <MonitoringChart title={t("metricsCpu")} description={t("monitoringCpuHelp")} points={points} metric="cpuPercent" unit="%" />
          <MonitoringChart title={t("metricsMemory")} description={t("monitoringMemoryHelp")} points={points} metric="memoryMb" unit=" MiB" />
          <MonitoringChart title={t("players")} description={t("monitoringPlayersHelp")} points={points} metric="playersOnline" />
        </div>
      )}
      <TickCommandCard serverId={serverId} config={config} updateConfig={updateConfig} />
      <MonitoringAlerts serverId={serverId} />
    </div>
  );
}
