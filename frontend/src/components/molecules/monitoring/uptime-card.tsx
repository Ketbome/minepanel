"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { UptimeReport } from "@/services/metrics/metrics.service";

const barColor = (percent: number | null) => percent == null ? "bg-gray-700" : percent >= 99.9 ? "bg-emerald-500" : percent >= 95 ? "bg-amber-400" : "bg-red-500";
const windowLabel = (hours: number) => hours === 24 ? "24h" : `${hours / 24}d`;
const duration = (minutes: number) => minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

export function UptimeCard({ report }: Readonly<{ report: UptimeReport | null }>) {
  const { t, language } = useLanguage();
  const hasData = report?.windows.some((window) => window.uptimePercent != null) ?? false;

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="gap-2">
        <CardTitle className="text-sm">{t("uptimeTitle")}</CardTitle>
        <CardDescription className="text-gray-400">{hasData ? t("uptimeHelp") : t("uptimeNoData")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-3">
          {report?.windows.map((window) => (
            <div key={window.hours} className="flex flex-col gap-1">
              <span className="text-xs text-gray-400">{windowLabel(window.hours)}</span>
              <span className="font-mono text-2xl tabular-nums">{window.uptimePercent == null ? "—" : `${window.uptimePercent}%`}</span>
              <span className="text-xs text-gray-400">{Math.round(window.observedMinutes / 60)}h {t("uptimeObserved")}</span>
            </div>
          ))}
        </div>

        {report && (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-gray-400">{t("uptimeDaily")}</span>
            <ul className="flex h-10 items-end gap-0.5" aria-label={t("uptimeDaily")}>
              {report.daily.map((day) => (
                <li key={day.date} title={`${day.date} · ${day.uptimePercent == null ? t("uptimeDayNoData") : `${day.uptimePercent}%`}`} aria-label={`${day.date} ${day.uptimePercent ?? t("uptimeDayNoData")}`} className={`min-w-0 flex-1 rounded-sm ${barColor(day.uptimePercent)}`} style={{ height: day.uptimePercent == null ? "30%" : `${Math.max(20, day.uptimePercent)}%` }} />
              ))}
            </ul>
          </div>
        )}

        {report && (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-gray-400">{t("uptimeIncidents")}</span>
            {report.incidents.length === 0 ? <p className="text-sm text-gray-400">{t("uptimeNoIncidents")}</p> : (
              <ul className="flex flex-col divide-y divide-gray-800 text-sm">
                {report.incidents.map((incident) => (
                  <li key={incident.start} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1.5">
                    <span className="font-mono text-xs tabular-nums">{new Date(incident.start).toLocaleString(language)}</span>
                    <span className="text-gray-300">{duration(incident.minutes)}{incident.end == null ? ` · ${t("uptimeOngoing")}` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
