'use client';

import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cue, playNote, startAmbience, stopAmbience } from '../end-audio';
import { spawnEffect } from '../engine/Effects';
import { runtime } from '../engine/runtime';
import { Sun } from '../engine/Sun';
import { setWaterSky } from '../engine/water';
import { World } from '../engine/world';
import { WorldMesh } from '../engine/WorldMesh';
import type { LoreKey } from '../lore/en';
import { useRespawns, type Wander } from '../mobs/parts';
import { Blub, Sifter, Turtle } from '../mobs/sift';
import { BLASTER, useEndGame } from '../store';
import { hash, UNIT_BOX } from '../voxels';
import { Chest } from './props';
import { SiftPortalSheet } from './SiftGate';
import { BOUNDS, CHEST_AT, FLOWERS, FOSSILS, groundAt, POOLS, PONDS, PORTAL, regionAt, RIB_RISE, RIB_SPAN, RIBS, SKULL, SPAWN, SUMMIT, TREES, type Region } from './sift-layout';

// The Sift, past the ancient city's frame: Singer's Meadow around the frame, pink sculk grass
// under white trees and shallow ponds, where the Blubs live; Lullaby Hills to the west, tall teal
// hills whose sculk flowers sing as you pass, with a circle of bone on the highest one; and the
// Carapace ahead, a pale desert under the ribs of something huge, with ichor pools, Sifters,
// turtles and, inside its skull, the chest. The frame you came through stands behind you, open.

const REGION_NAMES: Record<Region, LoreKey> = { meadow: 'regionMeadow', hills: 'regionHills', carapace: 'regionCarapace' };

function tree(world: World, x: number, z: number, small: boolean) {
  const grounds = [groundAt(x, z), groundAt(x + 1, z), groundAt(x, z + 1), groundAt(x + 1, z + 1)];
  const top = Math.max(...grounds) + (small ? 4 : 5) + Math.floor(hash(x, z, 51) * (small ? 2 : 3));
  const reach = small ? 3.6 : 4.8;
  // thick: a two by two trunk, rooted in the lowest of its four cells
  for (let y = Math.min(...grounds) + 1; y <= top; y += 1) world.fill(x, y, z, x + 1, y, z + 1, 'paleLog');
  const cx = x + 0.5;
  const cz = z + 0.5;
  for (let dx = -5; dx <= 6; dx += 1) {
    for (let dz = -5; dz <= 6; dz += 1) {
      const d = Math.hypot(x + dx - cx, z + dz - cz);
      const lx = x + dx;
      const lz = z + dz;
      if (d < reach) world.set(lx, top + 1, lz, 'paleLeaves');
      if (d < reach - 1.4) world.set(lx, top + 2, lz, 'paleLeaves');
      // pale foliage hangs from the canopy's rim
      if (d > reach - 1.6 && d < reach && hash(lx, lz, 52) > 0.55) {
        const length = 1 + Math.floor(hash(lx, lz, 53) * 3);
        for (let y = top; y > top - length; y -= 1) world.set(lx, y, lz, 'paleLeaves');
      }
    }
  }
}

// a half ring of bone across the Carapace: the ribs, and the smaller fossils
function arch(world: World, cx: number, z: number, span: number, rise: number) {
  for (let step = 0; step <= span * 6; step += 1) {
    const angle = (step / (span * 6)) * Math.PI;
    const x = cx + Math.round(Math.cos(angle) * span);
    const y = Math.round(1 + Math.sin(angle) * rise);
    world.set(x, y, z, 'boneBlock');
    world.set(x, y, z - 1, 'boneBlock');
  }
  [cx - span, cx + span].forEach((x) => {
    for (let y = groundAt(x, z); y <= 1; y += 1) world.fill(x, y, z - 1, x, y, z, 'boneBlock');
  });
}

function skull(world: World) {
  const { x0, x1, y1, z0, z1 } = SKULL;
  for (let x = x0; x <= x1; x += 1) {
    for (let y = 2; y <= y1; y += 1) {
      for (let z = z0; z <= z1; z += 1) {
        const shell = x === x0 || x === x1 || y === y1 || z === z0 || z === z1;
        const socket = z === z1 && Math.abs(Math.abs(x) - 3.5) < 1.5 && y >= 6 && y <= 8;
        const mouth = z === z1 && Math.abs(x) <= 1 && y <= 4;
        if (shell && !socket && !mouth) world.set(x, y, z, 'boneBlock');
      }
    }
  }
}

