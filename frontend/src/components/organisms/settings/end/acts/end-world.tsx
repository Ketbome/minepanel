'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cue } from '../end-audio';
import { World } from '../engine/world';
import { useEndGame } from '../store';
import { createPortalMaterial, createSkyMaterial, tickPortal } from '../shaders';
import { hash, kit, rng, type Block } from '../voxels';

// Scenery of the End, built into the block grid. One unit is one block; the main island's top
// layer sits at y = 0, so walkable ground is at y = 0.5.

export const ISLAND_RADIUS = 26;
// the obsidian platform you arrive on, a short end stone bridge away from the island
export const PLATFORM = new THREE.Vector3(33, 0, 0);
export const PORTAL_SURFACE_Y = 1.25;
export const PILLAR_TOP_Y = 4.5;
export const TOMB = new THREE.Vector3(21, 0, 1);

const PILLAR_SHAPES = [
  { height: 13, radius: 1.5 },
  { height: 21, radius: 2.5 },
  { height: 10, radius: 1.5, caged: true },
  { height: 17, radius: 2 },
  { height: 23, radius: 2.5 },
  { height: 15, radius: 1.5 },
  { height: 11, radius: 1.5, caged: true },
  { height: 19, radius: 2 },
  { height: 16, radius: 2 },
  { height: 22, radius: 2.5 },
];

export interface Pillar {
  readonly x: number;
  readonly z: number;
  readonly height: number;
  readonly radius: number;
  readonly caged: boolean;
  readonly crystal: THREE.Vector3;
}

// ten obsidian spikes in a ring, the two shortest caged in iron bars, like the real fight
export const PILLARS: Pillar[] = PILLAR_SHAPES.map((shape, index) => {
  const angle = (index / PILLAR_SHAPES.length) * Math.PI * 2 + 0.35;
  const x = Math.round(Math.cos(angle) * 17);
  const z = Math.round(Math.sin(angle) * 17);
  return { ...shape, caged: shape.caged ?? false, x, z, crystal: new THREE.Vector3(x, shape.height + 2.4, z) };
});

function coast(x: number, z: number) {
  const wobble = Math.sin(x * 0.31 + z * 0.17) * 0.5 + Math.sin(z * 0.43 - x * 0.29 + 1.7) * 0.5;
  return Math.hypot(x, z) + wobble * 1.6 + (hash(x, z, 1) - 0.5) * 1.4;
}

function mound(x: number, z: number) {
  return Math.hypot(x, z) < ISLAND_RADIUS - 5 && Math.hypot(x, z) > 6 && hash(Math.floor(x / 3), Math.floor(z / 3), 2) > 0.8;
}

// y of the walkable surface, so endermen and the egg stand on the ground, not in it
export function surfaceY(x: number, z: number) {
  return mound(Math.round(x), Math.round(z)) ? 1.5 : 0.5;
}

export function randomIslandSpot(rand: () => number = Math.random) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const angle = rand() * Math.PI * 2;
    const radius = 6 + rand() * 15;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (PILLARS.every((pillar) => Math.hypot(pillar.x - x, pillar.z - z) > pillar.radius + 1.5)) return new THREE.Vector3(x, surfaceY(x, z), z);
  }
  return new THREE.Vector3(10, 0.5, 0);
}

