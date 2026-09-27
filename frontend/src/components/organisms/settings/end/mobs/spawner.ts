import { useFrame } from '@react-three/fiber';
import { useCallback, useRef, useState } from 'react';
import type * as THREE from 'three';
import { runtime } from '../engine/runtime';
import type { Wander } from './parts';

export interface Spawn {
  readonly id: string;
  readonly wander: Wander;
}

interface SpawnerOptions {
  // most of this kind alive at once
  readonly cap: number;
  // how far from the player a new one appears, and past which one unloads
  readonly min: number;
  readonly max: number;
  readonly despawn: number;
  // seconds between spawn attempts
  readonly every: number;
  readonly allowed: () => boolean;
  // where one can stand at this column (feet position), or null
  readonly spot: (x: number, z: number) => THREE.Vector3 | null;
  readonly radius?: number;
  readonly speed?: number;
}

// Natural spawning the game's way: now and then, while the conditions hold and there is room under
// the cap, a mob appears on a random column at some distance from the player; the ones left far
// behind unload. The zone renders what it returns and calls `died` when one is gone.
export function useSpawner(kind: string, { cap, min, max, despawn, every, allowed, spot, radius = 5, speed = 1 }: SpawnerOptions) {
  const [spawns, setSpawns] = useState<readonly Spawn[]>([]);
  const state = useRef({ next: 0, count: 0, spawns: [] as readonly Spawn[] });
  const update = useCallback((next: readonly Spawn[]) => {
    state.current.spawns = next;
    setSpawns(next);
  }, []);

  useFrame(() => {
    const s = state.current;
    if (runtime.time < s.next) return;
    s.next = runtime.time + every;
    const player = runtime.player.pos;
    const kept = s.spawns.filter(({ wander }) => Math.hypot(wander.home.x - player.x, wander.home.z - player.z) < despawn);
    let added: Spawn | null = null;
    if (kept.length < cap && allowed()) {
      const angle = Math.random() * Math.PI * 2;
      const distance = min + Math.random() * (max - min);
      const home = spot(Math.round(player.x + Math.cos(angle) * distance), Math.round(player.z + Math.sin(angle) * distance));
      if (home) {
        s.count += 1;
        added = { id: `${kind}-${s.count}`, wander: { home, radius, speed } };
      }
    }
    if (added) update([...kept, added]);
    else if (kept.length !== s.spawns.length) update(kept);
  });

  const died = useCallback((id: string) => update(state.current.spawns.filter((spawn) => spawn.id !== id)), [update]);
  return { spawns, died };
}
