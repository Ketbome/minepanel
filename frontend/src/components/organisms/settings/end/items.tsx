import Image from 'next/image';
import type { ComponentType } from 'react';
import type { BlockId } from './engine/world';
import type { LoreKey } from './lore/en';
import { ArrowIcon, BlazePowderIcon, BlazeRodIcon, BoneIcon, DirtIcon, DragonEggIcon, EyeOfEnderIcon, FlintAndSteelIcon, ObsidianIcon, PixelSprite, SPRITES, StickIcon, type Pixel } from './PixelIcons';

export type ItemId =
  | 'note'
  | 'diamond'
  | 'stick'
  | 'pearl'
  | 'blaze'
  | 'rod'
  | 'bow'
  | 'arrow'
  | 'apple'
  | 'sword'
  | 'eye'
  | 'egg'
  | 'emerald'
  | 'map'
  | 'register'
  | 'flint'
  | 'obsidian'
  | 'elytra'
  | 'gold'
  | 'dirt'
  | 'log'
  | 'planks'
  | 'cobble'
  | 'netherrack'
  | 'endStone'
  | 'pickaxe'
  | 'helmet'
  | 'bone'
  | 'rottenFlesh'
  | 'porkchop'
  | 'nugget'
  | 'skull';

export interface Stack {
  readonly item: ItemId;
  readonly count: number;
}

export type Slot = Stack | null;

interface ItemDef {
  readonly name: LoreKey;
  readonly max: number;
  readonly image?: string;
  readonly icon?: ComponentType<{ className?: string }>;
  readonly pixels?: readonly Pixel[];
  // right click places it as this block
  readonly block?: BlockId;
  // held right click eats it, healing this much
  readonly food?: number;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  note: { name: 'itemNote', max: 1, image: '/images/paper.webp' },
  diamond: { name: 'itemDiamond', max: 64, image: '/images/diamond.webp' },
  stick: { name: 'itemStick', max: 64, icon: StickIcon },
  bone: { name: 'itemBone', max: 64, icon: BoneIcon },
  pearl: { name: 'itemPearl', max: 16, image: '/images/ender-pearl.webp' },
  blaze: { name: 'itemBlaze', max: 64, icon: BlazePowderIcon },
  rod: { name: 'itemRod', max: 64, icon: BlazeRodIcon },
  bow: { name: 'itemBow', max: 1, image: '/images/bow.webp' },
  arrow: { name: 'itemArrow', max: 64, icon: ArrowIcon },
  apple: { name: 'itemApple', max: 64, image: '/images/golden-apple.webp', food: 8 },
  sword: { name: 'itemSword', max: 1, image: '/images/diamond-sword.webp' },
  eye: { name: 'itemEye', max: 64, icon: EyeOfEnderIcon },
  egg: { name: 'itemEgg', max: 64, icon: DragonEggIcon },
  emerald: { name: 'itemEmerald', max: 64, image: '/images/emerald.webp' },
  map: { name: 'itemMap', max: 1, image: '/images/map.webp' },
  register: { name: 'itemRegister', max: 1, image: '/images/book.webp' },
  flint: { name: 'itemFlint', max: 1, icon: FlintAndSteelIcon },
  obsidian: { name: 'itemObsidian', max: 64, icon: ObsidianIcon, block: 'obsidian' },
  elytra: { name: 'itemElytra', max: 1, image: '/images/elytra.webp' },
  gold: { name: 'itemGold', max: 64, image: '/images/gold.webp' },
  dirt: { name: 'itemDirt', max: 64, icon: DirtIcon, block: 'dirt' },
  log: { name: 'itemLog', max: 64, pixels: SPRITES.log, block: 'log' },
  planks: { name: 'itemPlanks', max: 64, pixels: SPRITES.planks, block: 'planks' },
  cobble: { name: 'itemCobble', max: 64, pixels: SPRITES.cobble, block: 'cobble' },
  netherrack: { name: 'itemNetherrack', max: 64, pixels: SPRITES.netherrack, block: 'netherrack' },
  endStone: { name: 'itemEndStone', max: 64, pixels: SPRITES.endStone, block: 'endStone' },
  pickaxe: { name: 'itemPickaxe', max: 1, image: '/images/diamond-pickaxe.webp' },
  helmet: { name: 'itemHelmet', max: 1, pixels: SPRITES.helmet },
  rottenFlesh: { name: 'itemRottenFlesh', max: 64, pixels: SPRITES.rottenFlesh, food: 2 },
  porkchop: { name: 'itemPorkchop', max: 64, pixels: SPRITES.porkchop, food: 3 },
  nugget: { name: 'itemNugget', max: 64, pixels: SPRITES.nugget },
  skull: { name: 'itemSkull', max: 64, image: '/images/wither-skeleton-skull.webp' },
};

export const HOTBAR_SIZE = 9;
export const INVENTORY_SIZE = 36;

export const emptySlots = (size: number): Slot[] => Array.from({ length: size }, () => null);

export function ItemIcon({ item, className = '' }: { readonly item: ItemId; readonly className?: string }) {
  const { icon: Icon, image, pixels } = ITEMS[item];
  if (Icon) return <Icon className={className} />;
  if (pixels) return <PixelSprite pixels={pixels} className={className} />;
  return <Image src={image!} alt="" width={32} height={32} loading="eager" className={`pixelated object-contain ${className}`} />;
}

export function countOf(slots: readonly Slot[], item: ItemId) {
  return slots.reduce((sum, slot) => sum + (slot?.item === item ? slot.count : 0), 0);
}

// tops up matching stacks first, then empty slots; whatever does not fit is dropped, as in the game
export function addItem(slots: readonly Slot[], item: ItemId, count: number): Slot[] {
  const next = [...slots];
  const { max } = ITEMS[item];
  let left = count;
  next.forEach((slot, index) => {
    if (left === 0 || slot?.item !== item || slot.count >= max) return;
    const moved = Math.min(left, max - slot.count);
    next[index] = { item, count: slot.count + moved };
    left -= moved;
  });
  for (let index = 0; index < next.length && left > 0; index += 1) {
    if (next[index]) continue;
    const moved = Math.min(left, max);
    next[index] = { item, count: moved };
    left -= moved;
  }
  return next;
}

export function removeItem(slots: readonly Slot[], item: ItemId, count: number): Slot[] {
  const next = [...slots];
  let left = count;
  for (let index = next.length - 1; index >= 0 && left > 0; index -= 1) {
    const slot = next[index];
    if (slot?.item !== item) continue;
    const taken = Math.min(left, slot.count);
    next[index] = slot.count > taken ? { item, count: slot.count - taken } : null;
    left -= taken;
  }
  return next;
}
