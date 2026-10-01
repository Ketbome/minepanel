'use client';

import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { cue } from '../end-audio';
import { spawnDrop } from '../engine/Drops';
import { cellBox, runtime, useTarget, type Target } from '../engine/runtime';
import type { World } from '../engine/world';
import { overworldKit } from '../overworld-voxels';
import { createNetherPortalMaterial } from '../shaders';
import { useLore } from '../lore';
import type { LoreKey } from '../lore/en';
import { SIGN_TEXT } from '../signs';
import { BFUUNY, season, useEndGame, type BookId, type ChestId, type SignId } from '../store';
import { kit, UNIT_BOX } from '../voxels';

// Things you can walk up to and use. Each one claims its cell in the world so you cannot walk
// through it, and registers a target so the crosshair can find it.

type Cell = readonly [number, number, number];

function useCellTarget(world: World, [x, y, z]: Cell, target: Omit<Target, 'box'>, height = 1, solid = true) {
  const entry = useMemo<Target>(() => ({ ...target, box: cellBox(x, y, z, height) }), [x, y, z, height, target]);
  useEffect(() => {
    if (solid) world.set(x, y, z, 'prop');
  }, [world, x, y, z, solid]);
  useTarget(entry);
}

const CHEST_BODY = new THREE.BoxGeometry(14 / 16, 10 / 16, 14 / 16);
const CHEST_LID = new THREE.BoxGeometry(14 / 16, 4 / 16, 14 / 16);
const LATCH = new THREE.BoxGeometry(2 / 16, 4 / 16, 1 / 16);

// Bfuuny drops in to laugh every time someone falls for one of his pranks
export function bfuunyLaughs(key: LoreKey) {
  window.setTimeout(() => useEndGame.getState().presence('join', BFUUNY), 600);
  window.setTimeout(() => useEndGame.getState().say(key, BFUUNY), 1800);
  window.setTimeout(() => useEndGame.getState().presence('leave', BFUUNY), 3300);
}

export function Chest({ world, id, at, facing = 0 }: { readonly world: World; readonly id: ChestId; readonly at: Cell; readonly facing?: number }) {
  const { mat } = overworldKit();
  const [christmas] = useState(() => season() === 'christmas');
  const open = useEndGame((state) => state.panel?.kind === 'chest' && state.panel.id === id);
  const lid = useRef<THREE.Group>(null);
  const [x, y, z] = at;
  const target = useMemo<Omit<Target, 'box'>>(
    () => ({
      label: () => (id === 'backups' ? 'chestBackups' : 'chest'),
      use: () => {
        cue('chest');
        useEndGame.getState().openPanel({ kind: 'chest', id });
        runtime.hooks.vibration?.(new THREE.Vector3(x, y, z), 8);
      },
    }),
    [id, x, y, z]
  );
  useCellTarget(world, at, target, 0.875);
  // closing the "treasure" (nine stacks of dirt) for the first time is what Bfuuny waited for
  const wasOpen = useRef(false);
  useEffect(() => {
    const game = useEndGame.getState();
    if (wasOpen.current && !open && id === 'backups' && !game.flags.bfuunyChest) {
      game.setFlag('bfuunyChest');
      bfuunyLaughs('bfuunyChest');
    }
    wasOpen.current = open;
  }, [open, id]);

  useFrame((_, delta) => {
    if (!lid.current) return;
    const goal = open ? -1.15 : 0;
    lid.current.rotation.x += (goal - lid.current.rotation.x) * (1 - Math.exp(-Math.min(delta, 0.1) * 9));
  });

  return (
    <group position={[at[0], at[1] - 0.5, at[2]]} rotation={[0, facing, 0]}>
      <mesh geometry={CHEST_BODY} material={christmas ? mat.giftChest : mat.chest} position={[0, 5 / 16, 0]} />
      <group ref={lid} position={[0, 10 / 16, -7 / 16]}>
        <mesh geometry={CHEST_LID} material={christmas ? mat.giftLid : mat.lid} position={[0, 2 / 16, 7 / 16]} />
        <mesh geometry={LATCH} material={kit().mat.iron} position={[0, 0, 14.5 / 16]} />
      </group>
    </group>
  );
}

