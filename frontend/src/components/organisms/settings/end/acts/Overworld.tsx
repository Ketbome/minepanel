'use client';

import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { cue, startAmbience, stopAmbience } from '../end-audio';
import { spawnEffect } from '../engine/Effects';
import { countOf } from '../items';
import { cellBox, runtime, useTarget, type Target } from '../engine/runtime';
import { cellKey, cellOf, World } from '../engine/world';
import { WorldMesh } from '../engine/WorldMesh';
import { Creeper, Pig, Rabbit, Sheep, Villager } from '../mobs/overworld';
import { createSunsetMaterial } from '../shaders';
import { lastSeenKey } from '../lore';
import { useEndGame } from '../store';
import { easeInOut, hash, kit, UNIT_BOX, type Block } from '../voxels';
import { CAMP, CAVE, DIG, groundHeight, OVERWORLD_RADIUS, RUINED, VILLAGE } from './overworld-layout';
import { Chest, CraftingTable, inside, Lectern, NetherPortalSheet, Sign, Torch } from './props';

const R = OVERWORLD_RADIUS;
const SUN = new THREE.Vector3(DIG.x, 6, DIG.z).normalize();
const SKY = new THREE.SphereGeometry(300, 24, 16);
const TREES = [
  [-8, -5],
  [-10, 6],
  [-4, -12],
  [6, 9],
  [-6, 11],
  [12, 4],
  [15, -4],
  [4, -16],
  [-14, 12],
  [11, 13],
  [-18, 2],
  [8, -28],
  [-10, -30],
  [18, 8],
  [30, -4],
  [34, 12],
  [-34, -6],
  [-36, 14],
  [2, 30],
  [14, 34],
  [-14, 36],
  [36, -30],
  [-30, -34],
  [28, -36],
] as const;

// the ruined portal: a 4x5 obsidian frame on the x axis, two blocks never placed
const FRAME = { x0: RUINED.x - 1, x1: RUINED.x + 2, y0: 1, y1: 5, z: RUINED.z };
const GAPS = [
  [RUINED.x + 1, 5, RUINED.z],
  [RUINED.x + 2, 3, RUINED.z],
] as const;
const INNER_FROM = [FRAME.x0 + 1, FRAME.y0 + 1, FRAME.z] as const;
const INNER_TO = [FRAME.x1 - 1, FRAME.y1 - 1, FRAME.z] as const;
const TUNNEL = { x0: CAVE.x + 1, x1: CAVE.x + 3, z0: CAVE.z - 5, z1: CAVE.z };

// mobs wander around fixed homes; module constants so a re-render never snaps them back
const HOMES = {
  librarian: { home: new THREE.Vector3(VILLAGE.x - 6, 0.5, VILLAGE.z - 1.5), radius: 2, speed: 0.8 },
  farmer: { home: new THREE.Vector3(VILLAGE.x + 4, 0.5, VILLAGE.z + 2), radius: 5, speed: 1 },
  nitwit: { home: new THREE.Vector3(VILLAGE.x, 0.5, VILLAGE.z + 4), radius: 6, speed: 1.2 },
  mason: { home: new THREE.Vector3(VILLAGE.x + 6, 0.5, VILLAGE.z - 1.5), radius: 3, speed: 0.9 },
  sheep: { home: new THREE.Vector3(VILLAGE.x - 3, 0.5, VILLAGE.z + 10), radius: 4, speed: 0.8 },
  rabbit: { home: new THREE.Vector3(VILLAGE.x + 9, 0.5, VILLAGE.z + 12.5), radius: 2, speed: 1.4 },
  pig: { home: new THREE.Vector3(CAMP.x + 5, 0.5, CAMP.z + 5), radius: 3, speed: 0.7 },
  // out of sight of the camp: Kevin finds you on the way to the dig, sword in hand
  creeper: { home: new THREE.Vector3(18, 0.5, 16), radius: 5, speed: 0.9 },
};

export const OVERWORLD_SPAWNS: Record<string, readonly [number, number, number, number]> = {
  camp: [CAMP.x + 0.5, 0.5, CAMP.z + 4.5, 0],
  portal: [RUINED.x + 1, 0.5, RUINED.z + 3, 0],
  cave: [CAVE.x + 2, 0.5, CAVE.z - 8, -0.83],
};

