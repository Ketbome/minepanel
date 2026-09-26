import { parse, simplify } from 'prismarine-nbt';

export interface PlayerItem {
  slot: number;
  id: string;
  count: number;
  name?: string;
  // Items inside a carried shulker box or bundle (one level deep)
  contents?: PlayerItem[];
  // Only present when the item has them
  enchantments?: { id: string; level: number }[];
  damage?: number;
  maxDamage?: number;
}

export interface PlayerVitals {
  health: number | null;
  food: number | null;
  xpLevel: number | null;
  xpProgress: number | null;
  gameMode: string | null;
}

export interface PlayerEffect {
  id: string;
  amplifier: number;
  duration: number;
}

export interface PlayerLocation {
  dimension: string;
  x: number;
  y: number;
  z: number;
}

export interface PlayerNbtData {
  inventory: PlayerItem[];
  armor: PlayerItem[];
  offhand: PlayerItem | null;
  enderChest: PlayerItem[];
  position: PlayerLocation | null;
  spawn: PlayerLocation | null;
  vitals: PlayerVitals;
  effects: PlayerEffect[];
}

// Slot numbers the pre-1.21.5 format used for armor and offhand inside `Inventory`.
// 1.21.5 moved them to an `equipment` compound; both are mapped onto these numbers.
const EQUIPMENT_SLOTS: Record<string, number> = { feet: 100, legs: 101, chest: 102, head: 103, offhand: -106 };
const OFFHAND_SLOT = -106;
const GAME_MODES = ['survival', 'creative', 'adventure', 'spectator'];

// Vanilla max durability, for the in-slot damage bar. Items can override it with minecraft:max_damage.
const TOOL_DURABILITY: Record<string, number> = { wooden: 59, stone: 131, copper: 190, iron: 250, golden: 32, diamond: 1561, netherite: 2031 };
const ARMOR_DURABILITY: Record<string, number[]> = { leather: [55, 80, 75, 65], chainmail: [165, 240, 225, 195], copper: [121, 176, 165, 143], iron: [165, 240, 225, 195], golden: [77, 112, 105, 91], diamond: [363, 528, 495, 429], netherite: [407, 592, 555, 481] };
const ARMOR_PIECES = ['helmet', 'chestplate', 'leggings', 'boots'];
const OTHER_DURABILITY: Record<string, number> = { turtle_helmet: 275, bow: 384, crossbow: 465, trident: 250, fishing_rod: 64, shears: 238, flint_and_steel: 64, shield: 336, elytra: 432, carrot_on_a_stick: 25, warped_fungus_on_a_stick: 100, mace: 500, brush: 64, wolf_armor: 64 };
const LEGACY_DIMENSIONS: Record<number, string> = { 0: 'minecraft:overworld', [-1]: 'minecraft:the_nether', 1: 'minecraft:the_end' };

type RawItem = {
  Slot?: number;
  id?: string;
  count?: number;
  Count?: number;
  tag?: { display?: { Name?: unknown }; BlockEntityTag?: { Items?: RawItem[] }; Items?: RawItem[]; Damage?: number; Enchantments?: unknown; StoredEnchantments?: unknown };
  components?: Record<string, unknown>;
};

export async function readPlayerNbt(buffer: Buffer): Promise<PlayerNbtData> {
  const { parsed } = await parse(buffer);
  return normalizePlayer(simplify(parsed));
}

export function normalizePlayer(data: Record<string, any>): PlayerNbtData {
  const inventory: PlayerItem[] = [];
  const armor: PlayerItem[] = [];
  let offhand: PlayerItem | null = null;

  for (const raw of asArray<RawItem>(data.Inventory)) {
    const item = toItem(raw, raw.Slot);
    if (!item) continue;
    if (item.slot === OFFHAND_SLOT) offhand = item;
    else if (item.slot >= 100 && item.slot <= 103) armor.push(item);
    else inventory.push(item);
  }

  for (const [key, raw] of Object.entries((data.equipment ?? {}) as Record<string, RawItem>)) {
    const item = key in EQUIPMENT_SLOTS ? toItem(raw, EQUIPMENT_SLOTS[key]) : null;
    if (!item) continue;
    if (item.slot === OFFHAND_SLOT) offhand = item;
    else armor.push(item);
  }

  const enderChest = asArray<RawItem>(data.EnderItems)
    .map((raw) => toItem(raw, raw.Slot))
    .filter((item): item is PlayerItem => item !== null);

  return {
    inventory: bySlot(inventory),
    armor: bySlot(armor),
    offhand,
    enderChest: bySlot(enderChest),
    position: toLocation(data.Dimension, data.Pos),
    spawn: readSpawn(data),
    vitals: {
      health: numberOrNull(data.Health),
      food: numberOrNull(data.foodLevel),
      xpLevel: numberOrNull(data.XpLevel),
      xpProgress: numberOrNull(data.XpP),
      gameMode: GAME_MODES[data.playerGameType] ?? null,
    },
    effects: readEffects(data),
  };
}

// 1.20.2+ `active_effects` with namespaced ids; older `ActiveEffects` only has numeric ids.
function readEffects(data: Record<string, any>): PlayerEffect[] {
  return asArray<Record<string, unknown>>(data.active_effects ?? data.ActiveEffects).flatMap((effect) => {
    const id = typeof effect.id === 'string' ? effect.id : typeof effect.Id === 'number' ? `#${effect.Id}` : null;
    return id ? [{ id, amplifier: numberOrNull(effect.amplifier ?? effect.Amplifier) ?? 0, duration: numberOrNull(effect.duration ?? effect.Duration) ?? 0 }] : [];
  });
}

