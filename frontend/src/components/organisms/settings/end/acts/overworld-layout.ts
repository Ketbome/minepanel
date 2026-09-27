import { createNoise2D } from 'simplex-noise';
import { hash, rng } from '../voxels';

// Where things are in the Overworld. The map panel reads this too, so it lives apart from the
// scene. One unit is one block; the ground's top layer sits at y = 0 around the camp.

export const OVERWORLD_RADIUS = 128;
export const CAMP = { x: 0, z: 0 };
export const VILLAGE = { x: -24, z: -16 };
export const RUINED = { x: 22, z: -20 };
export const CAVE = { x: -26, z: 24 };
export const DIG = { x: 26, z: 20 };

// the four biomes around the story, each with a structure and one of Ketbome's unfinished servers
export const TEMPLE = { x: 96, z: -4 };
export const PYRAMID = { x: 92, z: 26 };
export const IGLOO = { x: -4, z: -98 };
export const DOME = { x: 24, z: -92 };
export const HUT = { x: -98, z: 8 };
export const PEN = { x: -92, z: -22 };
export const WRECK = { x: -20, z: 101 };
export const HARBOR = { x: 36, z: 84 };
// Bfuuny's note: "3 steps north of the lone cactus on the beach"
export const BEACH_CACTUS = { x: 12, z: 86 };
export const TREASURE = { x: 12, z: 83 };

export type Biome = 'plains' | 'taiga' | 'desert' | 'swamp' | 'coast';

// the story lives inside CORE; past BLEND the biomes have taken over
const CORE = 50;
const BLEND = 64;
// north is -z, like the game's
const SECTORS: readonly (readonly [Biome, number])[] = [
  ['desert', 0],
  ['coast', Math.PI / 2],
  ['swamp', Math.PI],
  ['taiga', -Math.PI / 2],
];

const warp = createNoise2D(rng(71));
const hills = createNoise2D(rng(72));
const detail = createNoise2D(rng(73));

// places that stay level so houses, the portal, the camp and the structures sit on flat ground
const FLAT = [
  { ...CAMP, radius: 7, level: 0 },
  { ...VILLAGE, radius: 13, level: 0 },
  { ...RUINED, radius: 6, level: 0 },
  { ...DIG, radius: 3, level: 0 },
  { x: CAVE.x + 2, z: CAVE.z - 5, radius: 4, level: 0 },
  { ...TEMPLE, radius: 8, level: 1 },
  { ...PYRAMID, radius: 5, level: 1 },
  { ...IGLOO, radius: 6, level: 3 },
  { ...DOME, radius: 5, level: 3 },
  { ...HUT, radius: 5, level: 0 },
  { ...PEN, radius: 6, level: 0 },
  { ...WRECK, radius: 7, level: -1 },
  { ...HARBOR, radius: 3, level: 1 },
  { x: BEACH_CACTUS.x, z: BEACH_CACTUS.z - 1, radius: 4, level: 1 },
];

const smooth = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

// the angle around the camp, bent by noise so the borders between biomes wander
function bent(x: number, z: number) {
  return Math.atan2(z, x) + warp(x / 90, z / 90) * 0.35;
}

function weights(x: number, z: number) {
  const angle = bent(x, z);
  const raw = SECTORS.map(([, center]) => Math.max(0, Math.cos(angle - center)) ** 2);
  const total = raw.reduce((sum, w) => sum + w, 0);
  return raw.map((w) => w / total);
}

export function biomeAt(x: number, z: number): Biome {
  if (Math.hypot(x, z) < (CORE + BLEND) / 2) return 'plains';
  const w = weights(x, z);
  return SECTORS[w.indexOf(Math.max(...w))][0];
}

function biomeHeight(biome: Biome, x: number, z: number) {
  const n = hills(x / 48, z / 48);
  const d = detail(x / 12, z / 12);
  if (biome === 'taiga') return 3 + n * 3 + d;
  if (biome === 'desert') return 1.5 + n * 1.5 + d * 0.8;
  if (biome === 'swamp') return n * 0.9 + d * 0.5;
  if (biome === 'coast') return 1 + n * 1.2 - smooth(84, 98, z) * (3 + n * 1.2) + d * 0.3;
  return 1 + n * 1.5 + d * 0.5;
}

// the story's rolling plains, as they were before the biomes
function coreHeight(x: number, z: number) {
  // the cave sits in a hill
  const hill = Math.max(0, 7 - Math.hypot(x - CAVE.x, z - CAVE.z) * 0.8);
  const n = Math.sin(x * 0.19 + 1.3) * Math.cos(z * 0.17 - 0.4) + Math.sin((x - z) * 0.11) * 0.7 + (hash(Math.floor(x / 5), Math.floor(z / 5), 9) - 0.5) * 0.6;
  return Math.max(hill, n * 1.2);
}

// the top block's y; below 0 the column is under water
export function groundHeight(x: number, z: number) {
  const distance = Math.hypot(x, z);
  let h = coreHeight(x, z);
  if (distance > CORE) {
    const w = weights(x, z);
    const outer = SECTORS.reduce((sum, [biome], index) => sum + w[index] * biomeHeight(biome, x, z), 0);
    h += (outer - h) * smooth(CORE, BLEND, distance);
  } else {
    h = Math.max(0, h);
  }
  for (const spot of FLAT) {
    const gap = Math.hypot(x - spot.x, z - spot.z) - spot.radius;
    if (gap < 0) return spot.level;
    if (gap < 4) h += (spot.level - h) * (1 - gap / 4);
  }
  return Math.max(-2, Math.round(h));
}

// inside a levelled spot (or `margin` blocks around it): nothing grows there
export function isLevelled(x: number, z: number, margin = 0) {
  return FLAT.some((spot) => Math.hypot(x - spot.x, z - spot.z) < spot.radius + margin);
}

export const MAP = [
  { ...CAMP, mark: '■', color: '#e0a060' },
  { ...VILLAGE, mark: '▲', color: '#f5f0c8' },
  { ...RUINED, mark: '◆', color: '#c77dff' },
  { ...CAVE, mark: '?', color: '#ff6b6b' },
] as const;
