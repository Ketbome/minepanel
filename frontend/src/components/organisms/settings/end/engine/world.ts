import type { Block } from '../voxels';

// One unit is one block and cell (x, y, z) spans [x - 0.5, x + 0.5] on every axis. Each zone
// builds its terrain into a World; the same grid feeds rendering, collisions and the crosshair.

export type BlockId =
  | 'grass'
  | 'dirt'
  | 'stone'
  | 'cobble'
  | 'path'
  | 'log'
  | 'leaves'
  | 'planks'
  | 'glass'
  | 'hay'
  | 'water'
  | 'barrier'
  | 'prop'
  | 'obsidian'
  | 'crying'
  | 'goldBlock'
  | 'netherrack'
  | 'netherBricks'
  | 'glowstone'
  | 'magma'
  | 'lava'
  | 'deepslate'
  | 'deepBricks'
  | 'reinforced'
  | 'sculk'
  | 'bricks'
  | 'mossy'
  | 'cracked'
  | 'bookshelf'
  | 'endStone'
  | 'endBricks'
  | 'bedrock'
  | 'purpur'
  | 'purpurPillar'
  | 'chorus'
  | 'chorusFlower'
  | 'endRod';

interface BlockDef {
  readonly solid: boolean;
  // seconds to break by hand; blocks without it cannot be mined
  readonly mine?: number;
  readonly visible?: boolean;
  // see-through blocks never hide the faces of their neighbours
  readonly clear?: boolean;
}

export const BLOCKS: Record<BlockId, BlockDef> = {
  grass: { solid: true, mine: 0.9 },
  dirt: { solid: true, mine: 0.75 },
  stone: { solid: true },
  cobble: { solid: true },
  path: { solid: true },
  log: { solid: true },
  leaves: { solid: true, clear: true },
  planks: { solid: true },
  glass: { solid: true, clear: true },
  hay: { solid: true },
  water: { solid: false, clear: true },
  barrier: { solid: true, visible: false },
  prop: { solid: true, visible: false },
  obsidian: { solid: true },
  crying: { solid: true },
  goldBlock: { solid: true },
  netherrack: { solid: true },
  netherBricks: { solid: true },
  glowstone: { solid: true },
  magma: { solid: true },
  lava: { solid: false },
  deepslate: { solid: true },
  deepBricks: { solid: true },
  reinforced: { solid: true },
  sculk: { solid: true },
  bricks: { solid: true },
  mossy: { solid: true },
  cracked: { solid: true },
  bookshelf: { solid: true },
  endStone: { solid: true },
  endBricks: { solid: true },
  bedrock: { solid: true },
  purpur: { solid: true },
  purpurPillar: { solid: true },
  chorus: { solid: false },
  chorusFlower: { solid: false },
  endRod: { solid: false },
};

const OFFSET = 512;
const SPAN = 1024;

export const cellKey = (x: number, y: number, z: number) => ((x + OFFSET) * SPAN + (y + OFFSET)) * SPAN + (z + OFFSET);

export function cellOf(key: number): [number, number, number] {
  const z = (key % SPAN) - OFFSET;
  const rest = Math.floor(key / SPAN);
  return [Math.floor(rest / SPAN) - OFFSET, (rest % SPAN) - OFFSET, z];
}

export class World {
  private readonly cells = new Map<number, BlockId>();
  private readonly tints = new Map<number, number>();
  private readonly scales = new Map<number, readonly [number, number, number]>();
  private readonly lists = new Map<BlockId, Block[]>();
  private readonly listeners = new Set<() => void>();
  revision = 0;

  get(x: number, y: number, z: number) {
    return this.cells.get(cellKey(x, y, z));
  }

  set(x: number, y: number, z: number, id: BlockId, tint?: number, scale?: readonly [number, number, number]) {
    const key = cellKey(x, y, z);
    const previous = this.cells.get(key);
    if (previous) this.lists.delete(previous);
    this.cells.set(key, id);
    if (tint === undefined) this.tints.delete(key);
    else this.tints.set(key, tint);
    if (scale) this.scales.set(key, scale);
    this.lists.delete(id);
  }

  fill(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: BlockId) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x += 1) {
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y += 1) {
        for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z += 1) this.set(x, y, z, id);
      }
    }
  }

  // runtime edits (mining, placing) notify the meshes; the initial build does not need to
  remove(x: number, y: number, z: number) {
    const key = cellKey(x, y, z);
    const id = this.cells.get(key);
    if (!id) return;
    this.cells.delete(key);
    this.tints.delete(key);
    this.scales.delete(key);
    this.lists.delete(id);
    this.touchNeighbours(x, y, z);
    this.changed();
  }

  place(x: number, y: number, z: number, id: BlockId) {
    this.set(x, y, z, id);
    this.touchNeighbours(x, y, z);
    this.changed();
  }

  // a change can expose or bury the blocks around it, so their meshes rebuild too
  private touchNeighbours(x: number, y: number, z: number) {
    [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ].forEach(([dx, dy, dz]) => {
      const id = this.get(x + dx, y + dy, z + dz);
      if (id) this.lists.delete(id);
    });
  }

  solid(x: number, y: number, z: number) {
    const id = this.get(x, y, z);
    return id !== undefined && BLOCKS[id].solid;
  }

  ids() {
    return new Set(this.cells.values());
  }

  // an opaque full cube hides the face of whatever touches it
  private opaque(x: number, y: number, z: number) {
    const id = this.get(x, y, z);
    if (!id) return false;
    const def = BLOCKS[id];
    return def.solid && def.visible !== false && !def.clear;
  }

  // only blocks with at least one face in the open are drawn; buried ones cost nothing
  blocks(id: BlockId): Block[] {
    let list = this.lists.get(id);
    if (!list) {
      list = [];
      for (const [key, cell] of this.cells) {
        if (cell !== id) continue;
        const [x, y, z] = cellOf(key);
        const buried =
          this.opaque(x + 1, y, z) && this.opaque(x - 1, y, z) && this.opaque(x, y + 1, z) && this.opaque(x, y - 1, z) && this.opaque(x, y, z + 1) && this.opaque(x, y, z - 1);
        if (!buried) list.push({ x, y, z, tint: this.tints.get(key), scale: this.scales.get(key) });
      }
      this.lists.set(id, list);
    }
    return list;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private changed() {
    this.revision += 1;
    this.listeners.forEach((listener) => listener());
  }
}
