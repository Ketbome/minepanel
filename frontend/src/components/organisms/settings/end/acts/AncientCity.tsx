'use client';

import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { cue, prefetch, startAmbience, stopAmbience } from '../end-audio';
import { spawnEffect } from '../engine/Effects';
import { input } from '../engine/input';
import { cellBox, runtime, useTarget, type Target } from '../engine/runtime';
import { World } from '../engine/world';
import { WorldMesh } from '../engine/WorldMesh';
import { Warden, type Heard } from '../mobs/deep';
import { flat, useRespawns } from '../mobs/parts';
import { Skeleton } from '../mobs/skeleton';
import { BFUUNY, BLASTER, useEndGame, type ChestId } from '../store';
import { hash, UNIT_BOX } from '../voxels';
import { Chest, Lectern, Sign } from './props';

// The ancient city, under the cave: a dark hall of deepslate and sculk, ruined houses along an
// avenue of broken pillars, and at its end a frame far bigger than any End portal, switched off
// long ago. The first button was here.

const HALL = { x0: -40, x1: 40, z0: -92, z1: 0 };
const CEILING = 18;
const TUNNEL = { x0: -1, x1: 1, z0: 0, z1: 10 };
const FRAME = { x0: -10, x1: 10, y0: 1, y1: 10, z: -86 };
const BUTTON = [0, 2, FRAME.z + 2] as const;
// ruined houses: center, size, the side the doorway faces and the chest inside, if any
const HOUSES: readonly { readonly x: number; readonly z: number; readonly w: number; readonly d: number; readonly door: 'n' | 's' | 'e' | 'w'; readonly chest?: ChestId }[] = [
  { x: -13, z: -14, w: 9, d: 7, door: 'e', chest: 'city1' },
  { x: 14, z: -22, w: 7, d: 9, door: 'w' },
  { x: -25, z: -34, w: 9, d: 9, door: 'e', chest: 'city2' },
  { x: 23, z: -44, w: 9, d: 7, door: 'w', chest: 'city3' },
  { x: -15, z: -56, w: 7, d: 7, door: 'e' },
  { x: 29, z: -64, w: 7, d: 9, door: 'w' },
  { x: -30, z: -72, w: 9, d: 7, door: 's' },
];
const SHRIEKERS = [
  [-6, -20],
  [8, -16],
  [0, -32],
  [-18, -46],
  [18, -54],
  [-4, -66],
  [10, -76],
  [-22, -80],
] as const;
const LANTERNS = [
  [-4, -4],
  [4, -4],
  [-13, -10],
  [14, -18],
  [-25, -29],
  [23, -39],
  [-15, -52],
  [29, -59],
  [-30, -67],
  [-8, -82],
  [8, -82],
  [0, -48],
] as const;
const SKELETONS = [
  { id: 'deep-skeleton-1', wander: { home: new THREE.Vector3(-8, 0.5, -30), radius: 6, speed: 0.9 } },
  { id: 'deep-skeleton-2', wander: { home: new THREE.Vector3(10, 0.5, -50), radius: 6, speed: 0.9 } },
  { id: 'deep-skeleton-3', wander: { home: new THREE.Vector3(-6, 0.5, -72), radius: 6, speed: 0.9 } },
];

const inHouse = (x: number, z: number, margin = 0) => HOUSES.some((house) => Math.abs(x - house.x) <= Math.floor(house.w / 2) + margin && Math.abs(z - house.z) <= Math.floor(house.d / 2) + margin);

// sculk sensors every few blocks, the avenue included: that is the point
const SENSORS: readonly (readonly [number, number])[] = (() => {
  const spots: [number, number][] = [];
  for (let gx = HALL.x0 + 4; gx <= HALL.x1 - 4; gx += 7) {
    for (let gz = HALL.z1 - 8; gz >= FRAME.z + 6; gz -= 7) {
      const x = gx + Math.round((hash(gx, gz, 21) - 0.5) * 4);
      const z = gz + Math.round((hash(gz, gx, 22) - 0.5) * 4);
      if (hash(x, z, 23) > 0.45 && !inHouse(x, z, 1) && !(Math.abs(Math.abs(x) - 6) < 1 && z % 10 === 0)) spots.push([x, z]);
    }
  }
  return spots;
})();

