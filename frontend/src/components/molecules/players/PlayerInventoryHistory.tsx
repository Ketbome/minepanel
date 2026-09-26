import { FC, useEffect, useMemo, useState } from "react";
import { Loader2, Skull } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import type { TranslationKey } from "@/lib/translations";
import { getInventorySnapshot, getInventorySnapshots, SnapshotListItem } from "@/services/activity/activity.service";
import { PlayerInventoryData, PlayerProfile } from "@/services/players/players.service";
import { PlayerInventory } from "./PlayerInventory";
import { humanizeId } from "./player-format";

interface PlayerInventoryHistoryProps {
  serverId: string;
  profile: PlayerProfile;
}

const CURRENT = "current";
const REASONS: Record<SnapshotListItem["reason"], TranslationKey> = { join: "eventJoin", leave: "eventLeave", autosave: "autosave" };

// Totals per item (id + custom name) across inventory, armor, offhand, ender chest and carried containers
const countItems = (data: PlayerInventoryData): Map<string, number> => {
  const counts = new Map<string, number>();
  const add = (id: string, name: string | undefined, count: number) => {
    const key = name ? `${name} (${humanizeId(id)})` : humanizeId(id);
    counts.set(key, (counts.get(key) ?? 0) + count);
  };
  for (const item of [...data.inventory, ...data.armor, ...(data.offhand ? [data.offhand] : []), ...data.enderChest]) {
    add(item.id, item.name, item.count);
    for (const inner of item.contents ?? []) add(inner.id, inner.name, inner.count);
  }
  return counts;
};

const diffItems = (before: PlayerInventoryData, after: PlayerInventoryData) => {
  const a = countItems(before);
  const b = countItems(after);
  return [...new Set([...a.keys(), ...b.keys()])]
    .map((key) => ({ key, delta: (b.get(key) ?? 0) - (a.get(key) ?? 0) }))
    .filter((row) => row.delta !== 0)
    .sort((x, y) => x.delta - y.delta);
};

export const PlayerInventoryHistory: FC<PlayerInventoryHistoryProps> = ({ serverId, profile }) => {
  const { t, language } = useLanguage();
  const [snapshots, setSnapshots] = useState<SnapshotListItem[]>([]);
  const [selected, setSelected] = useState(CURRENT);
  const [shown, setShown] = useState<PlayerInventoryData>(profile);
  const [previous, setPrevious] = useState<PlayerInventoryData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelected(CURRENT);
    getInventorySnapshots(serverId, profile.uuid)
      .then(setSnapshots)
      .catch(() => setSnapshots([]));
  }, [serverId, profile.uuid]);

  useEffect(() => {
    if (selected === CURRENT) {
      setShown(profile);
      setPrevious(null);
      return;
    }
    const index = snapshots.findIndex((snapshot) => String(snapshot.id) === selected);
    const older = index >= 0 ? snapshots[index + 1] : undefined;
    let cancelled = false;
    setLoading(true);
    Promise.all([getInventorySnapshot(serverId, Number(selected)), older ? getInventorySnapshot(serverId, older.id) : Promise.resolve(null)])
      .then(([snapshot, before]) => {
        if (cancelled) return;
        setShown(snapshot.data);
        setPrevious(before?.data ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, snapshots, serverId, profile]);

  const changes = useMemo(() => (previous ? diffItems(previous, shown) : []), [previous, shown]);
  const selectedSnapshot = snapshots.find((snapshot) => String(snapshot.id) === selected);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="mc-input h-8 text-sm bg-gray-900/60 border border-gray-700 px-2 text-gray-200">
          <option value={CURRENT}>
            {t("currentInventory")}
            {profile.lastSeen ? ` · ${new Date(profile.lastSeen).toLocaleString(language)}` : ""}
          </option>
          {snapshots.map((snapshot) => (
            <option key={snapshot.id} value={snapshot.id}>
              {new Date(snapshot.createdAt).toLocaleString(language)} · {t(REASONS[snapshot.reason])}
              {snapshot.deathMessage ? ` · ☠ ${t("beforeDeath")}` : ""}
            </option>
          ))}
        </select>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        {snapshots.length === 0 && <span className="text-xs text-gray-500">{t("noSnapshots")}</span>}
      </div>

      {selectedSnapshot?.deathMessage && (
        <p className="flex items-center gap-2 text-xs text-red-300">
          <Skull className="h-3 w-3" />
          {t("snapshotBeforeDeath")}: {selectedSnapshot.deathMessage}
        </p>
      )}

      {previous && (
        <div className="flex flex-wrap gap-1 text-xs">
          <span className="text-gray-400">{t("changesSincePrevious")}:</span>
          {changes.length === 0 && <span className="text-gray-500">—</span>}
          {changes.map(({ key, delta }) => (
            <span key={key} className={`px-1.5 py-0.5 border ${delta > 0 ? "border-emerald-700 text-emerald-300" : "border-red-800 text-red-300"}`}>
              {delta > 0 ? "+" : ""}
              {delta} {key}
            </span>
          ))}
        </div>
      )}

      <PlayerInventory profile={shown} textureVersion={profile.textureVersion} />
    </div>
  );
};