function house(world: World, cx: number, cz: number, w: number, d: number, door: 'n' | 's' | 'e' | 'w') {
  const x0 = cx - Math.floor(w / 2);
  const z0 = cz - Math.floor(d / 2);
  const x1 = x0 + w - 1;
  const z1 = z0 + d - 1;
  world.fill(x0, 0, z0, x1, 0, z1, 'cobble');
  for (let y = 1; y <= 3; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      for (let z = z0; z <= z1; z += 1) {
        const edgeX = x === x0 || x === x1;
        const edgeZ = z === z0 || z === z1;
        if (!edgeX && !edgeZ) continue;
        const corner = edgeX && edgeZ;
        const window = y === 2 && !corner && ((edgeX && z === cz) || (edgeZ && x === cx));
        world.set(x, y, z, corner ? 'log' : window ? 'glass' : 'planks');
      }
    }
  }
  const [dx, dz] = door === 'n' ? [cx, z0] : door === 's' ? [cx, z1] : door === 'e' ? [x1, cz] : [x0, cz];
  world.remove(dx, 1, dz);
  world.remove(dx, 2, dz);
  // a stepped roof
  for (let layer = 0; layer <= Math.ceil(Math.min(w, d) / 2); layer += 1) {
    world.fill(x0 - 1 + layer, 4 + layer, z0 - 1 + layer, x1 + 1 - layer, 4 + layer, z1 + 1 - layer, 'planks');
  }
}

interface Scenery {
  readonly world: World;
  readonly tallGrass: Block[];
}

