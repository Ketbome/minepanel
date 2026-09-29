import * as THREE from 'three';
import { sway } from './engine/shading';
import { CLEAR, fill, paint, pick, type Painter } from './voxels';

// The Sift's blocks, painted at runtime like the other kits, after the colors Mojang showed:
// pink and salmon sculk grass, turquoise-green sculk, white trees on gray trunks, bone.

const PINK = ['#f29bb0', '#ec8ea6', '#f7a9bb', '#e8859d', '#f4b3c2'];

const grassTop: Painter = (dot, rand, size) => {
  fill(dot, rand, size, PINK);
  for (let tuft = 0; tuft < 12; tuft += 1) dot(Math.floor(rand() * size), Math.floor(rand() * size), pick(['#ffc9d4', '#d9778f', '#fa9e86'], rand()));
};

const sculk: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const v = rand();
      dot(x, y, v < 0.06 ? '#9ff5e4' : v < 0.18 ? '#3fb8a2' : pick(['#1f7f73', '#23897b', '#1b7368', '#279384'], rand()));
    }
  }
};

// the pink grass hangs a ragged fringe over the sculk underneath
const grassSide: Painter = (dot, rand, size) => {
  sculk(dot, rand, size);
  for (let x = 0; x < size; x += 1) {
    const depth = 3 + Math.floor(rand() * 3);
    for (let y = 0; y < depth; y += 1) dot(x, y, pick(PINK, rand()));
  }
};

// Lullaby Hills: deep teal-green grass with pink and pale specks of flowers
const MINT = ['#2f9e8a', '#34a893', '#2a9180', '#3bb39c'];

const hillTop: Painter = (dot, rand, size) => {
  fill(dot, rand, size, MINT);
  for (let speck = 0; speck < 10; speck += 1) dot(Math.floor(rand() * size), Math.floor(rand() * size), pick(['#9ff5e4', '#ffc9d4', '#e6fff8'], rand()));
};

const hillSide: Painter = (dot, rand, size) => {
  sculk(dot, rand, size);
  for (let x = 0; x < size; x += 1) {
    const depth = 3 + Math.floor(rand() * 3);
    for (let y = 0; y < depth; y += 1) dot(x, y, pick(MINT, rand()));
  }
};

const sand: Painter = (dot, rand, size) => {
  fill(dot, rand, size, ['#e6ddd0', '#ddd3c4', '#ece4d8', '#d5cab9']);
  for (let grain = 0; grain < 10; grain += 1) dot(Math.floor(rand() * size), Math.floor(rand() * size), pick(['#c7b9a5', '#f5efe6'], rand()));
};

const logSide: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const groove = x % 4 === 1 && rand() < 0.8;
      dot(x, y, groove ? '#6d6f73' : pick(['#9a9ca0', '#8f9195', '#a3a5a9', '#86888c'], rand()));
    }
  }
};

const logTop: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const ring = Math.floor(Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)));
      dot(x, y, ring === 7 ? '#8f9195' : ring % 2 ? pick(['#f1eee6', '#e9e5dc'], rand()) : '#d7d2c6');
    }
  }
};

const leaves: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) dot(x, y, rand() < 0.14 ? CLEAR : pick(['#f4f6ee', '#e3ebe2', '#d6e3dc', '#fdfdf8', '#c9dbd3'], rand()));
  }
};

const boneSide: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const grain = x % 5 === 2 && rand() < 0.7;
      dot(x, y, grain ? '#cfc6ad' : pick(['#ebe4cf', '#e4dcc4', '#f1ebd9'], rand()));
    }
  }
};

const boneTop: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      dot(x, y, d < 2.5 ? '#bfb498' : d < 4 ? '#d8cfb6' : pick(['#ebe4cf', '#e4dcc4'], rand()));
    }
  }
};

// soul-blue, like the fire it sets
const ichor: Painter = (dot, rand, size) => {
  const tau = Math.PI * 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const n = Math.sin(tau * (x / size) * 2 - tau * (y / size)) + Math.sin(tau * (y / size) * 2 + tau * (x / size)) + rand() * 0.9;
      dot(x, y, n > 1.5 ? '#d6fbff' : n > 0.8 ? '#7ee8f7' : n > 0.1 ? '#35c4e0' : n > -0.7 ? '#1d97c0' : '#136f99');
    }
  }
};

// the note blocks at the ancient city's frame: dark wood with a speaker grille
const noteBlock: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const border = x < 2 || y < 2 || x > 13 || y > 13;
      const hole = !border && x > 3 && y > 3 && x < 12 && y < 12 && x % 2 === 0 && y % 2 === 0;
      dot(x, y, border ? pick(['#3a2413', '#40291a'], rand()) : hole ? '#150c05' : pick(['#6b4428', '#613d23', '#744b2c'], rand()));
    }
  }
};

function buildSiftKit() {
  const tex = {
    grassTop: paint(120, grassTop),
    grassSide: paint(121, grassSide),
    sculk: paint(122, sculk),
    sand: paint(123, sand),
    logSide: paint(124, logSide),
    logTop: paint(125, logTop),
    leaves: paint(126, leaves),
    boneSide: paint(127, boneSide),
    boneTop: paint(128, boneTop),
    ichor: paint(129, ichor),
    noteBlock: paint(130, noteBlock),
    hillTop: paint(131, hillTop),
    hillSide: paint(132, hillSide),
  };
  const lambert = (map: THREE.Texture) => new THREE.MeshLambertMaterial({ map });
  const sculkMat = new THREE.MeshLambertMaterial({ map: tex.sculk, emissive: '#031a16' });
  const grassSideMat = lambert(tex.grassSide);
  const hillSideMat = lambert(tex.hillSide);
  const logSideMat = lambert(tex.logSide);
  const logTopMat = lambert(tex.logTop);
  const boneSideMat = lambert(tex.boneSide);
  const boneTopMat = lambert(tex.boneTop);
  // box face order is +x, -x, +y, -y, +z, -z
  const mat = {
    siftGrass: [grassSideMat, grassSideMat, lambert(tex.grassTop), sculkMat, grassSideMat, grassSideMat],
    siftSculk: sculkMat,
    hillGrass: [hillSideMat, hillSideMat, lambert(tex.hillTop), sculkMat, hillSideMat, hillSideMat],
    siftSand: lambert(tex.sand),
    paleLog: [logSideMat, logSideMat, logTopMat, logTopMat, logSideMat, logSideMat],
    paleLeaves: sway(new THREE.MeshLambertMaterial({ map: tex.leaves, alphaTest: 0.5 }), 'leaves'),
    boneBlock: [boneSideMat, boneSideMat, boneTopMat, boneTopMat, boneSideMat, boneSideMat],
    ichor: new THREE.MeshBasicMaterial({ map: tex.ichor }),
    noteBlock: lambert(tex.noteBlock),
  };
  return { tex, mat };
}

let cached: ReturnType<typeof buildSiftKit> | null = null;

export function siftKit() {
  cached ??= buildSiftKit();
  return cached;
}
