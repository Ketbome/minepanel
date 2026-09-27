'use client';

import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { cue, prefetch, startAmbience, stopAmbience } from '../end-audio';
import { spawnEffect } from '../engine/Effects';
import { cellBox, runtime, useTarget, type Target } from '../engine/runtime';
import { World } from '../engine/world';
import { WorldMesh } from '../engine/WorldMesh';
import { Enderman } from '../mobs/end';
import { Shulker } from '../mobs/shulker';
import { overworldKit } from '../overworld-voxels';
import { useEndGame } from '../store';
import { UNIT_BOX } from '../voxels';
import { EndSky, floatingIsland, growChorus, type SceneFx } from './end-world';
import { Sign, Torch } from './props';

// Past the gateway: an End City tower, a ship with the elytra, and far below it the islet where
// the one who stayed is waiting. You glide down to it; there the run ends without a poem.

const TOWER = { x0: -2, x1: 2, z0: -16, z1: -12, top: 20 };
const DECK = 21;
const SHIP = { z0: -24, z1: -40 };
const ISLET = new THREE.Vector3(0, -10, -84);
const KEEPER_HOME = new THREE.Vector3(1, ISLET.y + 0.5, ISLET.z - 1.4);
const GRASS_AT = new THREE.Vector3(1, ISLET.y + 1, ISLET.z);
const FRAME_AT = [0, DECK + 2, -30] as const;
const COMMAND_AT = [1, DECK + 1, -15] as const;
const SHULKERS = [
  [3, 8, -14],
  [-3, 13, -14],
  [0, DECK + 1, -35],
] as const;

// seconds after you look at the keeper
const PLANT_AT = 1.4;
const THANKS_AT = 2.6;
const LEAVE_AT = 4.6;
const TITLE_AT = 6.6;
const DONE_AT = 13;

function buildCity() {
  const world = new World();
  // the landing island and the tower's footing
  const rand = floatingIsland(world, 0, 0, -4, 12, 41);
  growChorus(rand, 7, 1, 2, world);
  growChorus(rand, -8, 1, -4, world);
  // the tower: a solid purpur column with a staircase winding up its outside
  for (let y = 1; y <= TOWER.top; y += 1) world.fill(TOWER.x0, y, TOWER.z0, TOWER.x1, y, TOWER.z1, y % 5 === 0 ? 'endBricks' : 'purpurPillar');
  const ring: [number, number][] = [];
  for (let x = TOWER.x0 - 1; x <= TOWER.x1 + 1; x += 1) ring.push([x, TOWER.z1 + 1]);
  for (let z = TOWER.z1; z >= TOWER.z0 - 1; z -= 1) ring.push([TOWER.x1 + 1, z]);
  for (let x = TOWER.x1; x >= TOWER.x0 - 1; x -= 1) ring.push([x, TOWER.z0 - 1]);
  for (let z = TOWER.z0; z <= TOWER.z1; z += 1) ring.push([TOWER.x0 - 1, z]);
  for (let step = 0; step < TOWER.top; step += 1) {
    const [x, z] = ring[step % ring.length];
    world.set(x, step + 1, z, 'purpur');
  }
  // the top: a wide platform where the admin camped, with a stairwell where the steps come up
  world.fill(TOWER.x0 - 3, DECK, TOWER.z0 - 3, TOWER.x1 + 3, DECK, TOWER.z1 + 3, 'purpur');
  for (let step = TOWER.top - 5; step < TOWER.top; step += 1) {
    const [x, z] = ring[step % ring.length];
    world.remove(x, DECK, z);
  }
  // a narrow bridge to the ship, then the ship itself
  world.fill(0, DECK, TOWER.z0 - 4, 0, DECK, SHIP.z0, 'endBricks');
  world.fill(-2, DECK, SHIP.z0, 2, DECK, SHIP.z1, 'purpur');
  world.fill(-1, DECK - 2, SHIP.z0 - 1, 1, DECK - 2, SHIP.z1 + 1, 'purpur');
  for (let z = SHIP.z1; z <= SHIP.z0; z += 1) {
    world.set(-3, DECK + 1, z, 'purpur');
    world.set(3, DECK + 1, z, 'purpur');
    world.set(-2, DECK - 1, z, 'purpur');
    world.set(2, DECK - 1, z, 'purpur');
  }
  for (let y = DECK + 1; y <= DECK + 7; y += 1) world.set(0, y, -30, 'purpurPillar');
  // the bow opens toward the islet, so there is a place to jump from
  world.remove(-1, DECK + 1, SHIP.z1);
  world.remove(1, DECK + 1, SHIP.z1);
  // the islet, far below
  const islet = floatingIsland(world, ISLET.x, ISLET.y, ISLET.z, 6, 42);
  growChorus(islet, ISLET.x - 3, ISLET.y + 1, ISLET.z - 2, world);
  growChorus(islet, ISLET.x + 4, ISLET.y + 1, ISLET.z + 3, world);
  return world;
}

