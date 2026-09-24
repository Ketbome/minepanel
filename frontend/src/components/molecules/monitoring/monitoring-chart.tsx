"use client";

import { memo, useId, useState, type PointerEvent, type ReactNode } from "react";
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
  const valid = points.filter((point) => point[metric] !== null && Number.isFinite(point[metric]));
  const maximum = valid.reduce((max, point) => Math.max(max, point[metric]!), 0);
  const minimum = valid.reduce((min, point) => Math.min(min, point[metric]!), Infinity);
  const scale = metric === "memoryMb" ? 1024 : 1;
  const displayUnit = metric === "memoryMb" ? " GiB" : unit;
  const upper = Math.max(maximum, reference ?? 0, 1) / scale;
  const magnitude = 10 ** Math.floor(Math.log10(upper));
  const ceiling = Math.ceil(upper / magnitude / 0.5) * magnitude * 0.5 * scale;
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
  const current = last;
  const format = (value: number | null | undefined) => value == null ? "—" : `${(value / scale).toLocaleString(language, { maximumFractionDigits: metric === "playersOnline" ? 0 : 1 })}${displayUnit}`;
  const time = (timestamp: string) => new Date(timestamp).toLocaleString(language, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <Card className="min-w-0 gap-4">
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm">{title}</CardTitle>
          <div className="text-right"><span className="block text-[10px] uppercase tracking-wider text-gray-400">{t("monitoringLatest")}</span><span className="font-mono text-2xl tabular-nums text-emerald-400">{format(current?.[metric])}</span></div>
        </div>
        <CardDescription className="min-h-10 text-xs leading-5 text-gray-400">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {valid.length === 0 ? <p className="flex h-40 items-center justify-center text-sm text-gray-400">{t("metricsEmpty")}</p> : (
          <>
            <div className="flex gap-3 border-y border-gray-700/60 bg-gray-950/30 py-3">
              <div aria-hidden="true" className="flex w-14 shrink-0 flex-col justify-between py-2 text-right font-mono text-[10px] tabular-nums text-gray-400">
                {[ceiling, ceiling / 2, 0].map((value) => <span key={value}>{(value / scale).toLocaleString(language, { maximumFractionDigits: 1 })}</span>)}
              </div>
              <ChartProbe points={points} metric={metric} title={title} ceiling={ceiling} start={start} span={span} format={format} time={time}>
              <svg viewBox="0 0 600 160" className="h-40 w-full text-emerald-400" preserveAspectRatio="none" role="img" aria-label={`${title}: ${format(current?.[metric])}`}>
                {[0, ceiling / 2, ceiling].map((value) => <line key={value} x1="8" x2="592" y1={y(value)} y2={y(value)} stroke="currentColor" opacity="0.12" />)}
                {reference !== undefined && <line x1="8" x2="592" y1={y(reference)} y2={y(reference)} stroke="currentColor" strokeDasharray="5 5" opacity="0.5" />}
                <path d={path} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                {valid.length === 1 && <circle cx={x(valid[0])} cy={y(valid[0][metric]!)} r="3" fill="currentColor" />}
              </svg>
              </ChartProbe>
            </div>
            <div className="ml-17 flex justify-between gap-2 text-[10px] text-gray-400"><span>{first && time(first.timestamp)}</span><span className="text-right">{last && time(last.timestamp)}</span></div>
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-gray-700/60 pt-3 text-xs">
              <div><dt className="text-gray-400">{t("monitoringMinimum")}</dt><dd className="mt-1 font-mono tabular-nums">{format(minimum)}</dd></div>
              <div><dt className="text-gray-400">{t("monitoringMaximum")}</dt><dd className="mt-1 font-mono tabular-nums">{format(maximum)}</dd></div>
              {reference !== undefined && <div className="ml-auto text-right"><dt className="text-gray-400">{t("monitoringReference")}</dt><dd className="mt-1 font-mono tabular-nums">{format(reference)}</dd></div>}
            </dl>
          </>
        )}
      </CardContent>
    </Card>
  );
});


// Keep pointer updates local so moving over a week of samples never rebuilds the chart path.
function ChartProbe({ points, metric, title, ceiling, start, span, format, time, children }: {
  points: MetricPoint[];
  metric: Metric;
  title: string;
  ceiling: number;
  start: number;
  span: number;
  format: (value: number | null | undefined) => string;
  time: (timestamp: string) => string;
  children: ReactNode;
}) {
  const [timestamp, setTimestamp] = useState<string | null>(null);
  const tooltipId = useId();
  const nearestIndex = (target: number) => {
    let low = 0;
    let high = points.length - 1;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (Date.parse(points[middle].timestamp) < target) low = middle + 1;
      else high = middle;
    }
    return low > 0 && target - Date.parse(points[low - 1].timestamp) < Date.parse(points[low].timestamp) - target ? low - 1 : low;
  };
  const index = timestamp === null ? -1 : nearestIndex(Date.parse(timestamp));
  const point = index >= 0 && points[index]?.timestamp === timestamp ? points[index] : null;
  const value = point?.[metric];
  const position = point ? 8 + (Date.parse(point.timestamp) - start) / span * 584 : 0;

  const inspect = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const target = start + Math.max(0, Math.min(1, ((event.clientX - bounds.left) / bounds.width * 600 - 8) / 584)) * span;
    const nearest = points[nearestIndex(target)];
    // Do not project an old reading into a gap in the history.
    setTimestamp(nearest && Math.abs(Date.parse(nearest.timestamp) - target) <= 45_000 ? nearest.timestamp : null);
  };

  return (
    <div className="relative min-w-0 flex-1 outline-offset-4 focus-visible:outline-2 focus-visible:outline-emerald-400"
      tabIndex={0} role="group" aria-label={title} aria-describedby={point ? tooltipId : undefined}
      onPointerMove={inspect}
      onPointerDown={inspect}
      onPointerLeave={(event) => { if (event.pointerType !== "touch") setTimestamp(null); }}
      onPointerCancel={() => setTimestamp(null)}
      onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) setTimestamp(points.at(-1)?.timestamp ?? null); }}
      onBlur={() => setTimestamp(null)}
      onKeyDown={(event) => {
        if (event.key === "Escape") { setTimestamp(null); return; }
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? points.length - 1 : Math.max(0, Math.min(points.length - 1, (index < 0 ? points.length - 1 : index) + (event.key === "ArrowLeft" ? -1 : 1)));
        setTimestamp(points[next]?.timestamp ?? null);
      }}>
      {children}
      {point && <>
        <svg aria-hidden="true" viewBox="0 0 600 160" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-40 w-full text-emerald-400">
          <line x1={position} x2={position} y1="0" y2="160" stroke="currentColor" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          {value != null && Number.isFinite(value) && <circle cx={position} cy={148 - value / ceiling * 136} r="4" fill="currentColor" />}
        </svg>
        <div id={tooltipId} role="tooltip" className="pointer-events-none absolute -top-2 z-10 max-w-full border border-gray-600 bg-gray-950 px-3 py-2 text-xs shadow-md" style={position > 300 ? { right: 0 } : { left: 0 }}>
          <time dateTime={point.timestamp} className="block text-gray-300">{time(point.timestamp)}</time>
          <span className="mt-1 block font-mono tabular-nums text-emerald-400">{title}: {format(value)}</span>
        </div>
      </>}
    </div>
  );
}
