import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Cpu, MemoryStick, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { getServerMetrics, MetricPoint } from "@/services/metrics/metrics.service";

interface MetricsTabProps {
  serverId: string;
}

const RANGES = [
  { hours: 1, label: "1h" },
  { hours: 6, label: "6h" },
  { hours: 24, label: "24h" },
  { hours: 72, label: "72h" },
];

const REFRESH_MS = 60_000;

interface SeriesChartProps {
  points: MetricPoint[];
  accessor: (point: MetricPoint) => number;
  color: string;
  unit: string;
  maxHint?: number;
}

const SeriesChart: FC<SeriesChartProps> = ({ points, accessor, color, unit, maxHint }) => {
  const width = 600;
  const height = 160;
  const padding = 8;

  const values = points.map(accessor);
  const maxValue = Math.max(maxHint ?? 0, ...values, 1);
  const minTs = new Date(points[0].timestamp).getTime();
  const maxTs = new Date(points[points.length - 1].timestamp).getTime();
  const tsRange = Math.max(1, maxTs - minTs);

  const coords = points.map((point) => {
    const x = padding + ((new Date(point.timestamp).getTime() - minTs) / tsRange) * (width - padding * 2);
    const y = height - padding - (accessor(point) / maxValue) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const linePath = coords.join(" ");
  const areaPath = `${padding},${height - padding} ${linePath} ${width - padding},${height - padding}`;
  const last = values[values.length - 1];

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-gray-400">
          {unit === "%" ? "0" : "0"} – {Math.round(maxValue)}
          {unit}
        </span>
        <span className="text-sm font-minecraft" style={{ color }}>
          {last.toFixed(unit === "%" ? 1 : 0)}
          {unit}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40" preserveAspectRatio="none">
        <polygon points={areaPath} fill={color} opacity={0.12} />
        <polyline points={linePath} fill="none" stroke={color} strokeWidth={2} />
      </svg>
    </div>
  );
};

export const MetricsTab: FC<MetricsTabProps> = ({ serverId }) => {
  const { t } = useLanguage();
  const [hours, setHours] = useState(24);
  const [points, setPoints] = useState<MetricPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const history = await getServerMetrics(serverId, hours);
      setPoints(history.points);
    } catch {
      setPoints([]);
    } finally {
      setLoading(false);
    }
  }, [serverId, hours]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const memoryLimit = useMemo(() => {
    const limits = points.map((point) => point.memoryLimitMb ?? 0).filter((value) => value > 0);
    return limits.length > 0 ? Math.max(...limits) : undefined;
  }, [points]);

  const hasData = points.length > 1;

  return (
    <div className="space-y-4">
      <Card className="bg-gray-900/60 border-gray-700/60">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 font-minecraft text-emerald-400">
                <Activity className="h-5 w-5" />
                {t("metricsTitle")}
              </CardTitle>
              <CardDescription className="text-gray-400">{t("metricsDescription")}</CardDescription>
            </div>
            <div className="flex items-center gap-1">
              {RANGES.map((range) => (
                <Button
                  key={range.hours}
                  type="button"
                  size="sm"
                  variant={hours === range.hours ? "default" : "outline"}
                  className={hours === range.hours ? "bg-emerald-600 hover:bg-emerald-500" : "border-gray-700 text-gray-300"}
                  onClick={() => setHours(range.hours)}
                >
                  {range.label}
                </Button>
              ))}
              <Button type="button" size="sm" variant="outline" className="border-gray-700 text-gray-300" onClick={fetchMetrics} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!hasData && <p className="text-sm text-gray-400 py-8 text-center">{t("metricsEmpty")}</p>}

          {hasData && (
            <>
              <div>
                <div className="flex items-center gap-2 mb-2 text-gray-300">
                  <Cpu className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-minecraft">{t("metricsCpu")}</span>
                </div>
                <SeriesChart points={points} accessor={(point) => point.cpuPercent} color="#34d399" unit="%" maxHint={100} />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2 text-gray-300">
                  <MemoryStick className="h-4 w-4 text-sky-400" />
                  <span className="text-sm font-minecraft">{t("metricsMemory")}</span>
                </div>
                <SeriesChart points={points} accessor={(point) => point.memoryMb} color="#38bdf8" unit="MB" maxHint={memoryLimit} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