function buildOverworld(mined: readonly number[], obsidian: readonly number[], eyeLanded: boolean): Scenery {
  const world = new World();
  const tallGrass: Block[] = [];
  for (let x = -R; x <= R; x += 1) {
    for (let z = -R; z <= R; z += 1) {
      const h = groundHeight(x, z);
      world.set(x, h, z, 'grass', 0.88 + hash(x, z, 3) * 0.12);
      for (let y = h - 1; y >= -2; y -= 1) world.set(x, y, z, 'dirt', 0.9);
      world.set(x, -3, z, 'stone');
      const open = Math.hypot(x - CAMP.x, z - CAMP.z) > 3 && Math.hypot(x - VILLAGE.x, z - VILLAGE.z) > 12 && Math.hypot(x - RUINED.x, z - RUINED.z) > 5;
      if (open && hash(x, z, 5) > 0.86) tallGrass.push({ x, y: h + 1, z, tint: 0.85 + hash(z, x, 6) * 0.15 });
    }
  }
  // the world border: invisible barrier walls, like the game's
  for (let i = -R - 1; i <= R + 1; i += 1) {
    for (let y = -3; y <= 14; y += 1) {
      world.set(i, y, -R - 1, 'barrier');
      world.set(i, y, R + 1, 'barrier');
      world.set(-R - 1, y, i, 'barrier');
      world.set(R + 1, y, i, 'barrier');
    }
  }
  TREES.forEach(([x, z], index) => {
    const base = groundHeight(x, z) + 1;
    const trunk = 4 + (index % 2);
    for (let y = 0; y < trunk; y += 1) world.set(x, base + y, z, 'log');
    const top = base + trunk;
    for (let layer = -2; layer <= 1; layer += 1) {
      const reach = layer < 0 ? 2 : 1;
      for (let dx = -reach; dx <= reach; dx += 1) {
        for (let dz = -reach; dz <= reach; dz += 1) {
          const corner = Math.abs(dx) === reach && Math.abs(dz) === reach;
          if ((dx === 0 && dz === 0 && layer < 0) || (corner && (layer === 1 || hash(x + dx, layer, z + dz) < 0.5))) continue;
          world.set(x + dx, top + layer, z + dz, 'leaves', 0.85 + hash(dx, layer, dz) * 0.15);
        }
      }
    }
  });

  // the village: four houses, a well and paths between them
  const houses = [
    [VILLAGE.x - 6, VILLAGE.z - 5, 5, 5, 's'],
    [VILLAGE.x + 6, VILLAGE.z - 5, 5, 6, 's'],
    [VILLAGE.x - 6, VILLAGE.z + 6, 6, 5, 'n'],
    [VILLAGE.x + 6, VILLAGE.z + 6, 5, 5, 'n'],
  ] as const;
  houses.forEach(([x, z, w, d, door]) => house(world, x, z, w, d, door));
  for (let i = -10; i <= 10; i += 1) {
    world.set(VILLAGE.x + i, 0, VILLAGE.z, 'path');
    world.set(VILLAGE.x, 0, VILLAGE.z + i, 'path');
  }
  for (let x = VILLAGE.x + 11; x <= CAMP.x - 3; x += 1) world.set(x, 0, Math.round(VILLAGE.z + ((x - VILLAGE.x) / (CAMP.x - VILLAGE.x)) * (CAMP.z - VILLAGE.z)), 'path');
  world.fill(VILLAGE.x - 1, 0, VILLAGE.z - 1, VILLAGE.x + 1, 1, VILLAGE.z + 1, 'cobble');
  world.set(VILLAGE.x, 1, VILLAGE.z, 'water');
  world.set(VILLAGE.x, 0, VILLAGE.z, 'water');
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].forEach(([dx, dz]) => world.fill(VILLAGE.x + dx, 2, VILLAGE.z + dz, VILLAGE.x + dx, 3, VILLAGE.z + dz, 'log'));
  world.fill(VILLAGE.x - 1, 4, VILLAGE.z - 1, VILLAGE.x + 1, 4, VILLAGE.z + 1, 'cobble');
  world.set(VILLAGE.x + 3, 1, VILLAGE.z + 2, 'hay');
  world.set(VILLAGE.x + 3, 1, VILLAGE.z + 3, 'hay');
  world.set(VILLAGE.x + 3, 2, VILLAGE.z + 3, 'hay');
  world.fill(VILLAGE.x - 8, 1, VILLAGE.z - 7, VILLAGE.x - 5, 1, VILLAGE.z - 7, 'bookshelf');

  // the ruined portal and the scorched ground around it
  for (let x = FRAME.x0; x <= FRAME.x1; x += 1) {
    for (let y = FRAME.y0; y <= FRAME.y1; y += 1) {
      const edge = x === FRAME.x0 || x === FRAME.x1 || y === FRAME.y0 || y === FRAME.y1;
      if (!edge) continue;
      world.set(x, y, FRAME.z, hash(x, y, 7) > 0.7 ? 'crying' : 'obsidian');
    }
  }
  GAPS.forEach(([x, y, z], index) => {
    if (!obsidian.includes(index)) world.remove(x, y, z);
  });
  for (let dx = -4; dx <= 5; dx += 1) {
    for (let dz = -3; dz <= 4; dz += 1) {
      const roll = hash(RUINED.x + dx, RUINED.z + dz, 11);
      if (Math.hypot(dx - 0.5, dz) > 4.5 || roll < 0.35) continue;
      world.set(RUINED.x + dx, 0, RUINED.z + dz, roll > 0.9 ? 'magma' : roll > 0.85 ? 'goldBlock' : 'netherrack');
    }
  }

  // the cave: a stone tunnel into the hill
  for (let x = TUNNEL.x0 - 1; x <= TUNNEL.x1 + 1; x += 1) {
    for (let z = TUNNEL.z0; z <= TUNNEL.z1 + 1; z += 1) {
      for (let y = 0; y <= 4; y += 1) {
        const wall = x === TUNNEL.x0 - 1 || x === TUNNEL.x1 + 1 || y === 0 || y === 4 || z === TUNNEL.z1 + 1;
        if (wall) world.set(x, y, z, 'stone');
        else world.remove(x, y, z);
      }
    }
  }

  // the shaft the eye points at: it only opens once the eye has shown the way
  for (let y = -3; y >= -9; y -= 1) {
    for (let dx = -1; dx <= 1; dx += 1) for (let dz = -1; dz <= 1; dz += 1) if (dx || dz) world.set(DIG.x + dx, y, DIG.z + dz, 'stone');
  }
  if (eyeLanded) world.remove(DIG.x, -3, DIG.z);

  mined.forEach((key) => {
    const [x, y, z] = cellOf(key);
    world.remove(x, y, z);
  });
  return { world, tallGrass };
}

