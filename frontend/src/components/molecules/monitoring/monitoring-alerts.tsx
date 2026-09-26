"use client";

import { FC, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { AlertConfig, getAlertConfig, updateAlertConfig } from "@/services/alerts/alerts.service";
import { mcToast } from "@/lib/utils/minecraft-toast";

export const MonitoringAlerts: FC<{ serverId: string }> = ({ serverId }) => {
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

        <Button type="button" size="sm" onClick={save} disabled={saving} className="bg-emerald-400 hover:bg-emerald-300 text-gray-950">
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          {t("saveAlerts")}
        </Button>
      </CardContent>
    </Card>
  );
};

