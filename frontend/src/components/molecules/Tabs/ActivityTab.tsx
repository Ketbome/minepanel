import { FC, useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { History, Loader2, LogIn, LogOut, MessageSquare, ScrollText, Skull, Terminal, Trophy } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import type { TranslationKey } from "@/lib/translations";
import { mcToast } from "@/lib/utils/minecraft-toast";
import { ActivityEvent, ActivitySettings, ActivityType, getActivityEvents, getActivitySettings, importActivityHistory, updateActivitySettings } from "@/services/activity/activity.service";

interface ActivityTabProps {
  serverId: string;
}

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

const TYPES: Array<{ type: ActivityType; label: TranslationKey; icon: typeof LogIn; color: string }> = [
  { type: "join", label: "eventJoin", icon: LogIn, color: "text-emerald-400" },
  { type: "leave", label: "eventLeave", icon: LogOut, color: "text-gray-400" },
  { type: "chat", label: "eventChat", icon: MessageSquare, color: "text-blue-400" },
  { type: "death", label: "eventDeath", icon: Skull, color: "text-red-400" },
  { type: "advancement", label: "eventAdvancement", icon: Trophy, color: "text-amber-400" },
  { type: "command", label: "eventCommand", icon: Terminal, color: "text-purple-400" },
];
const TYPE_META = Object.fromEntries(TYPES.map((meta) => [meta.type, meta]));

export const ActivityTab: FC<ActivityTabProps> = ({ serverId }) => {
  const { t, language } = useLanguage();
  const [settings, setSettings] = useState<ActivitySettings | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [types, setTypes] = useState<ActivityType[]>([]);
  const [name, setName] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    getActivitySettings(serverId)
      .then(setSettings)
      .catch(() => setSettings({ enabled: false, historyImported: false }));
  }, [serverId]);

  const load = useCallback(
    async (before?: number) => {
      setLoading(true);
      try {
        const page = await getActivityEvents(serverId, { types, name: name.trim() || undefined, q: q.trim() || undefined, before, limit: PAGE_SIZE });
        setEvents((current) => (before ? [...current, ...page.events] : page.events));
        setNextCursor(page.nextCursor);
      } catch {
        mcToast.error(t("activityLoadError"));
      } finally {
        setLoading(false);
      }
    },
    [serverId, types, name, q, t],
  );

  useEffect(() => {
    const timer = setTimeout(() => load(), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [load]);

  const toggleTracking = async (enabled: boolean) => {
    setSaving(true);
    try {
      setSettings(await updateActivitySettings(serverId, enabled));
    } catch {
      mcToast.error(t("activityLoadError"));
    } finally {
      setSaving(false);
    }
  };

  const importHistory = async () => {
    setImporting(true);
    try {
      const result = await importActivityHistory(serverId);
      mcToast.success(`${t("historyImported")}: ${result.imported}`);
      setSettings((current) => (current ? { ...current, historyImported: true } : current));
      load();
    } catch {
      mcToast.error(t("activityLoadError"));
    } finally {
      setImporting(false);
    }
  };

  const toggleType = (type: ActivityType) => setTypes((current) => (current.includes(type) ? current.filter((value) => value !== type) : [...current, type]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-emerald-400" />
          {t("activity")}
        </CardTitle>
        <CardDescription>{t("activityTabDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-start gap-4 p-3 bg-gray-800/50 border border-gray-700/50">
          <div className="flex-1 min-w-[240px]">
            <p className="text-sm text-gray-200 font-minecraft">{t("activityTracking")}</p>
            <p className="text-xs text-gray-400">{t("activityTrackingDesc")}</p>
          </div>
          <Switch checked={Boolean(settings?.enabled)} disabled={!settings || saving} onCheckedChange={toggleTracking} className="data-[state=checked]:bg-emerald-500" />
          {settings?.enabled && !settings.historyImported && (
            <Button type="button" size="sm" variant="outline" onClick={importHistory} disabled={importing} title={t("importHistoryDesc")}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
              {t("importHistory")}
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {TYPES.map(({ type, label, icon: Icon, color }) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={`flex items-center gap-1 px-2 py-0.5 text-xs border ${types.includes(type) ? "border-emerald-500 text-emerald-300 bg-emerald-600/20" : "border-gray-700 text-gray-400 hover:text-gray-200"}`}
              >
                <Icon className={`h-3 w-3 ${color}`} />
                {t(label)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("playerName")} className="h-8 text-sm max-w-[200px]" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="h-8 text-sm" />
          </div>
        </div>

        {events.length === 0 && !loading ? (
          <p className="text-gray-500 text-sm py-8 text-center">{settings?.enabled ? t("noActivity") : t("activityDisabled")}</p>
        ) : (
          <ul className="border border-gray-700/50 divide-y divide-gray-800 max-h-[600px] overflow-auto text-sm">
            {events.map((event) => {
              const meta = TYPE_META[event.type];
              const Icon = meta.icon;
              return (
                <li key={event.id} className="flex items-start gap-2 px-3 py-1.5">
                  <span className="text-xs text-gray-500 tabular-nums shrink-0 w-36">{new Date(event.createdAt).toLocaleString(language)}</span>
                  <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${meta.color}`} />
                  <span className="text-gray-100 shrink-0">{event.name}</span>
                  <span className="text-gray-400 break-words min-w-0">{event.type === "chat" || event.type === "command" || event.type === "advancement" ? event.message : event.type === "death" ? event.message.slice(event.name.length + 1) : t(meta.label)}</span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex justify-center">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : (
            nextCursor && (
              <Button type="button" variant="ghost" size="sm" onClick={() => load(nextCursor)}>
                {t("loadMore")}
              </Button>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
};
