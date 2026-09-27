import * as THREE from 'three';
import { BLOCKS, type World } from './world';
import { runtime, type Target } from './runtime';

export interface BlockHit {
  readonly cell: readonly [number, number, number];
  readonly normal: readonly [number, number, number];
  readonly distance: number;
}

// Amanatides-Woo voxel traversal. Cells are centred on integers, so the grid is shifted by
// half a block to use floor-based stepping.
export function castBlocks(world: World, origin: THREE.Vector3, dir: THREE.Vector3, max: number, stopAt: (x: number, y: number, z: number) => boolean): BlockHit | null {
  const ox = origin.x + 0.5;
  const oy = origin.y + 0.5;
  const oz = origin.z + 0.5;
  let x = Math.floor(ox);
  let y = Math.floor(oy);
  let z = Math.floor(oz);
  const stepX = Math.sign(dir.x);
  const stepY = Math.sign(dir.y);
  const stepZ = Math.sign(dir.z);
  const deltaX = stepX ? Math.abs(1 / dir.x) : Infinity;
  const deltaY = stepY ? Math.abs(1 / dir.y) : Infinity;
  const deltaZ = stepZ ? Math.abs(1 / dir.z) : Infinity;
  let maxX = stepX ? (stepX > 0 ? x + 1 - ox : ox - x) * deltaX : Infinity;
  let maxY = stepY ? (stepY > 0 ? y + 1 - oy : oy - y) * deltaY : Infinity;
  let maxZ = stepZ ? (stepZ > 0 ? z + 1 - oz : oz - z) * deltaZ : Infinity;
  let normal: [number, number, number] = [0, 0, 0];
  let distance = 0;
  if (stopAt(x, y, z)) return { cell: [x, y, z], normal, distance };
  while (distance <= max) {
    if (maxX < maxY && maxX < maxZ) {
      x += stepX;
      distance = maxX;
      maxX += deltaX;
      normal = [-stepX, 0, 0];
    } else if (maxY < maxZ) {
      y += stepY;
      distance = maxY;
      maxY += deltaY;
      normal = [0, -stepY, 0];
    } else {
      z += stepZ;
      distance = maxZ;
      maxZ += deltaZ;
      normal = [0, 0, -stepZ];
    }
    if (distance > max) break;
    if (stopAt(x, y, z)) return { cell: [x, y, z], normal, distance };
  }
  return null;
}

// what the crosshair can touch: visible blocks, not barriers or the cells props stand in
export function aimable(world: World) {
  return (x: number, y: number, z: number) => {
    const id = world.get(x, y, z);
    return id !== undefined && BLOCKS[id].solid && BLOCKS[id].visible !== false;
  };
}

export function solidCell(world: World) {
  return (x: number, y: number, z: number) => world.solid(x, y, z);
}

const ray = new THREE.Ray();
const point = new THREE.Vector3();

export function castTargets(origin: THREE.Vector3, dir: THREE.Vector3, max: number, accept: (target: Target) => boolean) {
  ray.set(origin, dir);
  let best: Target | null = null;
  let bestDistance = max;
  runtime.targets.forEach((target) => {
    if (!accept(target) || !ray.intersectBox(target.box, point)) return;
    const distance = point.distanceTo(origin);
    if (distance < bestDistance) {
      best = target;
      bestDistance = distance;
    }
  });
  return best ? { target: best as Target, distance: bestDistance } : null;
}
