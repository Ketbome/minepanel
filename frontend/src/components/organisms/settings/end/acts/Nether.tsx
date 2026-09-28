'use client';

import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cue, prefetch, startAmbience, stopAmbience } from '../end-audio';
import { spawnEffect } from '../engine/Effects';
import { cellBox, runtime, useTarget, type Target } from '../engine/runtime';
import { World } from '../engine/world';
import { WorldMesh } from '../engine/WorldMesh';
import { countOf } from '../items';
import { Blaze, Ghast } from '../mobs/nether';
import { Hoglin, MagmaCube, Strider, WitherSkeleton, ZombifiedPiglin } from '../mobs/nether-monsters';
import { useRespawns } from '../mobs/parts';
import { calmPiglins, Piglin } from '../mobs/piglin';
import { BFUUNY, BLAZES, useEndGame } from '../store';
import { hash, kit, UNIT_BOX } from '../voxels';
import { Bed, bfuunyLaughs, inside, Lectern, NetherPortalSheet, Sign } from './props';

// The Nether: a portal island, a lava lake, a nether brick bridge and the fortress where the
// blazes guard the rods. One unit is one block; walkable ground tops out at y = 0.5.

const EXTENT = { x0: -34, x1: 34, z0: -50, z1: 16 };
const PORTAL = { x0: -1, x1: 2, y0: 1, y1: 5, z: 8 };
const INNER_FROM = [PORTAL.x0 + 1, PORTAL.y0 + 1, PORTAL.z] as const;
const INNER_TO = [PORTAL.x1 - 1, PORTAL.y1 - 1, PORTAL.z] as const;
const FORTRESS = { x0: -9, x1: 9, z0: -44, z1: -26 };
const SPAWNER = new THREE.Vector3(0, 1, -36);
const BED = [5, 1, 4] as const;
const BLAZE_HOMES = [new THREE.Vector3(-4, 2.5, -35), new THREE.Vector3(4, 3, -37), new THREE.Vector3(0, 3.5, -40)];
const CEILING = 22;
const GHAST_HOME = new THREE.Vector3(-16, 9, -14);
// the piglins' ledge, off the portal island toward the bridge, strewn with gold
const CAMP = { x: -12, z: -3, radius: 5.5 };
const PIGLINS = [
  { id: 'piglin-1', home: new THREE.Vector3(-12, 0.5, -3) },
  { id: 'piglin-2', home: new THREE.Vector3(-14, 0.5, -1) },
  { id: 'piglin-3', home: new THREE.Vector3(-10, 0.5, -6) },
  { id: 'piglin-4', home: new THREE.Vector3(-15, 0.5, -5) },
].map((piglin) => ({ ...piglin, wander: { home: piglin.home, radius: 3, speed: 1 } }));
const PEARLS_NEEDED = 10;
// the rest of the Nether's mobs: zombified piglins idling on the portal island (neutral until you
// hit one), hoglins and magma cubes on islands out in the lava, wither skeletons in the fortress,
// striders on the shore
const HOGLIN_ISLAND = { x: 22, z: -12, radius: 5 };
const MAGMA_ISLAND = { x: -22, z: -24, radius: 4 };
const around = (x: number, z: number, radius = 3, speed = 1) => ({ home: new THREE.Vector3(x, 0.5, z), radius, speed });
const ZOMBIFIED = [around(4, 1), around(5, 0), around(3, -1), around(6, 2)];
const HOGLINS = [around(HOGLIN_ISLAND.x - 1, HOGLIN_ISLAND.z), around(HOGLIN_ISLAND.x + 2, HOGLIN_ISLAND.z + 1)];
const MAGMA_CUBES = [around(MAGMA_ISLAND.x, MAGMA_ISLAND.z - 1, 2), around(MAGMA_ISLAND.x + 1, MAGMA_ISLAND.z + 1, 2)];
const WITHER_SKELETONS = [
  { id: 'wither-1', wander: around(-5, -30) },
  { id: 'wither-2', wander: around(5, -42) },
];
const STRIDERS = [around(7.5, 9, 2, 0.6), around(-6, 5, 2, 0.6)];

