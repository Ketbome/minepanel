'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { cue } from '../end-audio';
import { isBright } from '../engine/clock';
import { spawnDrop } from '../engine/Drops';
import { spawnEffect } from '../engine/Effects';
import { spawnProjectile } from '../engine/Projectiles';
import { castBlocks, solidCell } from '../engine/raycast';
import { playerCenter, runtime } from '../engine/runtime';
import { season, useEndGame } from '../store';
import { flat, Part, PX, useDamage, useMob, useMobTarget, type Wander } from './parts';
import { Box, sides, useSkin, type SkinArt } from './skins';

const RANGE = 16;
const DRAW_S = 1.1;
const ARROW_SPEED = 20;
const ARROW_GRAVITY = 14;
const center = new THREE.Vector3();
const toward = new THREE.Vector3();

function sees(from: THREE.Vector3, range: number) {
  const world = runtime.world;
  playerCenter(center);
  const distance = from.distanceTo(center);
  if (!world || distance > range) return false;
  toward.copy(center).sub(from).normalize();
  return !castBlocks(world, from, toward, distance - 0.5, solidCell(world));
}

// the game's skeleton: a bone-white skull with deep sockets, a ribcage over a dark body and
// limbs two pixels thin
const SKELETON: SkinArt = {
  palette: {
    b: ['#c9c9c9', '#bdbdbd', '#d4d4d4', '#b3b3b3'],
    k: ['#3a3a3a', '#333333', '#414141'],
    j: '#8f8f8f',
  },
  boxes: {
    head: { size: [8, 8, 8], base: 'b', faces: { front: ['bbbbbbbb', 'bbbbbbbb', 'bbbbbbbb', 'bkkbbkkb', 'bkkbbkkb', 'bbbkkbbb', 'bkkkkkkb', 'bbkbkbkb'] } },
    body: {
      size: [8, 12, 4],
      base: 'k',
      faces: sides(['bbbbbbbb', 'kkkbbkkk', 'bbbbbbbb', 'kkkbbkkk', 'bbbbbbbb', 'kkkbbkkk', 'kbbbbbbk', 'kkkbbkkk', 'kkkbbkkk', 'kkkbbkkk', 'kbbbbbbk', 'kbbkkbbk']),
    },
    limb: { size: [2, 12, 2], base: 'b', faces: sides(['bb', 'bb', 'bb', 'bb', 'bb', 'jj', 'bb', 'bb', 'bb', 'bb', 'bb', 'jj']) },
  },
};

// a carved pumpkin, worn over the head around Halloween like the game's mobs do
const PUMPKIN: SkinArt = {
  palette: { o: ['#e3901d', '#d9851a', '#ec9a24'], r: '#b8650f', k: '#3b1f05', g: ['#4f7a28', '#5d8a30'] },
  boxes: {
    pumpkin: {
      size: [10, 10, 10],
      base: 'o',
      faces: {
        ...sides(Array.from({ length: 10 }, () => '.r..r..r..')),
        front: ['..........', '..........', '.kk....kk.', '.kkk..kkk.', '..........', '..........', '.kkkkkkkk.', '..kk..kk..', '..........', '..........'],
        top: ['..........', '..........', '..........', '..........', '....gg....', '....gg....', '..........', '..........', '..........', '..........'],
      },
    },
  },
};

function Pumpkin() {
  const { skin, material } = useSkin(PUMPKIN);
  return <Box skin={skin} name="pumpkin" at={[0, 4, 0]} material={material} />;
}

// nothing solid above it all the way up: the sun reaches it
function underSky(at: THREE.Vector3) {
  const world = runtime.world;
  if (!world) return false;
  const x = Math.round(at.x);
  const z = Math.round(at.z);
  for (let y = Math.round(at.y) + 2; y < at.y + 40; y += 1) if (world.solid(x, y, z)) return false;
  return true;
}

