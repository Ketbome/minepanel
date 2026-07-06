import { FC, type MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Activity, Bell, Cpu, Loader2, MemoryStick, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { getServerMetrics, MetricPoint } from "@/services/metrics/metrics.service";
import { AlertConfig, getAlertConfig, updateAlertConfig } from "@/services/alerts/alerts.service";
import { mcToast } from "@/lib/utils/minecraft-toast";

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

const X_TICKS = 4;
const CHART_HEIGHT = 160;
const V_PADDING = 8;

interface SeriesChartProps {
  points: MetricPoint[];
  accessor: (point: MetricPoint) => number;
  color: string;
  unit: string;
  maxHint?: number;
}

const SeriesChart: FC<SeriesChartProps> = ({ points, accessor, color, unit, maxHint }) => {
  const width = 600;
  const [hover, setHover] = useState<number | null>(null);

  const values = points.map(accessor);
  const maxValue = Math.max(maxHint ?? 0, ...values, 1);
  const minTs = new Date(points[0].timestamp).getTime();
  const maxTs = new Date(points[points.length - 1].timestamp).getTime();
  const tsRange = Math.max(1, maxTs - minTs);
  const showDate = tsRange > 24 * 60 * 60 * 1000;

  const xFrac = (point: MetricPoint) => (new Date(point.timestamp).getTime() - minTs) / tsRange;
  const yPx = (value: number) => CHART_HEIGHT - V_PADDING - (value / maxValue) * (CHART_HEIGHT - V_PADDING * 2);

  const coords = points.map((point) => `${(xFrac(point) * width).toFixed(1)},${yPx(accessor(point)).toFixed(1)}`);
  const linePath = coords.join(" ");
  const areaPath = `0,${CHART_HEIGHT} ${linePath} ${width},${CHART_HEIGHT}`;
  const last = values[values.length - 1];

  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleString([], showDate ? { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" } : { hour: "2-digit", minute: "2-digit" });

  const handleMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < points.length; i++) {
      const distance = Math.abs(xFrac(points[i]) - frac);
      if (distance < best) {
        best = distance;
        nearest = i;
      }
    }
    setHover(nearest);
  };

  const tick = (index: number) => points[Math.round((index / (X_TICKS - 1)) * (points.length - 1))];
  const hovered = hover !== null ? points[hover] : null;
  const hoverLeft = hovered ? xFrac(hovered) * 100 : 0;
  const hoverTransform = hoverLeft > 75 ? "translateX(-100%)" : hoverLeft < 25 ? "translateX(0)" : "translateX(-50%)";

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-gray-400">
          0 – {Math.round(maxValue)}
          {unit}
        </span>
        <span className="text-sm font-minecraft" style={{ color }}>
          {last.toFixed(unit === "%" ? 1 : 0)}
          {unit}
        </span>
      </div>

      <div className="relative w-full" style={{ height: CHART_HEIGHT }} onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${width} ${CHART_HEIGHT}`} className="w-full h-40" preserveAspectRatio="none">
          <polygon points={areaPath} fill={color} opacity={0.12} />
          <polyline points={linePath} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>

        {hovered && (
          <>
            <div className="pointer-events-none absolute top-0 bottom-0 w-px bg-gray-500/60" style={{ left: `${hoverLeft}%` }} />
            <div className="pointer-events-none absolute h-2.5 w-2.5 rounded-full border-2 border-gray-900" style={{ left: `${hoverLeft}%`, top: yPx(accessor(hovered)), backgroundColor: color, transform: "translate(-50%, -50%)" }} />
            <div className="pointer-events-none absolute top-1 z-10 rounded-md border border-gray-700 bg-gray-900/95 px-2 py-1 text-xs whitespace-nowrap shadow-lg" style={{ left: `${hoverLeft}%`, transform: hoverTransform }}>
              <span className="font-minecraft" style={{ color }}>
                {accessor(hovered).toFixed(unit === "%" ? 1 : 0)}
                {unit}
              </span>
              <span className="text-gray-400"> · {formatTime(hovered.timestamp)}</span>
            </div>
          </>
        )}
      </div>

      <div className="mt-1 flex justify-between text-[10px] text-gray-500">
        {Array.from({ length: X_TICKS }, (_, index) => (
          <span key={index}>{formatTime(tick(index).timestamp)}</span>
        ))}
      </div>
    </div>
  );
};

const AlertsCard: FC<{ serverId: string }> = ({ serverId }) => {
  const { t } = useLanguage();
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    getAlertConfig(serverId)
      .then((data) => {
        if (mounted) setConfig(data);
      })
      .catch(() => {
        if (mounted) setConfig(null);
      });
    return () => {
      mounted = false;
    };
  }, [serverId]);

  if (!config) {
    return null;
  }

  const update = <K extends keyof AlertConfig>(field: K, value: AlertConfig[K]) => {
    setConfig((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const numberInput = (field: "cpuThresholdPercent" | "memoryThresholdPercent" | "sustainedMinutes" | "cooldownMinutes", label: string, max: number) => (
    <div className="space-y-1">
      <Label htmlFor={field} className="text-gray-300 text-xs">
        {label}
      </Label>
      <Input
        id={field}
        type="number"
        min={1}
        max={max}
        value={config[field]}
        onChange={(e) => update(field, Number(e.target.value))}
        className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
      />
    </div>
  );

  const save = async () => {
    setSaving(true);
    try {
      const saved = await updateAlertConfig(serverId, {
        downAlertEnabled: config.downAlertEnabled,
        resourceAlertEnabled: config.resourceAlertEnabled,
        cpuThresholdPercent: config.cpuThresholdPercent,
        memoryThresholdPercent: config.memoryThresholdPercent,
        sustainedMinutes: config.sustainedMinutes,
        cooldownMinutes: config.cooldownMinutes,
      });
      setConfig(saved);
      mcToast.success(t("alertsSaved"));
    } catch (error) {
      console.error("Error saving alert config:", error);
      mcToast.error(t("alertsSaveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-gray-900/60 border-gray-700/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-minecraft text-emerald-400">
          <Bell className="h-5 w-5" />
          {t("alertsTitle")}
        </CardTitle>
        <CardDescription className="text-gray-400">{t("alertsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch checked={config.downAlertEnabled} onCheckedChange={(checked) => update("downAlertEnabled", checked)} className="data-[state=checked]:bg-emerald-500" />
          <Label className="text-gray-200 text-sm">{t("downAlert")}</Label>
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={config.resourceAlertEnabled} onCheckedChange={(checked) => update("resourceAlertEnabled", checked)} className="data-[state=checked]:bg-emerald-500" />
          <Label className="text-gray-200 text-sm">{t("resourceAlert")}</Label>
        </div>

        {config.resourceAlertEnabled && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {numberInput("cpuThresholdPercent", t("cpuThreshold"), 100)}
            {numberInput("memoryThresholdPercent", t("memoryThreshold"), 100)}
            {numberInput("sustainedMinutes", t("sustainedMinutes"), 1440)}
            {numberInput("cooldownMinutes", t("cooldownMinutes"), 10080)}
          </div>
        )}

        <p className="text-xs text-gray-400">{t("alertsNeedWebhook")}</p>

        <Button type="button" size="sm" onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 text-white">
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          {t("saveAlerts")}
        </Button>
      </CardContent>
    </Card>
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
                  className={hours === range.hours ? "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/40" : "bg-gray-800/60 border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white"}
                  onClick={() => setHours(range.hours)}
                >
                  {range.label}
                </Button>
              ))}
              <Button type="button" size="sm" variant="outline" className="bg-gray-800/60 border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white" onClick={fetchMetrics} disabled={loading}>
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

      <AlertsCard serverId={serverId} />
    </div>
  );
};
