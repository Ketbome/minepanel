'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { spawnEffect } from '../engine/Effects';
import { runtime } from '../engine/runtime';
import { NameTag, PX } from './parts';
import { Box, sides, useSkin, type SkinArt } from './skins';

export type AdminId = 'ketbome' | 'blaster' | 'bfuuny';
// what an admin is doing: standing around, pointing at his build, crouch-spamming a "gg", or
// running off the edge
export type AdminAct = 'idle' | 'point' | 'crouch' | 'leap';

const LEG = ['....', '....', '....', '....', '....', '....', '....', '....', '....', '....', 'kkkk', 'kkkk'];

// The three admins as players, in the game's player model. Ketbome wears a builder's hard hat,
// BlasterDaster diamond armor and sunglasses, and Bfuuny his "treasure": a block of dirt.
const SKINS: Record<AdminId, SkinArt> = {
  ketbome: {
    palette: { h: ['#3b2512', '#45301a'], s: ['#c68863', '#bd7f5a'], w: '#ffffff', e: '#2c5ea8', n: '#a8694a', m: '#6b3a2a', t: ['#00a8a8', '#009999', '#00b4b4'], j: ['#3048a8', '#2a4099'], k: '#4a4a4a', y: ['#f2c230', '#e0b020'], Y: '#fff08a' },
    boxes: {
      head: { size: [8, 8, 8], base: 's', faces: { front: ['hhhhhhhh', 'hsssssss', 'ssssssss', 'swessews', 'ssssssss', 'sssnnsss', 'ssmmmmss', 'ssssssss'], top: Array.from({ length: 8 }, () => 'hhhhhhhh'), back: Array.from({ length: 8 }, () => 'hhhhhhhh') } },
      hat: { size: [9, 3, 9], base: 'y', faces: sides(['YyyyyyyyY', 'yyyyyyyyy', 'yyyyyyyyy']) },
      body: { size: [8, 12, 4], base: 't', faces: { front: ['tttttttt', 'tttttttt', 'tttttttt', 'tttttttt', 'tttttttt', 'tttttttt', 'tttttttt', 'tttttttt', 'jjjjjjjj', 'jjjjjjjj', 'jjjjjjjj', 'jjjjjjjj'] } },
      arm: { size: [4, 12, 4], base: 's', faces: sides(['tttt', 'tttt', 'tttt', 'tttt']) },
      leg: { size: [4, 12, 4], base: 'j', faces: sides(LEG) },
    },
  },
  blaster: {
    palette: { h: ['#1c1c1c', '#262626'], s: ['#b07a55', '#a8704d'], k: '#0b0b0b', g: '#3a3a3a', m: '#5e3326', d: ['#4ee8e0', '#3fd3cb', '#62f2ea'], D: ['#2aa39c', '#23918b'], j: ['#232833', '#1d212b'] },
    boxes: {
      head: { size: [8, 8, 8], base: 's', faces: { front: ['dddddddd', 'dDDDDDDd', 'ssssssss', 'kkkkkkkk', 'skkggkks', 'ssssssss', 'ssmmmmss', 'ssssssss'], top: Array.from({ length: 8 }, () => 'dddddddd'), back: ['dddddddd', 'dDDDDDDd', 'hhhhhhhh', 'hhhhhhhh', 'hhhhhhhh', 'hhhhhhhh', 'hhhhhhhh', 'hhhhhhhh'] } },
      body: { size: [8, 12, 4], base: 'd', faces: { front: ['dddddddd', 'dDddddDd', 'dDddddDd', 'dddDDddd', 'dddddddd', 'dDddddDd', 'dddddddd', 'DDDDDDDD', 'jjjjjjjj', 'jjjjjjjj', 'jjjjjjjj', 'jjjjjjjj'] } },
      arm: { size: [4, 12, 4], base: 's', faces: sides(['dddd', 'dddd', 'dDDd', 'dddd', 'dddd']) },
      leg: { size: [4, 12, 4], base: 'j', faces: sides(['dddd', 'dddd', 'dDDd', 'dddd', 'dddd', 'dddd', '....', '....', '....', '....', 'DDDD', 'DDDD']) },
    },
  },
  bfuuny: {
    palette: { d: ['#866043', '#79553a', '#5a3f2a', '#a58466', '#866043'], k: '#1a120b', s: ['#d9a07a', '#cf966f'], r: ['#b02e26', '#a02820', '#c0362c'], j: ['#5a3f2a', '#4f3522'], g: '#5f9f35' },
    boxes: {
      head: {
        size: [8, 8, 8],
        base: 'd',
        faces: { front: ['gggggggg', 'dddddddd', 'dddddddd', 'dkkddkkd', 'dddddddd', 'dkddddkd', 'ddkkkkdd', 'dddddddd'], ...sides(['gggggggg', 'dgdggdgd']), top: Array.from({ length: 8 }, () => 'gggggggg') },
      },
      body: { size: [8, 12, 4], base: 'r' },
      arm: { size: [4, 12, 4], base: 's', faces: sides(['rrrr', 'rrrr', 'rrrr', 'rrrr']) },
      leg: { size: [4, 12, 4], base: 'j', faces: sides(LEG) },
    },
  },
};

