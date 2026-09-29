import type * as THREE from 'three';
import type { World } from './world';

// The player is an axis-aligned box standing on `pos` (feet centre). Movement is swept one
// axis at a time in short steps, and a blocked axis snaps flush to the block face it hit.

export const HALF_WIDTH = 0.3;
export const HEIGHT = 1.8;
export const GRAVITY = 28;
export const JUMP_SPEED = 8.6;
const STEP = 0.35;
const EPSILON = 1e-4;

export function overlaps(world: World, x: number, y: number, z: number, height = HEIGHT, half = HALF_WIDTH) {
  const x0 = Math.round(x - half + EPSILON);
  const x1 = Math.round(x + half - EPSILON);
  const y0 = Math.round(y + EPSILON);
  const y1 = Math.round(y + height - EPSILON);
  const z0 = Math.round(z - half + EPSILON);
  const z1 = Math.round(z + half - EPSILON);
  for (let cx = x0; cx <= x1; cx += 1) {
    for (let cy = y0; cy <= y1; cy += 1) {
      for (let cz = z0; cz <= z1; cz += 1) if (world.solid(cx, cy, cz)) return true;
    }
  }
  return false;
}

export interface MoveResult {
  onGround: boolean;
  hitX: boolean;
  hitZ: boolean;
  hitCeiling: boolean;
}

export function move(world: World, pos: THREE.Vector3, delta: THREE.Vector3, height = HEIGHT, half = HALF_WIDTH): MoveResult {
  const result: MoveResult = { onGround: false, hitX: false, hitZ: false, hitCeiling: false };
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(delta.x), Math.abs(delta.y), Math.abs(delta.z)) / STEP));
  const dx = delta.x / steps;
  const dy = delta.y / steps;
  const dz = delta.z / steps;
  for (let step = 0; step < steps; step += 1) {
    if (dy !== 0) {
      pos.y += dy;
      if (overlaps(world, pos.x, pos.y, pos.z, height, half)) {
        if (dy < 0) {
          pos.y = Math.floor(pos.y + 0.5 + EPSILON) + 0.5;
          result.onGround = true;
        } else {
          pos.y = Math.floor(pos.y + height + 0.5) - 0.5 - height - EPSILON;
          result.hitCeiling = true;
        }
      }
    }
    if (dx !== 0 && !result.hitX) {
      pos.x += dx;
      if (overlaps(world, pos.x, pos.y, pos.z, height, half)) {
        pos.x = dx > 0 ? Math.floor(pos.x + half + 0.5) - 0.5 - half - EPSILON : Math.floor(pos.x - half + 0.5) + 0.5 + half + EPSILON;
        result.hitX = true;
      }
    }
    if (dz !== 0 && !result.hitZ) {
      pos.z += dz;
      if (overlaps(world, pos.x, pos.y, pos.z, height, half)) {
        pos.z = dz > 0 ? Math.floor(pos.z + half + 0.5) - 0.5 - half - EPSILON : Math.floor(pos.z - half + 0.5) + 0.5 + half + EPSILON;
        result.hitZ = true;
      }
    }
  }
  if (!result.onGround && delta.y <= 0) result.onGround = overlaps(world, pos.x, pos.y - 0.05, pos.z, 0.05, half);
  return result;
}

// whether a one-block step in the walking direction could be climbed with a jump
export function canStepUp(world: World, pos: THREE.Vector3, dirX: number, dirZ: number, height = HEIGHT, half = HALF_WIDTH) {
  // probe along the actual heading: rounding it to a diagonal would test a wall beside the step
  const length = Math.hypot(dirX, dirZ) || 1;
  const x = pos.x + (dirX / length) * (half + 0.2);
  const z = pos.z + (dirZ / length) * (half + 0.2);
  const blocked = overlaps(world, x, pos.y, z, 0.9, half);
  return blocked && !overlaps(world, x, pos.y + 1.05, z, height, half);
}

// how far the ground drops one step ahead; mobs refuse to walk off anything deeper than 3, and
// lava and ichor count as a bottomless drop, so they never wander into them
export function dropAhead(world: World, pos: THREE.Vector3, dirX: number, dirZ: number, half: number) {
  const x = Math.round(pos.x + dirX * (half + 0.45));
  const z = Math.round(pos.z + dirZ * (half + 0.45));
  const feet = Math.round(pos.y + 0.01);
  for (let depth = 0; depth <= 4; depth += 1) {
    const below = world.get(x, feet - 1 - depth, z);
    if (below === 'lava' || below === 'ichor') return 5;
    if (world.solid(x, feet - 1 - depth, z)) return depth;
  }
  return 5;
}

export function cellsInBody(pos: THREE.Vector3, visit: (x: number, y: number, z: number) => boolean | void) {
  for (let x = Math.round(pos.x - HALF_WIDTH); x <= Math.round(pos.x + HALF_WIDTH); x += 1) {
    for (let y = Math.round(pos.y); y <= Math.round(pos.y + HEIGHT - 0.1); y += 1) {
      for (let z = Math.round(pos.z - HALF_WIDTH); z <= Math.round(pos.z + HALF_WIDTH); z += 1) if (visit(x, y, z)) return true;
    }
  }
  return false;
}

// y of the walkable top under (x, z), searching a few blocks around `near`; mobs stand on it
export function surface(world: World, x: number, z: number, near: number) {
  const cx = Math.round(x);
  const cz = Math.round(z);
  for (let y = Math.round(near) + 2; y >= Math.round(near) - 8; y -= 1) {
    if (world.solid(cx, y, cz) && !world.solid(cx, y + 1, cz)) return y + 0.5;
  }
  return near;
}
