import { FC, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { getPlayerSessions, getSessionSummary, PlayerRef, PlayerSession, SessionSummary } from "@/services/activity/activity.service";
import { formatDuration } from "./player-format";

interface PlayerSessionsProps {
  serverId: string;
  player: PlayerRef;
}

// 2026-09-20 was a Sunday; the backend buckets weekdays the same way (0 = Sunday)
const weekdayLabel = (day: number, language: string) => new Date(Date.UTC(2026, 8, 20 + day)).toLocaleDateString(language, { weekday: "short", timeZone: "UTC" });

const Stat: FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="p-3 bg-gray-800/50 border border-gray-700/50">
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-lg font-minecraft text-gray-100 tabular-nums">{value}</p>
  </div>
);

export const PlayerSessions: FC<PlayerSessionsProps> = ({ serverId, player }) => {
  const { t, language } = useLanguage();
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [sessions, setSessions] = useState<PlayerSession[]>([]);
  const [loading, setLoading] = useState(true);

  const { uuid, name } = player;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getSessionSummary(serverId, { uuid, name }), getPlayerSessions(serverId, { uuid, name })])
      .then(([nextSummary, nextSessions]) => {
        if (cancelled) return;
        setSummary(nextSummary);
        setSessions(nextSessions);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serverId, uuid, name]);

  if (loading) {
    return (
      <div className="flex justify-center py-10 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!summary || summary.sessions === 0) {
    return <p className="text-gray-500 text-sm py-6">{t("noSessions")}</p>;
  }

  const maxWeekday = Math.max(...summary.playMsByWeekday, 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Stat label={t("totalSessions")} value={summary.sessions} />
        <Stat label={t("playTime")} value={formatDuration(summary.totalMs)} />
        <Stat label={t("averageSession")} value={formatDuration(summary.averageMs)} />
        <Stat label={t("longestSession")} value={formatDuration(summary.longestMs)} />
        <Stat label={t("playStreak")} value={summary.streakDays} />
      </div>

      <div className="p-3 bg-gray-800/50 border border-gray-700/50">
        <p className="text-xs text-gray-400 mb-2">{t("playByWeekday")}</p>
        <div className="flex items-end gap-2 h-24">
          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={formatDuration(summary.playMsByWeekday[day])}>
              <div className="w-full bg-emerald-500/70" style={{ height: `${(summary.playMsByWeekday[day] / maxWeekday) * 100}%` }} />
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
                <td className="px-2 py-1.5">{new Date(session.startAt).toLocaleString(language)}</td>
                <td className="px-2 py-1.5 text-right">
                  {session.endAt ? formatDuration(new Date(session.endAt).getTime() - new Date(session.startAt).getTime()) : <span className="text-emerald-400">{t("online")}</span>}
                </td>
                <td className="px-2 py-1.5 text-right">{session.deaths ?? session.loggedDeaths}</td>
                <td className="px-2 py-1.5 text-right">{session.mobKills ?? "—"}</td>
                <td className="px-2 py-1.5 text-right">{session.playerKills ?? "—"}</td>
                <td className="px-2 py-1.5 text-right">{session.blocksMined ?? "—"}</td>
                <td className="px-2 py-1.5 text-right">{session.chatCount}</td>
                <td className="px-2 py-1.5 text-right">{session.advancements}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