export function buildMainIsland(world: World) {
  const depth = 14;
  const layerRadius = (layer: number) => ISLAND_RADIUS * Math.pow(1 - layer / (depth + 1), 0.7);
  const shade = (x: number, y: number, z: number) => 0.86 + hash(x, y, z) * 0.14;

  for (let x = -ISLAND_RADIUS - 2; x <= ISLAND_RADIUS + 2; x += 1) {
    for (let z = -ISLAND_RADIUS - 2; z <= ISLAND_RADIUS + 2; z += 1) {
      const edge = coast(x, z);
      if (edge > ISLAND_RADIUS) continue;
      const r = Math.hypot(x, z);
      if (r <= 3.6) {
        world.set(x, 0, z, 'bedrock');
        if (r > 2.6) world.set(x, 1, z, 'bedrock');
      } else {
        world.set(x, 0, z, 'endStone', shade(x, 0, z));
        if (mound(x, z)) world.set(x, 1, z, 'endStone', shade(x, 1, z));
      }
      for (let layer = 1; layer <= depth; layer += 1) {
        if (edge > layerRadius(layer)) break;
        world.set(x, -layer, z, 'endStone', shade(x, -layer, z));
      }
    }
  }
  for (let y = 1; y <= 4; y += 1) world.set(0, y, 0, 'bedrock');

  PILLARS.forEach((pillar) => {
    const reach = Math.ceil(pillar.radius);
    const inside = (dx: number, dz: number) => dx * dx + dz * dz <= pillar.radius * pillar.radius + 0.5;
    for (let dx = -reach; dx <= reach; dx += 1) {
      for (let dz = -reach; dz <= reach; dz += 1) {
        if (!inside(dx, dz)) continue;
        for (let y = 1; y <= pillar.height; y += 1) world.set(pillar.x + dx, y, pillar.z + dz, 'obsidian', 0.9 + hash(dx, y, dz) * 0.1);
      }
    }
    world.set(pillar.x, pillar.height + 1, pillar.z, 'bedrock');
  });

  // the arrival platform and the end stone path to the island
  for (let dx = -2; dx <= 2; dx += 1) for (let dz = -2; dz <= 2; dz += 1) world.set(PLATFORM.x + dx, PLATFORM.y, PLATFORM.z + dz, 'obsidian');
  for (let x = ISLAND_RADIUS - 3; x < PLATFORM.x - 2; x += 1) for (let dz = -1; dz <= 1; dz += 1) world.set(x, 0, dz, 'endStone', 0.9);

  // the tomb: a low mound where the admin's trail ends
  world.set(TOMB.x + 1, 1, TOMB.z, 'endStone', 0.8);
  world.set(TOMB.x + 2, 1, TOMB.z, 'endStone', 0.8);
}

// iron bars around the two caged crystals, as thin visual blocks
export function cageBars(): Block[] {
  const bars: Block[] = [];
  PILLARS.filter((pillar) => pillar.caged).forEach((pillar) => {
    const base = pillar.height + 1.5;
    for (let step = -1.5; step <= 1.5; step += 0.5) {
      [
        [step, -1.5],
        [step, 1.5],
        [-1.5, step],
        [1.5, step],
      ].forEach(([bx, bz]) => bars.push({ x: pillar.x + bx, y: base + 1.5, z: pillar.z + bz, scale: [0.08, 3, 0.08] }));
      bars.push({ x: pillar.x + step, y: base + 3, z: pillar.z, scale: [0.08, 0.08, 3] });
      bars.push({ x: pillar.x, y: base + 3, z: pillar.z + step, scale: [3, 0.08, 0.08] });
    }
  });
  return bars;
}

export function growChorus(rand: () => number, x: number, y: number, z: number, world: World) {
  const height = 3 + Math.floor(rand() * 4);
  const stem: [number, number, number] = [0.62, 1, 0.62];
  for (let step = 0; step < height; step += 1) world.set(x, y + step, z, 'chorus', undefined, stem);
  world.set(x, y + height, z, 'chorusFlower');
  const branches = 1 + Math.floor(rand() * 3);
  for (let branch = 0; branch < branches; branch += 1) {
    const [dx, dz] = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ][Math.floor(rand() * 4)];
    const from = y + 1 + Math.floor(rand() * (height - 1));
    const reach = 1 + Math.floor(rand() * 2);
    for (let k = 1; k <= reach; k += 1) world.set(x + dx * k, from, z + dz * k, 'chorus', undefined, stem);
    const rise = 1 + Math.floor(rand() * 2);
    for (let k = 1; k <= rise; k += 1) world.set(x + dx * reach, from + k, z + dz * reach, 'chorus', undefined, stem);
    world.set(x + dx * reach, from + rise + 1, z + dz * reach, 'chorusFlower');
  }
}