function buildSift() {
  const world = new World({ floor: -2 });
  for (let x = BOUNDS.x0; x <= BOUNDS.x1; x += 1) {
    for (let z = BOUNDS.z0; z <= BOUNDS.z1; z += 1) {
      const h = groundAt(x, z);
      const region = regionAt(x, z);
      const fill = region === 'carapace' ? 'siftSand' : 'siftSculk';
      for (let y = -2; y < h; y += 1) world.set(x, y, z, fill);
      const patch = hash(Math.floor(x / 4), Math.floor(z / 4), 62) > 0.72 && hash(x, z, 63) > 0.2;
      const shard = hash(x, z, 64) > 0.965;
      const top = region === 'carapace' ? (shard ? 'boneBlock' : 'siftSand') : region === 'hills' ? 'hillGrass' : patch ? 'siftSculk' : 'siftGrass';
      world.set(x, h, z, top);
      // the edge of the world is fog; an invisible wall keeps you in it
      const edge = x === BOUNDS.x0 || x === BOUNDS.x1 || z === BOUNDS.z0 || z === BOUNDS.z1;
      if (edge) for (let y = h + 1; y <= h + 8; y += 1) world.set(x, y, z, 'barrier');
    }
  }
  const flood = (spots: readonly (readonly [number, number, number])[], id: 'ichor' | 'water') =>
    spots.forEach(([px, pz, r]) => {
      for (let x = px - r; x <= px + r; x += 1) {
        for (let z = pz - r; z <= pz + r; z += 1) if (Math.hypot(x - px, z - pz) <= r) world.set(x, groundAt(x, z), z, id);
      }
    });
  flood(POOLS, 'ichor');
  flood(PONDS, 'water');
  TREES.forEach(([x, z]) => tree(world, x, z, regionAt(x, z) === 'hills'));
  RIBS.forEach((z) => arch(world, 0, z, RIB_SPAN, RIB_RISE));
  FOSSILS.forEach(([x, z, span, rise]) => arch(world, x, z, span, rise));
  // the spine along the top of the ribs
  for (let z = RIBS[0] + 4; z >= RIBS[RIBS.length - 1] - 6; z -= 1) world.set(0, RIB_RISE + 2, z, 'boneBlock');
  skull(world);
  // the bone circle on the summit of Lullaby Hills
  const peak = groundAt(SUMMIT.x, SUMMIT.z);
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const x = SUMMIT.x + Math.round(Math.cos(angle) * 5);
    const z = SUMMIT.z + Math.round(Math.sin(angle) * 5);
    const height = 3 + (index % 2) * 2;
    for (let y = groundAt(x, z) + 1; y <= peak + height; y += 1) world.set(x, y, z, 'boneBlock');
  }
  // the frame back to the ancient city, the same reinforced deepslate
  for (let x = PORTAL.x0; x <= PORTAL.x1; x += 1) {
    for (let y = 0; y <= PORTAL.y1; y += 1) {
      const edge = x === PORTAL.x0 || x === PORTAL.x1 || y === 0 || y === PORTAL.y1;
      if (edge) world.set(x, y, PORTAL.z, 'reinforced');
    }
  }
  return world;
}

const FLOWER_COLORS = ['#7ff6ff', '#ffc2d1', '#e8fffb', '#b8a6ff'];
const matrix = new THREE.Matrix4();
const place = new THREE.Vector3();
const size = new THREE.Vector3();
const turn = new THREE.Quaternion();