export function vanillaMaxDamage(id: string): number | null {
  const name = id.replace(/^minecraft:/, '');
  if (OTHER_DURABILITY[name]) return OTHER_DURABILITY[name];
  const tool = /^([a-z]+)_(sword|pickaxe|axe|shovel|hoe)$/.exec(name);
  if (tool) return TOOL_DURABILITY[tool[1]] ?? null;
  const armor = /^([a-z]+)_(helmet|chestplate|leggings|boots)$/.exec(name);
  return armor ? (ARMOR_DURABILITY[armor[1]]?.[ARMOR_PIECES.indexOf(armor[2])] ?? null) : null;
}

function readEnchantments(raw: RawItem): { id: string; level: number }[] {
  const result: { id: string; level: number }[] = [];
  for (const key of ['minecraft:enchantments', 'minecraft:stored_enchantments']) {
    const source = raw.components?.[key] as Record<string, unknown> | undefined;
    // 1.20.5-1.21.4 wrap the map in `levels`; 1.21.5+ store it directly.
    const levels = (source?.levels ?? source) as Record<string, unknown> | undefined;
    for (const [id, level] of Object.entries(levels ?? {})) if (typeof level === 'number') result.push({ id, level });
  }
  for (const entry of [...asArray<{ id?: unknown; lvl?: unknown }>(raw.tag?.Enchantments), ...asArray<{ id?: unknown; lvl?: unknown }>(raw.tag?.StoredEnchantments)]) {
    if (typeof entry.id === 'string' && typeof entry.lvl === 'number') result.push({ id: entry.id, level: entry.lvl });
  }
  return result;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readSpawn(data: Record<string, any>): PlayerLocation | null {
  // 1.21.5+: respawn: { pos: [x, y, z], dimension }
  if (data.respawn?.pos) {
    return toLocation(data.respawn.dimension, data.respawn.pos);
  }
  if (data.SpawnX === undefined) {
    return null;
  }
  return toLocation(data.SpawnDimension, [data.SpawnX, data.SpawnY, data.SpawnZ]);
}

function toLocation(dimension: unknown, pos: unknown): PlayerLocation | null {
  if (!Array.isArray(pos) || pos.length < 3) {
    return null;
  }
  const [x, y, z] = pos.map(Number);
  return { dimension: toDimension(dimension), x, y, z };
}

function toDimension(value: unknown): string {
  if (typeof value === 'number') {
    return LEGACY_DIMENSIONS[value] ?? `minecraft:dim${value}`;
  }
  return typeof value === 'string' && value ? value : 'minecraft:overworld';
}

function toItem(raw: RawItem | undefined, slot: number | undefined, nested = false): PlayerItem | null {
  if (!raw?.id) {
    return null;
  }
  const item: PlayerItem = { slot: slot ?? 0, id: raw.id, count: raw.count ?? raw.Count ?? 1 };
  const customName = raw.components?.['minecraft:custom_name'] ?? raw.tag?.display?.Name;
  if (customName !== undefined) {
    item.name = textOf(customName);
  }
  const contents = nested ? [] : containerContents(raw);
  if (contents.length > 0) {
    item.contents = contents;
  }
  const enchantments = readEnchantments(raw);
  if (enchantments.length > 0) {
    item.enchantments = enchantments;
  }
  const damage = numberOrNull(raw.components?.['minecraft:damage'] ?? raw.tag?.Damage);
  const maxDamage = numberOrNull(raw.components?.['minecraft:max_damage']) ?? vanillaMaxDamage(raw.id);
  if (damage && maxDamage) {
    item.damage = damage;
    item.maxDamage = maxDamage;
  }
  return item;
}

// Shulker boxes: `tag.BlockEntityTag.Items` before 1.20.5, `minecraft:container` after.
// Bundles: `tag.Items` before, `minecraft:bundle_contents` after.
function containerContents(raw: RawItem): PlayerItem[] {
  const container = asArray<{ slot?: number; item?: RawItem }>(raw.components?.['minecraft:container']).map((entry) => toItem(entry.item, entry.slot, true));
  const legacy = [...asArray<RawItem>(raw.tag?.BlockEntityTag?.Items), ...asArray<RawItem>(raw.tag?.Items)].map((entry) => toItem(entry, entry.Slot, true));
  const bundle = asArray<RawItem>(raw.components?.['minecraft:bundle_contents']).map((entry, index) => toItem(entry, index, true));
  return [...container, ...legacy, ...bundle].filter((item): item is PlayerItem => item !== null);
}

// Custom names are a JSON text component before 1.21.5 and an NBT one after; both reduce to their text.
export function textOf(value: unknown): string {
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return typeof parsed === 'string' ? parsed : textOf(parsed);
    } catch {
      return value;
    }
  }
  if (Array.isArray(value)) {
    return value.map(textOf).join('');
  }
  if (value && typeof value === 'object') {
    const component = value as { text?: unknown; extra?: unknown };
    return (typeof component.text === 'string' ? component.text : '') + (component.extra ? textOf(component.extra) : '');
  }
  return String(value);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function bySlot(items: PlayerItem[]): PlayerItem[] {
  return items.sort((a, b) => a.slot - b.slot);
}
