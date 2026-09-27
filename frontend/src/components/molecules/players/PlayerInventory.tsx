import { CSSProperties, FC, useState } from "react";
import Image from "next/image";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getPublicEnv } from "@/lib/public-env";
import { PlayerInventoryData, PlayerItem } from "@/services/players/players.service";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { humanizeId } from "./player-format";
import { PixelSprite, SPRITES } from "./PixelSprite";

// Item art the panel already ships in public/images, keyed by item id without namespace
const ITEM_ICONS: Record<string, string> = {
  anvil: "anvil.webp",
  barrier: "barrier.webp",
  beacon: "beacon.webp",
  book: "book.webp",
  bookshelf: "bookshelf.webp",
  bow: "bow.webp",
  cauldron: "cauldron.webp",
  chest: "chest.webp",
  clock: "clock.webp",
  command_block: "command-block.webp",
  compass: "compass.webp",
  crafting_table: "crafting-table.webp",
  crossbow: "crossbow.webp",
  daylight_detector: "daylight-detector.webp",
  diamond: "diamond.webp",
  diamond_pickaxe: "diamond-pickaxe.webp",
  diamond_sword: "diamond-sword.webp",
  elytra: "elytra.webp",
  emerald: "emerald.webp",
  enchanted_book: "enchanted-book.webp",
  ender_chest: "ender_chest.webp",
  ender_pearl: "ender-pearl.webp",
  experience_bottle: "experience-bottle.webp",
  filled_map: "map.webp",
  gold_ingot: "gold.webp",
  golden_apple: "golden-apple.webp",
  grass_block: "grass.webp",
  heart_of_the_sea: "heart-of-the-sea.webp",
  hopper: "hopper.webp",
  iron_bars: "iron-bars.webp",
  iron_pickaxe: "iron-pick.webp",
  lapis_lazuli: "lapis.webp",
  map: "map.webp",
  name_tag: "name_tag.webp",
  netherite_ingot: "netherite-ingot.webp",
  oak_sapling: "oak-sapling.webp",
  observer: "observer.webp",
  paper: "paper.webp",
  player_head: "player-head.png",
  redstone: "redstone.webp",
  repeater: "repeater.webp",
  sculk_shrieker: "sculk-shrieker.webp",
  shears: "shears.webp",
  shield: "shield.png",
  spawner: "spawner.webp",
  sunflower: "sunflower.webp",
  tnt: "tnt.webp",
  totem_of_undying: "totem-of-undying.webp",
  trident: "trident.webp",
  wither_skeleton_skull: "wither-skeleton-skull.webp",
};

const ARMOR_SLOTS = [103, 102, 101, 100];
const EMPTY_SPRITES: Record<number, keyof typeof SPRITES> = { 103: "head", 102: "chest", 101: "legs", 100: "feet", [-106]: "offhand" };
const CURSES = new Set(["minecraft:binding_curse", "minecraft:vanishing_curse"]);
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

// Vanilla texture for the server's game version, cached by the backend from Mojang's client jar
const textureUrl = (version: string | null | undefined, id: string) =>
  version && /^minecraft:[a-z0-9_]+$/.test(id) ? `${getPublicEnv("NEXT_PUBLIC_BACKEND_URL")}/item-textures/${encodeURIComponent(version)}/${id.slice("minecraft:".length)}` : null;

const ItemTooltip: FC<{ item: PlayerItem }> = ({ item }) => {
  const { t } = useLanguage();
  return (
    <div className="space-y-0.5">
      <div className={item.name ? "italic" : undefined} style={{ color: item.enchantments ? "#55ffff" : "#ffffff" }}>
        {item.name ?? humanizeId(item.id)}
        {item.count > 1 && <span className="not-italic text-[#aaaaaa]"> ×{item.count}</span>}
      </div>
      {item.enchantments?.map((e) => (
        <div key={e.id} style={{ color: CURSES.has(e.id) ? "#ff5555" : "#aaaaaa" }}>
          {humanizeId(e.id)} {ROMAN[e.level] ?? e.level}
        </div>
      ))}
      {item.contents?.map((inner, index) => (
        <div key={index} className="text-[#aaaaaa]">
          {inner.name ?? humanizeId(inner.id)} ×{inner.count}
        </div>
      ))}
      {item.damage && item.maxDamage ? (
        <div>
          {t("itemDurability")}: {item.maxDamage - item.damage} / {item.maxDamage}
        </div>
      ) : null}
      <div className="text-[#555555]">{item.id}</div>
    </div>
  );
};