// Lullaby Hills' flowers: a stem and a glowing bud each, two instanced meshes for all of them.
// Walk past one and it sings its note, and its bud swells.
function SingingFlowers() {
  const stems = useRef<THREE.InstancedMesh>(null);
  const buds = useRef<THREE.InstancedMesh>(null);
  const flowers = useMemo(() => FLOWERS.map((flower) => ({ ...flower, y: groundAt(flower.x, flower.z) + 0.5, sang: -9 })), []);
  const stemMat = useMemo(() => new THREE.MeshLambertMaterial({ color: '#1f7f73' }), []);
  const budMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff' }), []);
  useEffect(
    () => () => {
      stemMat.dispose();
      budMat.dispose();
    },
    [stemMat, budMat]
  );
  useLayoutEffect(() => {
    const color = new THREE.Color();
    flowers.forEach((flower, index) => {
      stems.current?.setMatrixAt(index, matrix.compose(place.set(flower.x, flower.y + 0.3, flower.z), turn, size.set(0.08, 0.6, 0.08)));
      buds.current?.setColorAt(index, color.set(FLOWER_COLORS[flower.pitch % FLOWER_COLORS.length]));
    });
    if (stems.current) stems.current.instanceMatrix.needsUpdate = true;
    if (buds.current?.instanceColor) buds.current.instanceColor.needsUpdate = true;
  }, [flowers]);

  useFrame(() => {
    const mesh = buds.current;
    if (!mesh) return;
    const p = runtime.player.pos;
    const t = runtime.time;
    flowers.forEach((flower, index) => {
      if (Math.abs(p.x - flower.x) < 1.3 && Math.abs(p.z - flower.z) < 1.3 && Math.abs(p.y - flower.y) < 2 && t - flower.sang > 2.5) {
        flower.sang = t;
        playNote(flower.pitch, 'subSculkFlower');
        spawnEffect('burst', new THREE.Vector3(flower.x, flower.y + 0.8, flower.z), FLOWER_COLORS[flower.pitch % FLOWER_COLORS.length]);
      }
      const swell = Math.max(0, 1 - (t - flower.sang) / 0.6);
      const s = 0.22 + swell * 0.18 + Math.sin(t * 2 + index) * 0.02;
      mesh.setMatrixAt(index, matrix.compose(place.set(flower.x, flower.y + 0.7, flower.z), turn, size.set(s, s, s)));
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={stems} args={[UNIT_BOX, stemMat, flowers.length]} />
      <instancedMesh ref={buds} args={[UNIT_BOX, budMat, flowers.length]} />
    </>
  );
}

const wander = (x: number, z: number, radius: number, speed: number): Wander => ({ home: new THREE.Vector3(x, groundAt(x, z) + 0.5, z), radius, speed });

const BLUBS = [
  [-8, -14],
  [9, -22],
  [18, -34],
  [-4, -40],
  [32, -10],
].flatMap(([x, z]) => [
  { wander: wander(x, z, 5, 1.2), baby: false },
  { wander: wander(x + 2, z + 2, 4, 1.4), baby: true },
]);
const SIFTERS = [
  { id: 'sifter-1', wander: wander(-6, -100, 6, 1) },
  { id: 'sifter-2', wander: wander(8, -112, 6, 1) },
  { id: 'sifter-3', wander: wander(-3, -128, 5, 1) },
  { id: 'sifter-4', wander: wander(-24, -120, 6, 1) },
  { id: 'sifter-5', wander: wander(24, -140, 6, 1) },
];
const TURTLES = [
  { wander: wander(22, -98, 6, 0.4), baby: false },
  { wander: wander(24, -100, 4, 0.5), baby: true },
  { wander: wander(-32, -128, 6, 0.4), baby: false },
  { wander: wander(12, -146, 5, 0.4), baby: false },
];

export function Sift() {
  const world = useMemo(() => buildSift(), []);
  const sifters = useRespawns(40);
  const beats = useRef({ t: 0, hinted: false, seen: new Set<Region>() });

  useEffect(() => {
    runtime.world = world;
    runtime.voidY = -20;
    setWaterSky([30, 60, 20], '#fff1f4', '#6fd9cf', '#8fe8f0');
    const game = useEndGame.getState();
    game.setCheckpoint(SPAWN[0], 0.5, SPAWN[1], 0);
    startAmbience('sift');
    if (!game.flags.siftVisited) {
      game.setFlag('siftVisited');
      game.showTitle('siftTitle', 'siftTagline');
      game.advance('goal', 'advSift', 'blub');
      window.setTimeout(() => useEndGame.getState().say('ghostSift'), 3500);
      window.setTimeout(() => useEndGame.getState().say('blasterSift', BLASTER), 6500);
    }
    return () => {
      stopAmbience();
      runtime.world = null;
    };
  }, [world]);

  useFrame((_, delta) => {
    const b = beats.current;
    const game = useEndGame.getState();
    if (game.transition || !game.checkpoint) return;
    b.t += Math.min(delta, 0.1);
    const p = runtime.player.pos;
    if (!b.hinted && b.t > 2) {
      b.hinted = true;
      game.showActionBar('hintSift');
    }
    // each region names itself the first time you walk into it
    const region = regionAt(Math.round(p.x), Math.round(p.z));
    if (b.t > 8 && !b.seen.has(region) && !game.actionBar) {
      b.seen.add(region);
      game.showActionBar(REGION_NAMES[region]);
    }
    if (p.z > PORTAL.z - 0.2 && p.x > PORTAL.x0 + 0.5 && p.x < PORTAL.x1 - 0.5 && p.y < PORTAL.y1) {
      game.travel('ancient', 'sift', 'portal');
      cue('travel');
    }
  });

  return (
    <>
      <color attach="background" args={['#6fd9cf']} />
      <fog attach="fog" args={['#6fd9cf', 30, 130]} />
      <ambientLight intensity={0.9} color="#f2fffb" />
      <hemisphereLight args={['#bff7ef', '#f29bb0', 0.6]} />
      <Sun position={[30, 60, 20]} intensity={2.2} color="#fff1f4" />
      <WorldMesh world={world} />
      <SiftPortalSheet center={[0, PORTAL.y1 / 2, PORTAL.z]} width={PORTAL.x1 - PORTAL.x0 - 1} height={PORTAL.y1 - 1} />
      <Chest world={world} id="sift" at={CHEST_AT} />
      <pointLight position={[0, 6, CHEST_AT[2] + 1]} color="#5ff0dc" intensity={6} distance={12} decay={1.6} />
      <SingingFlowers />
      {BLUBS.map(({ wander: home, baby }, index) => (
        <Blub key={index} wander={home} baby={baby} />
      ))}
      {TURTLES.map(({ wander: home, baby }, index) => (
        <Turtle key={index} wander={home} baby={baby} />
      ))}
      {SIFTERS.map(({ id, wander: home }) => (
        <Sifter key={`${id}:${sifters.life(id)}`} wander={home} onDeath={() => sifters.died(id)} />
      ))}
      {/* the souls the Sift is full of, and pink drifting from the meadow */}
      <Sparkles count={240} scale={[120, 22, 172]} position={[-10, 9, -74]} size={3} speed={0.3} color="#e8fffb" opacity={0.7} />
      <Sparkles count={90} scale={[70, 8, 90]} position={[10, 4, -30]} size={2.5} speed={0.2} color="#ffc2d1" opacity={0.6} />
    </>
  );
}
