'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { cue } from '../end-audio';
import { spawnEffect } from '../engine/Effects';
import { explode } from '../engine/explode';
import { runtime } from '../engine/runtime';
import type { World } from '../engine/world';
import { useEndGame, type Flag, type SignId } from '../store';
import { overworldKit } from '../overworld-voxels';
import { DOME, HARBOR, IGLOO, PEN, PYRAMID, TEMPLE, TREASURE, WRECK } from './overworld-layout';
import { Chest, Sign } from './props';

// The biomes' props and rules: Ketbome's ruin signs (seeing all four earns an achievement), the
// chests, the temple's pressure plate over the TNT, and the cactus that hurts to lean on.

// a sign faces the camp, so it reads on the way out
const toCamp = (x: number, z: number) => Math.atan2(-x, -z);

const RUINS: readonly { readonly id: SignId; readonly flag: Flag; readonly at: readonly [number, number, number] }[] = [
  { id: 'ruinDesert', flag: 'ruinDesert', at: [PYRAMID.x + 2, 2, PYRAMID.z + 3] },
  { id: 'ruinTaiga', flag: 'ruinTaiga', at: [DOME.x, 4, DOME.z + 5] },
  { id: 'ruinSwamp', flag: 'ruinSwamp', at: [PEN.x + 4, 1, PEN.z + 1] },
  { id: 'ruinCoast', flag: 'ruinCoast', at: [HARBOR.x, 2, HARBOR.z] },
];
const SEEN = 6;

const PLATE = new THREE.Vector3(TEMPLE.x, 1.5, TEMPLE.z);
const PLATE_GEOMETRY = new THREE.BoxGeometry(14 / 16, 1 / 16, 14 / 16);
const FUSE_S = 4;

export function Biomes({ world }: { readonly world: World }) {
  const blown = useEndGame((state) => Boolean(state.flags.templeBlown));
  const trap = useRef({ litAt: -1, hissAt: 0 });

  useFrame(() => {
    const game = useEndGame.getState();
    if (!game.checkpoint || game.transition || game.dead) return;
    const p = runtime.player;

    RUINS.forEach(({ flag, at }) => {
      if (game.flags[flag] || Math.hypot(p.pos.x - at[0], p.pos.z - at[2]) > SEEN) return;
      game.setFlag(flag);
      const flags = useEndGame.getState().flags;
      if (RUINS.every((ruin) => flags[ruin.flag])) {
        game.advance('goal', 'advRuins', 'ruins');
        window.setTimeout(() => useEndGame.getState().say('ghostRuins'), 1500);
      }
    });

    if (!game.flags.treasureFound && game.panel?.kind === 'chest' && game.panel.id === 'buried') {
      game.setFlag('treasureFound');
      window.setTimeout(() => useEndGame.getState().say('ghostTreasure'), 800);
    }

    // the plate: step on it and the TNT under the floor hisses for four seconds
    const t = trap.current;
    if (!game.flags.templeBlown) {
      const onPlate = Math.abs(p.pos.x - PLATE.x) < 0.5 && Math.abs(p.pos.z - PLATE.z) < 0.5 && Math.abs(p.pos.y - PLATE.y) < 0.3;
      if (t.litAt < 0 && onPlate) t.litAt = runtime.time;
      if (t.litAt >= 0) {
        if (runtime.time > t.hissAt) {
          t.hissAt = runtime.time + 0.8;
          cue('hiss', 0.9);
          spawnEffect('poof', PLATE.clone().setY(PLATE.y + 0.3));
        }
        if (runtime.time - t.litAt > FUSE_S) {
          game.setFlag('templeBlown');
          explode(new THREE.Vector3(TEMPLE.x, 0.5, TEMPLE.z), 5, 'tnt');
        }
      }
    }

    // leaning on a cactus hurts, like the game's
    const feet = Math.floor(p.pos.y + 0.5);
    for (let x = Math.round(p.pos.x - 0.4); x <= Math.round(p.pos.x + 0.4); x += 1) {
      for (let z = Math.round(p.pos.z - 0.4); z <= Math.round(p.pos.z + 0.4); z += 1) {
        for (let y = feet; y <= feet + 1; y += 1) {
          if (world.get(x, y, z) !== 'cactus') continue;
          if (Math.abs(p.pos.x - x) < 0.8 && Math.abs(p.pos.z - z) < 0.8) game.hurt(1, 'cactus');
        }
      }
    }
  });

  return (
    <>
      {RUINS.map(({ id, at }) => (
        <Sign key={id} id={id} at={at} facing={toCamp(at[0], at[2])} />
      ))}
      <Sign id="templeBfuuny" at={[TEMPLE.x - 6, 2, TEMPLE.z + 2]} facing={-Math.PI / 2} />
      <Sign id="wreckNote" at={[WRECK.x - 2, 1, WRECK.z]} facing={toCamp(WRECK.x, WRECK.z)} />
      <Chest world={world} id="igloo" at={[IGLOO.x, 4, IGLOO.z - 1]} />
      <Chest world={world} id="wreck" at={[WRECK.x + 2, 1, WRECK.z]} facing={-Math.PI / 2} />
      <Chest world={world} id="buried" at={[TREASURE.x, 0, TREASURE.z]} />
      {!blown && <mesh geometry={PLATE_GEOMETRY} material={overworldKit().mat.stone} position={[PLATE.x, 1.53, PLATE.z]} />}
    </>
  );
}
