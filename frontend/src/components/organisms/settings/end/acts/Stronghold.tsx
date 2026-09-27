'use client';

import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { cue, prefetch, startAmbience, stopAmbience } from '../end-audio';
import { spawnEffect } from '../engine/Effects';
import { cellBox, runtime, useTarget, type Target } from '../engine/runtime';
import { World } from '../engine/world';
import { WorldMesh } from '../engine/WorldMesh';
import { countOf } from '../items';
import { Silverfish } from '../mobs/silverfish';
import { createPortalMaterial, tickPortal } from '../shaders';
import { useEndGame } from '../store';
import { clamp01, easeOut, hash, kit, UNIT_BOX } from '../voxels';
import { Lectern, Sign } from './props';

// You fall into a stronghold corridor. It leads past a library to the portal room, where
// three of the twelve frames already hold an eye. The floor sits at y = -0.5 throughout.

const FRAMES = [
  [-1, -2],
  [0, -2],
  [1, -2],
  [2, -1],
  [2, 0],
  [2, 1],
  [1, 2],
  [0, 2],
  [-1, 2],
  [-2, 1],
  [-2, 0],
  [-2, -1],
] as const;

const FRAME_HEIGHT = 13 / 16;
const FRAME_GEOMETRY = new THREE.BoxGeometry(1, FRAME_HEIGHT, 1);
const EYE_GEOMETRY = new THREE.BoxGeometry(0.5, 3 / 16, 0.5);
const PORTAL_GEOMETRY = new THREE.PlaneGeometry(3, 3).rotateX(-Math.PI / 2);
const PORTAL_Y = 0.25;
const SPAWNER = new THREE.Vector3(4, 0, 5);
const LIBRARY = { x0: -13, x1: -4, z0: 11, z1: 17 };
// the way from the library to the portal, for the eye that shows it
const DOOR = new THREE.Vector3(-2.5, 1, 13.5);
const CORRIDOR = new THREE.Vector3(0.5, 1.3, 12.5);
const ENTRANCE = new THREE.Vector3(0.5, 1.4, 8.5);
const ABOVE_PORTAL = new THREE.Vector3(0, 1.4, 0);
const TRAIL = [DOOR, CORRIDOR, new THREE.Vector3(0.5, 1.2, 10.5), ENTRANCE, new THREE.Vector3(0.5, 1, 6), new THREE.Vector3(0.5, 1, 4)];
const GUIDE_SPEED = 4;

function buildStronghold() {
  const world = new World();
  const brick = (x: number, y: number, z: number) => {
    const roll = hash(x, y, z);
    world.set(x, y, z, roll < 0.22 ? 'mossy' : roll < 0.36 ? 'cracked' : 'bricks', 0.84 + hash(z, x, y) * 0.16);
  };
  const box = (x0: number, x1: number, z0: number, z1: number, height: number) => {
    for (let x = x0 - 1; x <= x1 + 1; x += 1) {
      for (let z = z0 - 1; z <= z1 + 1; z += 1) {
        brick(x, -1, z);
        brick(x, height, z);
        const wall = x < x0 || x > x1 || z < z0 || z > z1;
        for (let y = 0; y < height; y += 1) {
          if (wall) brick(x, y, z);
          else world.remove(x, y, z);
        }
      }
    }
  };
  // the portal room
  for (let x = -7; x <= 7; x += 1) {
    for (let z = -10; z <= 8; z += 1) {
      brick(x, 7, z);
      if (Math.abs(x) === 7 || z === -10 || (z === 8 && Math.abs(x) > 1)) {
        for (let y = -1; y <= 6; y += 1) brick(x, y, z);
        continue;
      }
      const ring = Math.max(Math.abs(x), Math.abs(z));
      if (ring > 4) {
        brick(x, -1, z);
        continue;
      }
      // like the game's: lava only under the portal, a floor to walk around the frames
      brick(x, -2, z);
      if (ring < 2) world.set(x, -1, z, 'lava');
      else brick(x, -1, z);
    }
  }
  [-6, -2, 3].forEach((z) => {
    for (let y = 0; y <= 6; y += 1) {
      brick(-6, y, z);
      brick(6, y, z);
    }
  });
  for (let x = -5; x <= -2; x += 1) for (let y = 0; y <= 2; y += 1) world.set(x, y, -9, 'bookshelf');
  // the corridor you fall into, open onto the portal room, and the library off its side
  box(-1, 1, 9, 22, 4);
  for (let x = -1; x <= 1; x += 1) for (let y = 0; y <= 3; y += 1) world.remove(x, y, 8);
  box(LIBRARY.x0, LIBRARY.x1, LIBRARY.z0, LIBRARY.z1, 5);
  for (let z = 13; z <= 14; z += 1) for (let y = 0; y <= 1; y += 1) world.remove(-2, y, z);
  for (let z = 13; z <= 14; z += 1) for (let y = 0; y <= 1; y += 1) world.remove(-3, y, z);
  for (let x = LIBRARY.x0; x <= LIBRARY.x1; x += 1) {
    for (let y = 0; y <= 3; y += 1) {
      world.set(x, y, LIBRARY.z0 - 1, 'bookshelf');
      world.set(x, y, LIBRARY.z1 + 1, 'bookshelf');
    }
  }
  for (let z = LIBRARY.z0; z <= LIBRARY.z1; z += 1) for (let y = 0; y <= 3; y += 1) world.set(LIBRARY.x0 - 1, y, z, 'bookshelf');
  // the shaft you came down through
  world.remove(0, 4, 20);
  FRAMES.forEach(([x, z]) => world.set(x, 0, z, 'prop'));
  return world;
}