export function CraftingTable({ world, at }: { readonly world: World; readonly at: Cell }) {
  const { mat } = overworldKit();
  const target = useMemo<Omit<Target, 'box'>>(
    () => ({
      label: () => 'craftingTable',
      use: () => {
        cue('craft');
        useEndGame.getState().openPanel({ kind: 'craft' });
      },
    }),
    []
  );
  useCellTarget(world, at, target);
  return <mesh geometry={UNIT_BOX} material={mat.table} position={at as [number, number, number]} />;
}

const COOK_S = 10;
const FIRE_LOG = new THREE.BoxGeometry(1, 2 / 16, 4 / 16);
const CHOP = new THREE.BoxGeometry(5 / 16, 1 / 16, 4 / 16);
const CHOP_SPOTS: readonly [number, number][] = [
  [-0.22, -0.22],
  [0.22, -0.22],
  [0.22, 0.22],
  [-0.22, 0.22],
];

// The camp's fire, like the game's campfire: right click with raw porkchop lays one on it (up to
// four), and each pops off cooked a few seconds later.
export function Campfire({ world, at }: { readonly world: World; readonly at: Cell }) {
  const { mat, tex } = kit();
  const logs = useMemo(() => new THREE.MeshLambertMaterial({ color: '#5a4125' }), []);
  const meat = useMemo(() => new THREE.MeshLambertMaterial({ color: '#e8878a' }), []);
  const flame = useRef<THREE.Mesh>(null);
  const cooking = useRef<number[]>([]);
  const [, redraw] = useState(0);
  const target = useMemo<Omit<Target, 'box'>>(
    () => ({
      label: () => 'campfire',
      use: () => {
        const game = useEndGame.getState();
        if (game.inventory[game.selected]?.item !== 'porkchop') return game.showActionBar('hintCampfire');
        if (cooking.current.length >= CHOP_SPOTS.length) return;
        game.consumeHeld();
        cue('place');
        cooking.current.push(runtime.time);
        redraw((n) => n + 1);
      },
    }),
    []
  );
  useCellTarget(world, at, target, 0.45);

  useFrame(() => {
    if (flame.current) flame.current.scale.set(0.35, 0.3 + Math.sin(runtime.time * 11) * 0.04 + Math.sin(runtime.time * 17) * 0.03, 0.35);
    const done = cooking.current.filter((start) => runtime.time - start >= COOK_S);
    if (!done.length) return;
    cooking.current = cooking.current.filter((start) => !done.includes(start));
    done.forEach(() => spawnDrop('cookedPorkchop', 1, new THREE.Vector3(at[0], at[1] - 0.1, at[2])));
    cue('pop');
    redraw((n) => n + 1);
  });

  return (
    <group position={[at[0], at[1] - 0.5, at[2]]}>
      <mesh geometry={FIRE_LOG} material={logs} position={[0, 1 / 16, -0.2]} />
      <mesh geometry={FIRE_LOG} material={logs} position={[0, 1 / 16, 0.2]} />
      <mesh geometry={FIRE_LOG} material={logs} position={[-0.2, 3 / 16, 0]} rotation={[0, Math.PI / 2, 0]} />
      <mesh geometry={FIRE_LOG} material={logs} position={[0.2, 3 / 16, 0]} rotation={[0, Math.PI / 2, 0]} />
      <mesh ref={flame} geometry={UNIT_BOX} material={mat.flame} position={[0, 0.3, 0]} scale={[0.35, 0.3, 0.35]} />
      {cooking.current.map((start, index) => (
        <mesh key={start} geometry={CHOP} material={meat} position={[CHOP_SPOTS[index][0], 0.33, CHOP_SPOTS[index][1]]} />
      ))}
      <sprite scale={2.4} position={[0, 0.45, 0]}>
        <spriteMaterial map={tex.glow} color="#ffb347" transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.8} />
      </sprite>
    </group>
  );
}

export function Torch({ position }: { readonly position: [number, number, number] }) {
  const { mat, tex } = kit();
  return (
    <group position={position}>
      <mesh geometry={UNIT_BOX} material={mat.torch} scale={[0.12, 0.55, 0.12]} />
      <mesh geometry={UNIT_BOX} material={mat.flame} scale={0.15} position={[0, 0.33, 0]} />
      <sprite scale={1.6} position={[0, 0.35, 0]}>
        <spriteMaterial map={tex.glow} color="#ffb347" transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.8} />
      </sprite>
    </group>
  );
}