function buildNether() {
  const world = new World();
  for (let x = EXTENT.x0; x <= EXTENT.x1; x += 1) {
    for (let z = EXTENT.z0; z <= EXTENT.z1; z += 1) {
      world.set(x, -3, z, 'netherrack');
      world.set(x, CEILING, z, 'netherrack');
      const edge = x === EXTENT.x0 || x === EXTENT.x1 || z === EXTENT.z0 || z === EXTENT.z1;
      if (edge) {
        for (let y = -2; y < CEILING; y += 1) world.set(x, y, z, 'netherrack');
        continue;
      }
      // the portal island and scattered rock around the lake
      const island = Math.hypot(x - 0.5, (z - 5) * 1.2) < 8.5 + hash(x, z, 1) * 1.5;
      const rock = hash(Math.floor(x / 4), Math.floor(z / 4), 3) > 0.82 && Math.abs(x) > 4;
      if (island || rock) {
        const height = island ? 0 : Math.floor(hash(x, z, 2) * 3);
        for (let y = -2; y <= height; y += 1) world.set(x, y, z, hash(x, y, z) > 0.93 ? 'magma' : 'netherrack');
      } else {
        world.set(x, -2, z, 'lava');
      }
      // stalactites and glowstone hanging from the ceiling
      const drip = hash(x, z, 4);
      if (drip > 0.92) {
        const length = 1 + Math.floor(hash(z, x, 5) * 5);
        for (let y = CEILING - 1; y >= CEILING - length; y -= 1) world.set(x, y, z, drip > 0.985 ? 'glowstone' : 'netherrack');
      }
    }
  }
  // the piglins' ledge and the path to it
  for (let x = CAMP.x - 7; x <= CAMP.x + 7; x += 1) {
    for (let z = CAMP.z - 7; z <= CAMP.z + 7; z += 1) {
      if (Math.hypot(x - CAMP.x, z - CAMP.z) > CAMP.radius + hash(x, z, 6) * 1.5) continue;
      for (let y = -2; y <= 0; y += 1) world.set(x, y, z, 'netherrack');
    }
  }
  for (let step = 0; step <= 8; step += 1) {
    const x = Math.round(-3 - step * 0.9);
    const z = Math.round(2 - step * 0.45);
    for (let y = -2; y <= 0; y += 1) {
      world.set(x, y, z, 'netherrack');
      world.set(x, y, z + 1, 'netherrack');
    }
  }
  world.set(CAMP.x - 2, 1, CAMP.z + 3, 'goldBlock');
  world.set(CAMP.x + 3, 1, CAMP.z - 2, 'goldBlock');
  // nether gold ore in the ground: the gold the piglins trade for
  for (let x = EXTENT.x0 + 1; x < EXTENT.x1; x += 1) {
    for (let z = EXTENT.z0 + 1; z < EXTENT.z1; z += 1) {
      const near = Math.hypot(x - 0.5, z - 5) < 10 || Math.hypot(x - CAMP.x, z - CAMP.z) < 7;
      if (world.get(x, 0, z) === 'netherrack' && hash(x, z, 12) > (near ? 0.92 : 0.97)) world.set(x, 0, z, 'netherGold');
    }
  }

  // the bridge: three wide, low walls on both sides, pillars down into the lava
  for (let z = 1; z >= FORTRESS.z1; z -= 1) {
    for (let x = -1; x <= 1; x += 1) world.set(x, 0, z, 'netherBricks');
    if (z % 2 === 0) {
      world.set(-2, 1, z, 'netherBricks');
      world.set(2, 1, z, 'netherBricks');
    }
    world.set(-2, 0, z, 'netherBricks');
    world.set(2, 0, z, 'netherBricks');
    if (z % 6 === 0) for (let y = -2; y < 0; y += 1) world.set(0, y, z, 'netherBricks');
  }
  // the fortress: a walled nether brick yard with the spawner on a dais
  for (let x = FORTRESS.x0; x <= FORTRESS.x1; x += 1) {
    for (let z = FORTRESS.z0; z <= FORTRESS.z1; z += 1) {
      for (let y = -2; y <= 0; y += 1) world.set(x, y, z, 'netherBricks');
      const wall = x === FORTRESS.x0 || x === FORTRESS.x1 || z === FORTRESS.z0 || z === FORTRESS.z1;
      const gate = z === FORTRESS.z1 && Math.abs(x) <= 1;
      if (wall && !gate) for (let y = 1; y <= ((x + z) % 3 === 0 ? 4 : 3); y += 1) world.set(x, y, z, 'netherBricks');
    }
  }
  world.fill(-2, 1, -38, 2, 1, -34, 'netherBricks');
  // two islands out in the lava: the hoglins' and a crust of magma for the magma cubes
  [HOGLIN_ISLAND, MAGMA_ISLAND].forEach(({ x: cx, z: cz, radius }, index) => {
    for (let x = cx - radius - 1; x <= cx + radius + 1; x += 1) {
      for (let z = cz - radius - 1; z <= cz + radius + 1; z += 1) {
        if (Math.hypot(x - cx, z - cz) > radius + hash(x, z, 13)) continue;
        for (let y = -2; y <= 0; y += 1) world.set(x, y, z, index === 1 && y === 0 && hash(x, z, 14) > 0.6 ? 'magma' : 'netherrack');
      }
    }
  });
  // the arrival portal
  for (let x = PORTAL.x0; x <= PORTAL.x1; x += 1) {
    for (let y = PORTAL.y0; y <= PORTAL.y1; y += 1) {
      const edge = x === PORTAL.x0 || x === PORTAL.x1 || y === PORTAL.y0 || y === PORTAL.y1;
      if (edge) world.set(x, y, PORTAL.z, 'obsidian');
    }
  }
  return world;
}