function SunsetSky() {
  const material = useMemo(() => createSunsetMaterial(SUN), []);
  const mesh = useRef<THREE.Mesh>(null);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((state) => {
    mesh.current?.position.copy(state.camera.position);
  });
  return <mesh ref={mesh} geometry={SKY} material={material} renderOrder={-1} frustumCulled={false} />;
}

// a gap in the portal frame: holding obsidian, you fill it
function PortalGap({ world, gap }: { readonly world: World; readonly gap: number }) {
  const at: readonly [number, number, number] = GAPS[gap];
  const filled = useEndGame((state) => state.obsidian.includes(gap));
  const target = useMemo<Target | null>(
    () =>
      filled
        ? null
        : {
            box: cellBox(...at),
            label: () => 'portalGap',
            use: () => {
              const game = useEndGame.getState();
              // like the game, but forgiving: the obsidian only has to be in your inventory
              if (!game.spend('obsidian')) {
                game.showActionBar('hintObsidian');
                return;
              }
              world.place(...at, 'obsidian');
              game.placeObsidian(gap);
              cue('place');
            },
          },
    [filled, at, gap, world]
  );
  useTarget(target);
  return filled ? null : <Sparkles count={6} scale={[1, 1, 1]} position={at as [number, number, number]} size={3} speed={0.4} color="#c77dff" />;
}

// the complete frame, lit with flint and steel
function PortalLighter() {
  const complete = useEndGame((state) => state.obsidian.length >= GAPS.length);
  const lit = useEndGame((state) => Boolean(state.flags.portalLit));
  const target = useMemo<Target | null>(
    () =>
      complete && !lit
        ? {
            box: new THREE.Box3(new THREE.Vector3(INNER_FROM[0] - 0.5, INNER_FROM[1] - 0.5, FRAME.z - 0.5), new THREE.Vector3(INNER_TO[0] + 0.5, INNER_TO[1] + 0.5, FRAME.z + 0.5)),
            label: () => 'portalFrame',
            use: () => {
              const game = useEndGame.getState();
              if (!countOf(game.inventory, 'flint')) {
                game.showActionBar('hintFlint');
                return;
              }
              cue('flint');
              cue('netherPortal');
              game.setFlag('portalLit');
            },
          }
        : null,
    [complete, lit]
  );
  useTarget(target);
  return lit ? <NetherPortalSheet from={INNER_FROM} to={INNER_TO} axis="x" /> : null;
}

// the eye of ender flies to where the stronghold is and sinks into the ground there
function ThrownEye({ from, onLand }: { readonly from: THREE.Vector3; readonly onLand: () => void }) {
  const { mat, tex } = kit();
  const group = useRef<THREE.Group>(null);
  const flight = useMemo(() => {
    const ground = groundHeight(DIG.x, DIG.z) + 0.5;
    const end = new THREE.Vector3(DIG.x, ground + 3, DIG.z);
    const mid = from.clone().lerp(end, 0.5).setY(Math.max(from.y, end.y) + 5);
    return { curve: new THREE.QuadraticBezierCurve3(from.clone(), mid, end), ground, seconds: Math.max(2, from.distanceTo(end) / 9) };
  }, [from]);
  const age = useRef(0);
  const landed = useRef(false);

  useFrame((state, delta) => {
    const eye = group.current;
    if (!eye || landed.current) return;
    const t = (age.current += Math.min(delta, 0.1));
    if (t < flight.seconds) flight.curve.getPointAt(easeInOut(t / flight.seconds), eye.position);
    else if (t < flight.seconds + 0.6) eye.position.set(DIG.x, flight.ground + 3 + Math.sin(t * 9) * 0.08, DIG.z);
    else {
      const k = Math.min(1, (t - flight.seconds - 0.6) / 0.35);
      eye.position.set(DIG.x, flight.ground + 3 - k * k * 3, DIG.z);
      if (k >= 1) {
        landed.current = true;
        eye.visible = false;
        onLand();
      }
    }
    eye.rotation.y = state.clock.elapsedTime * 4;
  });

  return (
    <group ref={group} position={from}>
      <mesh geometry={UNIT_BOX} material={mat.eye} scale={0.26} />
      <sprite scale={1.1}>
        <spriteMaterial map={tex.glow} color="#7dffb0" transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.8} />
      </sprite>
      <Sparkles count={14} scale={0.9} size={2} speed={0.9} color="#c86bff" />
    </group>
  );
}