function house(world: World, { x: cx, z: cz, w, d, door }: (typeof HOUSES)[number]) {
  const x0 = cx - Math.floor(w / 2);
  const x1 = cx + Math.floor(w / 2);
  const z0 = cz - Math.floor(d / 2);
  const z1 = cz + Math.floor(d / 2);
  for (let x = x0; x <= x1; x += 1) {
    for (let z = z0; z <= z1; z += 1) {
      world.set(x, 0, z, 'deepBricks');
      const wall = x === x0 || x === x1 || z === z0 || z === z1;
      const doorway = (door === 'e' && x === x1 && Math.abs(z - cz) <= 1) || (door === 'w' && x === x0 && Math.abs(z - cz) <= 1) || (door === 'n' && z === z0 && Math.abs(x - cx) <= 1) || (door === 's' && z === z1 && Math.abs(x - cx) <= 1);
      // the walls crumble toward the top, and the roof has fallen in places
      if (wall) for (let y = 1; y <= 5; y += 1) if (!(doorway && y <= 3) && !(y >= 4 && hash(x, y, z) > 0.62)) world.set(x, y, z, 'deepBricks');
      if (hash(x, z, 31) > 0.45) world.set(x, 6, z, 'deepBricks');
    }
  }
}

function buildCity() {
  const world = new World();
  for (let x = HALL.x0 - 1; x <= HALL.x1 + 1; x += 1) {
    for (let z = HALL.z0 - 1; z <= HALL.z1 + 1; z += 1) {
      const edge = x < HALL.x0 || x > HALL.x1 || z < HALL.z0 || z > HALL.z1;
      const sculk = hash(Math.floor(x / 3), Math.floor(z / 3), 7) > 0.5 && hash(x, z, 8) > 0.25;
      world.set(x, -1, z, 'deepslate');
      world.set(x, 0, z, sculk ? 'sculk' : hash(x, z, 9) > 0.8 ? 'deepBricks' : 'deepslate');
      world.set(x, CEILING, z, 'deepslate');
      if (edge) for (let y = 1; y < CEILING; y += 1) world.set(x, y, z, hash(x, y, z) > 0.7 ? 'sculk' : 'deepslate');
    }
  }
  // the way back up
  for (let x = TUNNEL.x0 - 1; x <= TUNNEL.x1 + 1; x += 1) {
    for (let z = TUNNEL.z0; z <= TUNNEL.z1 + 1; z += 1) {
      for (let y = -1; y <= 4; y += 1) {
        const wall = x < TUNNEL.x0 || x > TUNNEL.x1 || y <= 0 || y === 4 || z === TUNNEL.z1 + 1;
        if (wall) world.set(x, y, z, 'deepslate');
        else world.remove(x, y, z);
      }
    }
  }
  // the avenue: a deepslate brick road between two rows of pillars, some fallen short
  for (let z = HALL.z1; z >= FRAME.z + 3; z -= 1) for (let x = -2; x <= 2; x += 1) world.set(x, 0, z, 'deepBricks');
  for (let z = -10; z >= FRAME.z + 6; z -= 10) {
    [-6, 6].forEach((x) => {
      const height = 3 + Math.floor(hash(x, z, 41) * 8);
      for (let y = 1; y <= height; y += 1) world.set(x, y, z, 'deepBricks');
    });
  }
  HOUSES.forEach((spot) => house(world, spot));
  // the frame, twenty-one blocks wide, dark at its heart
  for (let x = FRAME.x0; x <= FRAME.x1; x += 1) {
    for (let y = FRAME.y0; y <= FRAME.y1; y += 1) {
      const edge = x === FRAME.x0 || x === FRAME.x1 || y === FRAME.y0 || y === FRAME.y1;
      if (edge) world.set(x, y, FRAME.z, 'reinforced');
    }
  }
  world.fill(FRAME.x0 - 2, 1, FRAME.z + 1, FRAME.x1 + 2, 1, FRAME.z + 3, 'deepBricks');
  return world;
}