const Slot: FC<{ item?: PlayerItem | null; version?: string | null; emptySlot?: number }> = ({ item, version, emptySlot }) => {
  const [textureFailed, setTextureFailed] = useState(false);
  if (!item) {
    const sprite = emptySlot === undefined ? undefined : EMPTY_SPRITES[emptySlot];
    return <div className="mc-slot aspect-square w-full flex items-center justify-center">{sprite && <PixelSprite map={SPRITES[sprite]} colors={{ X: "rgba(234,255,242,0.09)" }} size={20} />}</div>;
  }
  const title = item.name ? `${item.name} (${humanizeId(item.id)})` : humanizeId(item.id);
  const texture = textureFailed ? null : textureUrl(version, item.id);
  const icon = ITEM_ICONS[item.id.split(":").pop() ?? ""];
  const durability = item.damage && item.maxDamage ? Math.max(0, 1 - item.damage / item.maxDamage) : null;

  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <div tabIndex={0} aria-label={`${title} ×${item.count}`} className="mc-slot aspect-square w-full flex items-center justify-center overflow-hidden focus-visible:outline-2 focus-visible:outline-[var(--mc-emerald)]">
          {texture || icon ? (
            <span className={`relative size-7 flex items-center justify-center ${item.enchantments ? "mc-glint" : ""}`} style={texture ? ({ "--glint-mask": `url("${texture}")` } as CSSProperties) : undefined}>
              {texture ? (
                // eslint-disable-next-line @next/next/no-img-element -- runtime backend URL; pixel art must not be resampled
                <img src={texture} alt="" ref={(img) => { if (img?.complete && img.naturalWidth === 0) setTextureFailed(true); }} onError={() => setTextureFailed(true)} className="size-full pixelated" />
              ) : (
                <Image src={`/images/${icon}`} alt="" width={28} height={28} className="pixelated" />
              )}
            </span>
          ) : (
            <span className={`text-[9px] leading-tight text-center px-0.5 break-all ${item.name ? "text-cyan-300" : "text-gray-300"}`}>{item.name ?? humanizeId(item.id)}</span>
          )}
          {item.count > 1 && <span className="mc-count absolute bottom-0.5 right-1 text-xs tabular-nums">{item.count}</span>}
          {item.contents && <span className="absolute top-0.5 left-0.5 h-1.5 w-1.5 bg-amber-400" />}
          {durability !== null && (
            <span className="absolute bottom-0.5 left-1 right-1 h-[3px] bg-black">
              <span className="block h-[2px]" style={{ width: `${durability * 100}%`, backgroundColor: `hsl(${durability * 120}, 100%, 50%)` }} />
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="mc-tooltip">
        <ItemTooltip item={item} />
      </TooltipContent>
    </Tooltip>
  );
};

const Grid: FC<{ items: PlayerItem[]; slots: number[]; version?: string | null }> = ({ items, slots, version }) => {
  const bySlot = new Map(items.map((item) => [item.slot, item]));
  return (
    <div className="grid grid-cols-9 gap-1">
      {slots.map((slot) => (
        <Slot key={`${slot}-${bySlot.get(slot)?.id}`} item={bySlot.get(slot)} version={version} />
      ))}
    </div>
  );
};

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export const PlayerInventory: FC<{ profile: PlayerInventoryData; textureVersion?: string | null }> = ({ profile, textureVersion }) => {
  const { t } = useLanguage();
  const armor = new Map(profile.armor.map((item) => [item.slot, item]));

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="w-12 space-y-1">
          <p className="text-xs text-gray-400 mb-1">{t("armor")}</p>
          {ARMOR_SLOTS.map((slot) => (
            <Slot key={`${slot}-${armor.get(slot)?.id}`} item={armor.get(slot)} version={textureVersion} emptySlot={slot} />
          ))}
          <p className="text-xs text-gray-400 pt-2">{t("offhand")}</p>
          <Slot key={profile.offhand?.id} item={profile.offhand} version={textureVersion} emptySlot={-106} />
        </div>
        <div className="flex-1 space-y-2 max-w-md">
          <p className="text-xs text-gray-400">{t("inventory")}</p>
          <Grid items={profile.inventory} slots={range(9, 35)} version={textureVersion} />
          <Grid items={profile.inventory} slots={range(0, 8)} version={textureVersion} />
        </div>
      </div>
      <div className="space-y-2 max-w-md">
        <p className="text-xs text-gray-400 flex items-center gap-2">
          <Image src="/images/ender_chest.webp" alt="" width={14} height={14} className="pixelated" />
          {t("enderChest")}
        </p>
        <Grid items={profile.enderChest} slots={range(0, 26)} version={textureVersion} />
      </div>
    </div>
  );
};
