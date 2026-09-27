import { hash } from '../voxels';

// Where things are in the Overworld. The map panel reads this too, so it lives apart from the
// scene. One unit is one block; the ground's top layer sits at y = 0 around the camp.

export const OVERWORLD_RADIUS = 46;
export const CAMP = { x: 0, z: 0 };
export const VILLAGE = { x: -24, z: -16 };
export const RUINED = { x: 22, z: -20 };
export const CAVE = { x: -26, z: 24 };
export const DIG = { x: 26, z: 20 };

// places that stay flat so houses, the portal and the camp sit on level ground
const FLAT = [
  { ...CAMP, radius: 7 },
  { ...VILLAGE, radius: 13 },
  { ...RUINED, radius: 6 },
  { ...DIG, radius: 3 },
  { x: CAVE.x + 2, z: CAVE.z - 5, radius: 4 },
];

export function groundHeight(x: number, z: number) {
  if (FLAT.some((spot) => Math.hypot(x - spot.x, z - spot.z) < spot.radius)) return 0;
  // the cave sits in a hill
  const hill = Math.max(0, 7 - Math.hypot(x - CAVE.x, z - CAVE.z) * 0.8);
  const n = Math.sin(x * 0.19 + 1.3) * Math.cos(z * 0.17 - 0.4) + Math.sin((x - z) * 0.11) * 0.7 + (hash(Math.floor(x / 5), Math.floor(z / 5), 9) - 0.5) * 0.6;
  const rim = Math.max(0, Math.max(Math.abs(x), Math.abs(z)) - 34) * 0.35;
  return Math.max(0, Math.round(Math.max(hill, n * 1.2 + rim)));
}

export const MAP = [
  { ...CAMP, mark: '■', color: '#e0a060' },
  { ...VILLAGE, mark: '▲', color: '#f5f0c8' },
  { ...RUINED, mark: '◆', color: '#c77dff' },
  { ...CAVE, mark: '?', color: '#ff6b6b' },
] as const;