function Sensor({ at }: { readonly at: readonly [number, number] }) {
  const tendril = flat('#29dfeb');
  return (
    <group position={[at[0], 0.5, at[1]]}>
      <mesh geometry={UNIT_BOX} scale={[1, 0.5, 1]} position={[0, 0.25, 0]}>
        <meshLambertMaterial color="#0d2530" emissive="#02121a" />
      </mesh>
      {[
        [-0.25, -0.25],
        [0.25, -0.25],
        [-0.25, 0.25],
        [0.25, 0.25],
      ].map(([x, z]) => (
        <mesh key={`${x}:${z}`} geometry={UNIT_BOX} material={tendril} scale={[0.08, 0.4, 0.08]} position={[x, 0.7, z]} />
      ))}
    </group>
  );
}

function Shrieker({ at }: { readonly at: readonly [number, number] }) {
  return (
    <group position={[at[0], 0.5, at[1]]}>
      <mesh geometry={UNIT_BOX} scale={[1, 0.5, 1]} position={[0, 0.25, 0]}>
        <meshLambertMaterial color="#0b1f28" />
      </mesh>
      <mesh geometry={UNIT_BOX} scale={[0.9, 0.08, 0.9]} position={[0, 0.54, 0]}>
        <meshLambertMaterial color="#e8e2c8" />
      </mesh>
    </group>
  );
}

function SoulLantern({ at }: { readonly at: readonly [number, number] }) {
  return (
    <group position={[at[0], 1.9, at[1]]}>
      <mesh geometry={UNIT_BOX} scale={[0.35, 0.45, 0.35]}>
        <meshBasicMaterial color="#6ae7ff" />
      </mesh>
      <pointLight color="#4fd0ff" intensity={9} distance={12} decay={1.6} />
    </group>
  );
}

// the stone button at the foot of the frame. BlasterDaster's guide says not to press it; pressing
// it lets The Rake loose, and from then on it can turn up anywhere.
function Button() {
  const pressed = useEndGame((state) => Boolean(state.flags.buttonPressed));
  const target = useMemo<Target>(
    () => ({
      box: cellBox(BUTTON[0], BUTTON[1], BUTTON[2], 0.4).expandByScalar(0.1),
      label: () => 'button',
      use: () => {
        const game = useEndGame.getState();
        cue('pick');
        spawnEffect('burst', new THREE.Vector3(0, 5, FRAME.z + 0.6), '#29dfeb');
        cue('shriek', 0.5);
        if (game.flags.buttonPressed) {
          if (game.flags.buttonTwice) return;
          game.setFlag('buttonTwice');
          game.advance('goal', 'advNotAJoke', 'button');
          window.setTimeout(() => useEndGame.getState().say('lineNotAJoke', BLASTER), 1500);
          return;
        }
        game.setFlag('buttonPressed');
        prefetch(['rake', 'scream', 'breath']);
        game.advance('goal', 'advButton', 'button');
        window.setTimeout(() => useEndGame.getState().presence('join', 'The Rake'), 2500);
        window.setTimeout(() => useEndGame.getState().say('buttonBfuuny', BFUUNY), 4500);
        window.setTimeout(() => useEndGame.getState().say('buttonBlaster', BLASTER), 6500);
      },
    }),
    []
  );
  useTarget(target);
  return (
    <mesh geometry={UNIT_BOX} scale={[0.4, 0.25, 0.3]} position={[BUTTON[0], BUTTON[1] - 0.35, BUTTON[2]]}>
      <meshLambertMaterial color={pressed ? '#6f6f6f' : '#8a8a8a'} />
    </mesh>
  );
}

