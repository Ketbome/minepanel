"use client";

import { memo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricPoint } from "@/services/metrics/metrics.service";
import { useLanguage } from "@/lib/hooks/useLanguage";

type Metric = "tps" | "msptMean" | "msptMedian" | "msptP95" | "cpuPercent" | "memoryMb" | "playersOnline";

interface Props {
  title: string;
  description: string;
  points: MetricPoint[];
  metric: Metric;
  unit?: string;
  reference?: number;
}

export const MonitoringChart = memo(function MonitoringChart({ title, description, points, metric, unit = "", reference }: Props) {
  const { t, language } = useLanguage();
  const [selected, setSelected] = useState<number | null>(null);
  const valid = points.filter((point) => point[metric] !== null && Number.isFinite(point[metric]));
  const ceiling = valid.reduce((max, point) => Math.max(max, point[metric]!), reference ?? 1) * 1.1;
  const first = points[0];
  const last = points.at(-1);
  const start = first ? Date.parse(first.timestamp) : 0;
  const span = last ? Math.max(60_000, Date.parse(last.timestamp) - start) : 1;
  const x = (point: MetricPoint) => 8 + ((Date.parse(point.timestamp) - start) / span) * 584;
  const y = (value: number) => 148 - (value / ceiling) * 136;
  let connected = false;
  let previousTime = 0;
  const path = points.map((point) => {
    const value = point[metric];
    const time = Date.parse(point.timestamp);
    if (value === null || !Number.isFinite(value)) {
      connected = false;
      return "";
    }
    // Leave holes for missing probes and server downtime, instead of implying continuity.
    const command = connected && time - previousTime <= 90_000 ? "L" : "M";
    connected = true;
    previousTime = time;
    return `${command}${x(point).toFixed(1)},${y(value).toFixed(1)}`;
  }).join(" ");
  const current = selected !== null ? points[selected] : last;
  const format = (value: number | null | undefined) => value == null ? "—" : `${value.toFixed(metric === "playersOnline" ? 0 : 1)}${unit}`;
  const time = (timestamp: string) => new Date(timestamp).toLocaleString(language, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          <span className="font-mono text-lg tabular-nums">{format(current?.[metric])}</span>
        </div>
        <CardDescription className="text-gray-400">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {valid.length === 0 ? <p className="flex h-40 items-center justify-center text-sm text-gray-400">{t("metricsEmpty")}</p> : (
          <>
            <svg viewBox="0 0 600 160" className="h-40 w-full text-emerald-400" preserveAspectRatio="none" role="img" aria-label={`${title}: ${format(current?.[metric])}`}>
              {[0, ceiling / 2, ceiling].map((value) => <line key={value} x1="8" x2="592" y1={y(value)} y2={y(value)} stroke="currentColor" opacity="0.12" />)}
              {reference !== undefined && <line x1="8" x2="592" y1={y(reference)} y2={y(reference)} stroke="currentColor" strokeDasharray="5 5" opacity="0.5" />}
              <path d={path} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              {valid.length === 1 && <circle cx={x(valid[0])} cy={y(valid[0][metric]!)} r="3" fill="currentColor" />}
              {selected !== null && current && current[metric] !== null && <circle cx={x(current)} cy={y(current[metric]!)} r="4" fill="currentColor" />}
            </svg>
            <div className="flex justify-between gap-2 text-xs text-gray-400"><span>{first && time(first.timestamp)}</span><span>{last && time(last.timestamp)}</span></div>
            <input type="range" min={0} max={Math.max(0, points.length - 1)} value={selected ?? Math.max(0, points.length - 1)} onChange={(event) => setSelected(Number(event.target.value))} aria-label={title} aria-valuetext={current ? `${time(current.timestamp)}: ${format(current[metric])}` : "—"} className="w-full accent-emerald-400" />
            <div className="flex flex-wrap justify-between gap-2 text-xs text-gray-400"><span>{current && time(current.timestamp)}{current?.tickSource && ["tps", "msptMean", "msptP95"].includes(metric) ? ` · ${current.tickSource}` : ""}</span><span>0–{ceiling.toFixed(0)}{unit}{reference !== undefined ? ` · ${t("monitoringReference")}: ${reference}${unit}` : ""}</span></div>
          </>
        )}
      </CardContent>
    </Card>
  );
});
