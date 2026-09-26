import { FC } from "react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { PlayerEffect, PlayerVitals as Vitals } from "@/services/players/players.service";
import { humanizeId } from "./player-format";
import { PixelSprite, SPRITES } from "./PixelSprite";

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/** Ten icons, two points each, like the in-game HUD. */
const HudRow: FC<{ value: number | null; sprite: readonly string[]; colors: Record<string, string>; label: string }> = ({ value, sprite, colors, label }) => (
  <div className="flex gap-px" role="img" aria-label={`${label}: ${value === null ? "?" : Math.ceil(value)}/20`}>
    {Array.from({ length: 10 }, (_, i) => {
      const points = Math.ceil(value ?? 0) - i * 2;
      return <PixelSprite key={i} size={16} map={sprite} colors={colors} fillColumns={points >= 2 ? Infinity : points === 1 ? 4 : 0} emptyColor="#2a2f26" />;
    })}
  </div>
);

const formatTicks = (ticks: number) => (ticks < 0 ? "∞" : `${Math.floor(ticks / 1200)}:${String(Math.floor(ticks / 20) % 60).padStart(2, "0")}`);

export const PlayerVitals: FC<{ vitals: Vitals; effects: PlayerEffect[] }> = ({ vitals, effects }) => {
  const { t } = useLanguage();
  return (
    <div className="p-3 bg-gray-800/50 border border-gray-700/50 flex flex-wrap gap-x-8 gap-y-3">
      <div className="space-y-1.5 w-full max-w-[200px]">
        <HudRow value={vitals.health} sprite={SPRITES.heart} colors={{ X: "#ff3b3b" }} label={t("playerHealth")} />
        <HudRow value={vitals.food} sprite={SPRITES.food} colors={{ M: "#c8792e", B: "#efe6cf" }} label={t("playerHunger")} />
        <div>
          <div className="text-center font-minecraft text-sm leading-none mb-1" style={{ color: "#80ff20", textShadow: "1px 1px 0 #000" }}>
            {vitals.xpLevel ?? "?"}
          </div>
          <div className="mc-bar !h-[10px] !border-2">
            <div className="mc-bar__fill" style={{ width: `${Math.round((vitals.xpProgress ?? 0) * 100)}%`, backgroundColor: "#80ff20" }} />
          </div>
        </div>
        {vitals.gameMode && <p className="text-sm text-gray-300 capitalize">{vitals.gameMode}</p>}
      </div>
      <div className="min-w-[160px] flex-1 text-sm">
        <p className="text-xs text-gray-400 mb-1">{t("activeEffects")}</p>
        {effects.length === 0 ? (
          <p className="text-gray-500">{t("noActiveEffects")}</p>
        ) : (
          <ul className="space-y-0.5 max-w-xs">
            {effects.map((effect) => (
              <li key={effect.id} className="flex justify-between gap-4">
                <span className="text-gray-200">
                  {effect.id.startsWith("#") ? effect.id : humanizeId(effect.id)} {ROMAN[effect.amplifier + 1] ?? effect.amplifier + 1}
                </span>
                <span className="font-mono text-gray-400">{formatTicks(effect.duration)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
