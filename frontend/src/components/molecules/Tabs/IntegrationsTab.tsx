import { FC, useEffect, useState } from "react";
import { AlertTriangle, Info, Loader2, Plus, Send, ShieldAlert, Trash2, Webhook } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/lib/hooks/useLanguage";
import type { TranslationKey } from "@/lib/translations";
import { mcToast } from "@/lib/utils/minecraft-toast";
import { getCurrentUser } from "@/services/users/users.service";
import { getActivitySettings } from "@/services/activity/activity.service";
import {
  DISCORD_ACTIVITY_EVENTS,
  DISCORD_OPERATIONAL_EVENTS,
  DiscordIntegrationState,
  createDiscordWebhook,
  deleteDiscordWebhook,
  getDiscordIntegration,
  saveDiscordRoutes,
  testDiscordWebhook,
} from "@/services/discord/discord.service";

const DISCORD_WEBHOOK_PATTERN = /^https:\/\/(?:discord|discordapp)\.com\/api\/webhooks\/\d{17,20}\/[A-Za-z0-9_-]+$/;

const ACTIVITY_LABELS: Record<(typeof DISCORD_ACTIVITY_EVENTS)[number], TranslationKey> = {
  chat: "eventChat",
  command: "eventCommand",
  join: "eventJoin",
  leave: "eventLeave",
  death: "eventDeath",
  advancement: "eventAdvancement",
  console: "eventConsole",
};

const OPERATIONAL_LABELS: Record<(typeof DISCORD_OPERATIONAL_EVENTS)[number], TranslationKey> = {
  down: "discordEventDown",
  crash: "discordEventCrash",
  cpu: "discordEventCpu",
  memory: "discordEventMemory",
  backup: "notificationBackup",
  task: "notificationTask",
  game: "notificationGame",
  stale: "notificationStale",
  recovery: "notificationRecovery",
  lifecycle: "lifecycle",
};

type RouteChoice = string; // 'off' | 'instance' | `hook:${id}`

const choiceFor = (state: DiscordIntegrationState, key: string, operational: boolean): RouteChoice => {
  if (!(key in state.routes)) return operational ? "instance" : "off";
  const saved = state.routes[key];
  return saved === null ? "off" : `hook:${saved}`;
};

// Every select works from this one projection, so a response with fewer routes
// than were sent (an event turned back to the default) cannot leave a stale value.
const choicesFor = (state: DiscordIntegrationState): Record<string, RouteChoice> => Object.fromEntries([
  ...DISCORD_ACTIVITY_EVENTS.map((key) => [key, choiceFor(state, key, false)]),
  ...DISCORD_OPERATIONAL_EVENTS.map((key) => [key, choiceFor(state, key, true)]),
]);

interface IntegrationsTabProps {
  serverId: string;
}