// the elytra, displayed in an item frame on the ship's mast
function ElytraFrame() {
  const taken = useEndGame((state) => Boolean(state.flags.elytra));
  const texture = useMemo(() => {
    const loaded = new THREE.TextureLoader().load('/images/elytra.webp');
    loaded.colorSpace = THREE.SRGBColorSpace;
    return loaded;
  }, []);
  const target = useMemo<Target | null>(
    () =>
      taken
        ? null
        : {
            box: cellBox(FRAME_AT[0], FRAME_AT[1], FRAME_AT[2] + 0.5, 1).expandByScalar(0.2),
            label: () => 'itemFrame',
            use: () => {
              const game = useEndGame.getState();
              game.give('elytra');
              game.setFlag('elytra');
              game.setCheckpoint(0.5, DECK + 0.5, -32, 0);
              game.showActionBar('hintElytra');
              cue('xp');
            },
          },
    [taken]
  );
  useTarget(target);
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <group position={[FRAME_AT[0], FRAME_AT[1], FRAME_AT[2] + 0.53]}>
      <mesh geometry={UNIT_BOX} scale={[0.8, 0.8, 0.06]}>
        <meshLambertMaterial color="#8a6337" />
      </mesh>
      {!taken && (
        <mesh position={[0, 0, 0.04]}>
          <planeGeometry args={[0.7, 0.7]} />
          <meshBasicMaterial map={texture} transparent alphaTest={0.4} />
        </mesh>
      )}
    </group>
  );
}

function CommandBlock({ world }: { readonly world: World }) {
  const target = useMemo<Target>(
    () => ({
      box: cellBox(...COMMAND_AT),
      label: () => 'commandBlock',
      use: () => {
        cue('page');
        useEndGame.getState().openPanel({ kind: 'book', id: 'stop' });
      },
    }),
    []
  );
  useTarget(target);
  useEffect(() => {
    world.set(...COMMAND_AT, 'prop');
  }, [world]);
  return (
    <mesh geometry={UNIT_BOX} position={[...COMMAND_AT]}>
      <meshLambertMaterial color="#b9763a" emissive="#1a0c00" />
    </mesh>
  );
}

function DragonHead() {
  return (
    <group position={[2.5, DECK + 1.5, SHIP.z1 + 1]}>
      <mesh geometry={UNIT_BOX} scale={[1, 1, 1]}>
        <meshLambertMaterial color="#141414" />
      </mesh>
      <mesh geometry={UNIT_BOX} scale={[0.25, 0.1, 0.05]} position={[-0.25, 0.15, -0.51]}>
        <meshBasicMaterial color="#e079fa" />
      </mesh>
      <mesh geometry={UNIT_BOX} scale={[0.25, 0.1, 0.05]} position={[0.25, 0.15, -0.51]}>
        <meshBasicMaterial color="#e079fa" />
      </mesh>
    </group>
  );
}

