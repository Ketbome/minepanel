'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cue } from './end-audio';
import { useEndGame } from './end-game-store';
import { createPortalMaterial, createSkyMaterial, tickPortal } from './shaders';
import { hash, kit, rng, UNIT_BOX, VoxelMesh, type Block } from './voxels';

// Static scenery of the End. One unit is one block; the main island's top layer sits at y = 0.

export const ISLAND_RADIUS = 26;
export const PLATFORM = new THREE.Vector3(56, -4, 0);
export const PORTAL_SURFACE_Y = 1.25;
export const PILLAR_TOP_Y = 4.5;

export const pointerCursor = {
  onPointerOver: () => {
    document.body.style.cursor = 'pointer';
  },
  onPointerOut: () => {
    document.body.style.cursor = '';
  },
};

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
    if (PILLARS.every((pillar) => Math.hypot(pillar.x - x, pillar.z - z) > pillar.radius + 1.5)) {
      return new THREE.Vector3(x, surfaceY(x, z), z);
    }
  }
  return new THREE.Vector3(10, 0.5, 0);
}

interface IslandBlocks {
  readonly endStone: Block[];
  readonly bedrock: Block[];
  readonly obsidian: Block[];
  readonly iron: Block[];
}

function buildMainIsland(): IslandBlocks {
  const blocks: IslandBlocks = { endStone: [], bedrock: [], obsidian: [], iron: [] };
  const depth = 14;
  const layerRadius = (layer: number) => ISLAND_RADIUS * Math.pow(1 - layer / (depth + 1), 0.7);
  const shade = (x: number, y: number, z: number) => 0.86 + hash(x, y, z) * 0.14;

  for (let x = -ISLAND_RADIUS - 2; x <= ISLAND_RADIUS + 2; x += 1) {
    for (let z = -ISLAND_RADIUS - 2; z <= ISLAND_RADIUS + 2; z += 1) {
      const edge = coast(x, z);
      if (edge > ISLAND_RADIUS) continue;
      const r = Math.hypot(x, z);
      if (r <= 3.6) {
        blocks.bedrock.push({ x, y: 0, z });
        if (r > 2.6) blocks.bedrock.push({ x, y: 1, z });
      } else {
        blocks.endStone.push({ x, y: 0, z, tint: shade(x, 0, z) });
        if (mound(x, z)) blocks.endStone.push({ x, y: 1, z, tint: shade(x, 1, z) });
      }
      // the underside is a bowl: only its outer shell can ever be seen
      for (let layer = 1; layer <= depth; layer += 1) {
        if (edge > layerRadius(layer)) break;
        if (edge > layerRadius(layer + 1) - 1.5 || layer === depth) blocks.endStone.push({ x, y: -layer, z, tint: shade(x, -layer, z) });
      }
    }
  }

  for (let y = 1; y <= 4; y += 1) blocks.bedrock.push({ x: 0, y, z: 0 });

  PILLARS.forEach((pillar) => {
    const reach = Math.ceil(pillar.radius);
    const inside = (dx: number, dz: number) => dx * dx + dz * dz <= pillar.radius * pillar.radius + 0.5;
    for (let dx = -reach; dx <= reach; dx += 1) {
      for (let dz = -reach; dz <= reach; dz += 1) {
        if (!inside(dx, dz)) continue;
        const shell = !inside(dx + 1, dz) || !inside(dx - 1, dz) || !inside(dx, dz + 1) || !inside(dx, dz - 1);
        for (let y = 1; y <= pillar.height; y += 1) {
          if (shell || y === pillar.height) blocks.obsidian.push({ x: pillar.x + dx, y, z: pillar.z + dz, tint: 0.9 + hash(dx, y, dz) * 0.1 });
        }
      }
    }
    blocks.bedrock.push({ x: pillar.x, y: pillar.height + 1, z: pillar.z });
    if (!pillar.caged) return;
    const base = pillar.height + 1.5;
    for (let step = -1.5; step <= 1.5; step += 0.5) {
      [
        [step, -1.5],
        [step, 1.5],
        [-1.5, step],
        [1.5, step],
      ].forEach(([bx, bz]) => blocks.iron.push({ x: pillar.x + bx, y: base + 1.5, z: pillar.z + bz, scale: [0.08, 3, 0.08] }));
      blocks.iron.push({ x: pillar.x + step, y: base + 3, z: pillar.z, scale: [0.08, 0.08, 3] });
      blocks.iron.push({ x: pillar.x, y: base + 3, z: pillar.z + step, scale: [3, 0.08, 0.08] });
    }
  });

  for (let dx = -2; dx <= 2; dx += 1) {
    for (let dz = -2; dz <= 2; dz += 1) blocks.obsidian.push({ x: PLATFORM.x + dx, y: PLATFORM.y, z: PLATFORM.z + dz, tint: 0.9 + hash(dx, 7, dz) * 0.1 });
  }
  return blocks;
}

const OUTER_ISLANDS = [
  { x: -96, y: -6, z: -64, radius: 9, seed: 11, city: true },
  { x: 84, y: 8, z: -92, radius: 7, seed: 12 },
  { x: -74, y: 14, z: 94, radius: 6, seed: 13 },
  { x: 118, y: -16, z: 66, radius: 8, seed: 14 },
  { x: 12, y: 22, z: -140, radius: 10, seed: 15 },
];