const BOARD = new THREE.BoxGeometry(0.9, 0.55, 0.08);
const POST = new THREE.BoxGeometry(0.08, 0.8, 0.08);

// a standing sign on a post, or a wall sign flush against the block behind it
// the words painted on the board like the game's, wrapped and shrunk to fit; the click still opens
// the sign large
function useSignText(text: string) {
  const material = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 312;
    const ctx = canvas.getContext('2d')!;
    const lines = text.split('\n').flatMap((line) => {
      const out = [''];
      line.split(' ').forEach((word) => {
        const last = out.length - 1;
        if (out[last] && (out[last] + ' ' + word).length > 18) out.push(word);
        else out[last] = out[last] ? `${out[last]} ${word}` : word;
      });
      return out;
    });
    let size = 60;
    const fits = () => {
      ctx.font = `600 ${size}px Archivo, system-ui, sans-serif`;
      return lines.length * size * 1.15 <= 290 && lines.every((line) => ctx.measureText(line).width <= 480);
    };
    while (size > 16 && !fits()) size -= 2;
    ctx.fillStyle = '#1e1307';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((line, index) => ctx.fillText(line, 256, 156 + (index - (lines.length - 1) / 2) * size * 1.15));
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  }, [text]);
  useEffect(
    () => () => {
      material.map?.dispose();
      material.dispose();
    },
    [material]
  );
  return material;
}

const TEXT = new THREE.PlaneGeometry(0.86, 0.52);

export function Sign({ id, at, facing = 0, wall = false }: { readonly id: SignId; readonly at: Cell; readonly facing?: number; readonly wall?: boolean }) {
  const { mat } = overworldKit();
  const [x, y, z] = at;
  const box = useMemo(() => {
    const center = new THREE.Vector3(x, y + (wall ? 0 : 0.2), z);
    return new THREE.Box3().setFromCenterAndSize(center, new THREE.Vector3(0.9, wall ? 0.6 : 1.2, 0.9));
  }, [x, y, z, wall]);
  const target = useMemo<Target>(
    () => ({
      box,
      label: () => 'sign',
      use: () => useEndGame.getState().openPanel({ kind: 'sign', id }),
    }),
    [box, id]
  );
  useTarget(target);
  const lore = useLore();
  const text = useSignText(lore(SIGN_TEXT[id]));

  return (
    <group position={[x, y, z]} rotation={[0, facing, 0]}>
      {!wall && <mesh geometry={POST} material={mat.log} position={[0, -0.1, 0]} />}
      <mesh geometry={BOARD} material={mat.planks} position={[0, wall ? 0 : 0.45, wall ? -0.46 : 0]} />
      <mesh geometry={TEXT} material={text} position={[0, wall ? 0 : 0.45, wall ? -0.415 : 0.045]} />
    </group>
  );
}

export function Lectern({ world, at, book, facing = 0, glow = false }: { readonly world: World; readonly at: Cell; readonly book: BookId; readonly facing?: number; readonly glow?: boolean }) {
  const { mat } = overworldKit();
  const pages = useMemo(() => ({ page: new THREE.MeshLambertMaterial({ color: '#efe6cf' }), cover: new THREE.MeshLambertMaterial({ color: '#6b3a2a' }) }), []);
  const target = useMemo<Omit<Target, 'box'>>(
    () => ({
      label: () => 'lectern',
      use: () => {
        const game = useEndGame.getState();
        cue('page');
        game.openPanel({ kind: 'book', id: book });
        if (book === 'diary') game.setFlag('diaryRead');
      },
    }),
    [book]
  );
  useCellTarget(world, at, target, 0.9);

  useEffect(
    () => () => {
      pages.page.dispose();
      pages.cover.dispose();
    },
    [pages]
  );

  return (
    <group position={at as [number, number, number]} rotation={[0, facing, 0]}>
      <mesh geometry={UNIT_BOX} material={mat.planks} scale={[0.9, 0.12, 0.9]} position={[0, -0.44, 0]} />
      <mesh geometry={UNIT_BOX} material={mat.log} scale={[0.4, 0.8, 0.4]} position={[0, 0.02, 0]} />
      <group position={[0, 0.5, 0]} rotation={[0.4, 0, 0]}>
        <mesh geometry={UNIT_BOX} material={mat.planks} scale={[0.95, 0.12, 0.75]} />
        <mesh geometry={UNIT_BOX} material={pages.cover} scale={[0.72, 0.03, 0.5]} position={[0, 0.075, 0]} />
        <mesh geometry={UNIT_BOX} material={pages.page} scale={[0.32, 0.03, 0.46]} position={[-0.17, 0.1, 0]} rotation={[0, 0, 0.08]} />
        <mesh geometry={UNIT_BOX} material={pages.page} scale={[0.32, 0.03, 0.46]} position={[0.17, 0.1, 0]} rotation={[0, 0, -0.08]} />
      </group>
      {glow && <Sparkles count={12} scale={[1.4, 1.2, 1.4]} position={[0, 1, 0]} size={2.4} speed={0.5} color="#b9a2ff" />}
    </group>
  );
}