/** Server -> Integrations: webhooks, per-event routing and the panel alerts that follow them. */
export const IntegrationsTab: FC<IntegrationsTabProps> = ({ serverId }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [state, setState] = useState<DiscordIntegrationState | null>(null);
  const [routes, setRoutes] = useState<Record<string, RouteChoice>>({});
  const [draft, setDraft] = useState({ name: "", url: "", shared: false });
  const [busy, setBusy] = useState<string | null>(null);
  const [tracking, setTracking] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = await getCurrentUser();
        if (!active) return;
        if (user.role !== "ADMIN") {
          setIsAdmin(false);
          return;
        }
        setIsAdmin(true);
        const integration = await getDiscordIntegration(serverId);
        if (!active) return;
        setState(integration);
        setRoutes(choicesFor(integration));
        getActivitySettings(serverId).then((settings) => active && setTracking(settings.enabled)).catch(() => active && setTracking(null));
      } catch {
        if (active) mcToast.error(t("discordWebhookSaveFailed"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  const reload = async () => {
    const integration = await getDiscordIntegration(serverId);
    setState(integration);
    setRoutes(choicesFor(integration));
  };

  const urlInvalid = draft.url.trim() !== "" && !DISCORD_WEBHOOK_PATTERN.test(draft.url.trim());

  const addWebhook = async () => {
    if (!draft.name.trim() || !draft.url.trim() || urlInvalid) return;
    setBusy("add");
    try {
      await createDiscordWebhook(serverId, { name: draft.name.trim(), url: draft.url.trim(), shared: draft.shared });
      setDraft({ name: "", url: "", shared: false });
      await reload();
      mcToast.success(t("discordWebhookAdded"));
    } catch {
      mcToast.error(t("discordWebhookSaveFailed"));
    } finally {
      setBusy(null);
    }
  };

  const removeWebhook = async (id: number) => {
    if (!window.confirm(`${t("discordWebhookDelete")}?`)) return;
    setBusy(`delete:${id}`);
    try {
      await deleteDiscordWebhook(serverId, id);
      await reload();
      mcToast.success(t("discordWebhookRemoved"));
    } catch {
      mcToast.error(t("discordWebhookSaveFailed"));
    } finally {
      setBusy(null);
    }
  };

  const testWebhook = async (id: number) => {
    setBusy(`test:${id}`);
    try {
      const result = await testDiscordWebhook(serverId, id);
      result.success ? mcToast.success(result.message) : mcToast.error(result.message);
    } catch {
      mcToast.error(t("discordWebhookSaveFailed"));
    } finally {
      setBusy(null);
    }
  };

  const saveRoutes = async () => {
    setBusy("routes");
    try {
      const payload: Record<string, number | null | "instance"> = {};
      for (const key of [...DISCORD_ACTIVITY_EVENTS, ...DISCORD_OPERATIONAL_EVENTS]) {
        const choice = routes[key];
        payload[key] = choice === "off" ? null : choice === "instance" ? "instance" : Number(choice.replace("hook:", ""));
      }
      const saved = await saveDiscordRoutes(serverId, payload);
      setState(saved);
      setRoutes(choicesFor(saved));
      mcToast.success(t("discordRoutesSaved"));
    } catch {
      mcToast.error(t("discordWebhookSaveFailed"));
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-gray-300">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t("loading")}
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            {t("discordAdminOnly")}
          </CardTitle>
          <CardDescription>{t("discordAdminOnlyDesc")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const webhooks = state?.webhooks ?? [];
  const routeGroups: Array<{ title: string; keys: string[]; labels: Record<string, TranslationKey>; operational: boolean }> = [
    { title: t("discordRoutesActivity"), keys: [...DISCORD_ACTIVITY_EVENTS], labels: ACTIVITY_LABELS, operational: false },
    { title: t("discordRoutesOperational"), keys: [...DISCORD_OPERATIONAL_EVENTS], labels: OPERATIONAL_LABELS, operational: true },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-emerald-400" />
            {t("discordWebhooksTitle")}
          </CardTitle>
          <CardDescription>{t("discordWebhooksDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="discord-webhook-name">{t("discordWebhookName")}</Label>
              <Input id="discord-webhook-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} maxLength={80} className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discord-webhook-url">{t("discordWebhookUrl")}</Label>
              <Input id="discord-webhook-url" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} type="password" placeholder="https://discord.com/api/webhooks/…" aria-invalid={urlInvalid} className={`bg-gray-800 text-white ${urlInvalid ? "border-red-500" : "border-gray-700"}`} />
              {urlInvalid ? (
                <p role="alert" className="flex items-start gap-1.5 text-xs text-red-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {t("discordWebhookInvalid")}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Switch id="discord-webhook-shared" checked={draft.shared} onCheckedChange={(shared) => setDraft({ ...draft, shared })} />
            <Label htmlFor="discord-webhook-shared">{t("discordWebhookShared")}</Label>
          </div>
          <p className="text-xs text-gray-400">{t("discordWebhookSharedHelp")}</p>
          <Button type="button" onClick={addWebhook} disabled={busy !== null || !draft.name.trim() || !draft.url.trim() || urlInvalid} className="bg-emerald-400 hover:bg-emerald-300 text-gray-950 font-minecraft">
            {busy === "add" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {t("discordWebhookAdd")}
          </Button>

          {webhooks.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">{t("discordNoWebhooks")}</p>
          ) : (
            <ul className="divide-y divide-gray-800 border border-gray-700/50">
              {webhooks.map((hook) => (
                <li key={hook.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <span className="text-gray-100 min-w-0 flex-1 truncate">{hook.name}</span>
                  <Badge variant="secondary">{hook.shared ? t("discordWebhookSharedBadge") : t("discordWebhookOwn")}</Badge>
                  <Button type="button" size="sm" variant="outline" onClick={() => testWebhook(hook.id)} disabled={busy !== null}>
                    {busy === `test:${hook.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {t("test")}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeWebhook(hook.id)} disabled={busy !== null} aria-label={t("discordWebhookDelete")}>
                    {busy === `delete:${hook.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("discordRoutesTitle")}</CardTitle>
          <CardDescription>{t("discordRoutesDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {tracking === false ? (
            <p className="flex items-start gap-2 text-xs text-amber-300">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t("discordRoutesTrackingHint")}
            </p>
          ) : null}

          {routeGroups.map(({ title, keys, labels, operational }) => (
            <fieldset key={title} className="space-y-3">
              <legend className="font-minecraft text-sm text-gray-200">{title}</legend>
              <div className="grid gap-3 md:grid-cols-2">
                {keys.map((key) => (
                  <div key={key} className="flex min-w-0 flex-col gap-1.5">
                    <Label htmlFor={`discord-route-${key}`} className="text-sm text-gray-300">{t(labels[key])}</Label>
                    <Select value={routes[key] ?? (operational ? "instance" : "off")} onValueChange={(value) => setRoutes((current) => ({ ...current, [key]: value }))}>
                      <SelectTrigger id={`discord-route-${key}`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operational ? <SelectItem value="instance">{t("discordRoutesInstance")}</SelectItem> : null}
                        <SelectItem value="off">{t("discordRoutesOff")}</SelectItem>
                        {webhooks.map((hook) => (
                          <SelectItem key={hook.id} value={`hook:${hook.id}`}>
                            {hook.name}{hook.shared ? ` · ${t("discordWebhookSharedBadge")}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </fieldset>
          ))}

          <Button type="button" onClick={saveRoutes} disabled={busy !== null} className="bg-emerald-400 hover:bg-emerald-300 text-gray-950 font-minecraft">
            {busy === "routes" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {busy === "routes" ? t("saving") : t("saveChanges")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