interface OuterBlocks {
  readonly endStone: Block[];
  readonly chorus: Block[];
  readonly flowers: Block[];
  readonly purpur: Block[];
  readonly rods: Block[];
}

function growChorus(rand: () => number, x: number, y: number, z: number, out: OuterBlocks) {
  const height = 3 + Math.floor(rand() * 4);
  const stem: [number, number, number] = [0.62, 1, 0.62];
  for (let step = 0; step < height; step += 1) out.chorus.push({ x, y: y + step, z, scale: stem });
  out.flowers.push({ x, y: y + height, z });
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
    for (let k = 1; k <= reach; k += 1) out.chorus.push({ x: x + dx * k, y: from, z: z + dz * k, scale: stem });
    const rise = 1 + Math.floor(rand() * 2);
    for (let k = 1; k <= rise; k += 1) out.chorus.push({ x: x + dx * reach, y: from + k, z: z + dz * reach, scale: stem });
    out.flowers.push({ x: x + dx * reach, y: from + rise + 1, z: z + dz * reach });
  }
}

function buildOuterIslands(): OuterBlocks {
  const out: OuterBlocks = { endStone: [], chorus: [], flowers: [], purpur: [], rods: [] };
  OUTER_ISLANDS.forEach((island) => {
    const rand = rng(island.seed);
    for (let x = -island.radius - 1; x <= island.radius + 1; x += 1) {
      for (let z = -island.radius - 1; z <= island.radius + 1; z += 1) {
        const edge = Math.hypot(x, z) + (hash(x, z, island.seed) - 0.5) * 2;
        for (let layer = 0; layer <= island.radius / 1.5; layer += 1) {
          if (edge > island.radius * (1 - layer / (island.radius / 1.5 + 1))) break;
          out.endStone.push({ x: island.x + x, y: island.y - layer, z: island.z + z, tint: 0.86 + hash(x, layer, z) * 0.14 });
        }
      }
    }
    const trees = island.city ? 2 : 3;
    for (let tree = 0; tree < trees; tree += 1) {
      const angle = rand() * Math.PI * 2;
      const radius = 2 + rand() * (island.radius - 4);
      growChorus(rand, island.x + Math.round(Math.cos(angle) * radius), island.y + 1, island.z + Math.round(Math.sin(angle) * radius), out);
    }
    if (!island.city) return;
    // a lone End City tower: purpur shell, two tiers, end rods on the roof corners
    const cx = island.x - 2;
    const cz = island.z + 1;
    const ring = (half: number, from: number, to: number) => {
      for (let y = from; y <= to; y += 1) {
        for (let dx = -half; dx <= half; dx += 1) {
          for (let dz = -half; dz <= half; dz += 1) {
            if (Math.abs(dx) === half || Math.abs(dz) === half) out.purpur.push({ x: cx + dx, y: island.y + y, z: cz + dz });
          }
        }
      }
    };
    const slab = (half: number, y: number) => {
      for (let dx = -half; dx <= half; dx += 1) {
        for (let dz = -half; dz <= half; dz += 1) out.purpur.push({ x: cx + dx, y: island.y + y, z: cz + dz, scale: [1, 0.5, 1] });
      }
    };
    ring(2, 1, 10);
    slab(3, 11);
    ring(1, 12, 17);
    slab(2, 18);
    [
      [-3, -3],
      [-3, 3],
      [3, -3],
      [3, 3],
    ].forEach(([dx, dz]) => out.rods.push({ x: cx + dx, y: island.y + 11.8, z: cz + dz, scale: [0.14, 1.1, 0.14] }));
  });
  return out;
}

function Torch({ position }: { readonly position: [number, number, number] }) {
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

export function MainIsland() {
  const { mat } = kit();
  const blocks = useMemo(() => buildMainIsland(), []);
  const outer = useMemo(() => buildOuterIslands(), []);
  return (
    <>
      <VoxelMesh blocks={blocks.endStone} material={mat.endStone} />
      <VoxelMesh blocks={blocks.bedrock} material={mat.bedrock} />
      <VoxelMesh blocks={blocks.obsidian} material={mat.obsidian} />
      <VoxelMesh blocks={blocks.iron} material={mat.iron} />
      <VoxelMesh blocks={outer.endStone} material={mat.endStone} />
      <VoxelMesh blocks={outer.chorus} material={mat.chorus} />
      <VoxelMesh blocks={outer.flowers} material={mat.chorusFlower} />
      <VoxelMesh blocks={outer.purpur} material={mat.purpur} />
      <VoxelMesh blocks={outer.rods} material={mat.endRod} />
      <Torch position={[0.62, 3.1, 0]} />
      <Torch position={[-0.62, 3.1, 0]} />
      <Torch position={[0, 3.1, 0.62]} />
      <Torch position={[0, 3.1, -0.62]} />
    </>
  );
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
export function ExitPortal({ onEnter }: { readonly onEnter: () => void }) {
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
      {open && (
        <mesh
          geometry={geometry}
          material={material}
          onClick={(event) => {
            event.stopPropagation();
            if (event.delta <= 8) onEnter();
          }}
          {...pointerCursor}
        />
      )}
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
