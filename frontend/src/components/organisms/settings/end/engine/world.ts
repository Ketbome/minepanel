import type { ItemId } from '../items';
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
  | 'netherGold'
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
  | 'endRod'
  | 'sand'
  | 'sandstone'
  | 'snowyGrass'
  | 'snow'
  | 'ice'
  | 'spruceLog'
  | 'spruceLeaves'
  | 'cactus'
  | 'tnt'
  | 'siftGrass'
  | 'hillGrass'
  | 'siftSculk'
  | 'siftSand'
  | 'paleLog'
  | 'paleLeaves'
  | 'boneBlock'
  | 'ichor';

interface BlockDef {
  readonly solid: boolean;
  // seconds to break by hand, and with the pickaxe; a block with neither cannot be mined, one
  // with only `pick` needs the pickaxe
  readonly mine?: number;
  readonly pick?: number;
  // what breaking it puts in your inventory
  readonly drop?: ItemId;
  readonly drops?: number;
  readonly visible?: boolean;
  // see-through blocks never hide the faces of their neighbours
  readonly clear?: boolean;
}

export const BLOCKS: Record<BlockId, BlockDef> = {
  grass: { solid: true, mine: 0.9, pick: 0.45, drop: 'dirt' },
  dirt: { solid: true, mine: 0.75, pick: 0.4, drop: 'dirt' },
  stone: { solid: true, pick: 0.6, drop: 'cobble' },
  cobble: { solid: true, pick: 0.7, drop: 'cobble' },
  path: { solid: true, mine: 0.9, pick: 0.45, drop: 'dirt' },
  log: { solid: true, mine: 2.4, pick: 1.4, drop: 'log' },
  leaves: { solid: true, clear: true, mine: 0.3 },
  planks: { solid: true, mine: 2.4, pick: 1.4, drop: 'planks' },
  glass: { solid: true, clear: true, mine: 0.4 },
  hay: { solid: true },
  water: { solid: false, clear: true },
  barrier: { solid: true, visible: false },
  prop: { solid: true, visible: false },
  obsidian: { solid: true, pick: 4, drop: 'obsidian' },
  crying: { solid: true },
  goldBlock: { solid: true, pick: 1.2, drop: 'gold', drops: 9 },
  netherrack: { solid: true, mine: 2, pick: 0.3, drop: 'netherrack' },
  netherGold: { solid: true, mine: 2.5, pick: 0.5, drop: 'gold', drops: 2 },
  netherBricks: { solid: true },
  glowstone: { solid: true },
  magma: { solid: true },
  lava: { solid: false },
  deepslate: { solid: true },
  deepBricks: { solid: true },
  reinforced: { solid: true },
  sculk: { solid: true, mine: 0.5, pick: 0.3 },
  bricks: { solid: true },
  mossy: { solid: true },
  cracked: { solid: true },
  bookshelf: { solid: true },
  endStone: { solid: true, pick: 0.9, drop: 'endStone' },
  endBricks: { solid: true },
  bedrock: { solid: true },
  purpur: { solid: true },
  purpurPillar: { solid: true },
  chorus: { solid: false },
  chorusFlower: { solid: false },
  endRod: { solid: false },
  // the biomes' blocks drop nothing: there are no items for them yet
  sand: { solid: true, mine: 0.5, pick: 0.3, drop: 'sand' },
  sandstone: { solid: true, pick: 0.8 },
  snowyGrass: { solid: true, mine: 0.9, pick: 0.45, drop: 'dirt' },
  snow: { solid: true, mine: 0.3 },
  ice: { solid: true, clear: true, mine: 0.5 },
  spruceLog: { solid: true, mine: 2.4, pick: 1.4, drop: 'log' },
  spruceLeaves: { solid: true, clear: true, mine: 0.3 },
  cactus: { solid: true, clear: true, mine: 0.4 },
  tnt: { solid: true, mine: 0.1, drop: 'tnt' },
  // The Sift's blocks drop nothing either
  siftGrass: { solid: true, mine: 0.9, pick: 0.45 },
  hillGrass: { solid: true, mine: 0.9, pick: 0.45 },
  siftSculk: { solid: true, mine: 0.5, pick: 0.3 },
  siftSand: { solid: true, mine: 0.5, pick: 0.3 },
  paleLog: { solid: true, mine: 2.4, pick: 1.4 },
  paleLeaves: { solid: true, clear: true, mine: 0.3 },
  boneBlock: { solid: true, pick: 0.8 },
  ichor: { solid: false },
};

const OFFSET = 512;
const SPAN = 1024;

export const cellKey = (x: number, y: number, z: number) => ((x + OFFSET) * SPAN + (y + OFFSET)) * SPAN + (z + OFFSET);

export function cellOf(key: number): [number, number, number] {
  const z = (key % SPAN) - OFFSET;
  const rest = Math.floor(key / SPAN);
  return [Math.floor(rest / SPAN) - OFFSET, (rest % SPAN) - OFFSET, z];
}

