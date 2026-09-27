'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cue } from '../end-audio';
import { spawnProjectile } from '../engine/Projectiles';
import { playerCenter, runtime, useTarget, type Target } from '../engine/runtime';
import { useEndGame } from '../store';
import { PX, useDamage } from './parts';
import { Box, useSkin, type SkinArt } from './skins';

const center = new THREE.Vector3();

// the game's shulker: a purpur shell with a pale rim on the lid, dark inside, and a small
// yellow head that only shows when it peeks
const LID_SIDE = ['................', '................', '................', '................', '................', '................', '................', '................', '................', '................', 'rrrrrrrrrrrrrrrr', 'dddddddddddddddd'];
const BASE_SIDE = ['iiiiiiiiiiiiiiii', 'dddddddddddddddd', '................', '................', '................', '................', '................', 'dddddddddddddddd'];
const LID_TOP = [
  'dddddddddddddddd',
  'd..............d',
  'd..............d',
  'd..............d',
  'd..............d',
  'd..............d',
  'd..............d',
  'd..............d',
  'd..............d',
  'd..............d',
  'd..............d',
  'd..............d',
  'd..............d',
  'd..............d',
  'd..............d',
  'dddddddddddddddd',
];
const SHULKER: SkinArt = {
  palette: {
    p: ['#946994', '#946994', '#9c709c', '#a57ca5', '#8d638d', '#a47aa4', '#88608a'],
    r: ['#c7a3c7', '#bf9abf'],
    d: ['#6f4c6f', '#6a486a'],
    i: ['#3f2940', '#452d46'],
    y: ['#e3dc8f', '#dcd488', '#e8e29c'],
    k: '#2b2230',
  },
  boxes: {
    // a hair narrower than the lid, so their overlapping sides never fight
    base: { size: [15.8, 8, 15.8], base: 'p', faces: { front: BASE_SIDE, back: BASE_SIDE, left: BASE_SIDE, right: BASE_SIDE, top: Array.from({ length: 16 }, () => 'i'.repeat(16)) } },
    lid: { size: [16, 12, 16], base: 'p', faces: { front: LID_SIDE, back: LID_SIDE, left: LID_SIDE, right: LID_SIDE, top: LID_TOP, bottom: Array.from({ length: 16 }, () => 'i'.repeat(16)) } },
    head: { size: [6, 6, 6], base: 'y', faces: { front: ['......', '......', '.k..k.', '.k..k.', '......', '..kk..'] } },
  },
};

// A purpur box that peeks, turns its head to you and fires a slow homing bullet. Get hit and you
// float up for a few seconds; what happens when it wears off is the shulker's favourite part.
// It can only be hurt while open, and a hit makes it snap shut.
export function Shulker({ at }: { readonly at: readonly [number, number, number] }) {
  const root = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const state = useRef({ next: 0, hp: 15, dead: false, open: 0, peekUntil: 0, peekAt: 0, shutUntil: 0 });
  const { skin, material } = useSkin(SHULKER);
  const materials = useMemo(() => [material], [material]);
  const damage = useDamage(root, materials, 1);
  const position = useMemo(() => new THREE.Vector3(...at), [at]);
  const box = useMemo(() => new THREE.Box3().setFromCenterAndSize(position.clone().setY(position.y + 0.5), new THREE.Vector3(1, 1, 1)), [position]);
  const target = useMemo<Target>(
    () => ({
      box,
      label: () => null,
      solid: true,
      hit: (amount) => {
        const s = state.current;
        if (s.dead || s.open < 0.3) {
          cue('hit', 0.5);
          return;
        }
        s.hp -= amount;
        s.shutUntil = runtime.time + 1.2;
        damage.hurt();
        cue('hit');
        if (s.hp > 0) return;
        s.dead = true;
        box.makeEmpty();
        damage.die();
      },
    }),
    [box, damage]
  );
  useTarget(target);

  useEffect(() => {
    state.current.next = runtime.time + 3 + Math.random() * 3;
    state.current.peekAt = runtime.time + 2 + Math.random() * 6;
  }, []);

  useFrame((_, delta) => {
    const s = state.current;
    if (s.dead) return;
    const dt = Math.min(delta, 0.1);
    const t = runtime.time;
    playerCenter(center);
    const near = center.distanceTo(position) < 14;
    // far away it still peeks now and then, like the game's
    if (!near && t > s.peekAt) {
      s.peekUntil = t + 1.5 + Math.random() * 2;
      s.peekAt = t + 5 + Math.random() * 7;
    }
    const shut = t < s.shutUntil;
    const goal = shut ? 0 : near ? 1 : t < s.peekUntil ? 0.35 : 0;
    s.open += (goal - s.open) * Math.min(1, dt * (shut ? 12 : 3));
    // the game's lid: it rises and twists on the way up, and jitters while wide open
    const turn = (0.5 + s.open) * Math.PI;
    const twist = -1 + Math.sin(turn);
    if (lid.current) {
      lid.current.position.y = ((1 - Math.sin(turn)) * 5 + (s.open > 0.5 ? Math.sin(t * 2) * 0.7 : 0)) * PX;
      lid.current.rotation.y = s.open > 0.3 ? twist ** 4 * Math.PI * 0.125 : 0;
    }
    if (head.current) {
      head.current.rotation.y += (Math.atan2(center.x - position.x, center.z - position.z) - head.current.rotation.y) * Math.min(1, dt * 4);
      head.current.rotation.x = Math.atan2(position.y + 0.7 - center.y, Math.hypot(center.x - position.x, center.z - position.z)) * 0.5;
    }
    if (near && s.open > 0.7 && t > s.next && !useEndGame.getState().dead) {
      s.next = t + 4 + Math.random() * 2;
      const from = position.clone().setY(position.y + 0.9);
      spawnProjectile({
        kind: 'bullet',
        pos: from,
        vel: center.clone().sub(from).normalize().multiplyScalar(5),
        gravity: 0,
        fromPlayer: false,
        damage: 2,
        cause: 'shulker',
        onLand: () => {
          cue('levitate');
          const game = useEndGame.getState();
          if (!game.flags.shulkerJoked) {
            game.setFlag('shulkerJoked');
            game.say('ghostShulker');
          }
        },
      });
      cue('zap');
    }
  });

  return (
    <group ref={root} position={position}>
      <Box skin={skin} name="base" at={[0, 4, 0]} material={material} />
      <group ref={head} position={[0, 6 * PX, 0]}>
        <Box skin={skin} name="head" at={[0, 3, 0]} material={material} />
      </group>
      <group ref={lid}>
        <Box skin={skin} name="lid" at={[0, 10, 0]} material={material} />
      </group>
    </group>
  );
}