function Frame({ index }: { readonly index: number }) {
  const { mat, tex } = kit();
  const [x, z] = FRAMES[index];
  const filled = useEndGame((state) => state.frames[index]);
  const eye = useRef<THREE.Group>(null);
  const socket = useRef<THREE.Sprite>(null);
  const placedAt = useRef(-1);
  const target = useMemo<Target | null>(
    () =>
      filled
        ? null
        : {
            box: cellBox(x, 0, z, FRAME_HEIGHT),
            label: () => 'frame',
            use: () => {
              const game = useEndGame.getState();
              if (!countOf(game.inventory, 'eye')) {
                game.showActionBar('hintFramesUse');
                return;
              }
              game.spend('eye');
              game.placeEye(index);
              placedAt.current = runtime.time;
              cue('eye');
            },
          },
    [filled, x, z, index]
  );
  useTarget(target);

  useFrame(() => {
    if (eye.current && placedAt.current >= 0) {
      const age = runtime.time - placedAt.current;
      eye.current.scale.setScalar(age < 0.1 ? (age / 0.1) * 1.4 : Math.max(1, 1.4 - (age - 0.1) * 3));
    }
    if (socket.current) socket.current.material.opacity = 0.25 + Math.sin(runtime.time * 3 + index) * 0.12;
  });

  return (
    <group position={[x, 0, z]}>
      <mesh geometry={FRAME_GEOMETRY} material={mat.frame} position={[0, -0.5 + FRAME_HEIGHT / 2, 0]} />
      {filled && (
        <group ref={eye} position={[0, -0.5 + FRAME_HEIGHT + 3 / 32, 0]}>
          <mesh geometry={EYE_GEOMETRY} material={mat.eye} />
        </group>
      )}
      {!filled && (
        <sprite ref={socket} scale={0.9} position={[0, 0.45, 0]}>
          <spriteMaterial map={tex.glow} color="#6dffb0" transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.3} />
        </sprite>
      )}
    </group>
  );
}

// An eye of ender flies ahead of you to the portal, the way the game's eyes point to the
// stronghold; it waits a while when you fall behind, hovers over the frames and bursts.
function GuideEye({ from, onDone }: { readonly from: THREE.Vector3; readonly onDone: () => void }) {
  const { mat, tex } = kit();
  const group = useRef<THREE.Group>(null);
  const path = useMemo(() => {
    const points = [from.clone()];
    if (from.x < -2) points.push(DOOR.clone(), CORRIDOR.clone());
    else if (from.z > 11) points.push(CORRIDOR.clone());
    if (from.z > 8.5 || from.x < -2) points.push(ENTRANCE.clone());
    points.push(ABOVE_PORTAL.clone());
    const curve = new THREE.CatmullRomCurve3(points);
    return { curve, length: curve.getLength() };
  }, [from]);
  const flight = useRef({ travelled: 0, hover: 0, waited: 0, done: false });

  useFrame((_, delta) => {
    const eye = group.current;
    const f = flight.current;
    if (!eye || f.done) return;
    const dt = Math.min(delta, 0.1);
    if (f.travelled < path.length) {
      const waiting = eye.position.distanceTo(runtime.player.eye) > 6;
      f.waited = waiting ? f.waited + dt : 0;
      f.travelled = Math.min(path.length, f.travelled + (waiting ? 0 : GUIDE_SPEED) * dt);
      path.curve.getPointAt(f.travelled / path.length, eye.position);
    } else {
      f.hover += dt;
      eye.position.copy(ABOVE_PORTAL);
    }
    if (f.hover > 2.5 || f.waited > 8) {
      f.done = true;
      eye.visible = false;
      spawnEffect('burst', eye.position, '#7dffb0');
      onDone();
      return;
    }
    eye.position.y += Math.sin(runtime.time * 5) * 0.06;
    eye.rotation.y = runtime.time * 4;
  });

  return (
    <group ref={group} position={from}>
      <mesh geometry={UNIT_BOX} material={mat.eye} scale={0.26} />
      <sprite scale={1.1}>
        <spriteMaterial map={tex.glow} color="#7dffb0" transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.8} />
      </sprite>
      <Sparkles count={14} scale={0.9} size={2} speed={0.9} color="#7dffb0" />
      <pointLight color="#7dffb0" intensity={3} distance={5} decay={2} />
    </group>
  );
}

