'use client';

import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cue, startAmbience, stopAmbience } from './end-audio';
import { EYE_COUNT, INTRO_S, useEndGame } from './end-game-store';
import { createPortalMaterial, tickPortal } from './shaders';
import { clamp01, easeIn, easeInOut, easeOut, hash, kit, UNIT_BOX, VoxelMesh, type Block } from './voxels';

const EYES_AT = INTRO_S + 1.1;
const EYE_GAP = 0.3;
const ACTIVATE_AT = EYES_AT + EYE_COUNT * EYE_GAP + 0.5;
const RISE_AT = ACTIVATE_AT + 1.2;
const DIVE_AT = RISE_AT + 1.3;
const DIVE_S = 1.1;

// clockwise around the 3x3 opening, so the ring fills like a dial
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

const UP = new THREE.Vector3(0, 1, 0);
const NORTH = new THREE.Vector3(0, 0, -1);
const START = new THREE.Vector3(1.6, 3.4, 10.8);
const NEAR = new THREE.Vector3(0.5, 4.6, 6.4);
const ABOVE = new THREE.Vector3(0, 7.8, 0.9);
const INSIDE = new THREE.Vector3(0, -0.4, 0.02);
const LOOK_ROOM = new THREE.Vector3(0, -0.3, 0);
const LOOK_DOWN = new THREE.Vector3(0, -2, 0);

interface Room {
  readonly bricks: Block[];
  readonly mossy: Block[];
  readonly cracked: Block[];
  readonly lava: Block[];
}

function buildRoom(): Room {
  const room: Room = { bricks: [], mossy: [], cracked: [], lava: [] };
  const brick = (x: number, y: number, z: number) => {
    const roll = hash(x, y, z);
    const list = roll < 0.22 ? room.mossy : roll < 0.36 ? room.cracked : room.bricks;
    list.push({ x, y, z, tint: 0.84 + hash(z, x, y) * 0.16 });
  };
  for (let x = -7; x <= 7; x += 1) {
    for (let z = -10; z <= 8; z += 1) {
      if (Math.abs(x) === 7 || z === -10) {
        for (let y = -1; y <= 6; y += 1) brick(x, y, z);
        continue;
      }
      const ring = Math.max(Math.abs(x), Math.abs(z));
      if (ring > 4) {
        brick(x, -1, z);
        continue;
      }
      brick(x, -2, z);
      const bridge = Math.abs(x) <= 1 && z >= 3;
      if (ring === 2 || bridge) brick(x, -1, z);
      else room.lava.push({ x, y: -1.06, z, scale: [1, 0.875, 1] });
    }
  }
  // buttresses along the side walls give the room depth when the camera moves
  [-6, -2, 3].forEach((z) => {
    for (let y = 0; y <= 6; y += 1) {
      brick(-6, y, z);
      brick(6, y, z);
    }
  });
  return room;
}

function Spawner({ position }: { readonly position: [number, number, number] }) {
  const { mat } = kit();
  const fish = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (fish.current) fish.current.rotation.y += delta * 2.6;
  });

  return (
    <group position={position}>
      <mesh geometry={UNIT_BOX} material={mat.spawner} />
      <group ref={fish} scale={0.45}>
        {[
          [0.12, 0.1, 0.14, 0.42],
          [0.2, 0.15, 0.18, 0.26],
          [0.26, 0.19, 0.2, 0.07],
          [0.2, 0.14, 0.18, -0.12],
          [0.12, 0.09, 0.16, -0.28],
          [0.06, 0.05, 0.14, -0.42],
        ].map(([w, h, d, z]) => (
          <mesh key={z} geometry={UNIT_BOX} material={mat.silverfish} scale={[w, h, d]} position={[0, -0.12 + h / 2, z]} />
        ))}
      </group>
      <Sparkles count={7} scale={0.9} size={3} speed={0.6} color="#ff8a2a" />
    </group>
  );
}

