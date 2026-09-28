'use client';

import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { isNight } from '../engine/clock';
import { runtime } from '../engine/runtime';
import type { BlockId, World } from '../engine/world';
import { Drowned, Phantom, Slime, Spider, Witch, Zombie, ZombieVillager, type SlimeSize } from '../mobs/monsters';
import { Skeleton } from '../mobs/skeleton';
import { useSpawner } from '../mobs/spawner';
import { useEndGame } from '../store';
import { biomeAt, CAMP, OVERWORLD_RADIUS, VILLAGE, type Biome } from './overworld-layout';

// The Overworld's monsters, spawned the game's way: in the dark, a little away from you, each
// kind where it belongs (witches and slimes in the swamp, drowned in the sea, zombie villagers
// around the village) and never by the camp's or the village's torches. They unload far behind.

const R = OVERWORLD_RADIUS;
const LIT = [
  { ...CAMP, radius: 10 },
  { ...VILLAGE, radius: 15 },
];
const NATURAL = new Set<BlockId>(['grass', 'dirt', 'stone', 'sand', 'snowyGrass']);
const BAND = { min: 20, max: 40, despawn: 64, every: 4 } as const;

// where a monster can stand at this column: on natural ground, inside the border, away from light
function landSpot(world: World, x: number, z: number, biome?: Biome) {
  if (Math.abs(x) > R - 2 || Math.abs(z) > R - 2) return null;
  if (LIT.some((lit) => Math.hypot(x - lit.x, z - lit.z) < lit.radius)) return null;
  if (biome && biomeAt(x, z) !== biome) return null;
  for (let y = 24; y >= -3; y -= 1) {
    const id = world.get(x, y, z);
    if (id) return NATURAL.has(id) ? new THREE.Vector3(x, y + 0.5, z) : null;
  }
  return null;
}

// the sea floor under the coast's water
function seaSpot(world: World, x: number, z: number) {
  if (Math.abs(x) > R - 2 || Math.abs(z) > R - 2 || biomeAt(x, z) !== 'coast' || world.get(x, 0, z) !== 'water') return null;
  for (let y = -1; y >= -3; y -= 1) if (world.solid(x, y, z)) return new THREE.Vector3(x, y + 0.5, z);
  return null;
}

// phantoms circle high over any column, once you have gone two nights without sleep
const phantomNight = () => isNight() && runtime.nightsAwake >= 2;

export function NightMobs({ world }: { readonly world: World }) {
  const night = () => isNight();
  const skeletons = useSpawner('skeleton', { ...BAND, cap: 3, allowed: night, spot: (x, z) => landSpot(world, x, z) });
  const zombies = useSpawner('zombie', { ...BAND, cap: 3, allowed: night, spot: (x, z) => landSpot(world, x, z) });
  const villagers = useSpawner('zombie-villager', {
    ...BAND,
    cap: 1,
    allowed: night,
    spot: (x, z) => (Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < 40 ? landSpot(world, x, z) : null),
  });
  const spiders = useSpawner('spider', { ...BAND, cap: 2, allowed: night, spot: (x, z) => landSpot(world, x, z) });
  const witches = useSpawner('witch', { ...BAND, cap: 1, allowed: night, spot: (x, z) => landSpot(world, x, z, 'swamp') });
  const slimes = useSpawner('slime', { ...BAND, cap: 2, allowed: night, spot: (x, z) => landSpot(world, x, z, 'swamp'), sized: () => (Math.random() < 0.5 ? 4 : 2) });
  const drowned = useSpawner('drowned', { ...BAND, cap: 2, allowed: () => true, spot: (x, z) => seaSpot(world, x, z) });
  const phantoms = useSpawner('phantom', {
    ...BAND,
    cap: 2,
    allowed: phantomNight,
    spot: (x, z) => {
      const ground = landSpot(world, x, z);
      return ground && ground.setY(ground.y + 12);
    },
    radius: 6,
    speed: 4,
  });

  // the first night phantoms can come, Ketbome tells you why
  useFrame(() => {
    const game = useEndGame.getState();
    if (game.flags.phantomsWarned || !game.checkpoint || !phantomNight()) return;
    game.setFlag('phantomsWarned');
    game.say('ghostPhantoms');
  });

  // a slime splits in two of the next size down, where it died
  const split = (id: string, size: number, at: THREE.Vector3) => {
    slimes.died(id);
    if (size <= 1) return;
    [-0.6, 0.6].forEach((dx) => slimes.add(at.clone().setX(at.x + dx), size / 2));
  };

  return (
    <>
      {skeletons.spawns.map(({ id, wander }) => (
        <Skeleton key={id} wander={wander} burns onDeath={() => skeletons.died(id)} />
      ))}
      {zombies.spawns.map(({ id, wander }) => (
        <Zombie key={id} wander={wander} onDeath={() => zombies.died(id)} />
      ))}
      {villagers.spawns.map(({ id, wander }) => (
        <ZombieVillager key={id} wander={wander} onDeath={() => villagers.died(id)} />
      ))}
      {spiders.spawns.map(({ id, wander }) => (
        <Spider key={id} wander={wander} onDeath={() => spiders.died(id)} />
      ))}
      {witches.spawns.map(({ id, wander }) => (
        <Witch key={id} wander={wander} onDeath={() => witches.died(id)} />
      ))}
      {slimes.spawns.map(({ id, wander, size = 2 }) => (
        <Slime key={id} wander={wander} size={size as SlimeSize} onDeath={(at) => split(id, size, at)} />
      ))}
      {drowned.spawns.map(({ id, wander }) => (
        <Drowned key={id} wander={wander} onDeath={() => drowned.died(id)} />
      ))}
      {phantoms.spawns.map(({ id, wander }) => (
        <Phantom key={id} wander={wander} onDeath={() => phantoms.died(id)} />
      ))}
    </>
  );
}
