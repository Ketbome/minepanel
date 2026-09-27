import type { BlockId, World } from '../engine/world';
import type { Plant } from '../engine/WorldMesh';
import { hash } from '../voxels';
import { BEACH_CACTUS, biomeAt, DOME, groundHeight, HARBOR, HUT, IGLOO, isLevelled, OVERWORLD_RADIUS, PEN, PYRAMID, TEMPLE, TREASURE, WRECK, type Biome } from './overworld-layout';

// The biomes around the story: their ground, water, plants and trees, and the structures each one
// hides (the temple, the igloo, the swamp hut and the shipwreck) next to Ketbome's unfinished
// servers. The props (signs, chests, the TNT plate) are placed by Biomes.tsx.

const R = OVERWORLD_RADIUS;

// the top block, the ones under it, and what grows on it
const SURFACE: Record<Biome, { readonly top: BlockId; readonly under: BlockId }> = {
  plains: { top: 'grass', under: 'dirt' },
  taiga: { top: 'snowyGrass', under: 'dirt' },
  desert: { top: 'sand', under: 'sand' },
  swamp: { top: 'grass', under: 'dirt' },
  coast: { top: 'sand', under: 'sand' },
};

// the coast keeps grass until the beach
const beach = (z: number) => z > 70;

export function oak(world: World, x: number, base: number, z: number, trunk: number) {
  for (let y = 0; y < trunk; y += 1) world.set(x, base + y, z, 'log');
  const top = base + trunk;
  for (let layer = -2; layer <= 1; layer += 1) {
    const reach = layer < 0 ? 2 : 1;
    for (let dx = -reach; dx <= reach; dx += 1) {
      for (let dz = -reach; dz <= reach; dz += 1) {
        const corner = Math.abs(dx) === reach && Math.abs(dz) === reach;
        if ((dx === 0 && dz === 0 && layer < 0) || (corner && (layer === 1 || hash(x + dx, layer, z + dz) < 0.5))) continue;
        world.set(x + dx, top + layer, z + dz, 'leaves', 0.85 + hash(dx, layer, dz) * 0.15);
      }
    }
  }
}

// a cone of needles on a tall trunk
function spruce(world: World, x: number, base: number, z: number, trunk: number) {
  for (let y = 0; y < trunk; y += 1) world.set(x, base + y, z, 'spruceLog');
  const top = base + trunk;
  world.set(x, top, z, 'spruceLeaves');
  for (let layer = 1; layer <= trunk - 2; layer += 1) {
    const reach = layer % 2 === 0 ? 1 : Math.min(3, 1 + Math.floor(layer / 2));
    for (let dx = -reach; dx <= reach; dx += 1) {
      for (let dz = -reach; dz <= reach; dz += 1) {
        if ((dx === 0 && dz === 0) || Math.abs(dx) + Math.abs(dz) > reach + 1) continue;
        world.set(x + dx, top - layer, z + dz, 'spruceLeaves', 0.85 + hash(dx, layer, dz) * 0.15);
      }
    }
  }
}

function cactus(world: World, x: number, base: number, z: number, height: number) {
  for (let y = 0; y < height; y += 1) world.set(x, base + y, z, 'cactus', undefined, [0.875, 1, 0.875]);
}

// every column past the story's plains: ground by biome, water below y = 0, and what grows there
export function buildBiomeColumn(world: World, plants: Plant[], x: number, z: number) {
  const h = groundHeight(x, z);
  const biome = biomeAt(x, z);
  const coastGrass = biome === 'coast' && !beach(z);
  const { top, under } = coastGrass ? SURFACE.plains : SURFACE[biome];
  const wet = h < 0;
  const surface: BlockId = wet ? (biome === 'swamp' ? 'dirt' : 'sand') : top;
  const tint = biome === 'swamp' && surface === 'grass' ? 0.66 + hash(x, z, 3) * 0.1 : surface === 'grass' ? 0.88 + hash(x, z, 3) * 0.12 : undefined;
  world.set(x, h, z, surface, tint);
  const below: BlockId = wet ? (biome === 'swamp' ? 'dirt' : 'sand') : under;
  for (let y = h - 1; y >= -2; y -= 1) world.set(x, y, z, biome === 'desert' && y < h - 2 ? 'sandstone' : below, below === 'dirt' ? 0.9 : undefined);
  world.set(x, -3, z, 'stone');
  for (let y = h + 1; y <= 0; y += 1) world.set(x, y, z, 'water');
  if (wet || isLevelled(x, z, 2)) return;

  const roll = hash(x, z, 21);
  const plant = (kind: Plant['kind']) => plants.push({ x, y: h + 1, z, kind, tint: 0.85 + hash(z, x, 6) * 0.15 });
  if (biome === 'taiga') {
    if (roll > 0.982 && Math.abs(x) < R - 3 && Math.abs(z) < R - 3) spruce(world, x, h + 1, z, 6 + Math.floor(hash(x, z, 22) * 3));
    else if (roll < 0.06) plant('fern');
  } else if (biome === 'desert') {
    if (roll > 0.992) cactus(world, x, h + 1, z, 1 + Math.floor(hash(x, z, 22) * 3));
    else if (roll < 0.015) plant('deadBush');
  } else if (biome === 'swamp') {
    if (roll > 0.986 && Math.abs(x) < R - 3 && Math.abs(z) < R - 3) oak(world, x, h + 1, z, 4);
    else if (roll < 0.18) plant('grass');
  } else if (coastGrass) {
    if (roll > 0.993) oak(world, x, h + 1, z, 5);
    else if (roll < 0.1) plant('grass');
    else if (roll < 0.115) plant('flower');
  }
}

