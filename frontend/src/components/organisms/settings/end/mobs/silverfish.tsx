'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { cue } from '../end-audio';
import { runtime } from '../engine/runtime';
import { useEndGame } from '../store';
import { PX, useDamage, useMob, useMobTarget } from './parts';
import { Box, useSkin, type SkinArt } from './skins';

// the game's silverfish: seven gray segments tapering from a wide middle, dark ridges across
// the back, two beady eyes, and three bristly plates cut out like the game's, so legs and spines
// stick out from the body (the segments they wrap are a hair shallower, so faces never fight)
const RIDGED = (width: number, depth: number) => Array.from({ length: depth }, (_, row) => (row === depth - 1 ? 'r' : '.').repeat(width));
const SILVERFISH: SkinArt = {
  palette: {
    s: ['#7d8286', '#7d8286', '#868b8f', '#72777b', '#8f9498', '#6a6f73'],
    r: ['#55595d', '#5c6064'],
    f: ['#8a8f93', '#7a7f83', '#959a9e', '#6c7175'],
    k: '#1b1d1f',
    x: 'rgba(0,0,0,0)',
  },
  boxes: {
    s0: { size: [3, 2, 2], base: 's', faces: { front: ['k.k', '...'] } },
    s1: { size: [4, 3, 1.9], base: 's', faces: { top: RIDGED(4, 2) } },
    s2: { size: [6, 4, 2.9], base: 's', faces: { top: RIDGED(6, 3) } },
    s3: { size: [3, 3, 3], base: 's', faces: { top: RIDGED(3, 3) } },
    s4: { size: [2, 2, 2.9], base: 's', faces: { top: RIDGED(2, 3) } },
    s5: { size: [2, 1, 2], base: 's' },
    s6: { size: [1, 1, 2], base: 's' },
    fringe0: {
      size: [10, 8, 3],
      base: 'x',
      faces: {
        front: ['..f.ff.f..', '.ffffffff.', 'ffffffffff', 'ffffffffff', 'ffffffffff', 'f.ffffff.f', 'f.f....f.f', 'f.f....f.f'],
        back: ['..f.ff.f..', '.ffffffff.', 'ffffffffff', 'ffffffffff', 'ffffffffff', 'f.ffffff.f', 'f.f....f.f', 'f.f....f.f'],
        left: ['.f.', 'fff', 'fff', 'fff', 'fff', 'fff', 'f.f', 'f.f'],
        right: ['.f.', 'fff', 'fff', 'fff', 'fff', 'fff', 'f.f', 'f.f'],
      },
    },
    fringe1: {
      size: [6, 4, 3],
      base: 'x',
      faces: {
        front: ['..ff..', '.ffff.', 'ffffff', 'f.ff.f'],
        back: ['..ff..', '.ffff.', 'ffffff', 'f.ff.f'],
        left: ['.f.', 'fff', 'fff', 'f.f'],
        right: ['.f.', 'fff', 'fff', 'f.f'],
      },
    },
    fringe2: {
      size: [6, 5, 2],
      base: 'x',
      faces: {
        front: ['..ff..', '.ffff.', 'ffffff', 'ffffff', 'f.ff.f'],
        back: ['..ff..', '.ffff.', 'ffffff', 'ffffff', 'f.ff.f'],
        left: ['..', 'ff', 'ff', 'ff', 'f.'],
        right: ['..', 'ff', 'ff', 'ff', 'f.'],
      },
    },
  },
};

// segment depths front to back, and where each segment's middle sits along the body
const DEPTHS = [2, 2, 3, 3, 3, 2, 2];
const HEIGHTS = [2, 3, 4, 3, 2, 1, 1];
const PLACES = DEPTHS.map((_, index) => 8.5 - DEPTHS.slice(0, index).reduce((sum, depth) => sum + depth, 0) - DEPTHS[index] / 2);
// the fringed plates ride on segments 2, 4 and 1, the way the game stacks them
const FRINGES = [
  { name: 'fringe0', on: 2, height: 8 },
  { name: 'fringe1', on: 4, height: 4 },
  { name: 'fringe2', on: 1, height: 5 },
];

// Small, fast, and the most embarrassing way to die in a stronghold.
export function Silverfish({ from }: { readonly from: THREE.Vector3 }) {
  const root = useRef<THREE.Group>(null);
  const segments = useRef<(THREE.Group | null)[]>([]);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const state = useRef({ hp: 6, biteAt: 0, squeakAt: Math.random() * 2, age: Math.random() * 6 });
  const wander = useMemo(() => ({ home: from, radius: 3, speed: 2 }), [from]);
  const control = useMob(root, wander, legs, { half: 0.2, height: 0.3 });
  const { skin, material } = useSkin(SILVERFISH, { alphaTest: 0.5 });
  const materials = useMemo(() => [material], [material]);
  const damage = useDamage(root, materials, 0.3);

  useMobTarget(root, [0.5, 0.35, 0.5], {
    label: () => null,
    solid: true,
    hit: (amount) => {
      const s = state.current;
      if (control.dead) return;
      s.hp -= amount;
      damage.hurt();
      cue('squeak');
      control.knock(runtime.player.pos, 5);
      if (s.hp > 0) return;
      control.dead = true;
      damage.die();
    },
  });

  useFrame((_, delta) => {
    const group = root.current;
    const s = state.current;
    if (!group || control.dead) return;
    control.chase = runtime.player.pos;
    control.chaseSpeed = 3.4;
    // the game's wiggle: each segment sways a beat behind the one ahead of it
    s.age += Math.min(delta, 0.1) * 18;
    segments.current.forEach((segment, index) => {
      if (!segment) return;
      const phase = s.age + index * 0.15 * Math.PI;
      segment.rotation.y = Math.cos(phase) * Math.PI * 0.05 * (1 + Math.abs(index - 2));
      segment.position.x = Math.sin(phase) * Math.PI * 0.2 * Math.abs(index - 2) * PX;
    });
    const p = runtime.player.pos;
    if (group.position.distanceTo(p) < 1.4 && runtime.time > s.biteAt) {
      s.biteAt = runtime.time + 0.8;
      useEndGame.getState().hurt(1, 'silverfish');
    }
    if (runtime.time > s.squeakAt) {
      s.squeakAt = runtime.time + 1.5 + Math.random() * 2;
      cue('squeak', 0.5);
    }
  });

  return (
    <group ref={root} position={from}>
      {PLACES.map((z, index) => (
        <group
          key={index}
          ref={(segment) => {
            segments.current[index] = segment;
          }}
          position={[0, 0, z * PX]}
        >
          <Box skin={skin} name={`s${index}`} at={[0, HEIGHTS[index] / 2, 0]} material={material} />
          {FRINGES.filter((fringe) => fringe.on === index).map((fringe) => (
            <Box key={fringe.name} skin={skin} name={fringe.name} at={[0, fringe.height / 2, 0]} material={material} />
          ))}
        </group>
      ))}
    </group>
  );
}
