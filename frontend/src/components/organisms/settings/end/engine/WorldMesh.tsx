'use client';

import { useMemo, useSyncExternalStore } from 'react';
import type * as THREE from 'three';
import { crossGeometry, overworldKit } from '../overworld-voxels';
import { netherKit } from '../nether-voxels';
import { kit, VoxelMesh } from '../voxels';
import { BLOCKS, type BlockId, type World } from './world';

type Material = THREE.Material | THREE.Material[];

function materialFor(id: BlockId): Material | null {
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

// One instanced mesh per block type. Mining or placing a block rebuilds only its type's mesh.
export function WorldMesh({ world, grass = [] }: { readonly world: World; readonly grass?: Parameters<typeof VoxelMesh>[0]['blocks'] }) {
  const revision = useSyncExternalStore(
    (listener) => world.subscribe(listener),
    () => world.revision,
    () => 0
  );
  const ids = useMemo(() => {
    void revision;
    return [...world.ids()].filter((id) => BLOCKS[id].visible !== false);
  }, [world, revision]);
  // tall grass goes with the block under it (mined, or blown up by a creeper)
  const standing = useMemo(() => {
    void revision;
    return grass.filter((blade) => world.get(blade.x, blade.y - 1, blade.z));
  }, [grass, world, revision]);
  cross ??= crossGeometry();

  return (
    <>
      {ids.map((id) => {
        const material = materialFor(id);
        return material ? <VoxelMesh key={id} blocks={world.blocks(id)} material={material} /> : null;
      })}
      {standing.length > 0 && <VoxelMesh blocks={standing} material={overworldKit().mat.tallGrass} geometry={cross} />}
    </>
  );
}