function Spawner({ onNear }: { readonly onNear: () => void }) {
  const { mat } = kit();
  const fish = useRef<THREE.Group>(null);
  const fired = useRef(false);
  useFrame((_, delta) => {
    if (fish.current) fish.current.rotation.y += delta * 2.6;
    if (!fired.current && runtime.player.pos.distanceTo(SPAWNER) < 4.5) {
      fired.current = true;
      onNear();
    }
  });
  return (
    <group position={SPAWNER}>
      <mesh geometry={UNIT_BOX} material={mat.spawner} />
      <group ref={fish} scale={0.45}>
        {[
          [0.12, 0.1, 0.14, 0.42],
          [0.2, 0.15, 0.18, 0.26],
          [0.26, 0.19, 0.2, 0.07],
          [0.2, 0.14, 0.18, -0.12],
          [0.12, 0.09, 0.16, -0.28],
        ].map(([w, h, d, z]) => (
          <mesh key={z} geometry={UNIT_BOX} material={mat.silverfish} scale={[w, h, d]} position={[0, -0.12 + h / 2, z]} />
        ))}
      </group>
      <Sparkles count={7} scale={0.9} size={3} speed={0.6} color="#ff8a2a" />
    </group>
  );
}

export function Stronghold() {
  const { tex } = kit();
  const world = useMemo(() => buildStronghold(), []);
  const portal = useMemo(() => createPortalMaterial(tex.specks), [tex.specks]);
  const complete = useEndGame((state) => state.frames.every(Boolean));
  const [silverfish, setSilverfish] = useState<THREE.Vector3[]>([]);
  const [guide, setGuide] = useState<{ readonly id: number; readonly from: THREE.Vector3 } | null>(null);
  const [trail, setTrail] = useState(false);
  const guiding = useRef(false);
  // send an eye from where you stand to the portal, and leave green sparks along the way; an
  // eye you use yourself replaces one still in the air
  const showWay = useCallback((replace = false) => {
    if (guiding.current && !replace) return;
    guiding.current = true;
    cue('throw');
    setGuide((current) => ({ id: (current?.id ?? 0) + 1, from: runtime.player.eye.clone().addScaledVector(runtime.player.look, 0.8) }));
    setTrail(true);
  }, []);
  const portalMesh = useRef<THREE.Mesh>(null);
  const portalLight = useRef<THREE.PointLight>(null);
  const lavaLight = useRef<THREE.PointLight>(null);
  const beats = useRef({ t: 0, spied: false, hinted: false, nudged: false, guided: false, nextGuide: 45, openedAt: -1, joined: false, left: false, urged: false, nextLava: 3, crossed: false });

  useEffect(() => {
    runtime.world = world;
    runtime.voidY = -20;
    useEndGame.getState().setCheckpoint(0.5, 1.5, 19.5, 0);
    startAmbience('stronghold');
    prefetch(['eye', 'portal', 'squeak']);
    // like the game: an eye used away from the frames flies toward the portal
    runtime.hooks.useItem = (item) => {
      if (item !== 'eye') return false;
      if (runtime.player.pos.z < 8) useEndGame.getState().showActionBar('hintFramesUse');
      else showWay(true);
      return true;
    };
    return () => {
      stopAmbience();
      portal.dispose();
      runtime.world = null;
      runtime.hooks.useItem = null;
    };
  }, [world, portal, showWay]);

  useFrame((state, delta) => {
    const b = beats.current;
    const game = useEndGame.getState();
    // until the player stands here, its position is still the last zone's
    if (!game.checkpoint) return;
    const dt = Math.min(delta, 0.1);
    b.t += dt;
    if (!b.spied && b.t > 1.2) {
      b.spied = true;
      game.advance('task', 'advEyeSpy', 'eye');
    }
    if (!b.hinted && b.t > 3) {
      b.hinted = true;
      game.showActionBar('hintLectern');
    }
    if (!b.nudged && runtime.player.pos.z < 8) {
      b.nudged = true;
      game.showActionBar('hintFramesUse');
      game.setCheckpoint(0.5, -0.5, 6.5, 0);
      setTrail(false);
    }
    // after the diary, or after a while lost in the corridors, an eye shows the way; it comes
    // back every so often until you reach the portal room
    if (!b.nudged && !game.panel && b.t > b.nextGuide && !guiding.current) {
      b.nextGuide = b.t + 25;
      showWay();
    }
    if (!b.guided && !b.nudged && game.flags.diaryRead && !game.panel) {
      b.guided = true;
      b.nextGuide = b.t + 25;
      game.showActionBar('hintFollowEye');
      showWay();
    }
    if (complete && b.openedAt < 0) {
      b.openedAt = b.t;
      cue('portal');
    }
    if (b.openedAt >= 0) {
      const since = b.t - b.openedAt;
      if (!b.joined && since > 0.9) {
        b.joined = true;
        game.presence('join');
      }
      if (!b.urged && since > 1.6) {
        b.urged = true;
        game.showActionBar('hintJump');
      }
      if (!b.left && since > 2.4) {
        b.left = true;
        game.presence('leave');
      }
    }
    const open = b.openedAt >= 0 ? clamp01((b.t - b.openedAt) / 0.6) : 0;
    if (portalMesh.current) {
      portalMesh.current.visible = open > 0;
      portalMesh.current.scale.setScalar(0.15 + easeOut(open) * 0.85);
    }
    tickPortal(portal, state);
    portal.uniforms.uOpacity.value = open;
    portal.uniforms.uFlash.value = b.openedAt >= 0 ? Math.max(0, 1 - (b.t - b.openedAt) / 1.3) : 0;
    if (portalLight.current) portalLight.current.intensity = open * (9 + Math.sin(b.t * 3) * 1.5);
    tex.lava.offset.y = (b.t * 0.035) % 1;
    if (lavaLight.current) lavaLight.current.intensity = 22 + Math.sin(b.t * 7) * 2.5;
    if (b.t > b.nextLava) {
      b.nextLava = b.t + 1.8 + Math.random() * 3.2;
      cue('lava', 0.7);
    }
    // stepping onto the lit portal takes you to the End
    const p = runtime.player.pos;
    if (open >= 1 && !b.crossed && Math.abs(p.x) < 1.5 && Math.abs(p.z) < 1.5 && p.y < 0.6) {
      b.crossed = true;
      cue('travel');
      game.travel('end', 'arrive', 'portal');
    }
  });

  return (
    <>
      <color attach="background" args={['#040305']} />
      <fog attach="fog" args={['#060508', 12, 30]} />
      <ambientLight intensity={0.95} color="#8a93b3" />
      <directionalLight position={[3, 8, 6]} intensity={1.1} color="#c9d2ff" />
      <pointLight ref={lavaLight} position={[0, -0.4, 0]} color="#ff7a1f" intensity={22} distance={16} decay={1.5} />
      <pointLight ref={portalLight} position={[0, 1.2, 0]} color="#4de3c1" intensity={0} distance={12} decay={1.6} />
      <pointLight position={[-8.5, 2.5, 14]} color="#ffcf8a" intensity={10} distance={10} decay={1.6} />
      <pointLight position={[0.5, 2.5, 16]} color="#ffcf8a" intensity={6} distance={9} decay={1.8} />
      <WorldMesh world={world} />
      {FRAMES.map((_, index) => (
        <Frame key={index} index={index} />
      ))}
      <mesh ref={portalMesh} geometry={PORTAL_GEOMETRY} material={portal} position={[0, PORTAL_Y, 0]} visible={false} />
      <Lectern world={world} at={[-8, 0, 14]} book="diary" facing={Math.PI / 2} glow />
      <Sign id="bfuunyExit" at={[0, 1, 22]} facing={Math.PI} wall />
      <Spawner
        onNear={() => {
          setSilverfish([new THREE.Vector3(3, -0.5, 4), new THREE.Vector3(4.5, -0.5, 4.5), new THREE.Vector3(3.5, -0.5, 6)]);
          useEndGame.getState().setFlag('silverfish');
        }}
      />
      {silverfish.map((from, index) => (
        <Silverfish key={index} from={from} />
      ))}
      {guide && (
        <GuideEye
          key={guide.id}
          from={guide.from}
          onDone={() => {
            guiding.current = false;
            setGuide(null);
          }}
        />
      )}
      {trail && TRAIL.map((at) => <Sparkles key={at.toArray().join(':')} count={8} scale={[0.9, 0.7, 0.9]} position={at} size={2.6} speed={0.4} color="#7dffb0" />)}
      <Sparkles count={36} scale={[8, 2.5, 8]} position={[0, 0.4, 0]} size={2.2} speed={0.35} color="#ff9a3c" opacity={0.7} />
    </>
  );
}