export function EndCity() {
  const world = useMemo(() => buildCity(), []);
  const fx = useMemo<SceneFx>(() => ({ shake: 0, flash: 0, light: 0, lightAt: new THREE.Vector3() }), []);
  const met = useEndGame((state) => Boolean(state.flags.keeperMet));
  const [holding, setHolding] = useState(true);
  const [leave, setLeave] = useState(false);
  const planted = useRef<THREE.Mesh>(null);
  const grass = overworldKit().mat.grass;
  const run = useRef({ t: 0, welcomed: false, glided: false, landed: false, lookedAt: -1, planted: false, thanked: false, left: false, titled: false, done: false });
  // back turned until you look at it, then it faces you
  const facing = met ? 0 : Math.PI;

  useEffect(() => {
    runtime.world = world;
    runtime.voidY = -40;
    const game = useEndGame.getState();
    game.setCheckpoint(0.5, 0.5, 3.5, 0);
    if (!game.flags.endcity) {
      game.setFlag('endcity');
      game.advance('task', 'advGetaway', 'pearl');
    }
    startAmbience('end');
    prefetch(['zap', 'levitate', 'wind', 'enderman']);
    return () => {
      stopAmbience();
      runtime.world = null;
    };
  }, [world]);

  // looking at the keeper from the islet starts the ending
  const meet = () => {
    const r = run.current;
    const game = useEndGame.getState();
    if (r.lookedAt >= 0 || runtime.player.pos.distanceTo(KEEPER_HOME) > 12) return;
    r.lookedAt = r.t;
    game.setFlag('keeperMet');
  };

  useFrame((_, delta) => {
    const r = run.current;
    const game = useEndGame.getState();
    if (!game.checkpoint) return;
    const dt = Math.min(delta, 0.1);
    r.t += dt;
    if (!r.welcomed && r.t > 1.5) {
      r.welcomed = true;
      game.showActionBar('hintEndCity');
    }
    if (!r.glided && runtime.player.gliding) {
      r.glided = true;
      game.advance('goal', 'advSky', 'elytra');
      cue('wind');
    }
    if (runtime.player.gliding && Math.floor(r.t / 2) !== Math.floor((r.t - dt) / 2)) cue('wind', 0.6);
    if (runtime.player.pos.distanceTo(ISLET) < 9 && runtime.player.onGround && !r.landed) {
      r.landed = true;
      game.setCheckpoint(ISLET.x + 0.5, ISLET.y + 0.5, ISLET.z + 3, 0);
      game.showActionBar('hintMeet');
    }

    const since = r.lookedAt >= 0 ? r.t - r.lookedAt : -1;
    if (!r.planted && since > PLANT_AT) {
      r.planted = true;
      setHolding(false);
      cue('place');
    }
    if (!r.thanked && since > THANKS_AT) {
      r.thanked = true;
      game.say('ghostThanks');
    }
    if (!r.left && since > LEAVE_AT) {
      r.left = true;
      setLeave(true);
      game.presence('leave');
    }
    if (!r.titled && since > TITLE_AT) {
      r.titled = true;
      game.showTitle('stayTitle', 'staySubtitle');
    }
    if (!r.done && since > DONE_AT) {
      r.done = true;
      game.setFlag('stayed');
    }
    if (planted.current) {
      planted.current.visible = r.planted;
      planted.current.scale.setScalar(r.planted ? Math.min(1, 0.6 + (since - PLANT_AT) * 1.6) : 0.6);
    }
  });

  return (
    <>
      <color attach="background" args={['#130e1b']} />
      <fog attach="fog" args={['#130e1b', 50, 190]} />
      <ambientLight intensity={1.8} color="#ddd3ea" />
      <directionalLight position={[20, 50, 12]} intensity={1.3} color="#fff4e0" />
      <pointLight position={[1, ISLET.y + 3, ISLET.z + 1.5]} color="#9dff3f" intensity={holding ? 0 : 6} distance={7} decay={1.6} />
      <EndSky fx={fx} />
      <WorldMesh world={world} />
      <Sign id="uptime" at={[-1, DECK + 1, -15]} facing={Math.PI} />
      <Sign id="bfuunyShip" at={[-1.5, DECK + 1, -26]} />
      <Torch position={[2, DECK + 0.78, -12]} />
      <CommandBlock world={world} />
      <ElytraFrame />
      <DragonHead />
      {SHULKERS.map((at) => (
        <Shulker key={at.join(':')} at={[at[0], at[1] - 0.5, at[2]]} />
      ))}
      <Enderman seed={55} carrying={{ home: KEEPER_HOME, facing, holding, leave }} onTeleport={(at) => spawnEffect('burst', at)} onNotice={meet} />
      <mesh ref={planted} geometry={UNIT_BOX} material={grass} position={GRASS_AT} visible={false} />
      <group position={[0, 3, 6]}>
        <mesh geometry={UNIT_BOX}>
          <meshBasicMaterial color="#2a0848" />
        </mesh>
        <pointLight color="#c77dff" intensity={6} distance={8} decay={1.8} />
      </group>
      <Sparkles count={80} scale={[60, 30, 100]} position={[0, 10, -40]} size={2.5} speed={0.25} color="#d8b4fe" opacity={0.5} />
    </>
  );
}