export function StrongholdAct() {
  const { mat, tex } = kit();
  const room = useMemo(() => buildRoom(), []);
  const portal = useMemo(() => createPortalMaterial(tex.specks), [tex.specks]);
  const portalMesh = useRef<THREE.Mesh>(null);
  const eyes = useRef<(THREE.Group | null)[]>([]);
  const eyeLight = useRef<THREE.PointLight>(null);
  const lavaLight = useRef<THREE.PointLight>(null);
  const portalLight = useRef<THREE.PointLight>(null);
  const timeline = useRef({ t: 0, placed: 0, pops: [] as number[], activated: false, whoosh: false, crossed: false, spied: false, nextLava: 3, shake: 0 });
  const scratch = useMemo(() => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), up: new THREE.Vector3() }), []);

  useEffect(() => {
    startAmbience('stronghold');
    return () => {
      stopAmbience();
      portal.dispose();
    };
  }, [portal]);

  useFrame((state, delta) => {
    const run = timeline.current;
    const dt = Math.min(delta, 0.1);
    const t = (run.t += dt);
    const game = useEndGame.getState();

    if (!run.spied && t > INTRO_S + 0.6) {
      run.spied = true;
      game.advance('task', 'dangerEggAdvEyeSpy', 'eye');
    }

    const due = t < EYES_AT ? 0 : Math.min(EYE_COUNT, Math.floor((t - EYES_AT) / EYE_GAP) + 1);
    while (run.placed < due) {
      const [x, z] = FRAMES[run.placed];
      run.pops[run.placed] = t;
      run.placed += 1;
      game.placeEye();
      cue('eye');
      eyeLight.current?.position.set(x, 0.9, z);
      if (eyeLight.current) eyeLight.current.intensity = 6;
    }
    eyes.current.forEach((eye, index) => {
      if (!eye) return;
      const pop = run.pops[index];
      eye.visible = pop !== undefined;
      if (pop === undefined) return;
      const age = t - pop;
      eye.scale.setScalar(age < 0.1 ? (age / 0.1) * 1.4 : Math.max(1, 1.4 - (age - 0.1) * 3));
    });
    if (eyeLight.current) eyeLight.current.intensity *= Math.exp(-dt * 3.5);

    if (!run.activated && t >= ACTIVATE_AT) {
      run.activated = true;
      run.shake = 0.35;
      cue('portal');
    }
    const open = run.activated ? clamp01((t - ACTIVATE_AT) / 0.6) : 0;
    if (portalMesh.current) {
      portalMesh.current.visible = open > 0;
      portalMesh.current.scale.setScalar(0.15 + easeOut(open) * 0.85);
    }
    tickPortal(portal, state);
    portal.uniforms.uOpacity.value = open;
    portal.uniforms.uFlash.value = run.activated ? Math.max(0, 1 - (t - ACTIVATE_AT) / 1.3) : 0;
    if (portalLight.current) portalLight.current.intensity = open * (9 + Math.sin(t * 3) * 1.5);

    tex.lava.offset.y = (t * 0.035) % 1;
    if (lavaLight.current) lavaLight.current.intensity = 22 + Math.sin(t * 7) * 2.5 + Math.sin(t * 13.7) * 1.5;
    if (t > run.nextLava) {
      run.nextLava = t + 1.8 + Math.random() * 3.2;
      cue('lava', 0.7);
    }

    if (!run.whoosh && t >= DIVE_AT - 0.35) {
      run.whoosh = true;
      cue('travel');
    }

    const camera = state.camera as THREE.PerspectiveCamera;
    const portrait = state.size.width / state.size.height < 0.9;
    const { pos, look, up } = scratch;
    let fov = portrait ? 66 : 50;
    up.copy(UP);
    look.copy(LOOK_ROOM);
    if (t < ACTIVATE_AT) {
      pos.lerpVectors(START, NEAR, easeInOut(clamp01((t - INTRO_S) / (ACTIVATE_AT - INTRO_S))));
    } else if (t < RISE_AT) {
      pos.copy(NEAR);
    } else if (t < DIVE_AT) {
      const k = easeInOut((t - RISE_AT) / (DIVE_AT - RISE_AT));
      pos.lerpVectors(NEAR, ABOVE, k);
      look.lerpVectors(LOOK_ROOM, LOOK_DOWN, k);
      up.lerpVectors(UP, NORTH, k).normalize();
    } else {
      const k = easeIn(clamp01((t - DIVE_AT) / DIVE_S));
      pos.lerpVectors(ABOVE, INSIDE, k);
      look.copy(LOOK_DOWN);
      up.copy(NORTH);
      fov += k * 45;
    }
    pos.x += Math.sin(t * 0.7) * 0.05;
    pos.y += Math.sin(t * 0.9) * 0.04;
    if (run.shake > 0.001) {
      pos.x += (Math.random() - 0.5) * run.shake;
      pos.y += (Math.random() - 0.5) * run.shake;
      run.shake *= Math.exp(-dt * 5);
    }
    camera.position.copy(pos);
    camera.up.copy(up);
    camera.lookAt(look);
    camera.fov = fov;
    camera.updateProjectionMatrix();

    if (!run.crossed && t >= DIVE_AT && camera.position.y < PORTAL_Y + 0.05) {
      run.crossed = true;
      game.setAct('end');
    }
  });

  return (
    <>
      <color attach="background" args={['#040305']} />
      <fog attach="fog" args={['#060508', 11, 27]} />
      <ambientLight intensity={0.9} color="#8a93b3" />
      <directionalLight position={[3, 8, 6]} intensity={1.1} color="#c9d2ff" />
      <pointLight ref={lavaLight} position={[0, -0.4, 0]} color="#ff7a1f" intensity={22} distance={16} decay={1.5} />
      <pointLight ref={eyeLight} position={[0, 0.9, 0]} color="#6dffb0" intensity={0} distance={6} decay={2} />
      <pointLight ref={portalLight} position={[0, 1.2, 0]} color="#4de3c1" intensity={0} distance={12} decay={1.6} />

      <VoxelMesh blocks={room.bricks} material={mat.bricks} />
      <VoxelMesh blocks={room.mossy} material={mat.mossy} />
      <VoxelMesh blocks={room.cracked} material={mat.cracked} />
      <VoxelMesh blocks={room.lava} material={mat.lava} />

      {FRAMES.map(([x, z], index) => (
        <group key={`${x}:${z}`} position={[x, 0, z]}>
          <mesh geometry={FRAME_GEOMETRY} material={mat.frame} position={[0, -0.5 + FRAME_HEIGHT / 2, 0]} />
          <group
            ref={(eye) => {
              eyes.current[index] = eye;
            }}
            position={[0, -0.5 + FRAME_HEIGHT + 3 / 32, 0]}
            visible={false}
          >
            <mesh geometry={EYE_GEOMETRY} material={mat.eye} />
          </group>
        </group>
      ))}
      <mesh ref={portalMesh} geometry={PORTAL_GEOMETRY} material={portal} position={[0, PORTAL_Y, 0]} visible={false} />

      <Spawner position={[3, 0, 6]} />
      <Sparkles count={36} scale={[8, 2.5, 8]} position={[0, 0.4, 0]} size={2.2} speed={0.35} color="#ff9a3c" opacity={0.7} />
    </>
  );
}