// how far you can see: the dark closes in and throbs with the warden's heart while it hunts
const FOG = { near: 3, far: 26 };
const HEARTBEAT_S = 1.6;

export function AncientCity() {
  const world = useMemo(() => buildCity(), []);
  const [warden, setWarden] = useState<THREE.Vector3 | null>(null);
  // the last vibration the warden could have heard, and when
  const heard = useMemo<Heard>(() => ({ pos: new THREE.Vector3(), at: -99 }), []);
  const beats = useRef({ t: 0, noise: 0, near: new Set<number>(), shrieks: 0, hinted: false, greeted: false, stride: 0, spawn: -1, dark: 0, obituary: false });
  const fog = useRef<THREE.Fog>(null);
  const ambient = useRef<THREE.AmbientLight>(null);
  const skeletons = useRespawns(45);

  useEffect(() => {
    runtime.world = world;
    runtime.voidY = -20;
    useEndGame.getState().setCheckpoint(0.5, 0.5, 6, 0);
    startAmbience('ancient');
    prefetch(['sculk', 'shriek', 'heartbeat', 'roar']);
    // steps, landings, blocks, chests and arrows all carry through the sculk
    runtime.hooks.vibration = (at, loudness) => {
      beats.current.noise += loudness;
      heard.pos.copy(at);
      heard.at = runtime.time;
    };
    return () => {
      stopAmbience();
      runtime.world = null;
      runtime.hooks.vibration = null;
      useEndGame.getState().setNoise(0);
    };
  }, [world, heard]);

  useFrame((_, delta) => {
    const b = beats.current;
    const game = useEndGame.getState();
    if (game.transition || !game.checkpoint) return;
    const dt = Math.min(delta, 0.1);
    // the dark lifts slowly once it has gone quiet, even while you lie dead
    const darkness = warden || b.noise >= 50 ? 1 : 0;
    b.dark += (darkness - b.dark) * Math.min(1, dt * (darkness ? 1.5 : 0.4));
    const pulse = 0.5 + 0.5 * Math.cos((runtime.time * Math.PI * 2) / HEARTBEAT_S);
    if (fog.current) {
      fog.current.near = FOG.near - b.dark * 2.5;
      fog.current.far = FOG.far - b.dark * (18 - pulse * 5);
    }
    if (ambient.current) ambient.current.intensity = 0.8 - b.dark * (0.5 + pulse * 0.1);
    if (game.dead) return;
    // a respawn starts quiet, or the meter left full at death would summon it again at once
    if (b.spawn !== game.spawnId) {
      b.spawn = game.spawnId;
      b.noise = 0;
      b.shrieks = 0;
      game.setNoise(0);
    }
    b.t += dt;
    const p = runtime.player;
    if (!b.hinted && b.t > 1.2) {
      b.hinted = true;
      game.showActionBar('hintQuiet');
    }
    if (!b.greeted && p.pos.z < -6) {
      b.greeted = true;
      game.say('ghostAncient');
    }
    if (!b.obituary && b.t > 40) {
      b.obituary = true;
      game.obituary(BFUUNY, 'bfuunyDiedWarden');
    }

    // noise: walking is loud, sprinting louder, sneaking is silent; sensors add a spike, and
    // everything else you do arrives through the vibration hook
    const speed = Math.hypot(p.vel.x, p.vel.z);
    const loud = !p.sneaking && speed > 0.5;
    let noise = b.noise + (loud ? (p.sprinting ? 20 : 7) : -5) * dt;
    if (input.left || input.right) noise += 4 * dt;
    if (loud) {
      heard.pos.copy(p.pos);
      heard.at = runtime.time;
    }
    SENSORS.forEach(([x, z], index) => {
      const close = Math.hypot(p.pos.x - x, p.pos.z - z) < 3;
      if (close && loud && !b.near.has(index)) {
        noise += 35;
        cue('sculk');
      }
      if (close) b.near.add(index);
      else b.near.delete(index);
    });
    noise = Math.max(0, Math.min(100, noise));
    if (noise >= 50 && b.shrieks === 0) {
      b.shrieks = 1;
      cue('shriek');
      if (!game.flags.darkness) {
        game.setFlag('darkness');
        game.say('ghostDarkness');
      }
    }
    if (noise >= 100 && !warden) {
      b.shrieks = 2;
      cue('shriek');
      // it rises behind you, nine blocks back
      const angle = p.yaw + (Math.random() - 0.5);
      const x = Math.max(HALL.x0 + 1, Math.min(HALL.x1 - 1, p.pos.x + Math.sin(angle) * 9));
      const z = Math.max(HALL.z0 + 1, Math.min(HALL.z1 - 1, p.pos.z + Math.cos(angle) * 9));
      setWarden(new THREE.Vector3(x, 0.5, z));
      if (!game.flags.wardenMet) game.setFlag('wardenMet');
    }
    if (noise < 30 && b.shrieks === 1) b.shrieks = 0;
    b.noise = noise;
    if (Math.abs(noise - game.noise) > 2 || (noise === 0 && game.noise !== 0)) game.setNoise(noise);

    if (p.pos.z > TUNNEL.z1 - 1) game.travel('overworld', 'cave', 'black');
  });

  return (
    <>
      <color attach="background" args={['#020607']} />
      <fog ref={fog} attach="fog" args={['#020607', FOG.near, FOG.far]} />
      <ambientLight ref={ambient} intensity={0.8} color="#5f9aa8" />
      <hemisphereLight args={['#1d4f5c', '#020607', 0.6]} />
      <pointLight position={[0, 6, FRAME.z + 2]} color="#29dfeb" intensity={14} distance={20} decay={1.5} />
      <WorldMesh world={world} />
      {SENSORS.map((at) => (
        <Sensor key={at.join(':')} at={at} />
      ))}
      {SHRIEKERS.map((at) => (
        <Shrieker key={at.join(':')} at={at} />
      ))}
      {LANTERNS.map((at) => (
        <SoulLantern key={at.join(':')} at={at} />
      ))}
      {HOUSES.map(({ x, z, d, chest }) => chest && <Chest key={chest} world={world} id={chest} at={[x, 1, z - Math.floor(d / 2) + 1]} />)}
      <Chest world={world} id="city4" at={[-6, 2, FRAME.z + 2]} />
      <Sign id="quiet" at={[2.5, 1, -1]} facing={0.3} />
      <Sign id="bfuunyGrave" at={[8, 2, FRAME.z + 2]} facing={-0.3} />
      <Lectern world={world} at={[4, 2, FRAME.z + 2]} book="admin2011" facing={-0.6} glow />
      <Button />
      {SKELETONS.map(({ id, wander }) => (
        <Skeleton key={`${id}:${skeletons.life(id)}`} wander={wander} onDeath={() => skeletons.died(id)} />
      ))}
      <Sparkles count={60} scale={[20, 9, 1.5]} position={[0, 5.5, FRAME.z]} size={2.5} speed={0.2} color="#29dfeb" opacity={0.5} />
      <Sparkles count={120} scale={[80, 10, 90]} position={[0, 5, -46]} size={2} speed={0.15} color="#6ae7ff" opacity={0.4} />
      {warden && (
        <Warden
          from={warden}
          heard={heard}
          onGone={() => {
            setWarden(null);
            beats.current.noise = 0;
            beats.current.shrieks = 0;
            useEndGame.getState().setNoise(0);
          }}
        />
      )}
    </>
  );
}
