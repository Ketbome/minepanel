'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { startAmbience, stopAmbience } from '../end-audio';
import { runtime } from '../engine/runtime';
import { World } from '../engine/world';
import { WorldMesh } from '../engine/WorldMesh';
import { Admin, type AdminAct } from '../mobs/admins';
import { BFUUNY, BLASTER, useEndGame } from '../store';
import { DayCycle } from './Overworld';
import { Sign } from './props';

// Server #48, after the credits: Ketbome's brand new world is one block so far. BlasterDaster's
// server #48 is already a castle, and Bfuuny finds the edge of the map the usual way.

const R = 16;
const CASTLE = { x0: -4, x1: 4, z0: -24, z1: -16 };
const HOMES = {
  ketbome: new THREE.Vector3(-1.5, 0.5, -1.5),
  blaster: new THREE.Vector3(1.5, 0.5, CASTLE.z1 + 2),
  bfuuny: new THREE.Vector3(R - 5, 0.5, 2),
};
const LEAP = new THREE.Vector3(1, 0, 0);

function buildServer() {
  const world = new World({ floor: -3 });
  for (let x = -R; x <= R; x += 1) {
    for (let z = -R - 10; z <= R; z += 1) {
      world.set(x, 0, z, 'grass', 0.9);
      world.fill(x, -2, z, x, -1, z, 'dirt');
      world.set(x, -3, z, 'stone');
    }
  }
  // day 1: one block
  world.set(0, 1, 0, 'cobble');
  // BlasterDaster's: walls with crenellations, corner towers and a gate
  for (let x = CASTLE.x0; x <= CASTLE.x1; x += 1) {
    for (let z = CASTLE.z0; z <= CASTLE.z1; z += 1) {
      const wall = x === CASTLE.x0 || x === CASTLE.x1 || z === CASTLE.z0 || z === CASTLE.z1;
      if (!wall) continue;
      const corner = (x === CASTLE.x0 || x === CASTLE.x1) && (z === CASTLE.z0 || z === CASTLE.z1);
      const gate = z === CASTLE.z1 && Math.abs(x) <= 1;
      const top = corner ? 7 : (x + z) % 2 === 0 ? 5 : 4;
      for (let y = gate ? 4 : 1; y <= top; y += 1) world.set(x, y, z, corner ? 'mossy' : 'bricks');
    }
  }
  return world;
}

export function Server48() {
  const world = useMemo(() => buildServer(), []);
  const [bfuuny, setBfuuny] = useState<AdminAct | null>(null);
  const beats = useRef({ t: 0, step: 0 });

  useEffect(() => {
    runtime.world = world;
    runtime.voidY = -30;
    useEndGame.getState().setCheckpoint(0.5, 0.5, 6.5, 0);
    startAmbience('overworld');
    return () => {
      stopAmbience();
      runtime.world = null;
    };
  }, [world]);

  useFrame((_, delta) => {
    const game = useEndGame.getState();
    if (game.transition || !game.checkpoint) return;
    const b = beats.current;
    b.t += Math.min(delta, 0.1);
    const script: readonly (readonly [number, () => void])[] = [
      [1.5, () => game.say('s48Ketbome')],
      [4, () => game.say('s48Blaster', BLASTER)],
      [7, () => {
        game.presence('join', BFUUNY);
        setBfuuny('idle');
      }],
      [9, () => game.say('s48Bfuuny', BFUUNY)],
      [10.5, () => setBfuuny('leap')],
      [13, () => game.obituary(BFUUNY, 'bfuunyDiedVoid')],
      [16, () => game.say('s48Ketbome2')],
    ];
    while (b.step < script.length && b.t > script[b.step][0]) {
      script[b.step][1]();
      b.step += 1;
    }
  });

  return (
    <>
      <DayCycle />
      <WorldMesh world={world} />
      <Sign id="server48Day1" at={[1, 1, 1]} facing={-0.4} />
      <Sign id="server48Blaster" at={[3, 1, CASTLE.z1 + 1.5]} facing={-0.3} />
      <Admin who="ketbome" home={HOMES.ketbome} act="point" />
      <Admin who="blaster" home={HOMES.blaster} act="crouch" />
      {bfuuny && <Admin who="bfuuny" home={HOMES.bfuuny} act={bfuuny} leap={LEAP} />}
    </>
  );
}
