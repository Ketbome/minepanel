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
import { Warden } from '../mobs/deep';
import { flat } from '../mobs/parts';
import { useEndGame } from '../store';
import { hash, UNIT_BOX } from '../voxels';
import { Lectern, Sign } from './props';

// The ancient city, under the cave: a dark hall of deepslate and sculk, and at its end a frame
// far bigger than any End portal, switched off long ago. The first button was here.

const HALL = { x0: -22, x1: 22, z0: -44, z1: 0 };
const TUNNEL = { x0: -1, x1: 1, z0: 0, z1: 10 };
const FRAME = { x0: -10, x1: 10, y0: 1, y1: 10, z: -40 };
const BUTTON = [0, 2, -38] as const;
const SENSORS = [
  [-6, -8],
  [5, -12],
  [-3, -18],
  [8, -22],
  [-9, -26],
  [2, -28],
  [-5, -33],
  [6, -34],
] as const;
const SHRIEKERS = [
  [-12, -20],
  [12, -16],
  [0, -30],
] as const;
const LANTERNS = [
  [-4, -4],
  [4, -4],
  [-14, -14],
  [14, -24],
  [-8, -36],
  [8, -36],
] as const;

function buildCity() {
  const world = new World();
  for (let x = HALL.x0 - 1; x <= HALL.x1 + 1; x += 1) {
    for (let z = HALL.z0 - 1; z <= HALL.z1 + 1; z += 1) {
      const edge = x < HALL.x0 || x > HALL.x1 || z < HALL.z0 || z > HALL.z1;
      const sculk = hash(Math.floor(x / 3), Math.floor(z / 3), 7) > 0.6 && hash(x, z, 8) > 0.3;
      world.set(x, 0, z, sculk ? 'sculk' : hash(x, z, 9) > 0.8 ? 'deepBricks' : 'deepslate');
      world.set(x, 15, z, 'deepslate');
      if (edge) for (let y = 1; y < 15; y += 1) world.set(x, y, z, hash(x, y, z) > 0.7 ? 'sculk' : 'deepslate');
    }
  }
  // the way back up
  for (let x = TUNNEL.x0 - 1; x <= TUNNEL.x1 + 1; x += 1) {
    for (let z = TUNNEL.z0; z <= TUNNEL.z1 + 1; z += 1) {
      for (let y = 0; y <= 4; y += 1) {
        const wall = x < TUNNEL.x0 || x > TUNNEL.x1 || y === 0 || y === 4 || z === TUNNEL.z1 + 1;
        if (wall) world.set(x, y, z, 'deepslate');
        else world.remove(x, y, z);
      }
    }
  }
  // broken pillars and a few ruined walls of deepslate bricks
  [
    [-14, -8],
    [14, -8],
    [-16, -30],
    [16, -30],
  ].forEach(([x, z], index) => {
    for (let y = 1; y <= 6 + (index % 3) * 3; y += 1) world.set(x, y, z, 'deepBricks');
  });
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

// the stone button at the foot of the frame. Nobody tells you not to press this one.
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
        if (game.flags.buttonPressed) return;
        game.setFlag('buttonPressed');
        game.voices('voiceNo', 'voiceDone');
        game.advance('goal', 'advButton', 'button');
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

export function AncientCity() {
  const world = useMemo(() => buildCity(), []);
  const [warden, setWarden] = useState<THREE.Vector3 | null>(null);
  const beats = useRef({ t: 0, noise: 0, near: new Set<number>(), shrieks: 0, hinted: false, greeted: false, stride: 0, spawn: -1 });

  useEffect(() => {
    runtime.world = world;
    runtime.voidY = -20;
    useEndGame.getState().setCheckpoint(0.5, 0.5, 6, 0);
    startAmbience('ancient');
    prefetch(['sculk', 'shriek', 'heartbeat', 'roar']);
    return () => {
      stopAmbience();
      runtime.world = null;
      useEndGame.getState().setNoise(0);
    };
  }, [world]);

  useFrame((_, delta) => {
    const b = beats.current;
    const game = useEndGame.getState();
    if (game.transition || game.dead || !game.checkpoint) return;
    // a respawn starts quiet, or the meter left full at death would summon it again at once
    if (b.spawn !== game.spawnId) {
      b.spawn = game.spawnId;
      b.noise = 0;
      b.shrieks = 0;
      game.setNoise(0);
    }
    const dt = Math.min(delta, 0.1);
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

    // noise: walking is loud, sprinting louder, sneaking is silent; sensors add a spike
    const speed = Math.hypot(p.vel.x, p.vel.z);
    const loud = !p.sneaking && speed > 0.5;
    let noise = b.noise + (loud ? (p.sprinting ? 12 : 4) : -7) * dt;
    if (input.left || input.right) noise += 3 * dt;
    SENSORS.forEach(([x, z], index) => {
      const close = Math.hypot(p.pos.x - x, p.pos.z - z) < 1.8;
      if (close && loud && !b.near.has(index)) {
        noise += 25;
        cue('sculk');
      }
      if (close) b.near.add(index);
      else b.near.delete(index);
    });
    noise = Math.max(0, Math.min(100, noise));
    if (noise >= 50 && b.shrieks === 0) {
      b.shrieks = 1;
      cue('shriek');
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
      <fog attach="fog" args={['#030a0c', 4, 30]} />
      <ambientLight intensity={0.8} color="#5f9aa8" />
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
      <Sign id="quiet" at={[2.5, 1, -1]} facing={0.3} />
      <Lectern world={world} at={[4, 2, -38]} book="admin2011" facing={-0.6} glow />
      <Button />
      <Sparkles count={60} scale={[20, 9, 1.5]} position={[0, 5.5, FRAME.z]} size={2.5} speed={0.2} color="#29dfeb" opacity={0.5} />
      <Sparkles count={50} scale={[40, 8, 40]} position={[0, 4, -22]} size={2} speed={0.15} color="#6ae7ff" opacity={0.4} />
      {warden && (
        <Warden
          from={warden}
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
