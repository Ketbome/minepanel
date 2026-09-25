import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, UserPlus, Users } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { mcToast } from "@/lib/utils/minecraft-toast";
import { executeServerCommand, getOnlinePlayers } from "@/services/docker/fetchs";
import { getPlayerProfile, getPlayers, PlayerProfile, PlayerSummary } from "@/services/players/players.service";
import { PlayerAvatar } from "../players/PlayerAvatar";
import { PlayerActions } from "../players/PlayerActions";
import { PlayerProfilePanel } from "../players/PlayerProfilePanel";
import { formatPlayTime } from "../players/player-format";

interface PlayersTabProps {
  serverId: string;
  serverStatus: string;
  rconPort: string;
  rconPassword: string;
}

type Filter = "all" | "online" | "whitelisted" | "op" | "banned";

interface PlayerRow {
  key: string;
  name: string;
  online: boolean;
  // Absent for players online for the first time, whose files are not written yet
  summary?: PlayerSummary;
}

const COMMAND_SETTLE_MS = 500;

export const PlayersTab: FC<PlayersTabProps> = ({ serverId, serverStatus, rconPort, rconPassword }) => {
  const { t } = useLanguage();
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [onlineNames, setOnlineNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [newPlayer, setNewPlayer] = useState("");

  const isRunning = serverStatus === "running";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, online] = await Promise.all([getPlayers(serverId), isRunning ? getOnlinePlayers(serverId, rconPort, rconPassword) : Promise.resolve(null)]);
      setPlayers(list);
      setOnlineNames(online?.players ?? []);
    } catch {
      mcToast.error(t("playersLoadError"));
    } finally {
      setLoading(false);
    }
  }, [serverId, isRunning, rconPort, rconPassword, t]);

  useEffect(() => {
    load();
  }, [load]);

  const loadProfile = useCallback(
    async (uuid: string) => {
      setLoadingProfile(true);
      try {
        setProfile(await getPlayerProfile(serverId, uuid));
      } catch {
        setProfile(null);
        mcToast.error(t("playersLoadError"));
      } finally {
        setLoadingProfile(false);
      }
    },
    [serverId, t],
  );

  useEffect(() => {
    if (selected) loadProfile(selected);
    else setProfile(null);
  }, [selected, loadProfile]);

  const rows = useMemo<PlayerRow[]>(() => {
    const online = new Set(onlineNames.map((name) => name.toLowerCase()));
    const known = players.map((summary) => ({
      key: summary.uuid,
      name: summary.name ?? summary.uuid,
      online: summary.name ? online.has(summary.name.toLowerCase()) : false,
      summary,
    }));
    const knownNames = new Set(known.map((row) => row.name.toLowerCase()));
    const newcomers = onlineNames.filter((name) => !knownNames.has(name.toLowerCase())).map((name) => ({ key: `online:${name}`, name, online: true }));
    return [...newcomers, ...known].sort((a, b) => Number(b.online) - Number(a.online));
  }, [players, onlineNames]);

  const counts: Record<Filter, number> = {
    all: rows.length,
    online: rows.filter((row) => row.online).length,
    whitelisted: rows.filter((row) => row.summary?.whitelisted).length,
    op: rows.filter((row) => row.summary?.op).length,
    banned: rows.filter((row) => row.summary?.banned).length,
  };

  const visible = rows.filter((row) => {
    if (query && !row.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (filter === "online") return row.online;
    if (filter === "all") return true;
    return Boolean(row.summary?.[filter]);
  });

  const runCommand = async (command: string, successMessage: string) => {
    const result = await executeServerCommand(serverId, { command, rconPort, rconPassword });
    if (!result.success) {
      mcToast.error(result.output);
      return;
    }
    mcToast.success(successMessage);
    setTimeout(() => {
      load();
      if (selected) loadProfile(selected);
    }, COMMAND_SETTLE_MS);
  };

  const addToWhitelist = () => {
    const name = newPlayer.trim();
    if (!name) return;
    runCommand(`whitelist add ${name}`, t("playerAddedToWhitelist"));
    setNewPlayer("");
  };

  const selectedRow = rows.find((row) => row.key === selected);
  const filters: Array<{ value: Filter; label: string }> = [
    { value: "all", label: t("filterAll") },
    { value: "online", label: t("online") },
    { value: "whitelisted", label: t("whitelist") },
    { value: "op", label: "OP" },
    { value: "banned", label: t("banned") },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-400" />
          {t("players")}
        </CardTitle>
        <CardDescription>{t("playersTabDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-[320px_1fr] gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex gap-2">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} className="h-8 text-sm" />
              <Button type="button" variant="ghost" size="sm" onClick={load} disabled={loading} title={t("refresh")}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {filters.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`px-2 py-0.5 text-xs border ${filter === value ? "border-emerald-500 text-emerald-300 bg-emerald-600/20" : "border-gray-700 text-gray-400 hover:text-gray-200"}`}
                >
                  {label} ({counts[value]})
                </button>
              ))}
            </div>
            {isRunning && (
              <div className="flex gap-2">
                <Input value={newPlayer} onChange={(e) => setNewPlayer(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addToWhitelist()} placeholder={t("playerName")} className="h-8 text-sm" />
                <Button type="button" size="sm" onClick={addToWhitelist} disabled={!newPlayer.trim()} title={t("addToWhitelist")}>
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            )}
            <ul className="max-h-[560px] overflow-auto space-y-1">
              {visible.length === 0 && <li className="text-gray-500 text-sm py-6 text-center">{t("noPlayersFound")}</li>}
              {visible.map((row) => (
                <li key={row.key} className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={!row.summary}
                    onClick={() => setSelected(row.key)}
                    className={`flex-1 min-w-0 flex items-center gap-2 p-2 text-left border ${selected === row.key ? "border-emerald-500 bg-emerald-600/10" : "border-transparent hover:bg-gray-800/60"}`}
                  >
                    <PlayerAvatar player={row.name} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        {row.online && <span className="h-2 w-2 bg-emerald-400 shrink-0" />}
                        <span className="text-sm text-gray-100 truncate">{row.name}</span>
                        {row.summary?.op && <span className="text-[10px] text-amber-300">OP</span>}
                        {row.summary?.banned && <span className="text-[10px] text-red-400">{t("banned")}</span>}
                      </span>
                      <span className="block text-xs text-gray-500 truncate">
                        {row.summary
                          ? `${row.summary.lastSeen ? new Date(row.summary.lastSeen).toLocaleDateString() : t("never")} · ${formatPlayTime(row.summary.stats.playTimeTicks)} · ${row.summary.advancements} ${t("advancements").toLowerCase()}`
                          : t("playerNoDataYet")}
                      </span>
                    </span>
                  </button>
                  {!row.summary && <PlayerActions name={row.name} online whitelisted={false} op={false} banned={false} disabled={!isRunning} onRun={runCommand} />}
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            <PlayerProfilePanel
              profile={profile}
              loading={loadingProfile}
              online={Boolean(selectedRow?.online)}
              actions={
                profile && (
                  <PlayerActions
                    name={profile.name ?? profile.uuid}
                    online={Boolean(selectedRow?.online)}
                    whitelisted={profile.whitelisted}
                    op={profile.op}
                    banned={profile.banned}
                    disabled={!isRunning || !profile.name}
                    onRun={runCommand}
                  />
                )
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