const NAMES: Record<AdminId, string> = { ketbome: 'Ketbome', blaster: 'BlasterDaster', bfuuny: 'Bfuuny' };
const RUN_S = 1.4;
const RUN_SPEED = 4.2;
const GRAVITY = 28;
const toward = new THREE.Vector3();

export function Admin({ who, home, act, leap }: { readonly who: AdminId; readonly home: THREE.Vector3; readonly act: AdminAct; readonly leap?: THREE.Vector3 }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const arms = useRef<(THREE.Group | null)[]>([]);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const { skin, material } = useSkin(SKINS[who]);
  const state = useRef({ act: 'idle' as AdminAct, since: 0, fall: 0, gone: false });

  // placed once, not by a prop: a re-render must not pull a falling Bfuuny back onto the islet.
  // Appearing (or coming back after a fall) makes a little puff.
  useEffect(() => {
    root.current?.position.copy(home);
    spawnEffect('poof', home.clone().setY(home.y + 1));
  }, [home]);

  useFrame((frame, delta) => {
    const group = root.current;
    const s = state.current;
    if (!group || s.gone) return;
    const dt = Math.min(delta, 0.05);
    if (act !== s.act) {
      s.act = act;
      s.since = runtime.time;
    }
    const t = runtime.time - s.since;
    const camera = frame.camera.position;

    let stride = 0;
    if (act === 'leap' && leap) {
      // "watch this": a run at the edge, a jump, and the void
      group.rotation.y = Math.atan2(leap.x, leap.z);
      if (t < RUN_S) {
        group.position.addScaledVector(leap, RUN_SPEED * dt);
        stride = t * 14;
      } else {
        s.fall += GRAVITY * dt;
        group.position.addScaledVector(leap, RUN_SPEED * 0.6 * dt);
        group.position.y += (t - RUN_S < 0.25 ? 7 : 0) * dt - s.fall * dt;
        stride = t * 20;
      }
      if (group.position.y < home.y - 40) {
        s.gone = true;
        group.visible = false;
      }
    } else {
      // they face you while they talk
      toward.set(camera.x - group.position.x, 0, camera.z - group.position.z);
      const turn = Math.atan2(toward.x, toward.z) - group.rotation.y;
      group.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * Math.min(1, dt * 4);
    }

    // crouch spam, the game's way of saying well played
    const crouched = act === 'crouch' && Math.floor(t * 5) % 2 === 0;
    if (body.current) {
      body.current.position.y = crouched ? -3 * PX : 0;
      body.current.rotation.x = crouched ? 0.35 : 0;
    }
    if (head.current) head.current.rotation.x = crouched ? -0.35 : Math.sin(runtime.time * 0.8) * 0.05;
    const sway = Math.sin(runtime.time * 1.6) * 0.06;
    const [right, left] = arms.current;
    // pointing is the left arm, toward the build on his left
    if (right) right.rotation.set(act === 'leap' ? Math.sin(stride) * 1.1 : sway, 0, 0);
    if (left) left.rotation.set(act === 'point' ? -0.6 : act === 'leap' ? -Math.sin(stride) * 1.1 : -sway, 0, act === 'point' ? 1.3 : act === 'leap' && t > RUN_S ? -1.2 : 0);
    legs.current.forEach((leg, index) => leg?.rotation.set(act === 'leap' ? Math.sin(stride + index * Math.PI) * 0.9 : 0, 0, 0));
  });

  return (
    <group ref={root}>
      <group ref={body}>
        {[-2, 2].map((x, index) => (
          <group
            key={x}
            ref={(leg) => {
              legs.current[index] = leg;
            }}
            position={[x * PX, 12 * PX, 0]}
          >
            <Box skin={skin} name="leg" at={[0, -6, 0]} material={material} />
          </group>
        ))}
        <Box skin={skin} name="body" at={[0, 18, 0]} material={material} />
        {[-6, 6].map((x, index) => (
          <group
            key={x}
            ref={(arm) => {
              arms.current[index] = arm;
            }}
            position={[x * PX, 22 * PX, 0]}
          >
            <Box skin={skin} name="arm" at={[0, -4, 0]} material={material} />
          </group>
        ))}
        <group ref={head} position={[0, 24 * PX, 0]}>
          <Box skin={skin} name="head" at={[0, 4, 0]} material={material} />
          {skin.boxes.hat && <Box skin={skin} name="hat" at={[0, 8.5, 0]} material={material} />}
        </group>
      </group>
      <NameTag text={NAMES[who]} y={2.35} />
    </group>
  );
}