export function floatingIsland(world: World, cx: number, cy: number, cz: number, radius: number, seed: number) {
  const rand = rng(seed);
  const depth = radius / 1.5;
  for (let x = -radius - 1; x <= radius + 1; x += 1) {
    for (let z = -radius - 1; z <= radius + 1; z += 1) {
      const edge = Math.hypot(x, z) + (hash(x, z, seed) - 0.5) * 2;
      for (let layer = 0; layer <= depth; layer += 1) {
        if (edge > radius * (1 - layer / (depth + 1))) break;
        world.set(cx + x, cy - layer, cz + z, 'endStone', 0.86 + hash(x, layer, z) * 0.14);
      }
    }
  }
  return rand;
}

function portalCells() {
  const positions: number[] = [];
  for (let x = -3; x <= 3; x += 1) {
    for (let z = -3; z <= 3; z += 1) {
      if (Math.hypot(x, z) > 2.6 || (x === 0 && z === 0)) continue;
      const y = PORTAL_SURFACE_Y;
      positions.push(x - 0.5, y, z - 0.5, x - 0.5, y, z + 0.5, x + 0.5, y, z + 0.5);
      positions.push(x - 0.5, y, z - 0.5, x + 0.5, y, z + 0.5, x + 0.5, y, z - 0.5);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

// The exit portal stays an empty bedrock bowl until the dragon dies, as in the game.
export function ExitPortal() {
  const { tex } = kit();
  const open = useEndGame((state) => state.portalOpen);
  const geometry = useMemo(() => portalCells(), []);
  const material = useMemo(() => createPortalMaterial(tex.specks), [tex.specks]);
  const light = useRef<THREE.PointLight>(null);
  const openedAt = useRef(-1);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  useFrame((state) => {
    tickPortal(material, state);
    if (!open) return;
    const t = state.clock.elapsedTime;
    if (openedAt.current < 0) openedAt.current = t;
    const age = t - openedAt.current;
    material.uniforms.uOpacity.value = Math.min(1, age / 0.8);
    material.uniforms.uFlash.value = Math.max(0, 1 - age / 1.4);
    if (light.current) light.current.intensity = Math.min(1, age) * (30 + Math.sin(t * 2.4) * 4);
  });

  return (
    <>
      <pointLight ref={light} position={[0, 2.6, 0]} color="#9d6bff" intensity={0} distance={22} decay={1.5} />
      {open && <mesh geometry={geometry} material={material} />}
    </>
  );
}

const SKY = new THREE.SphereGeometry(300, 24, 16);

export interface SceneFx {
  shake: number;
  flash: number;
  light: number;
  readonly lightAt: THREE.Vector3;
}

// The End sky, with the occasional purple flash lighting the whole dimension.
export function EndSky({ fx }: { readonly fx: SceneFx }) {
  const { tex } = kit();
  const material = useMemo(() => createSkyMaterial(tex.skyNoise), [tex.skyNoise]);
  const mesh = useRef<THREE.Mesh>(null);
  const flash = useRef({ t: 0, next: 16 + Math.random() * 8, start: -99 });

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state, delta) => {
    const run = flash.current;
    run.t += Math.min(delta, 0.1);
    if (run.t > run.next) {
      run.start = run.t;
      run.next = run.t + 22 + Math.random() * 26;
      const direction = material.uniforms.uFlashDir.value as THREE.Vector3;
      direction.set(Math.random() - 0.5, 0.3 + Math.random() * 0.6, Math.random() - 0.5).normalize();
      cue('flash');
    }
    const age = run.t - run.start;
    const strength = age < 0 ? 0 : age < 0.3 ? age / 0.3 : Math.exp(-(age - 0.3) * 1.4);
    material.uniforms.uFlash.value = strength;
    fx.flash = strength;
    mesh.current?.position.copy(state.camera.position);
  });

  return <mesh ref={mesh} geometry={SKY} material={material} renderOrder={-1} frustumCulled={false} />;
}
