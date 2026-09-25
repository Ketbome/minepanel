import { parse, simplify } from 'prismarine-nbt';

export interface PlayerItem {
  slot: number;
  id: string;
  count: number;
  name?: string;
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
}

// Slot numbers the pre-1.21.5 format used for armor and offhand inside `Inventory`.
// 1.21.5 moved them to an `equipment` compound; both are mapped onto these numbers.
const EQUIPMENT_SLOTS: Record<string, number> = { feet: 100, legs: 101, chest: 102, head: 103, offhand: -106 };
const OFFHAND_SLOT = -106;
const LEGACY_DIMENSIONS: Record<number, string> = { 0: 'minecraft:overworld', [-1]: 'minecraft:the_nether', 1: 'minecraft:the_end' };

type RawItem = {
  Slot?: number;
  id?: string;
  count?: number;
  Count?: number;
  tag?: { display?: { Name?: unknown } };
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
  };
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

function toItem(raw: RawItem | undefined, slot: number | undefined): PlayerItem | null {
  if (!raw?.id) {
    return null;
  }
  const item: PlayerItem = { slot: slot ?? 0, id: raw.id, count: raw.count ?? raw.Count ?? 1 };
  const customName = raw.components?.['minecraft:custom_name'] ?? raw.tag?.display?.Name;
  if (customName !== undefined) {
    item.name = textOf(customName);
  }
  return item;
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