export function Overworld() {
  // where you came in from, read once: `entry` already names the next zone while this one unmounts
  const [entry] = useState(() => useEndGame.getState().entry);
  const eyeLanded = useEndGame((state) => Boolean(state.flags.eyeLanded));
  const scenery = useMemo(() => {
    const game = useEndGame.getState();
    return buildOverworld(game.mined, game.obsidian, Boolean(game.flags.eyeLanded));
  }, []);
  const { world } = scenery;
  const [thrown, setThrown] = useState<THREE.Vector3 | null>(null);
  const beats = useRef({ t: 0, voices: false, seen: false, hinted: false, portalSeen: false, back: false, eyesHint: false });

  useEffect(() => {
    runtime.world = world;
    runtime.voidY = -30;
    const game = useEndGame.getState();
    const [x, y, z, yaw] = OVERWORLD_SPAWNS[entry] ?? OVERWORLD_SPAWNS.camp;
    game.setCheckpoint(x, y, z, yaw);
    startAmbience('overworld');
    runtime.hooks.mined = (mx, my, mz) => {
      useEndGame.getState().mine(cellKey(mx, my, mz));
      spawnEffect('debris', new THREE.Vector3(mx, my, mz), my >= 0 ? '#5f9f35' : '#79553a');
    };
    runtime.hooks.useItem = (item) => {
      if (item !== 'eye') return false;
      const state = useEndGame.getState();
      if (!state.flags.rodsDone) state.showActionBar('hintNotYet');
      else if (state.flags.eyeThrown) state.showActionBar('hintEyeKnown');
      else if (state.spend('eye')) {
        state.setFlag('eyeThrown');
        cue('throw');
        setThrown(runtime.player.eye.clone().addScaledVector(runtime.player.look, 0.8));
      }
      return true;
    };
    return () => {
      stopAmbience();
      runtime.world = null;
      runtime.hooks.mined = null;
      runtime.hooks.useItem = null;
    };
  }, [world, entry]);

  const land = () => {
    const game = useEndGame.getState();
    cue('shatter');
    spawnEffect('burst', new THREE.Vector3(DIG.x, groundHeight(DIG.x, DIG.z) + 0.6, DIG.z));
    world.remove(DIG.x, -3, DIG.z);
    game.setFlag('eyeLanded');
    game.showActionBar('hintDig');
  };

  useFrame((_, delta) => {
    const b = beats.current;
    const game = useEndGame.getState();
    if (!game.flags.started || game.transition || !game.checkpoint) return;
    b.t += Math.min(delta, 0.1);
    const p = runtime.player.pos;

    if (!game.flags.camp && entry === 'camp') {
      if (!b.voices && b.t > 1) {
        b.voices = true;
        game.voices('voiceWill', 'voiceAlways');
      }
      if (!b.seen && b.t > 3) {
        b.seen = true;
        game.announce(lastSeenKey(game.ghost));
      }
      if (!b.hinted && b.t > 5) {
        b.hinted = true;
        game.showActionBar('hintCamp');
      }
    }
    if (!game.flags.camp && game.chests.camp.every((slot) => !slot || slot.item === 'dirt')) {
      game.setFlag('camp');
      game.showActionBar('hintSword');
    }
    if (!b.portalSeen && Math.hypot(p.x - RUINED.x, p.z - RUINED.z) < 9 && !game.flags.portalLit) {
      b.portalSeen = true;
      game.say('ghostPortal');
    }
    if (game.flags.rodsDone && !b.back && entry === 'portal') {
      b.back = true;
      game.showActionBar('hintEyes');
      game.say('ghostBack');
    }
    if (game.flags.eyesCrafted && !b.eyesHint && !game.flags.eyeThrown) {
      b.eyesHint = true;
      game.showActionBar('hintThrowEye');
    }

    if (game.flags.portalLit && inside(INNER_FROM, INNER_TO, 0.1)) {
      game.travel('nether', 'arrive', 'portal');
      cue('travel');
    }
    if (p.x > TUNNEL.x0 - 0.5 && p.x < TUNNEL.x1 + 0.5 && p.z > TUNNEL.z1 - 1.2 && p.y < 3) game.travel('ancient', 'arrive', 'black');
    if (Math.hypot(p.x - DIG.x, p.z - DIG.z) < 1 && p.y < -5) {
      game.setFlag('stronghold');
      game.travel('stronghold', 'arrive', 'black');
    }
  });

  return (
    <>
      <color attach="background" args={['#e89a74']} />
      <fog attach="fog" args={['#d98a72', 22, 70]} />
      <ambientLight intensity={0.75} color="#ffd9b8" />
      <hemisphereLight args={['#ffb27a', '#3a5a2a', 0.7]} />
      <directionalLight position={[SUN.x * 40, SUN.y * 40, SUN.z * 40]} intensity={1.5} color="#ffb070" />
      <SunsetSky />
      <WorldMesh world={world} grass={scenery.tallGrass} />

      <Chest world={world} id="camp" at={[CAMP.x, 1, CAMP.z]} />
      <Chest world={world} id="backups" at={[CAMP.x - 2, 1, CAMP.z]} />
      <CraftingTable world={world} at={[CAMP.x + 2, 1, CAMP.z]} />
      <Torch position={[CAMP.x - 1, 0.78, CAMP.z + 1.3]} />
      <Sign id="incidents" at={[CAMP.x + 1, 1, CAMP.z - 2]} />
      <Sign id="restart" at={[CAMP.x + 3, 1, CAMP.z + 1]} facing={-0.6} />
      <Sign id="backups" at={[CAMP.x - 3, 1, CAMP.z + 1]} facing={0.5} />
      <Sign id="border" at={[R - 1, groundHeight(R - 1, 0) + 1, 0]} facing={-Math.PI / 2} />
      <Sign id="toast" at={[VILLAGE.x + 9, 1, VILLAGE.z + 11]} />
      <Sign id="cave" at={[CAVE.x + 5, 1, CAVE.z - 7]} facing={-0.8} />
      <Sign id="casi" at={[RUINED.x + 4, 1, RUINED.z + 2]} facing={-0.4} />
      <Chest world={world} id="ruined" at={[RUINED.x - 2, 1, RUINED.z + 2]} facing={0.4} />
      <Lectern world={world} at={[VILLAGE.x - 6, 1, VILLAGE.z - 6]} book="register" />
      {GAPS.map((gap, index) => (
        <PortalGap key={gap.join(':')} world={world} gap={index} />
      ))}
      <PortalLighter />
      {[
        [VILLAGE.x + 2, VILLAGE.z + 2],
        [VILLAGE.x - 2, VILLAGE.z - 2],
        [VILLAGE.x + 10, VILLAGE.z],
      ].map(([x, z]) => (
        <Torch key={`${x}:${z}`} position={[x, 0.78, z]} />
      ))}

      <Villager profession="librarian" wander={HOMES.librarian} />
      <Villager profession="farmer" wander={HOMES.farmer} />
      <Villager profession="nitwit" wander={HOMES.nitwit} />
      <Villager profession="mason" wander={HOMES.mason} />
      <Sheep wander={HOMES.sheep} />
      <Rabbit name="Toast" wander={HOMES.rabbit} />
      <Pig name="Producción" wander={HOMES.pig} />
      <Creeper name="Kevin" wander={HOMES.creeper} />

      {eyeLanded && (
        <group position={[DIG.x, groundHeight(DIG.x, DIG.z) + 1.5, DIG.z]}>
          <Sparkles count={30} scale={[1.2, 3, 1.2]} size={3} speed={0.5} color="#7dffb0" />
          <pointLight color="#6dffb0" intensity={4} distance={6} decay={2} />
        </group>
      )}
      {thrown && !eyeLanded && <ThrownEye from={thrown} onLand={land} />}
    </>
  );
}
