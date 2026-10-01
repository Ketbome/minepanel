import { hash } from '../voxels';

// Where things are in The Sift. The frame you arrive through stands in Singer's Meadow; Lullaby
// Hills rise to the west (-x), and the Carapace lies ahead (-z), with the skull and its chest at
// the far end. Everything here is pure, so the builder and the scene agree on the ground.

export type Region = 'meadow' | 'hills' | 'carapace';

export const BOUNDS = { x0: -70, x1: 50, z0: -160, z1: 12 };
export const PORTAL = { x0: -3, x1: 3, y1: 6, z: 6 };
export const SPAWN = [0.5, 2.5] as const;
const CARAPACE_Z = -80;
const HILLS_X = -24;
// the hills' highest dome, with the bone circle on top
export const SUMMIT = { x: -50, z: -40, radius: 14, rise: 6 };
export const RIBS = [-92, -100, -108, -116, -124, -132];
export const RIB_SPAN = 14;
export const RIB_RISE = 16;
export const SKULL = { x0: -7, x1: 7, y1: 11, z0: -152, z1: -140 };
export const CHEST_AT = [0, 2, -147] as const;
// ichor pools and the meadow's shallow ponds: [x, z, radius]
export const POOLS = [
  [20, -64, 2],
  [-14, -98, 3],
  [14, -106, 3],
  [-26, -112, 3],
  [-9, -122, 2],
  [18, -134, 3],
  [30, -92, 2],
] as const;
export const PONDS = [
  [14, -18, 3],
  [26, -44, 4],
  [-8, -54, 3],
] as const;
// the old fossils scattered over the Carapace: [x, z, span, rise]
export const FOSSILS = [
  [-34, -100, 4, 5],
  [34, -118, 5, 6],
  [-40, -140, 4, 4],
  [30, -148, 3, 5],
] as const;

const smooth = (t: number) => Math.min(1, Math.max(0, t));

export function regionAt(x: number, z: number): Region {
  const edge = Math.round((hash(x, 0, 61) - 0.5) * 6);
  if (z < CARAPACE_Z + edge) return 'carapace';
  if (x < HILLS_X + Math.round((hash(0, z, 65) - 0.5) * 6)) return 'hills';
  return 'meadow';
}

// gentle rolls in the meadow, tall slow hills to the west, long dunes in the Carapace, blended at
// the borders so there is never a cliff
function baseHeight(x: number, z: number) {
  const meadow = 1 + Math.sin(x * 0.19) * 0.9 + Math.cos(z * 0.16 + x * 0.07) * 1.1 + Math.sin((x + z) * 0.08) * 0.8;
  const summit = Math.max(0, 1 - Math.hypot(x - SUMMIT.x, z - SUMMIT.z) / SUMMIT.radius) * SUMMIT.rise;
  const hills = 5 + Math.sin(x * 0.07) * 2.5 + Math.cos(z * 0.06 + x * 0.03) * 2.5 + Math.sin((x - z) * 0.05) * 2 + summit;
  const carapace = 1 + Math.sin(x * 0.11 + z * 0.05) * 1.4 + Math.cos(z * 0.09) * 0.6;
  const west = smooth((HILLS_X + 2 - x) / 10);
  const ahead = smooth((CARAPACE_Z + 4 - z) / 8);
  const land = meadow * (1 - west) + hills * west;
  return Math.max(0, Math.min(16, Math.round(land * (1 - ahead) + carapace * ahead)));
}

export function groundAt(x: number, z: number) {
  if (Math.hypot(x - SPAWN[0], z - SPAWN[1]) < 7) return 0;
  if (x >= SKULL.x0 - 1 && x <= SKULL.x1 + 1 && z >= SKULL.z0 - 1 && z <= SKULL.z1 + 2) return 1;
  // pools and ponds lie level, with a flat rim
  const pool = [...POOLS, ...PONDS].find(([px, pz, r]) => Math.hypot(x - px, z - pz) <= r + 1.5);
  return pool ? baseHeight(pool[0], pool[1]) : baseHeight(x, z);
}

// trees on a jittered grid: many in the meadow, a few on the hills, none near the frame or water
export const TREES: readonly (readonly [number, number])[] = (() => {
  const spots: [number, number][] = [];
  for (let gx = BOUNDS.x0 + 6; gx <= BOUNDS.x1 - 6; gx += 9) {
    for (let gz = BOUNDS.z1 - 6; gz >= CARAPACE_Z + 6; gz -= 9) {
      const x = gx + Math.round((hash(gx, gz, 71) - 0.5) * 5);
      const z = gz + Math.round((hash(gz, gx, 72) - 0.5) * 5);
      const region = regionAt(x, z);
      const keep = region === 'meadow' ? 0.35 : 0.8;
      const wet = [...POOLS, ...PONDS].some(([px, pz, r]) => Math.hypot(x - px, z - pz) < r + 5);
      if (hash(x, z, 73) > keep && !wet && Math.hypot(x - SPAWN[0], z - SPAWN[1]) > 11 && Math.hypot(x - SUMMIT.x, z - SUMMIT.z) > 8) spots.push([x, z]);
    }
  }
  return spots;
})();

// the singing flowers of Lullaby Hills, each with its note of D minor's pentatonic scale
const SCALE = [62, 65, 67, 69, 72, 74, 77];
export const FLOWERS: readonly { readonly x: number; readonly z: number; readonly pitch: number }[] = (() => {
  const out: { x: number; z: number; pitch: number }[] = [];
  for (let x = BOUNDS.x0 + 2; x < HILLS_X - 2; x += 3) {
    for (let z = BOUNDS.z1 - 4; z > CARAPACE_Z + 4; z -= 3) {
      const fx = x + Math.round((hash(x, z, 81) - 0.5) * 2);
      const fz = z + Math.round((hash(z, x, 82) - 0.5) * 2);
      if (regionAt(fx, fz) === 'hills' && hash(fx, fz, 83) > 0.72 && !TREES.some(([tx, tz]) => Math.hypot(fx - tx, fz - tz) < 5)) out.push({ x: fx, z: fz, pitch: SCALE[Math.floor(hash(fx, fz, 84) * SCALE.length)] });
    }
  }
  return out;
})();