// Meshes are built per chunk of CHUNK x CHUNK columns (full height), so a mined block only
// rebuilds its own chunk, and three culls the chunks the camera does not see.
export const CHUNK = 32;
const CHUNKS = SPAN / CHUNK;

export const chunkKey = (x: number, z: number) => (Math.floor(x / CHUNK) + CHUNKS / 2) * CHUNKS + Math.floor(z / CHUNK) + CHUNKS / 2;

// the centre column of a chunk, for distance checks
export function chunkCenter(key: number): [number, number] {
  return [(Math.floor(key / CHUNKS) - CHUNKS / 2 + 0.5) * CHUNK - 0.5, ((key % CHUNKS) - CHUNKS / 2 + 0.5) * CHUNK - 0.5];
}

export interface WorldOptions {
  // nobody looks up at the world from below this y, so faces pointing down into it are not drawn
  readonly floor?: number;
}

export class World {
  private readonly cells = new Map<number, BlockId>();
  private readonly tints = new Map<number, number>();
  private readonly scales = new Map<number, readonly [number, number, number]>();
  private readonly chunks = new Map<number, Set<number>>();
  private readonly lists = new Map<number, ReadonlyMap<BlockId, Block[]>>();
  private readonly revisions = new Map<number, number>();
  private readonly listeners = new Set<() => void>();
  private readonly floor: number;
  revision = 0;

  constructor({ floor = -Infinity }: WorldOptions = {}) {
    this.floor = floor;
  }

  get(x: number, y: number, z: number) {
    return this.cells.get(cellKey(x, y, z));
  }

  set(x: number, y: number, z: number, id: BlockId, tint?: number, scale?: readonly [number, number, number]) {
    const key = cellKey(x, y, z);
    this.cells.set(key, id);
    if (tint === undefined) this.tints.delete(key);
    else this.tints.set(key, tint);
    if (scale) this.scales.set(key, scale);
    const chunk = chunkKey(x, z);
    let members = this.chunks.get(chunk);
    if (!members) {
      members = new Set();
      this.chunks.set(chunk, members);
    }
    members.add(key);
    this.invalidate(chunk);
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
    if (!this.cells.has(key)) return;
    this.cells.delete(key);
    this.tints.delete(key);
    this.scales.delete(key);
    const chunk = chunkKey(x, z);
    this.chunks.get(chunk)?.delete(key);
    this.invalidate(chunk);
    this.touchNeighbours(x, z);
    this.changed();
  }

  place(x: number, y: number, z: number, id: BlockId) {
    this.set(x, y, z, id);
    this.touchNeighbours(x, z);
    this.changed();
  }

  // a change can expose or bury the blocks around it; across a chunk border that is another mesh
  private touchNeighbours(x: number, z: number) {
    const own = chunkKey(x, z);
    [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].forEach(([dx, dz]) => {
      const chunk = chunkKey(x + dx, z + dz);
      if (chunk !== own) this.invalidate(chunk);
    });
  }

  private invalidate(chunk: number) {
    if (!this.lists.delete(chunk) && this.revisions.has(chunk)) return;
    this.revisions.set(chunk, (this.revisions.get(chunk) ?? 0) + 1);
  }

  solid(x: number, y: number, z: number) {
    const id = this.get(x, y, z);
    return id !== undefined && BLOCKS[id].solid;
  }

  chunkKeys() {
    return [...this.chunks.keys()];
  }

  chunkRevision(chunk: number) {
    return this.revisions.get(chunk) ?? 0;
  }

  // an opaque full cube hides the face of whatever touches it
  private opaque(x: number, y: number, z: number) {
    const id = this.get(x, y, z);
    if (!id) return false;
    const def = BLOCKS[id];
    return def.solid && def.visible !== false && !def.clear;
  }

  // only blocks with at least one face in the open are drawn; buried ones cost nothing
  chunkBlocks(chunk: number): ReadonlyMap<BlockId, Block[]> {
    let lists = this.lists.get(chunk);
    if (!lists) {
      const built = new Map<BlockId, Block[]>();
      for (const key of this.chunks.get(chunk) ?? []) {
        const id = this.cells.get(key);
        if (!id || BLOCKS[id].visible === false) continue;
        const [x, y, z] = cellOf(key);
        const buried =
          this.opaque(x + 1, y, z) && this.opaque(x - 1, y, z) && this.opaque(x, y + 1, z) && (y - 1 < this.floor || this.opaque(x, y - 1, z)) && this.opaque(x, y, z + 1) && this.opaque(x, y, z - 1);
        if (buried) continue;
        let list = built.get(id);
        if (!list) {
          list = [];
          built.set(id, list);
        }
        list.push({ x, y, z, tint: this.tints.get(key), scale: this.scales.get(key) });
      }
      lists = built;
      this.lists.set(chunk, lists);
    }
    return lists;
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
