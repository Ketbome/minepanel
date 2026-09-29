'use client';

import { memo, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { crossGeometry, overworldKit } from '../overworld-voxels';
import { netherKit } from '../nether-voxels';
import { siftKit } from '../sift-voxels';
import { type Block, kit, VoxelMesh } from '../voxels';
import { waterGeometry, waterMaterial } from './water';
import { type BlockId, CHUNK, chunkCenter, chunkKey, type World } from './world';

type Material = THREE.Material | THREE.Material[];

export function materialFor(id: BlockId): Material | null {
  const end = kit().mat;
  const over = overworldKit().mat;
  const nether = netherKit().mat;
  const sift = siftKit().mat;
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
    sand: over.sand,
    sandstone: over.sandstone,
    snowyGrass: over.snowyGrass,
    snow: over.snow,
    ice: over.ice,
    spruceLog: over.spruceLog,
    spruceLeaves: over.spruceLeaves,
    cactus: over.cactus,
    tnt: over.tnt,
    siftGrass: sift.siftGrass,
    hillGrass: sift.hillGrass,
    siftSculk: sift.siftSculk,
    siftSand: sift.siftSand,
    paleLog: sift.paleLog,
    paleLeaves: sift.paleLeaves,
    boneBlock: sift.boneBlock,
    ichor: sift.ichor,
  };
  return table[id] ?? null;
}

let cross: THREE.BufferGeometry | null = null;

// A block whose four sides share one texture (grass, logs, sandstone...) is drawn with the sides
// in one group, the top and the bottom in two more: three draw calls per chunk instead of six.
let sided: THREE.BufferGeometry | null = null;

function sidedBox() {
  if (sided) return sided;
  const box = new THREE.BoxGeometry(1, 1, 1);
  const index = box.getIndex()!.array;
  // three's face order is +x, -x, +y, -y, +z, -z, six indices each
  const faces = (list: readonly number[]) => list.flatMap((face) => Array.from(index.slice(face * 6, face * 6 + 6)));
  box.setIndex([...faces([0, 1, 4, 5]), ...faces([2]), ...faces([3])]);
  box.clearGroups();
  box.addGroup(0, 24, 0);
  box.addGroup(24, 6, 1);
  box.addGroup(30, 6, 2);
  sided = box;
  return box;
}

const drawn = new Map<BlockId, { readonly material: Material; readonly geometry?: THREE.BufferGeometry } | null>();

function drawOf(id: BlockId) {
  let entry = drawn.get(id);
  if (entry === undefined) {
    const material = materialFor(id);
    const isSided = Array.isArray(material) && material.length === 6 && material[0] === material[1] && material[0] === material[4] && material[0] === material[5];
    entry = !material ? null : isSided ? { material: [material[0], material[2], material[3]], geometry: sidedBox() } : { material };
    drawn.set(id, entry);
  }
  return entry;
}

// the plants drawn as two crossed quads, standing on the block below them
export type PlantKind = 'grass' | 'flower' | 'fern' | 'deadBush';
export interface Plant extends Block {
  readonly kind: PlantKind;
}
const PLANT_KINDS: readonly PlantKind[] = ['grass', 'flower', 'fern', 'deadBush'];

function plantMaterial(kind: PlantKind) {
  const { mat } = overworldKit();
  return kind === 'grass' ? mat.tallGrass : mat[kind];
}

// a chunk's water is one mesh of the faces that show, not a cube per block
function WaterMesh({ world, blocks }: { readonly world: World; readonly blocks: readonly Block[] }) {
  const geometry = useMemo(() => waterGeometry(world, blocks), [world, blocks]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={waterMaterial()} />;
}

// One instanced mesh per block type and chunk. Mining or placing a block rebuilds only its chunk.
export function WorldMesh({ world, plants = [] }: { readonly world: World; readonly plants?: readonly Plant[] }) {
  const revision = useSyncExternalStore(
    (listener) => world.subscribe(listener),
    () => world.revision,
    () => 0
  );
  const chunks = useMemo(() => {
    void revision;
    return world.chunkKeys();
  }, [world, revision]);
  const byChunk = useMemo(() => {
    const out = new Map<number, Plant[]>();
    plants.forEach((plant) => {
      const key = chunkKey(plant.x, plant.z);
      const list = out.get(key);
      if (list) list.push(plant);
      else out.set(key, [plant]);
    });
    return out;
  }, [plants]);
  const groups = useRef(new Map<number, THREE.Group>());

  // three already skips chunks outside the view; a chunk wholly past the fog would only draw fog
  useFrame(({ camera, scene }) => {
    const far = scene.fog instanceof THREE.Fog ? scene.fog.far + (CHUNK / 2) * Math.SQRT2 : Infinity;
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
          plants={byChunk.get(key)}
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
  readonly plants?: readonly Plant[];
  readonly group: (group: THREE.Group | null) => void;
}

const ChunkMesh = memo(
  function ChunkMesh({ world, chunk, plants, group }: ChunkMeshProps) {
    const lists = world.chunkBlocks(chunk);
    // a plant goes with the block under it (mined, or blown up by a creeper)
    const standing = plants?.filter((plant) => world.get(plant.x, plant.y - 1, plant.z)) ?? [];
    const geometry = (cross ??= crossGeometry());
    return (
      <group ref={group}>
        {[...lists].map(([id, blocks]) => {
          if (id === 'water') return <WaterMesh key={id} world={world} blocks={blocks} />;
          const draw = drawOf(id);
          return draw ? <VoxelMesh key={id} blocks={blocks} material={draw.material} geometry={draw.geometry} /> : null;
        })}
        {PLANT_KINDS.map((kind) => {
          const blocks = standing.filter((plant) => plant.kind === kind);
          return blocks.length > 0 ? <VoxelMesh key={kind} blocks={blocks} material={plantMaterial(kind)} geometry={geometry} /> : null;
        })}
      </group>
    );
  },
  (previous, next) => previous.revision === next.revision && previous.world === next.world && previous.plants === next.plants
);