// a dome of `id` around (x, y, z), the door on the side facing the camp; `gaps` leaves holes
function dome(world: World, x: number, y: number, z: number, id: BlockId, gaps = 0) {
  for (let dx = -3; dx <= 3; dx += 1) {
    for (let dz = -3; dz <= 3; dz += 1) {
      for (let dy = 0; dy <= 3; dy += 1) {
        const r = Math.hypot(dx, dy, dz);
        if (r < 2.2 || r > 3.2) continue;
        if (gaps && dy > 0 && hash(x + dx, y + dy, z + dz) < gaps) continue;
        world.set(x + dx, y + dy, z + dz, id);
      }
    }
  }
  // the door faces +z, toward the camp
  world.remove(x, y, z + 3);
  world.remove(x, y + 1, z + 3);
  world.remove(x, y, z + 2);
  world.remove(x, y + 1, z + 2);
}

export function buildStructures(world: World) {
  // desert temple: sandstone walls, open roof, the door facing the camp (west)
  {
    const { x, z } = TEMPLE;
    world.fill(x - 4, 1, z - 4, x + 4, 1, z + 4, 'sandstone');
    for (let dx = -4; dx <= 4; dx += 1) {
      for (let dz = -4; dz <= 4; dz += 1) {
        if (Math.abs(dx) !== 4 && Math.abs(dz) !== 4) continue;
        const tower = Math.abs(dz) === 4 && dx === -4;
        for (let y = 2; y <= (tower ? 8 : 6); y += 1) world.set(x + dx, y, z + dz, 'sandstone');
      }
    }
    for (let y = 2; y <= 3; y += 1) world.remove(x - 4, y, z);
    // the trap: TNT under the plate in the middle
    world.fill(x - 1, 0, z - 1, x + 1, 0, z + 1, 'tnt');
  }
  // Ketbome's server #12: one stepped corner of a pyramid
  {
    const x0 = PYRAMID.x - 3;
    const z0 = PYRAMID.z - 3;
    for (let k = 0; k < 4; k += 1) {
      for (let i = k; i <= 6; i += 1) {
        world.set(x0 + i, 2 + k, z0 + k, 'sandstone');
        world.set(x0 + k, 2 + k, z0 + i, 'sandstone');
      }
    }
  }
  // snowy taiga: a snow igloo, and Ketbome's server #23 in dirt, half built
  dome(world, IGLOO.x, 4, IGLOO.z, 'snow');
  dome(world, DOME.x, 4, DOME.z, 'dirt', 0.4);
  // swamp: a hut on stilts with steps up to its door (east)
  {
    const { x, z } = HUT;
    [
      [-2, -2],
      [2, -2],
      [-2, 2],
      [2, 2],
    ].forEach(([dx, dz]) => world.fill(x + dx, 1, z + dz, x + dx, 3, z + dz, 'spruceLog'));
    world.fill(x - 2, 4, z - 2, x + 2, 4, z + 2, 'planks');
    for (let dx = -2; dx <= 2; dx += 1) {
      for (let dz = -2; dz <= 2; dz += 1) {
        if (Math.abs(dx) !== 2 && Math.abs(dz) !== 2) continue;
        for (let y = 5; y <= 6; y += 1) world.set(x + dx, y, z + dz, 'planks');
      }
    }
    world.fill(x - 2, 7, z - 2, x + 2, 7, z + 2, 'planks');
    world.remove(x + 2, 5, z);
    world.remove(x + 2, 6, z);
    world.set(x + 5, 1, z, 'planks');
    world.fill(x + 4, 1, z, x + 4, 2, z, 'planks');
    world.fill(x + 3, 1, z, x + 3, 3, z, 'planks');
  }
  // Ketbome's server #31: a slime farm pen, empty
  {
    const { x, z } = PEN;
    for (let dx = -3; dx <= 3; dx += 1) {
      for (let dz = -3; dz <= 3; dz += 1) {
        if (Math.abs(dx) === 3 || Math.abs(dz) === 3) world.fill(x + dx, 1, z + dz, x + dx, 2, z + dz, 'cobble');
      }
    }
  }
  // coast: a shipwreck lying in the shallows, its deck dry
  {
    const { x, z } = WRECK;
    for (let dx = -5; dx <= 5; dx += 1) {
      const width = Math.abs(dx) >= 4 ? 1 : 2;
      for (let dz = -width; dz <= width; dz += 1) {
        world.set(x + dx, 0, z + dz, 'planks');
        world.remove(x + dx, 1, z + dz);
        // the hull leans: the south side stands taller
        if (Math.abs(dz) === width) world.fill(x + dx, 1, z + dz, x + dx, dz > 0 ? 3 : 1, z + dz, 'planks');
      }
    }
    world.fill(x, 1, z, x, 5, z, 'log');
  }
  // the lone cactus on the beach, and the treasure buried under the sand north of it
  cactus(world, BEACH_CACTUS.x, 2, BEACH_CACTUS.z, 2);
  world.set(TREASURE.x, 1, TREASURE.z, 'sand');
  // Ketbome's server #40, the harbor: only the sign (placed by Biomes.tsx) and one post
  world.set(HARBOR.x + 1, 2, HARBOR.z, 'log');
}
