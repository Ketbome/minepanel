import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';
import { isBright } from '../engine/clock';
import { spawnEffect } from '../engine/Effects';
import { runtime } from '../engine/runtime';

// nothing solid above it all the way up: the sun reaches it
function underSky(at: THREE.Vector3) {
  const world = runtime.world;
  if (!world) return false;
  const x = Math.round(at.x);
  const z = Math.round(at.z);
  for (let y = Math.round(at.y) + 2; y < at.y + 40; y += 1) if (world.solid(x, y, z)) return false;
  return true;
}

// The undead of the Overworld (skeletons, zombies, phantoms) catch fire under the open sky by day
// and lose a heart a second, like the game's; shade saves them.
export function useSunBurn(root: React.RefObject<THREE.Group | null>, dead: () => boolean, harm: (amount: number) => void, enabled = true) {
  const next = useRef(0);
  useFrame(() => {
    const group = root.current;
    if (!enabled || !group || dead() || runtime.time < next.current || !isBright() || !underSky(group.position)) return;
    next.current = runtime.time + 1;
    spawnEffect('debris', group.position.clone().setY(group.position.y + 1.2), '#ff8a2a');
    harm(1);
  });
}
