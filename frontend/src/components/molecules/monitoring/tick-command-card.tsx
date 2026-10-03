"use client";

import { FC, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Terminal } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { useConfigMode } from "@/lib/hooks/useConfigMode";
import { ServerConfig } from "@/lib/types/types";
import { updateTickCommand } from "@/services/docker/fetchs";
import { getCurrentUser } from "@/services/users/users.service";
import { testTickCommand, TickTestResult } from "@/services/metrics/metrics.service";
import { mcToast } from "@/lib/utils/minecraft-toast";

interface TickCommandCardProps {
  serverId: string;
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

// Commands the panel has a built-in reader for; picking one needs no patterns.
const PRESETS = [
  { value: "tabtps", label: "TabTPS (tickinfo)", command: "tickinfo" },
  { value: "neoforge", label: "NeoForge (neoforge tps)", command: "neoforge tps" },
  { value: "spark", label: "spark (spark tps)", command: "spark tps" },
] as const;

type Choice = "auto" | "custom" | (typeof PRESETS)[number]["value"];

const choiceFor = (config: ServerConfig): Choice => {
  const command = config.tickCommand?.trim();
  if (!command) return "auto";
  const preset = PRESETS.find((candidate) => candidate.command === command);
  return preset && !config.tickTpsPattern && !config.tickMsptPattern ? preset.value : "custom";
};

// Admin only, like the endpoints behind it: the command runs on every metrics poll.
export const TickCommandCard: FC<TickCommandCardProps> = ({ serverId, config, updateConfig }) => {
  const { t } = useLanguage();
  const { mode } = useConfigMode();
  const [isAdmin, setIsAdmin] = useState(false);
  const [choice, setChoice] = useState<Choice>(() => choiceFor(config));
  const [command, setCommand] = useState(config.tickCommand ?? "");
  const [tpsPattern, setTpsPattern] = useState(config.tickTpsPattern ?? "");
  const [msptPattern, setMsptPattern] = useState(config.tickMsptPattern ?? "");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<TickTestResult | null>(null);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((user) => { if (active) setIsAdmin(user.role === "ADMIN"); })
      .catch(() => { if (active) setIsAdmin(false); });
    return () => { active = false; };
  }, []);

  if (!isAdmin) return null;

  // Patterns are an Advanced-mode tool, but saved ones stay visible so nothing in effect is hidden.
  const showPatterns = choice === "custom" && (mode === "advanced" || Boolean(tpsPattern.trim() || msptPattern.trim()));

  const handleChoice = (next: Choice) => {
    setChoice(next);
    setResult(null);
    if (next === "custom") return;
    setCommand(PRESETS.find((candidate) => candidate.value === next)?.command ?? "");
    setTpsPattern("");
    setMsptPattern("");
  };

  const draft = { tickCommand: command.trim(), tickTpsPattern: tpsPattern.trim() || undefined, tickMsptPattern: msptPattern.trim() || undefined };

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      setResult(await testTickCommand(serverId, draft));
    } catch {
      mcToast.error(t("error"));
    } finally {
      setTesting(false);
    }
  };

  // An empty command clears the custom setup and returns to the built-in probes.
  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await updateTickCommand(serverId, { tickCommand: draft.tickCommand, tickTpsPattern: tpsPattern.trim(), tickMsptPattern: msptPattern.trim() });
      updateConfig("tickCommand", saved.tickCommand);
      updateConfig("tickTpsPattern", saved.tickTpsPattern);
      updateConfig("tickMsptPattern", saved.tickMsptPattern);
      // The server normalizes what it stores (an empty command clears the patterns too), so show that.
      setChoice(choiceFor(saved));
      setCommand(saved.tickCommand ?? "");
      setTpsPattern(saved.tickTpsPattern ?? "");
      setMsptPattern(saved.tickMsptPattern ?? "");
      mcToast.success(t("save"));
    } catch {
      mcToast.error(t("error"));
    } finally {
      setSaving(false);
    }
  };

  const outcome = !result ? null
    : !result.success ? t("monitoringTestFailed")
    : !result.output.trim() ? t("monitoringTestEmpty")
    : !result.parsed ? t("monitoringTestNoMatch")
    : `${t("monitoringTestParsed")}: ${result.parsed.source} · TPS ${result.parsed.tps}${result.parsed.msptMean == null ? "" : ` · MSPT ${result.parsed.msptMean} ms`}`;

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2 text-sm"><Terminal className="size-4" />{t("monitoringCustomTitle")}</CardTitle>
        <CardDescription className="text-gray-400">{t("monitoringCustomHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex flex-col gap-1">
          <Label htmlFor="tick-preset">{t("monitoringPresetLabel")}</Label>
          <select id="tick-preset" className="mc-input px-3 py-2" value={choice} onChange={(event) => handleChoice(event.target.value as Choice)}>
            <option value="auto">{t("monitoringPresetAuto")}</option>
            {PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
            <option value="custom">{t("monitoringPresetCustom")}</option>
          </select>
        </div>
        {choice === "custom" && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="tick-command">{t("monitoringCommand")}</Label>
            <Input id="tick-command" value={command} maxLength={100} placeholder="tickinfo" onChange={(event) => setCommand(event.target.value)} />
          </div>
        )}
        {showPatterns && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="tick-tps-pattern">{t("monitoringTpsPattern")}</Label>
              <Input id="tick-tps-pattern" value={tpsPattern} maxLength={200} className="font-mono" placeholder="TPS: ([\d.]+)" onChange={(event) => setTpsPattern(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="tick-mspt-pattern">{t("monitoringMsptPattern")}</Label>
              <Input id="tick-mspt-pattern" value={msptPattern} maxLength={200} className="font-mono" placeholder="avg ([\d.]+)" disabled={!tpsPattern.trim()} onChange={(event) => setMsptPattern(event.target.value)} />
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" className="bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-gray-100" disabled={testing || !command.trim()} onClick={handleTest}>
            {testing && <Loader2 className="size-4 animate-spin" />}{t("monitoringRunTest")}
          </Button>
          <Button type="button" size="sm" disabled={saving} onClick={handleSave}>{saving && <Loader2 className="size-4 animate-spin" />}{t("save")}</Button>
        </div>
        {result && (
          <div role="status" className="flex flex-col gap-2">
            <p className={result.parsed ? "text-emerald-400" : "text-amber-300"}>{outcome}</p>
            {result.output.trim() && <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-black/40 p-3 font-mono text-xs text-gray-300">{result.output}</pre>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