// Keeps its distance, draws for a second and looses an arrow at you, like the game's. It drops
// a few arrows when it dies, which is where yours come from once the camp's run out. With `burns`
// (the Overworld's) it catches fire under the open sky by day.
export function Skeleton({ wander, onDeath, burns = false }: { readonly wander: Wander; readonly onDeath: () => void; readonly burns?: boolean }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const arms = useRef<(THREE.Group | null)[]>([]);
  const { skin, material } = useSkin(SKELETON);
  const materials = useMemo(() => [material], [material]);
  const control = useMob(root, wander, legs, { half: 0.3, height: 1.95 }, head);
  const damage = useDamage(root, materials, 1.95);
  const state = useRef({ hp: 20, drawAt: -1, nextShot: 0, rattleAt: Math.random() * 6, burnAt: 0 });
  const [halloween] = useState(() => season() === 'halloween');
  const bow = flat('#6b4a2b');

  const harm = (amount: number) => {
    const s = state.current;
    const group = root.current;
    if (control.dead || !group) return false;
    s.hp -= amount;
    damage.hurt();
    cue('bones');
    if (s.hp > 0) return true;
    control.dead = true;
    spawnDrop('arrow', 2 + Math.floor(Math.random() * 3), group.position.clone().setY(group.position.y + 0.8));
    damage.die(onDeath);
    return true;
  };

  useMobTarget(root, [0.6, 1.95, 0.6], {
    label: () => null,
    solid: true,
    hostile: true,
    hit: (amount) => {
      if (harm(amount)) control.knock(runtime.player.pos);
    },
  });

  useFrame(() => {
    const group = root.current;
    const s = state.current;
    if (!group || control.dead) return;
    if (burns && runtime.time > s.burnAt && isBright() && underSky(group.position)) {
      s.burnAt = runtime.time + 1;
      spawnEffect('debris', group.position.clone().setY(group.position.y + 1.2), '#ff8a2a');
      harm(1);
      if (control.dead) return;
    }
    const game = useEndGame.getState();
    const eye = group.position.clone().setY(group.position.y + 1.6);
    const distance = group.position.distanceTo(runtime.player.pos);
    const seeing = !game.dead && sees(eye, RANGE);
    control.lookAt = seeing ? runtime.player.eye : null;
    control.chase = seeing && distance > 10 ? runtime.player.pos : null;
    control.chaseSpeed = 2.4;
    if (!seeing) s.drawAt = -1;
    else if (s.drawAt < 0 && runtime.time > s.nextShot) s.drawAt = runtime.time;
    control.stopped = s.drawAt >= 0;
    if (s.drawAt >= 0 && runtime.time - s.drawAt > DRAW_S) {
      s.drawAt = -1;
      s.nextShot = runtime.time + 1.6 + Math.random() * 1.2;
      playerCenter(center);
      const vel = center.clone().sub(eye);
      const flight = vel.length() / ARROW_SPEED;
      vel.normalize().multiplyScalar(ARROW_SPEED);
      vel.y += 0.5 * ARROW_GRAVITY * flight;
      vel.x += (Math.random() - 0.5) * 1.2;
      vel.z += (Math.random() - 0.5) * 1.2;
      spawnProjectile({ kind: 'arrow', pos: eye.clone().addScaledVector(vel.clone().normalize(), 0.6), vel, gravity: ARROW_GRAVITY, fromPlayer: false, damage: 3, cause: 'skeleton' });
      cue('bowShoot', 0.7);
    }
    if (runtime.time > s.rattleAt) {
      s.rattleAt = runtime.time + 4 + Math.random() * 5;
      if (distance < 14) cue('bones', 0.6);
    }
    // both arms reach forward while it aims, the bow in the right hand
    const aim = seeing ? -Math.PI / 2 : 0;
    arms.current.forEach((arm) => {
      if (arm) arm.rotation.x += (aim - arm.rotation.x) * 0.2;
    });
  });

  return (
    <group ref={root} position={wander.home}>
      {[-1, 1].map((x, index) => (
        <group
          key={x}
          ref={(leg) => {
            legs.current[index] = leg;
          }}
          position={[x * 2 * PX, 12 * PX, 0]}
        >
          <Box skin={skin} name="limb" at={[0, -6, 0]} material={material} />
        </group>
      ))}
      <Box skin={skin} name="body" at={[0, 18, 0]} material={material} />
      {[-1, 1].map((x, index) => (
        <group
          key={x}
          ref={(arm) => {
            arms.current[index] = arm;
          }}
          position={[x * 5 * PX, 23 * PX, 0]}
        >
          <Box skin={skin} name="limb" at={[0, -5, 0]} material={material} />
          {x < 0 && (
            <group position={[0, -10 * PX, 1 * PX]}>
              <Part size={[1, 12, 1]} at={[0, 0, 2]} material={bow} />
              <Part size={[1, 2, 2]} at={[0, 6, 1]} material={bow} />
              <Part size={[1, 2, 2]} at={[0, -6, 1]} material={bow} />
            </group>
          )}
        </group>
      ))}
      <group ref={head} position={[0, 24 * PX, 0]}>
        <Box skin={skin} name="head" at={[0, 4, 0]} material={material} />
        {halloween && <Pumpkin />}
      </group>
    </group>
  );
}
