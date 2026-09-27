import { useEffect } from 'react';
import * as THREE from 'three';
import type { ItemId } from '../items';
import type { LoreKey } from '../lore/en';
import type { DeathCause } from '../store';
import { input } from './input';
import type { World } from './world';

// Per-frame state shared by the player, the mobs and the zones. It changes every frame, so it
// lives outside React and zustand; the store only holds what the HUD has to render.

export type HitSource = 'melee' | 'arrow' | 'fireball';

export interface Target {
  readonly box: THREE.Box3;
  // what the crosshair label says; null hides it
  readonly label?: () => LoreKey | null;
  readonly use?: () => void;
  readonly hit?: (damage: number, source: HitSource) => void;
  // called every frame the crosshair rests on it, from any distance (endermen)
  readonly watch?: (dt: number) => void;
  readonly reach?: number;
  // blocks arrows and fireballs
  readonly solid?: boolean;
  // an ender pearl landing here does this instead of teleporting you (the End gateway)
  readonly pearl?: () => void;
}

export interface Projectile {
  kind: 'arrow' | 'fireball' | 'ghastball' | 'dragonball' | 'pearl' | 'bullet';
  readonly pos: THREE.Vector3;
  readonly vel: THREE.Vector3;
  gravity: number;
  fromPlayer: boolean;
  damage: number;
  cause: DeathCause;
  age: number;
  done: boolean;
  // a deflected ghast fireball becomes the player's
  target?: Target;
  onLand?: (at: THREE.Vector3, hit: Target | null) => void;
}

export interface Cloud {
  readonly pos: THREE.Vector3;
  readonly radius: number;
  until: number;
}

export const runtime = {
  world: null as World | null,
  voidY: -40,
  targets: new Set<Target>(),
  projectiles: [] as Projectile[],
  clouds: [] as Cloud[],
  player: {
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    onGround: false,
    sneaking: false,
    sprinting: false,
    gliding: false,
    // highest point since leaving the ground, for fall damage
    peak: 0,
    eye: new THREE.Vector3(),
    look: new THREE.Vector3(0, 0, -1),
    lastLevitation: -1e9,
  },
  time: 0,
  // the system asks for less motion: no view bobbing, no field-of-view kicks, no hand sway
  reducedMotion: false,
  // zones hook into what the player does with a held item or a mined block
  hooks: {
    useItem: null as ((item: ItemId) => boolean) | null,
    mined: null as ((x: number, y: number, z: number) => void) | null,
  },
  canvas: null as HTMLCanvasElement | null,
};

export function lockPointer() {
  if (runtime.canvas && !document.pointerLockElement && !input.touch) {
    void Promise.resolve(runtime.canvas.requestPointerLock()).catch(() => {});
  }
}

export const EYE_HEIGHT = 1.62;
export const SNEAK_EYE = 1.32;

export function useTarget(target: Target | null) {
  useEffect(() => {
    if (!target) return;
    runtime.targets.add(target);
    return () => {
      runtime.targets.delete(target);
    };
  }, [target]);
}

export function cellBox(x: number, y: number, z: number, height = 1) {
  return new THREE.Box3(new THREE.Vector3(x - 0.5, y - 0.5, z - 0.5), new THREE.Vector3(x + 0.5, y - 0.5 + height, z + 0.5));
}

export function playerCenter(out: THREE.Vector3) {
  return out.copy(runtime.player.pos).setY(runtime.player.pos.y + 0.9);
}