// "Do not sleep here." It explodes, like every bed in the Nether.
function sleep() {
  const game = useEndGame.getState();
  spawnEffect('explosion', new THREE.Vector3(BED[0], BED[1], BED[2]));
  cue('boom');
  game.say('ghostBed');
  game.hurt(99, 'bed');
  if (!game.flags.bfuunyBed) {
    game.setFlag('bfuunyBed');
    bfuunyLaughs('bfuunyBed');
  }
}

function Spawner() {
  const { mat } = kit();
  return (
    <group position={SPAWNER.clone().setY(2)}>
      <mesh geometry={UNIT_BOX} material={mat.spawner} />
      <Sparkles count={12} scale={1.2} size={3} speed={0.8} color="#ff8a2a" />
    </group>
  );
}

export function Nether() {
  const world = useMemo(() => buildNether(), []);
  const killed = useEndGame((state) => state.killed);
  const ghastDown = useEndGame((state) => Boolean(state.flags.ghastReturned) || state.killed.includes('ghast'));
  const beats = useRef({ t: 0, fortress: false, left: false, hinted: false, obituary: false });
  const piglins = useRespawns(30);
  const withers = useRespawns(60);

  useEffect(() => {
    runtime.world = world;
    runtime.voidY = -30;
    const game = useEndGame.getState();
    game.setCheckpoint(0.5, 0.5, 4.5, 0);
    calmPiglins();
    if (!game.flags.nether) {
      game.setFlag('nether');
      game.advance('task', 'advDeeper', 'pearl');
    }
    startAmbience('nether');
    prefetch(['fireball', 'blaze', 'ghast', 'boom', 'hit']);
    return () => {
      stopAmbience();
      runtime.world = null;
    };
  }, [world]);

  const rodFrom = (id: string) => () => {
    const game = useEndGame.getState();
    game.kill(id);
    game.give('rod');
    cue('xp');
    const rods = game.killed.filter((killedId) => BLAZES.includes(killedId)).length + 1;
    if (rods === 1) game.advance('task', 'advRods', 'rod');
    if (rods >= BLAZES.length) {
      game.setFlag('rodsDone');
      game.showActionBar(countOf(game.inventory, 'pearl') + countOf(game.inventory, 'eye') >= PEARLS_NEEDED ? 'hintRodsDone' : 'hintPearlsLeft');
    }
  };

  useFrame((_, delta) => {
    const b = beats.current;
    const game = useEndGame.getState();
    if (game.transition || !game.checkpoint) return;
    b.t += Math.min(delta, 0.1);
    const p = runtime.player.pos;
    if (!b.hinted && b.t > 1.5) {
      b.hinted = true;
      game.showActionBar('hintNether');
    }
    if (!b.fortress && p.z < FORTRESS.z1 + 1 && p.y > -1) {
      b.fortress = true;
      game.setCheckpoint(0.5, 0.5, FORTRESS.z1 - 1, 0);
    } else if (!b.fortress && p.z < -6 && b.t > 4 && !game.actionBar) {
      game.showActionBar('hintFortress');
    }
    if (!b.obituary && b.t > 25) {
      b.obituary = true;
      game.obituary(BFUUNY, 'bfuunyDiedPiglin');
    }
    if (!game.flags.piglinMet && Math.hypot(p.x - CAMP.x, p.z - CAMP.z) < 13) {
      game.setFlag('piglinMet');
      game.say('ghostPiglin');
      game.showActionBar(game.helmet ? 'hintPiglin' : 'hintHelmet');
    }
    // the portal only takes you home once you have walked away from it
    if (!b.left && Math.hypot(p.x - 0.5, p.z - PORTAL.z) > 4) b.left = true;
    if (b.left && inside(INNER_FROM, INNER_TO, 0.1)) {
      cue('travel');
      game.travel('overworld', 'portal', 'portal');
    }
  });

  return (
    <>
      <color attach="background" args={['#2a0605']} />
      <fog attach="fog" args={['#3a0a07', 10, 48]} />
      <ambientLight intensity={0.85} color="#ff9a7a" />
      <hemisphereLight args={['#ff7a4a', '#2a0605', 0.5]} />
      <pointLight position={[0, -1, -14]} color="#ff6a1f" intensity={40} distance={40} decay={1.2} />
      <pointLight position={[0, 4, -36]} color="#ff9a3c" intensity={20} distance={24} decay={1.4} />
      <WorldMesh world={world} />
      <NetherPortalSheet from={INNER_FROM} to={INNER_TO} axis="x" />
      <Bed world={world} at={BED} use={sleep} />
      <Sign id="bed" at={[BED[0] + 1.3, 1, BED[2] - 0.2]} facing={-0.5} />
      <Sign id="bfuunyBed" at={[BED[0] - 1.3, 1, BED[2] - 0.2]} facing={0.5} />
      <Sign id="diamond" at={[FORTRESS.x0 + 1, 2, -32]} facing={Math.PI / 2} wall />
      <Sign id="blasterRods" at={[FORTRESS.x1 - 1, 2, -34]} facing={-Math.PI / 2} wall />
      <Lectern world={world} at={[FORTRESS.x1 - 3, 1, -29]} book="guide3" facing={-Math.PI / 2} />
      <Spawner />
      {PIGLINS.map(({ id, wander }) => (
        <Piglin key={`${id}:${piglins.life(id)}`} wander={wander} onDeath={() => piglins.died(id)} />
      ))}
      {ZOMBIFIED.map((wander, index) => (
        <ZombifiedPiglin key={index} wander={wander} />
      ))}
      {HOGLINS.map((wander, index) => (
        <Hoglin key={index} wander={wander} />
      ))}
      {MAGMA_CUBES.map((wander, index) => (
        <MagmaCube key={index} wander={wander} size={index === 0 ? 4 : 2} />
      ))}
      {WITHER_SKELETONS.map(({ id, wander }) => (
        <WitherSkeleton key={`${id}:${withers.life(id)}`} wander={wander} onDeath={() => withers.died(id)} />
      ))}
      {STRIDERS.map((wander, index) => (
        <Strider key={index} wander={wander} />
      ))}
      {BLAZES.map((id, index) => (killed.includes(id) ? null : <Blaze key={id} id={id} home={BLAZE_HOMES[index]} onDeath={rodFrom(id)} />))}
      {!ghastDown && (
        <Ghast
          home={GHAST_HOME}
          onReturned={() => {
            const game = useEndGame.getState();
            game.setFlag('ghastReturned');
            game.kill('ghast');
            game.advance('goal', 'advReturn', 'fireball');
          }}
        />
      )}
      <Sparkles count={80} scale={[60, 16, 60]} position={[0, 6, -18]} size={2} speed={0.3} color="#ff9a3c" opacity={0.6} />
    </>
  );
}
