import { FC, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { getPlayerDetail, PlayerDetail } from "@/services/player-activity/player-activity.service";
import { formatDuration } from "./player-format";

interface PlayerSessionsProps {
  serverId: string;
  // Java session history is keyed by name, like the server log it is read from
  name: string | null;
}

// 2026-09-20 was a Sunday; the backend buckets weekdays the same way (0 = Sunday)
const weekdayLabel = (day: number, language: string) => new Date(Date.UTC(2026, 8, 20 + day)).toLocaleDateString(language, { weekday: "short", timeZone: "UTC" });

const Stat: FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="p-3 bg-gray-800/50 border border-gray-700/50">
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-lg font-minecraft text-gray-100 tabular-nums">{value}</p>
  </div>
);

export const PlayerSessions: FC<PlayerSessionsProps> = ({ serverId, name }) => {
  const { t, language } = useLanguage();
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(name));

  useEffect(() => {
    if (!name) return;
    const controller = new AbortController();
    setLoading(true);
    getPlayerDetail(serverId, `java:${name.toLowerCase()}`, page, controller.signal)
      .then(setDetail)
      .catch(() => {
        if (!controller.signal.aborted) setDetail(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [serverId, name, page]);

  if (loading) {
    return (
      <div className="flex justify-center py-10 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!detail || detail.profile.sessionCount === 0) {
    return <p className="text-gray-500 text-sm py-6">{t("noSessions")}</p>;
  }

  const { profile, summary, sessions } = detail;
  const maxWeekday = Math.max(...summary.playSecondsByWeekday, 1);
  const unknown = (value: number | null | undefined) => value ?? "—";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Stat label={t("totalSessions")} value={profile.sessionCount} />
        <Stat label={t("playTime")} value={formatDuration(profile.totalSeconds * 1000)} />
        <Stat label={t("averageSession")} value={formatDuration(summary.averageSeconds * 1000)} />
        <Stat label={t("longestSession")} value={formatDuration(summary.longestSeconds * 1000)} />
        <Stat label={t("playStreak")} value={summary.streakDays} />
      </div>

      <div className="p-3 bg-gray-800/50 border border-gray-700/50">
        <p className="text-xs text-gray-400 mb-2">{t("playByWeekday")}</p>
        <div className="flex items-end gap-2 h-24">
          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={formatDuration(summary.playSecondsByWeekday[day] * 1000)}>
              <div className="w-full bg-emerald-500/70" style={{ height: `${(summary.playSecondsByWeekday[day] / maxWeekday) * 100}%` }} />
              <span className="text-[10px] text-gray-400">{weekdayLabel(day, language)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-h-96 overflow-auto border border-gray-700/50">
        <table className="w-full text-xs">
          <thead className="text-gray-400 bg-gray-800/60 sticky top-0">
            <tr>
              <th className="px-2 py-1.5 text-left">{t("sessionStart")}</th>
              <th className="px-2 py-1.5 text-right">{t("duration")}</th>
              <th className="px-2 py-1.5 text-right">{t("deaths")}</th>
              <th className="px-2 py-1.5 text-right">{t("mobKills")}</th>
              <th className="px-2 py-1.5 text-right">{t("playerKills")}</th>
              <th className="px-2 py-1.5 text-right">{t("blocksMined")}</th>
              <th className="px-2 py-1.5 text-right">{t("chatMessages")}</th>
              <th className="px-2 py-1.5 text-right">{t("advancements")}</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} className="border-b border-gray-800 text-gray-200 tabular-nums">
                <td className="px-2 py-1.5">{new Date(session.joinedAt).toLocaleString(language)}</td>
                <td className="px-2 py-1.5 text-right">
                  {session.endReason === null ? <span className="text-emerald-400">{t("online")}</span> : formatDuration(session.durationSeconds * 1000)}
                </td>
                <td className="px-2 py-1.5 text-right">{unknown(session.deaths ?? session.events?.deaths)}</td>
                <td className="px-2 py-1.5 text-right">{unknown(session.mobKills)}</td>
                <td className="px-2 py-1.5 text-right">{unknown(session.playerKills)}</td>
                <td className="px-2 py-1.5 text-right">{unknown(session.blocksMined)}</td>
                <td className="px-2 py-1.5 text-right">{unknown(session.events?.chat)}</td>
                <td className="px-2 py-1.5 text-right">{unknown(session.events?.advancements)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(page > 0 || detail.hasMore) && (
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="minepanelOutline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            {t("paPrevious")}
          </Button>
          <span className="text-sm tabular-nums text-gray-300">{page + 1}</span>
          <Button type="button" variant="minepanelOutline" size="sm" disabled={!detail.hasMore} onClick={() => setPage(page + 1)}>
            {t("paNext")}
          </Button>
        </div>
      )}
    </div>
  );
};
