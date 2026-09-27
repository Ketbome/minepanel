'use client';

import { memo, useMemo, useRef, useSyncExternalStore } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { crossGeometry, overworldKit } from '../overworld-voxels';
import { netherKit } from '../nether-voxels';
import { type Block, kit, VoxelMesh } from '../voxels';
import { type BlockId, CHUNK, chunkCenter, chunkKey, type World } from './world';

type Material = THREE.Material | THREE.Material[];

export function materialFor(id: BlockId): Material | null {
  const end = kit().mat;
  const over = overworldKit().mat;
  const nether = netherKit().mat;
  const table: Partial<Record<BlockId, Material>> = {
    grass: over.grass,
    dirt: over.dirt,
    stone: over.stone,
    cobble: over.cobble,
    path: over.path,
    log: over.log,
    leaves: over.leaves,
    planks: over.planks,
    glass: over.glass,
    hay: over.hay,
    water: over.water,
    obsidian: end.obsidian,
    crying: over.crying,
    goldBlock: over.goldBlock,
    netherrack: nether.netherrack,
    netherGold: nether.netherGold,
    netherBricks: nether.netherBricks,
    glowstone: nether.glowstone,
    magma: nether.magma,
    lava: end.lava,
    deepslate: over.deepslate,
    deepBricks: over.deepBricks,
    reinforced: over.reinforced,
    sculk: over.sculk,
    bricks: end.bricks,
    mossy: end.mossy,
    cracked: end.cracked,
    bookshelf: over.bookshelf,
    endStone: end.endStone,
    endBricks: end.endBricks,
    bedrock: end.bedrock,
    purpur: end.purpur,
    purpurPillar: end.purpurPillar,
    chorus: end.chorus,
    chorusFlower: end.chorusFlower,
    endRod: end.endRod,
  };
  return table[id] ?? null;
}

let cross: THREE.BufferGeometry | null = null;

type Blades = Parameters<typeof VoxelMesh>[0]['blocks'];

// One instanced mesh per block type and chunk. Mining or placing a block rebuilds only its chunk.
export function WorldMesh({ world, grass = [] }: { readonly world: World; readonly grass?: Blades }) {
  const revision = useSyncExternalStore(
    (listener) => world.subscribe(listener),
    () => world.revision,
    () => 0
  );
  const chunks = useMemo(() => {
    void revision;
    return world.chunkKeys();
  }, [world, revision]);
  const blades = useMemo(() => {
    const byChunk = new Map<number, Block[]>();
    grass.forEach((blade) => {
      const key = chunkKey(blade.x, blade.z);
      const list = byChunk.get(key);
      if (list) list.push(blade);
      else byChunk.set(key, [blade]);
    });
    return byChunk;
  }, [grass]);
  const groups = useRef(new Map<number, THREE.Group>());

  // three already skips chunks outside the view; past the fog they would draw as flat fog colour
  useFrame(({ camera, scene }) => {
    const far = scene.fog instanceof THREE.Fog ? scene.fog.far + CHUNK : Infinity;
    groups.current.forEach((group, key) => {
      const [x, z] = chunkCenter(key);
      group.visible = Math.hypot(camera.position.x - x, camera.position.z - z) < far;
    });
  });

  return (
    <>
      {chunks.map((key) => (
        <ChunkMesh
          key={key}
          world={world}
          chunk={key}
          revision={world.chunkRevision(key)}
          grass={blades.get(key)}
          group={(group) => {
            if (group) groups.current.set(key, group);
            else groups.current.delete(key);
          }}
        />
      ))}
    </>
  );
}

interface ChunkMeshProps {
  readonly world: World;
  readonly chunk: number;
  // only here so memo re-renders the chunk when its blocks change
  readonly revision: number;
  readonly grass?: Blades;
  readonly group: (group: THREE.Group | null) => void;
}

const ChunkMesh = memo(
  function ChunkMesh({ world, chunk, grass, group }: ChunkMeshProps) {
    const lists = world.chunkBlocks(chunk);
    // tall grass goes with the block under it (mined, or blown up by a creeper)
    const standing = grass?.filter((blade) => world.get(blade.x, blade.y - 1, blade.z)) ?? [];
    cross ??= crossGeometry();
    return (
      <group ref={group}>
        {[...lists].map(([id, blocks]) => {
          const material = materialFor(id);
          return material ? <VoxelMesh key={id} blocks={blocks} material={material} /> : null;
        })}
        {standing.length > 0 && <VoxelMesh blocks={standing} material={overworldKit().mat.tallGrass} geometry={cross} />}
      </group>
    );
  },
  (previous, next) => previous.revision === next.revision && previous.world === next.world && previous.grass === next.grass
);
