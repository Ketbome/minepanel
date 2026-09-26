import { FC } from "react";
import Image from "next/image";
import { PlayerInventoryData, PlayerItem } from "@/services/players/players.service";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { humanizeId } from "./player-format";

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

const Slot: FC<{ item?: PlayerItem | null }> = ({ item }) => {
  if (!item) {
    return <div className="mc-slot aspect-square w-full" />;
  }
  const title = item.name ? `${item.name} (${humanizeId(item.id)})` : humanizeId(item.id);
  const contents = item.contents?.map((inner) => `${inner.count}× ${inner.name ?? humanizeId(inner.id)}`).join("\n");
  const label = contents ? `${title}\n${contents}` : title;
  const icon = ITEM_ICONS[item.id.split(":").pop() ?? ""];

  return (
    <div className="mc-slot aspect-square w-full flex items-center justify-center overflow-hidden" title={label}>
      {icon ? (
        <Image src={`/images/${icon}`} alt={title} width={28} height={28} className="pixelated" />
      ) : (
        <span className={`text-[9px] leading-tight text-center px-0.5 break-all ${item.name ? "text-cyan-300" : "text-gray-300"}`}>{item.name ?? humanizeId(item.id)}</span>
      )}
      {item.count > 1 && <span className="mc-count absolute bottom-0.5 right-1 text-xs tabular-nums">{item.count}</span>}
      {item.contents && <span className="absolute top-0.5 left-0.5 h-1.5 w-1.5 bg-amber-400" />}
    </div>
  );
};

const Grid: FC<{ items: PlayerItem[]; slots: number[] }> = ({ items, slots }) => {
  const bySlot = new Map(items.map((item) => [item.slot, item]));
  return (
    <div className="grid grid-cols-9 gap-1">
      {slots.map((slot) => (
        <Slot key={slot} item={bySlot.get(slot)} />
      ))}
    </div>
  );
};

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export const PlayerInventory: FC<{ profile: PlayerInventoryData }> = ({ profile }) => {
  const { t } = useLanguage();
  const armor = new Map(profile.armor.map((item) => [item.slot, item]));

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="w-12 space-y-1">
          <p className="text-xs text-gray-400 mb-1">{t("armor")}</p>
          {ARMOR_SLOTS.map((slot) => (
            <Slot key={slot} item={armor.get(slot)} />
          ))}
          <p className="text-xs text-gray-400 pt-2">{t("offhand")}</p>
          <Slot item={profile.offhand} />
        </div>
        <div className="flex-1 space-y-2 max-w-md">
          <p className="text-xs text-gray-400">{t("inventory")}</p>
          <Grid items={profile.inventory} slots={range(9, 35)} />
          <Grid items={profile.inventory} slots={range(0, 8)} />
        </div>
      </div>
      <div className="space-y-2 max-w-md">
        <p className="text-xs text-gray-400 flex items-center gap-2">
          <Image src="/images/ender_chest.webp" alt="" width={14} height={14} className="pixelated" />
          {t("enderChest")}
        </p>
        <Grid items={profile.enderChest} slots={range(0, 26)} />
      </div>
    </div>
  );
};
