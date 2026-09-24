"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { TranslationKey } from "@/lib/translations";
import { getPlayerActivity, getPlayerDetail, PlayerActivity, PlayerDetail } from "@/services/player-activity/player-activity.service";

const duration = (seconds: number | null): string => seconds === null ? "—" : `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

function useActivityData<T>(fetchData: (signal: AbortSignal) => Promise<T>, dependencies: readonly unknown[]) {
  const [state, setState] = useState<{ data: T | null; error: boolean }>({ data: null, error: false });
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    setState({ data: null, error: false });
    const poll = async () => {
      try {
        const data = await fetchData(controller.signal);
        if (!controller.signal.aborted) setState({ data, error: false });
      } catch {
        if (!controller.signal.aborted) setState({ data: null, error: true });
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(poll, 30_000);
      }
    };
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
    // The request changes only when its server, player or page changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
  return state;
}

function Pager({ page, hasMore, onChange }: { page: number; hasMore: boolean; onChange: (page: number) => void }) {
  const { t } = useLanguage();
  return <div className="flex items-center justify-end gap-3">
    <Button type="button" variant="minepanelOutline" size="sm" disabled={page === 0} onClick={() => onChange(page - 1)}>{t("paPrevious")}</Button>
    <span className="text-sm tabular-nums">{page + 1}</span>
    <Button type="button" variant="minepanelOutline" size="sm" disabled={!hasMore} onClick={() => onChange(page + 1)}>{t("paNext")}</Button>
  </div>;
}

function Profile({ serverId, playerKey }: { serverId: string; playerKey: string }) {
  const { t, language } = useLanguage();
  const [page, setPage] = useState(0);
  const { data, error } = useActivityData<PlayerDetail>((signal) => getPlayerDetail(serverId, playerKey, page, signal), [serverId, playerKey, page]);
  const date = (value: string) => new Date(value).toLocaleString(language);
  if (!data) return <p role="status">{t(error ? "paError" : "loading")}</p>;
  const stats = data.stats;
  const fields: [TranslationKey, string | number][] = [
    ["paFirstSeen", date(data.profile.firstSeen)], ["paLastSeen", date(data.profile.lastSeen)],
    ["paRecordedTime", duration(data.profile.totalSeconds)], ["paSessions", data.profile.sessionCount],
  ];
  return <Card>
    <CardHeader><CardTitle>{data.profile.name}</CardTitle><CardDescription>{t("paIdentityNote")}</CardDescription></CardHeader>
    <CardContent className="flex flex-col gap-6">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {fields.map(([label, value]) => <div key={label}><dt className="text-sm text-muted-foreground">{t(label)}</dt><dd className="mt-1 tabular-nums">{value}</dd></div>)}
      </dl>
      <section className="flex flex-col gap-3" aria-label={t("paSavedStats")}>
        <h3 className="font-medium">{t("paSavedStats")}</h3>
        {stats ? <>
          <p className="text-sm text-muted-foreground">{stats.world} · {t("paUpdated")}: {date(stats.savedAt)}</p>
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {([
              ["paWorldTime", duration(stats.playSeconds)], ["paDeaths", stats.deaths ?? "—"],
              ["paMobKills", stats.mobKills ?? "—"], ["paPlayerKills", stats.playerKills ?? "—"], ["paBlocksMined", stats.blocksMined ?? "—"],
            ] as [TranslationKey, string | number][]).map(([label, value]) => <div key={label}><dt className="text-sm text-muted-foreground">{t(label)}</dt><dd className="mt-1 tabular-nums">{value}</dd></div>)}
          </dl>
          <p className="text-sm text-muted-foreground">{t("paStatsNote")}</p>
        </> : <p className="text-sm text-muted-foreground">{t("paStatsUnavailable")}</p>}
      </section>
      <section className="flex flex-col gap-3" aria-label={t("paSessions")}>
        <h3 className="font-medium">{t("paSessions")}</h3>
        <div className="overflow-x-auto"><table className="w-full text-sm [&_th]:text-left [&_th]:font-medium [&_th]:text-muted-foreground [&_th]:p-3 [&_td]:p-3 [&_td]:whitespace-nowrap [&_tr]:border-b"><thead><tr><th>{t("paJoined")}</th><th>{t("paLeft")}</th><th>{t("paDuration")}</th><th>{t("paStatus")}</th></tr></thead>
          <tbody>{data.sessions.map((session) => <tr key={session.id}>
            <td>{date(session.joinedAt)}</td><td>{session.leftAt ? date(session.leftAt) : "—"}</td>
            <td className="tabular-nums">{duration(session.durationSeconds)}</td>
            <td>{t(session.endReason === "interrupted" ? "paInterrupted" : session.endReason === "left" ? "paCompleted" : data.status === "collecting" ? "paActive" : "paUnknown")}</td>
          </tr>)}</tbody>
        </table></div>
        <Pager page={page} hasMore={data.hasMore} onChange={setPage} />
      </section>
    </CardContent>
  </Card>;
}

export function PlayerActivityTab({ serverId }: { serverId: string }) {
  const { t, language } = useLanguage();
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const { data, error } = useActivityData<PlayerActivity>((signal) => getPlayerActivity(serverId, page, signal), [serverId, page]);
  return <div className="flex flex-col gap-4">
    <Card>
      <CardHeader><CardTitle>{t("paTitle")}</CardTitle><CardDescription>{t("paDescription")}</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t("paTrackingNote")}</p>
        {data?.status === "unavailable" ? <p role="status">{t("paUnavailable")}</p> : null}
        {!data ? <p role="status">{t(error ? "paError" : "loading")}</p> : <>
          {data.players.length ? <div className="overflow-x-auto"><table className="w-full text-sm [&_th]:text-left [&_th]:font-medium [&_th]:text-muted-foreground [&_th]:p-3 [&_td]:p-3 [&_td]:whitespace-nowrap [&_tr]:border-b"><thead><tr><th>{t("paPlayer")}</th><th>{t("paStatus")}</th><th>{t("paLastSeen")}</th><th>{t("paRecordedTime")}</th><th>{t("paSessions")}</th></tr></thead>
            <tbody>{data.players.map((player) => <tr key={player.key} data-state={selected === player.key ? "selected" : undefined}>
              <td><Button type="button" variant="minepanelOutline" onClick={() => setSelected(player.key)} aria-pressed={selected === player.key}>{player.name}</Button></td>
              <td><Badge variant={player.online ? "default" : "secondary"}>{t(player.online === null ? "paUnknown" : player.online ? "paOnline" : "paOffline")}</Badge></td>
              <td>{new Date(player.lastSeen).toLocaleString(language)}</td><td className="tabular-nums">{duration(player.totalSeconds)}</td><td>{player.sessionCount}</td>
            </tr>)}</tbody>
          </table></div> : <p>{t("paEmpty")}</p>}
          <Pager page={page} hasMore={data.hasMore} onChange={setPage} />
        </>}
      </CardContent>
    </Card>
    {selected ? <Profile key={`${serverId}:${selected}`} serverId={serverId} playerKey={selected} /> : null}
  </div>;
}