// the purple sheet inside a lit Nether portal; walking into it is handled by the zone
const BED_FOOT = new THREE.BoxGeometry(1, 9 / 16, 1);

// A red bed two cells long: the pillow at `at`, the foot one cell toward +z.
export function Bed({ world, at, use }: { readonly world: World; readonly at: Cell; readonly use: () => void }) {
  const [x, y, z] = at;
  const latest = useRef(use);
  latest.current = use;
  const target = useMemo<Target>(
    () => ({
      box: cellBox(x, y, z, 0.6).expandByVector(new THREE.Vector3(0, 0, 0.5)),
      label: () => 'bed',
      use: () => latest.current(),
    }),
    [x, y, z]
  );
  useTarget(target);
  useEffect(() => {
    world.set(x, y, z, 'prop');
    world.set(x, y, z + 1, 'prop');
  }, [world, x, y, z]);
  const { mat } = kit();
  return (
    <group position={[x, y - 0.5, z + 0.5]}>
      <mesh geometry={BED_FOOT} scale={[1, 1, 2]} position={[0, 9 / 32, 0]}>
        <meshLambertMaterial color="#b02e26" />
      </mesh>
      <mesh geometry={UNIT_BOX} scale={[0.9, 0.12, 0.6]} position={[0, 0.6, -0.65]}>
        <meshLambertMaterial color="#f0f0f0" />
      </mesh>
      <mesh geometry={UNIT_BOX} material={mat.torch} scale={[1, 0.2, 0.1]} position={[0, 0.1, -1]} />
    </group>
  );
}

export function NetherPortalSheet({ from, to, axis }: { readonly from: Cell; readonly to: Cell; readonly axis: 'x' | 'z' }) {
  const material = useMemo(() => createNetherPortalMaterial(), []);
  const width = (axis === 'x' ? to[0] - from[0] : to[2] - from[2]) + 1;
  const height = to[1] - from[1] + 1;
  const center: [number, number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];

  useEffect(() => () => material.dispose(), [material]);
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <group position={center}>
      <mesh rotation={[0, axis === 'x' ? 0 : Math.PI / 2, 0]}>
        <planeGeometry args={[width, height]} />
        <primitive object={material} attach="material" />
      </mesh>
      <pointLight color="#9d4dff" intensity={8} distance={8} decay={1.6} />
      <Sparkles count={24} scale={[width + 1, height, 1.2]} size={3} speed={0.6} color="#c77dff" />
    </group>
  );
}

// true while the player's body is inside the given block range
export function inside(from: Cell, to: Cell, margin = 0) {
  const { pos } = runtime.player;
  return (
    pos.x > Math.min(from[0], to[0]) - 0.5 - margin &&
    pos.x < Math.max(from[0], to[0]) + 0.5 + margin &&
    pos.y + 0.9 > Math.min(from[1], to[1]) - 0.5 &&
    pos.y < Math.max(from[1], to[1]) + 0.5 &&
    pos.z > Math.min(from[2], to[2]) - 0.5 - margin &&
    pos.z < Math.max(from[2], to[2]) + 0.5 + margin
  );
}

