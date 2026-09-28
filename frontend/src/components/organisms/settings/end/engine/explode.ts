import * as THREE from 'three';
import { cue } from '../end-audio';
import type { DeathCause } from '../store';
import { useEndGame } from '../store';
import { spawnEffect } from './Effects';
import { playerCenter, runtime } from './runtime';
import { cellKey, type BlockId } from './world';

// what a blast can break: the soft blocks of the Overworld, never stone or the story's obsidian
const BRITTLE = new Set<BlockId>(['grass', 'dirt', 'leaves', 'planks', 'glass', 'hay', 'path', 'cobble', 'log', 'sand', 'sandstone', 'snowyGrass', 'snow', 'ice', 'spruceLog', 'spruceLeaves', 'cactus', 'tnt']);
const center = new THREE.Vector3();

// A creeper's or a TNT's blast: blocks within `radius` go (the Overworld remembers them as mined),
// and you are hurt and thrown back by how close you stood. Pelusa's spares the village.
export function explode(at: THREE.Vector3, radius: number, cause: DeathCause, breaks = true) {
  const world = runtime.world;
  if (!world) return;
  spawnEffect('explosion', at);
  cue('boom');
  const game = useEndGame.getState();
  const mined: number[] = [];
  for (let x = Math.floor(at.x - radius); breaks && x <= at.x + radius; x += 1) {
    for (let y = Math.floor(at.y - radius); y <= at.y + radius; y += 1) {
      for (let z = Math.floor(at.z - radius); z <= at.z + radius; z += 1) {
        const id = world.get(x, y, z);
        if (!id || !BRITTLE.has(id) || y <= -3 || Math.hypot(x - at.x, y - at.y, z - at.z) > radius - Math.random() * 0.8) continue;
        world.remove(x, y, z);
        mined.push(cellKey(x, y, z));
      }
    }
  }
  mined.forEach((key) => game.mine(key));
  playerCenter(center);
  const distance = center.distanceTo(at);
  const reach = radius * 2;
  if (distance < reach) {
    game.hurt(Math.round(16 * (1 - distance / reach) * (radius / 3)) + 1, cause);
    runtime.player.vel.add(center.clone().sub(at).normalize().multiplyScalar(9)).setY(7);
  }
}
