'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';
import { runtime } from '../engine/runtime';
import { useMonster } from './monsters';
import { PX, type Wander } from './parts';
import { Box, useSkin, type SkinArt } from './skins';

// the game's endermite: four dark purple segments, widest in the middle, with pale ridges
const RIDGED = (width: number, depth: number) => Array.from({ length: depth }, (_, row) => (row === 0 ? 'l' : '.').repeat(width));
const ENDERMITE: SkinArt = {
  palette: {
    p: ['#34263f', '#3c2c48', '#2e2238', '#44324f'],
    l: ['#6a5078', '#765a85'],
    k: '#120c16',
  },
  boxes: {
    s0: { size: [4, 3, 2], base: 'p', faces: { front: ['pppp', 'kppk', 'pppp'], top: RIDGED(4, 2) } },
    s1: { size: [6, 4, 5], base: 'p', faces: { top: ['llllll', 'pppppp', 'pllllp', 'pppppp', 'llllll'] } },
    s2: { size: [3, 3, 1], base: 'p', faces: { top: RIDGED(3, 1) } },
    s3: { size: [1, 2, 1], base: 'l' },
  },
};

// segment sizes front to back, and where each one's middle sits, as the game lays them out
const HEIGHTS = [3, 4, 3, 2];
const PLACES = [3.5, 0, -3, -4];

// Small, fast, and it comes out of thrown ender pearls.
export function Endermite({ wander, onDeath }: { readonly wander: Wander; readonly onDeath?: () => void }) {
  const root = useRef<THREE.Group>(null);
  const segments = useRef<(THREE.Group | null)[]>([]);
  const none = useRef<(THREE.Group | null)[]>([]);
  const age = useRef(Math.random() * 6);
  const { skin, material } = useSkin(ENDERMITE);
  const materials = useMemo(() => [material], [material]);
  useMonster(root, wander, none, materials, { hp: 8, strike: 2, cause: 'endermite', size: [0.4, 0.3], speed: 3.2, onDeath });

  // the game's wiggle: each segment sways a beat behind the one ahead of it
  useFrame((_, delta) => {
    age.current += Math.min(delta, 0.1) * 18;
    segments.current.forEach((segment, index) => {
      if (!segment) return;
      const phase = age.current * 0.9 + index * 0.15 * Math.PI;
      segment.rotation.y = Math.cos(phase) * Math.PI * 0.01 * (1 + Math.abs(index - 2));
      segment.position.x = Math.sin(phase) * Math.PI * 0.1 * Math.abs(index - 2) * PX;
    });
  });

  return (
    <group ref={root} position={wander.home}>
      {PLACES.map((z, index) => (
        <group
          key={index}
          ref={(segment) => {
            segments.current[index] = segment;
          }}
          position={[0, 0, z * PX]}
        >
          <Box skin={skin} name={`s${index}`} at={[0, HEIGHTS[index] / 2, 0]} material={material} />
        </group>
      ))}
    </group>
  );
}

// Endermites crawl out of one landed pearl in twenty, in whatever zone you threw it (JourneyScene
// keys this by zone, so they stay behind when you leave).
export function Endermites() {
  const [mites, setMites] = useState<readonly { readonly id: number; readonly wander: Wander }[]>([]);
  useEffect(() => {
    let count = 0;
    runtime.hooks.pearl = (at) => {
      count += 1;
      setMites((current) => [...current, { id: count, wander: { home: at.setY(Math.round(at.y) + 0.5), radius: 3, speed: 1.4 } }]);
    };
    return () => {
      runtime.hooks.pearl = null;
    };
  }, []);
  return mites.map(({ id, wander }) => <Endermite key={id} wander={wander} onDeath={() => setMites((current) => current.filter((mite) => mite.id !== id))} />);
}
