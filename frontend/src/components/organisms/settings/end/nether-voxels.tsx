import * as THREE from 'three';
import { glow } from './engine/shading';
import { fill, paint, pick, type Painter } from './voxels';

// Nether blocks, painted at runtime like the other kits.

const netherrack: Painter = (dot, rand, size) => {
  fill(dot, rand, size, ['#6f2a2a', '#7c3030', '#612424', '#853838', '#5a2020']);
  for (let vein = 0; vein < 10; vein += 1) dot(Math.floor(rand() * size), Math.floor(rand() * size), '#9e4a4a');
};

// netherrack with gold nuggets pressed into it
const netherGold: Painter = (dot, rand, size) => {
  netherrack(dot, rand, size);
  for (let nugget = 0; nugget < 7; nugget += 1) {
    const x = Math.floor(rand() * (size - 2));
    const y = Math.floor(rand() * (size - 2));
    dot(x, y, '#ffe36b');
    dot(x + 1, y, '#f2b32a');
    dot(x, y + 1, '#c7861a');
  }
};

const netherBricks: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const seam = (y % 8 < 4 ? x + 4 : x) % 8 === 0;
      let color = pick(['#2e1418', '#35171c', '#291115'], rand());
      if (y % 4 === 3 || seam) color = '#170a0c';
      else if (y % 4 === 0) color = '#43202a';
      dot(x, y, color);
    }
  }
};

const glowstone: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const v = rand();
      dot(x, y, v < 0.18 ? '#fff6c4' : v < 0.5 ? '#f7d36b' : v < 0.8 ? '#d9a441' : '#9c6a2a');
    }
  }
};

const magma: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const crack = (x + y * 3) % 7 === 0 || (x * 5 + y) % 11 === 0;
      dot(x, y, crack ? pick(['#ff9a2a', '#ffcc4d'], rand()) : pick(['#4a1a0e', '#3a140a', '#5a2212'], rand()));
    }
  }
};

function buildNetherKit() {
  const tex = {
    netherrack: paint(90, netherrack),
    netherGold: paint(94, netherGold),
    netherBricks: paint(91, netherBricks),
    glowstone: paint(92, glowstone),
    magma: paint(93, magma),
  };
  const mat = {
    netherrack: new THREE.MeshLambertMaterial({ map: tex.netherrack }),
    netherGold: new THREE.MeshLambertMaterial({ map: tex.netherGold }),
    netherBricks: new THREE.MeshLambertMaterial({ map: tex.netherBricks }),
    glowstone: glow(new THREE.MeshBasicMaterial({ map: tex.glowstone }), 1.8),
    magma: new THREE.MeshLambertMaterial({ map: tex.magma, emissive: '#3a1204' }),
  };
  return { tex, mat };
}

let cached: ReturnType<typeof buildNetherKit> | null = null;

export function netherKit() {
  cached ??= buildNetherKit();
  return cached;
}
