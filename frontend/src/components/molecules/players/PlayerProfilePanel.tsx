import { FC, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { PlayerLocation, PlayerProfile } from "@/services/players/players.service";
import { PlayerAvatar } from "./PlayerAvatar";
import { PlayerInventory } from "./PlayerInventory";
import { formatDimension, formatDistance, formatPlayTime, humanizeId, idNamespace } from "./player-format";

interface PlayerProfilePanelProps {
  profile: PlayerProfile | null;
  loading: boolean;
  online: boolean;
  actions: React.ReactNode;
}

const StatCard: FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="p-3 bg-gray-800/50 border border-gray-700/50">
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-lg font-minecraft text-gray-100 tabular-nums">{value}</p>
  </div>
);

const formatLocation = (location: PlayerLocation | null) =>
  location ? `${formatDimension(location.dimension)} · ${Math.round(location.x)}, ${Math.round(location.y)}, ${Math.round(location.z)}` : "—";

export const PlayerProfilePanel: FC<PlayerProfilePanelProps> = ({ profile, loading, online, actions }) => {
  const { t } = useLanguage();
  const [category, setCategory] = useState("minecraft:custom");
  const [statsQuery, setStatsQuery] = useState("");

  const categories = useMemo(() => Object.keys(profile?.statsByCategory ?? {}).sort(), [profile]);
  const statRows = useMemo(() => {
    const values = profile?.statsByCategory[category] ?? {};
    const query = statsQuery.trim().toLowerCase();
    return Object.entries(values)
      .map(([key, value]) => ({ key, label: humanizeId(key), value }))
      .filter((row) => !query || row.label.toLowerCase().includes(query))
      .sort((a, b) => b.value - a.value);
  }, [profile, category, statsQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!profile) {
    return <p className="text-gray-500 text-sm py-16 text-center">{t("selectPlayer")}</p>;
  }

  const name = profile.name ?? profile.uuid;
  const done = profile.advancementList.filter((advancement) => advancement.done);
  const pending = profile.advancementList.filter((advancement) => !advancement.done);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <PlayerAvatar player={name} size={48} />
        <div className="min-w-0 flex-1">
          <p className="font-minecraft text-lg text-gray-100 truncate">{name}</p>
          <p className="text-xs text-gray-500 font-mono truncate">{profile.uuid}</p>
        </div>
        <div className="flex flex-wrap gap-1 justify-end">
          {online && <Badge className="bg-emerald-600/30 text-emerald-300">{t("online")}</Badge>}
          {profile.op && <Badge className="bg-amber-600/30 text-amber-300">OP {profile.opLevel}</Badge>}
          {profile.whitelisted && <Badge className="bg-blue-600/30 text-blue-300">{t("whitelist")}</Badge>}
          {profile.banned && <Badge className="bg-red-600/30 text-red-300">{t("banned")}</Badge>}
        </div>
        {actions}
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">{t("profile")}</TabsTrigger>
          <TabsTrigger value="statistics">{t("statistics")}</TabsTrigger>
          <TabsTrigger value="inventory">{t("inventory")}</TabsTrigger>
          <TabsTrigger value="advancements">{t("advancements")}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-3 pt-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatCard label={t("playTime")} value={formatPlayTime(profile.stats.playTimeTicks)} />
            <StatCard label={t("deaths")} value={profile.stats.deaths} />
            <StatCard label={t("mobKills")} value={profile.stats.mobKills} />
            <StatCard label={t("playerKills")} value={profile.stats.playerKills} />
            <StatCard label={t("distanceTraveled")} value={formatDistance(profile.stats.distanceCm)} />
            <StatCard label={t("blocksMined")} value={profile.stats.blocksMined} />
            <StatCard label={t("advancements")} value={profile.advancements} />
            <StatCard label={t("lastSeen")} value={profile.lastSeen ? new Date(profile.lastSeen).toLocaleDateString() : t("never")} />
          </div>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <div className="p-3 bg-gray-800/50 border border-gray-700/50">
              <p className="text-xs text-gray-400">{t("lastPosition")}</p>
              <p className="text-gray-200">{formatLocation(profile.position)}</p>
            </div>
            <div className="p-3 bg-gray-800/50 border border-gray-700/50">
              <p className="text-xs text-gray-400">{t("spawnPoint")}</p>
              <p className="text-gray-200">{formatLocation(profile.spawn)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">{t("playerDataSavedNote")}</p>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-3 pt-3">
          <div className="flex flex-wrap gap-1">
            {categories.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`px-2 py-1 text-xs border ${key === category ? "border-emerald-500 text-emerald-300 bg-emerald-600/20" : "border-gray-700 text-gray-400 hover:text-gray-200"}`}
              >
                {humanizeId(key)}
              </button>
            ))}
          </div>
          <Input value={statsQuery} onChange={(e) => setStatsQuery(e.target.value)} placeholder={t("search")} className="h-8 text-sm" />
          {statRows.length === 0 ? (
            <p className="text-gray-500 text-sm">{t("noStats")}</p>
          ) : (
            <div className="max-h-96 overflow-auto border border-gray-700/50">
              <table className="w-full text-sm">
                <tbody>
                  {statRows.map((row) => (
                    <tr key={row.key} className="border-b border-gray-800">
                      <td className="px-3 py-1.5 text-gray-300">{row.label}</td>
                      <td className="px-3 py-1.5 text-right text-gray-100 tabular-nums">{row.value.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="inventory" className="pt-3">
          <PlayerInventory profile={profile} />
        </TabsContent>

        <TabsContent value="advancements" className="pt-3">
          {profile.advancementList.length === 0 ? (
            <p className="text-gray-500 text-sm">{t("noAdvancements")}</p>
          ) : (
            <ul className="space-y-1 max-h-96 overflow-auto text-sm">
              {[...done, ...pending].map((advancement) => (
                <li key={advancement.id} className="flex items-center gap-2">
                  {advancement.done ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> : <Circle className="h-4 w-4 text-gray-600 shrink-0" />}
                  <span className={advancement.done ? "text-gray-200" : "text-gray-500"}>{humanizeId(advancement.id)}</span>
                  <span className="text-xs text-gray-500">{idNamespace(advancement.id)}</span>
                  {advancement.doneAt && <span className="ml-auto text-xs text-gray-500">{new Date(advancement.doneAt).toLocaleDateString()}</span>}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
