import * as THREE from 'three';
import { CLEAR, fill, line, paint, pick, type Painter } from './voxels';

// Overworld blocks for the prologue, painted at runtime like the End kit in voxels.tsx.
// Kept apart so the End scenes never pay for textures they do not use.

const DIRT = ['#866043', '#79553a', '#96704f', '#6c4b31', '#8b6a4b'];
const GRASS = ['#5f9f35', '#6aab3d', '#578f30', '#72b544', '#4f8a2c'];
const PLANKS = ['#b8945f', '#af8b57', '#c09d66', '#a8844f'];
const CHEST_WOOD = ['#a0692c', '#955f27', '#ad7432', '#8a5a26'];

const dirt: Painter = (dot, rand, size) => {
  fill(dot, rand, size, DIRT);
  for (let pebble = 0; pebble < 9; pebble += 1) dot(Math.floor(rand() * size), Math.floor(rand() * size), rand() < 0.5 ? '#5a3f2a' : '#a58466');
};

const grassTop: Painter = (dot, rand, size) => fill(dot, rand, size, GRASS);

// dirt with a ragged green fringe hanging from the top edge
const grassSide: Painter = (dot, rand, size) => {
  dirt(dot, rand, size);
  for (let x = 0; x < size; x += 1) {
    const drip = 3 + Math.floor(rand() * 3) - (rand() < 0.3 ? 1 : 0);
    for (let y = 0; y < drip; y += 1) dot(x, y, pick(GRASS, rand()));
  }
};

const logSide: Painter = (dot, rand, size) => {
  for (let x = 0; x < size; x += 1) {
    const groove = x % 4 === 1 || (x * 7) % 11 === 3;
    for (let y = 0; y < size; y += 1) dot(x, y, groove ? pick(['#4e3a24', '#553f27'], rand()) : pick(['#6b5033', '#745637', '#5d452b'], rand()));
  }
};

const logTop: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const ring = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      let color = ring > 6.5 ? pick(['#6b5033', '#5d452b'], rand()) : Math.floor(ring) % 2 ? '#a3814f' : '#b8945f';
      if (ring < 1) color = '#9a7747';
      dot(x, y, color);
    }
  }
};

const leaves: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) dot(x, y, rand() < 0.16 ? CLEAR : pick(['#3f7a26', '#4a8a2e', '#356b20', '#5a9a38', '#2f5f1c'], rand()));
  }
};

// four boards, each with its own end joint, like oak planks
const planks: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    const board = Math.floor(y / 4);
    const joint = (board * 5 + 3) % size;
    for (let x = 0; x < size; x += 1) {
      let color = pick(PLANKS, rand());
      if (y % 4 === 3) color = '#7e603a';
      else if (x === joint) color = '#8c6a40';
      dot(x, y, color);
    }
  }
};

const tableTop: Painter = (dot, rand, size) => {
  planks(dot, rand, size);
  for (let i = 0; i < size; i += 1) {
    dot(i, 0, '#4f3a22');
    dot(i, size - 1, '#4f3a22');
    dot(0, i, '#4f3a22');
    dot(size - 1, i, '#4f3a22');
    if (i < 2 || i > size - 3) continue;
    [5, 10].forEach((k) => {
      dot(k, i, '#6b5033');
      dot(i, k, '#6b5033');
    });
  }
};

const tableBand = (dot: Parameters<Painter>[0], rand: () => number, size: number) => {
  planks(dot, rand, size);
  for (let x = 0; x < size; x += 1) for (let y = 0; y < 3; y += 1) dot(x, y, pick(['#5d452b', '#6b5033'], rand()));
};

// the side shows a saw hanging on the wood
const tableSide: Painter = (dot, rand, size) => {
  tableBand(dot, rand, size);
  for (let x = 3; x <= 10; x += 1) {
    for (let y = 6; y <= 8; y += 1) dot(x, y, y === 6 ? '#c9c9c9' : '#9a9a9a');
    if (x % 2) dot(x, 9, '#7a7a7a');
  }
  for (let y = 5; y <= 9; y += 1) for (let x = 11; x <= 12; x += 1) dot(x, y, '#5d3d1e');
};

// the front shows a hammer and a pair of shears
const tableFront: Painter = (dot, rand, size) => {
  tableBand(dot, rand, size);
  line(dot, 4, 13, 4, 6, '#5d3d1e');
  for (let x = 2; x <= 6; x += 1) for (let y = 5; y <= 6; y += 1) dot(x, y, '#8f8f8f');
  line(dot, 9, 12, 12, 6, '#b5b5b5');
  line(dot, 12, 12, 9, 6, '#9a9a9a');
  dot(10, 12, '#7a2e2e');
  dot(11, 12, '#7a2e2e');
};

const chestWood = (dot: Parameters<Painter>[0], rand: () => number, size: number) => {
  fill(dot, rand, size, CHEST_WOOD);
  for (let i = 0; i < size; i += 1) {
    dot(i, 0, '#3a2410');
    dot(i, size - 1, '#3a2410');
    dot(0, i, '#3a2410');
    dot(size - 1, i, '#3a2410');
  }
};

const latch = (dot: Parameters<Painter>[0], from: number, to: number, [light, body]: readonly [string, string] = ['#e0e0e0', '#9a9a9a']) => {
  for (let y = from; y <= to; y += 1) for (let x = 7; x <= 8; x += 1) dot(x, y, y === from ? light : body);
};

// the game's Christmas chest: wrapped in red with a green ribbon and a gold latch
const GIFT = ['#b3262a', '#a32226', '#c02d30'];
const GOLD = ['#f6e27a', '#d9a520'] as const;

const gift: Painter = (dot, rand, size) => {
  fill(dot, rand, size, GIFT);
  for (let i = 0; i < size; i += 1) {
    dot(i, 0, '#5a1012');
    dot(i, size - 1, '#5a1012');
    dot(0, i, '#5a1012');
    dot(size - 1, i, '#5a1012');
  }
  for (let y = 1; y < size - 1; y += 1) for (let x = 6; x <= 9; x += 1) dot(x, y, x === 6 || x === 9 ? '#2a6b2c' : '#3c8f3f');
};

const giftFront: Painter = (dot, rand, size) => {
  gift(dot, rand, size);
  latch(dot, 0, 3, GOLD);
};

const giftLidFront: Painter = (dot, rand, size) => {
  gift(dot, rand, size);
  latch(dot, 10, 15, GOLD);
};

const chestSide: Painter = (dot, rand, size) => chestWood(dot, rand, size);

const chestFront: Painter = (dot, rand, size) => {
  chestWood(dot, rand, size);
  latch(dot, 0, 3);
};

const lidFront: Painter = (dot, rand, size) => {
  chestWood(dot, rand, size);
  latch(dot, 10, 15);
};

const bookshelf: Painter = (dot, rand, size) => {
  planks(dot, rand, size);
  const spines = ['#7a2e2e', '#2e4f7a', '#3f6b2e', '#7a6a2e', '#5a2e7a', '#8a8a8a', '#a0522d'];
  [
    [1, 6],
    [9, 14],
  ].forEach(([top, bottom]) => {
    for (let x = 1; x < size - 1; x += 1) {
      const color = pick(spines, rand());
      const height = Math.floor(rand() * 2);
      for (let y = top + height; y <= bottom; y += 1) dot(x, y, x % 3 === 0 ? '#2b1d10' : color);
    }
  });
};

const tallGrass: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) dot(x, y, CLEAR);
  for (let blade = 0; blade < 9; blade += 1) {
    let x = 1 + Math.floor(rand() * (size - 2));
    const height = 6 + Math.floor(rand() * 9);
    for (let y = size - 1; y >= size - height; y -= 1) {
      dot(x, y, pick(GRASS, rand()));
      if (rand() < 0.25) x = Math.max(0, Math.min(size - 1, x + (rand() < 0.5 ? -1 : 1)));
    }
  }
};

// the biomes around the story: desert, snowy taiga and the beach
const SAND = ['#dbd3a0', '#d6cf98', '#e0d8a8', '#cfc690', '#d9d19c'];
const SNOW = ['#f4fafc', '#eef6fa', '#ffffff', '#e6f0f5'];
const SPRUCE = ['#2e5a2e', '#355f35', '#284f28', '#3a6a3a', '#24472a'];
const CACTUS = ['#5d8a2a', '#548024', '#669530'];

const sand: Painter = (dot, rand, size) => {
  fill(dot, rand, size, SAND);
  for (let grain = 0; grain < 10; grain += 1) dot(Math.floor(rand() * size), Math.floor(rand() * size), rand() < 0.5 ? '#bfb57e' : '#ece6c0');
};

// the game's sandstone: a pale top, and sides banded top and bottom
const sandstoneTop: Painter = (dot, rand, size) => fill(dot, rand, size, ['#e0d8a8', '#dcd4a2', '#e4dcae']);

const sandstoneSide: Painter = (dot, rand, size) => {
  fill(dot, rand, size, ['#d8cf98', '#d2c990', '#dcd39e']);
  for (let x = 0; x < size; x += 1) {
    for (let y = 0; y < 3; y += 1) dot(x, y, y === 2 ? '#c2b77e' : pick(['#e0d8a8', '#e4dcae'], rand()));
    for (let y = size - 3; y < size; y += 1) dot(x, y, y === size - 3 ? '#c2b77e' : pick(['#cabf86', '#c6bb82'], rand()));
    if (x % 5 === 2) dot(x, 7, '#c8bd84');
  }
};

const snow: Painter = (dot, rand, size) => fill(dot, rand, size, SNOW);

// dirt with snow over the top edge, like snowy grass
const snowySide: Painter = (dot, rand, size) => {
  dirt(dot, rand, size);
  for (let x = 0; x < size; x += 1) {
    const drip = 3 + Math.floor(rand() * 2);
    for (let y = 0; y < drip; y += 1) dot(x, y, pick(SNOW, rand()));
  }
};

const ice: Painter = (dot, rand, size) => {
  fill(dot, rand, size, ['rgba(150,190,255,0.8)', 'rgba(140,182,250,0.8)', 'rgba(160,198,255,0.8)']);
  line(dot, 2, 12, 6, 8, 'rgba(235,245,255,0.9)');
  line(dot, 9, 5, 12, 2, 'rgba(235,245,255,0.9)');
};

const spruceSide: Painter = (dot, rand, size) => {
  for (let x = 0; x < size; x += 1) {
    const groove = x % 3 === 1;
    for (let y = 0; y < size; y += 1) dot(x, y, groove ? pick(['#2a1d10', '#2f2213'], rand()) : pick(['#3b2a19', '#45321e', '#3f2d1a'], rand()));
  }
};

const spruceTop: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const ring = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      dot(x, y, ring > 6.5 ? pick(['#3b2a19', '#45321e'], rand()) : Math.floor(ring) % 2 ? '#6b4f31' : '#7d5e3b');
    }
  }
};

const spruceLeaves: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) dot(x, y, rand() < 0.12 ? CLEAR : pick(SPRUCE, rand()));
};

// ribbed green with pale spines, a lighter crown on top
const cactusSide: Painter = (dot, rand, size) => {
  fill(dot, rand, size, CACTUS);
  for (let y = 0; y < size; y += 1) {
    [3, 8, 12].forEach((x) => dot(x, y, '#3f6a1a'));
    if (y % 4 === 1) [2, 7, 13].forEach((x) => dot(x, y, '#e2e8b8'));
  }
};

const cactusTop: Painter = (dot, rand, size) => {
  fill(dot, rand, size, CACTUS);
  for (let y = 4; y < 12; y += 1) for (let x = 4; x < 12; x += 1) dot(x, y, pick(['#7aab3c', '#86b545'], rand()));
};

// red wrapping around a white band that says TNT
const tntSide: Painter = (dot, rand, size) => {
  fill(dot, rand, size, ['#c83c2a', '#b8321f', '#d04430']);
  for (let x = 0; x < size; x += 1) for (let y = 5; y <= 10; y += 1) dot(x, y, '#ececec');
  const letters = ['xxx.x..x.xxx', '.x..xx.x..x.', '.x..x.xx..x.', '.x..x..x..x.'];
  letters.forEach((row, y) => [...row].forEach((cell, x) => cell === 'x' && dot(x + 2, y + 6, '#1a1a1a')));
};

const tntTop: Painter = (dot, rand, size) => {
  fill(dot, rand, size, ['#b8321f', '#c83c2a']);
  for (let y = 3; y < 13; y += 1) for (let x = 3; x < 13; x += 1) dot(x, y, pick(['#a8a8a8', '#9a9a9a'], rand()));
  for (let y = 7; y <= 8; y += 1) for (let x = 7; x <= 8; x += 1) dot(x, y, '#3a3a3a');
};

// crossed plants: a poppy, a fern, a dead bush
const flower: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) dot(x, y, CLEAR);
  line(dot, 8, 15, 8, 8, '#3f7a26');
  dot(7, 12, '#4a8a2e');
  dot(9, 11, '#4a8a2e');
  for (let y = 4; y <= 7; y += 1) for (let x = 6; x <= 10; x += 1) if (Math.abs(x - 8) + Math.abs(y - 5.5) < 3.2) dot(x, y, pick(['#d8261c', '#c21d15', '#e03a2c'], rand()));
  dot(8, 5, '#2a1a0c');
};

const fern: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) dot(x, y, CLEAR);
  [3, 8, 12].forEach((root) => {
    for (let y = 15; y >= 4; y -= 1) {
      const x = root + Math.round((15 - y) * (root < 8 ? -0.2 : root > 8 ? 0.2 : 0));
      dot(x, y, pick(['#4f8a2c', '#5f9f35'], rand()));
      if (y % 2 === 0 && y < 13) {
        dot(x - 1, y, '#578f30');
        dot(x + 1, y, '#578f30');
      }
    }
  });
};

const deadBush: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) dot(x, y, CLEAR);
  line(dot, 8, 15, 8, 9, '#6b4a26');
  line(dot, 8, 11, 4, 6, '#7a5530');
  line(dot, 8, 10, 12, 5, '#7a5530');
  line(dot, 6, 8, 6, 4, '#6b4a26');
  line(dot, 10, 7, 11, 3, '#6b4a26');
};

const STONE = ['#7f7f7f', '#767676', '#888888', '#6e6e6e', '#838383'];

const stone: Painter = (dot, rand, size) => {
  fill(dot, rand, size, STONE);
  for (let streak = 0; streak < 6; streak += 1) {
    const x = Math.floor(rand() * 13);
    const y = Math.floor(rand() * 15);
    line(dot, x, y, x + 2 + Math.floor(rand() * 2), y, '#646464');
  }
};

// rounded stones in dark mortar
const cobble: Painter = (dot, rand, size) => {
  fill(dot, rand, size, ['#4a4a4a', '#525252']);
  for (let rock = 0; rock < 14; rock += 1) {
    const cx = Math.floor(rand() * size);
    const cy = Math.floor(rand() * size);
    const r = 1.5 + rand() * 2;
    const shade = pick(['#8a8a8a', '#7a7a7a', '#999999', '#6d6d6d'], rand());
    for (let y = Math.floor(cy - r); y <= cy + r; y += 1) {
      for (let x = Math.floor(cx - r); x <= cx + r; x += 1) {
        if (Math.hypot(x - cx, y - cy) > r) continue;
        dot((x + size) % size, (y + size) % size, Math.hypot(x - cx + 0.7, y - cy + 0.7) < r * 0.5 ? '#a8a8a8' : shade);
      }
    }
  }
};

const pathTop: Painter = (dot, rand, size) => fill(dot, rand, size, ['#9b7d4a', '#a88a55', '#927447', '#b0925c']);

const glass: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const edge = x === 0 || y === 0 || x === size - 1 || y === size - 1;
      const glint = (x === 3 && y > 2 && y < 7) || (x === 4 && y > 3 && y < 6);
      dot(x, y, edge ? 'rgba(220,238,245,0.95)' : glint ? 'rgba(255,255,255,0.8)' : rand() < 0.03 ? 'rgba(255,255,255,0.3)' : 'rgba(200,230,240,0.08)');
    }
  }
};

const hayTop: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const ring = Math.floor(Math.hypot(x - 7.5, y - 7.5));
      dot(x, y, ring % 2 ? pick(['#c9a52a', '#b8951f'], rand()) : pick(['#e3c04a', '#d6b43b'], rand()));
    }
  }
};

const haySide: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const band = y === 3 || y === 12;
      dot(x, y, band ? pick(['#8b2a1a', '#7a2416'], rand()) : x % 3 === 0 ? '#b8951f' : pick(['#e3c04a', '#d6b43b', '#cfae35'], rand()));
    }
  }
};

const water: Painter = (dot, rand, size) => fill(dot, rand, size, ['rgba(52,92,200,0.72)', 'rgba(60,104,214,0.72)', 'rgba(44,80,184,0.72)']);

const crying: Painter = (dot, rand, size) => {
  fill(dot, rand, size, ['#140f1d', '#191223', '#100c17', '#1d1528']);
  for (let tear = 0; tear < 9; tear += 1) {
    const x = Math.floor(rand() * size);
    const y = Math.floor(rand() * 14);
    dot(x, y, '#b24dff');
    dot(x, y + 1, rand() < 0.5 ? '#7a2fd0' : '#5a1f9e');
  }
};

const goldBlock: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const edge = x === 0 || y === 0 || x === size - 1 || y === size - 1;
      const lit = x === 1 || y === 1;
      dot(x, y, edge ? '#b8860b' : lit ? '#fff4a3' : pick(['#f5d33a', '#fcdb4b', '#e9c62b'], rand()));
    }
  }
};

const DEEP = ['#3a3a40', '#34343a', '#404046', '#2f2f35'];

const deepslate: Painter = (dot, rand, size) => {
  for (let x = 0; x < size; x += 1) {
    for (let y = 0; y < size; y += 1) dot(x, y, (x + Math.floor(rand() * 2)) % 4 === 0 ? '#28282d' : pick(DEEP, rand()));
  }
};

const deepBricks: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const seam = (y < 8 ? x + 4 : x) % 8 === 0;
      dot(x, y, y % 4 === 3 || seam ? '#1d1d22' : pick(DEEP, rand()));
    }
  }
};

// reinforced deepslate: a dark casing around a faint cyan core, like the ancient frame
const reinforcedSide: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const casing = x < 2 || x > 13 || y < 2 || y > 13;
      const core = x > 5 && x < 10 && y > 5 && y < 10;
      dot(x, y, casing ? pick(['#2a2c33', '#23252b'], rand()) : core ? pick(['#1f5c63', '#194a50'], rand()) : pick(['#44464f', '#3b3d45'], rand()));
    }
  }
};

const reinforcedTop: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const ring = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      dot(x, y, ring > 6 ? '#23252b' : ring > 4 ? pick(['#44464f', '#3b3d45'], rand()) : ring > 2 ? '#2a2c33' : '#1f5c63');
    }
  }
};

const sculk: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const v = rand();
      dot(x, y, v < 0.05 ? '#29dfeb' : v < 0.14 ? '#0f5c6b' : pick(['#0b1f28', '#0d2530', '#081820'], rand()));
    }
  }
};

// every stage redraws the same crack walk further along, so stages grow instead of reshuffling
const crack =
  (stage: number): Painter =>
  (dot, rand, size) => {
    for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) dot(x, y, CLEAR);
    const steps = 6 + stage * 9;
    const walkers = [
      [7, 7],
      [8, 8],
      [7, 8],
    ].map(([x, y]) => ({ x, y }));
    for (let step = 0; step < steps; step += 1) {
      const walker = walkers[step % walkers.length];
      walker.x = Math.max(0, Math.min(size - 1, walker.x + Math.round(rand() * 2 - 1)));
      walker.y = Math.max(0, Math.min(size - 1, walker.y + Math.round(rand() * 2 - 1)));
      dot(walker.x, walker.y, 'rgba(0,0,0,0.7)');
    }
  };

export const CRACK_STAGES = 10;

function buildOverworldKit() {
  const tex = {
    dirt: paint(40, dirt),
    grassTop: paint(41, grassTop),
    grassSide: paint(42, grassSide),
    logSide: paint(43, logSide),
    logTop: paint(44, logTop),
    leaves: paint(45, leaves),
    planks: paint(46, planks),
    tableTop: paint(47, tableTop),
    tableSide: paint(48, tableSide),
    tableFront: paint(49, tableFront),
    chestSide: paint(50, chestSide),
    chestFront: paint(51, chestFront),
    lidFront: paint(52, lidFront),
    gift: paint(55, gift),
    giftFront: paint(56, giftFront),
    giftLidFront: paint(57, giftLidFront),
    bookshelf: paint(53, bookshelf),
    tallGrass: paint(54, tallGrass),
    cracks: Array.from({ length: CRACK_STAGES }, (_, stage) => paint(60, crack(stage))),
    stone: paint(70, stone),
    cobble: paint(71, cobble),
    pathTop: paint(72, pathTop),
    glass: paint(73, glass),
    hayTop: paint(74, hayTop),
    haySide: paint(75, haySide),
    water: paint(76, water),
    crying: paint(77, crying),
    goldBlock: paint(78, goldBlock),
    deepslate: paint(79, deepslate),
    deepBricks: paint(80, deepBricks),
    reinforcedSide: paint(81, reinforcedSide),
    reinforcedTop: paint(82, reinforcedTop),
    sculk: paint(83, sculk),
    sand: paint(90, sand),
    sandstoneTop: paint(91, sandstoneTop),
    sandstoneSide: paint(92, sandstoneSide),
    snow: paint(93, snow),
    snowySide: paint(94, snowySide),
    ice: paint(95, ice),
    spruceSide: paint(96, spruceSide),
    spruceTop: paint(97, spruceTop),
    spruceLeaves: paint(98, spruceLeaves),
    cactusSide: paint(99, cactusSide),
    cactusTop: paint(100, cactusTop),
    tntSide: paint(101, tntSide),
    tntTop: paint(102, tntTop),
    flower: paint(103, flower),
    fern: paint(104, fern),
    deadBush: paint(105, deadBush),
  };
  const lambert = (map: THREE.Texture) => new THREE.MeshLambertMaterial({ map });
  const dirtMat = lambert(tex.dirt);
  const grassSideMat = lambert(tex.grassSide);
  const logSideMat = lambert(tex.logSide);
  const logTopMat = lambert(tex.logTop);
  const planksMat = lambert(tex.planks);
  const tableSideMat = lambert(tex.tableSide);
  const chestSideMat = lambert(tex.chestSide);
  const chestInside = new THREE.MeshLambertMaterial({ color: '#2a1a0c' });
  const giftMat = lambert(tex.gift);
  const shelfMat = lambert(tex.bookshelf);
  const sandstoneSideMat = lambert(tex.sandstoneSide);
  const snowMat = lambert(tex.snow);
  const snowySideMat = lambert(tex.snowySide);
  const spruceSideMat = lambert(tex.spruceSide);
  const spruceTopMat = lambert(tex.spruceTop);
  const cactusSideMat = lambert(tex.cactusSide);
  const tntSideMat = lambert(tex.tntSide);
  // box face order is +x, -x, +y, -y, +z, -z
  const mat = {
    dirt: dirtMat,
    planks: planksMat,
    grass: [grassSideMat, grassSideMat, lambert(tex.grassTop), dirtMat, grassSideMat, grassSideMat],
    log: [logSideMat, logSideMat, logTopMat, logTopMat, logSideMat, logSideMat],
    leaves: new THREE.MeshLambertMaterial({ map: tex.leaves, alphaTest: 0.5 }),
    table: [tableSideMat, tableSideMat, lambert(tex.tableTop), planksMat, lambert(tex.tableFront), tableSideMat],
    chest: [chestSideMat, chestSideMat, chestInside, chestSideMat, lambert(tex.chestFront), chestSideMat],
    lid: [chestSideMat, chestSideMat, chestSideMat, chestInside, lambert(tex.lidFront), chestSideMat],
    giftChest: [giftMat, giftMat, chestInside, giftMat, lambert(tex.giftFront), giftMat],
    giftLid: [giftMat, giftMat, giftMat, chestInside, lambert(tex.giftLidFront), giftMat],
    bookshelf: [shelfMat, shelfMat, planksMat, planksMat, shelfMat, shelfMat],
    tallGrass: new THREE.MeshLambertMaterial({ map: tex.tallGrass, alphaTest: 0.5, side: THREE.DoubleSide }),
    stone: lambert(tex.stone),
    cobble: lambert(tex.cobble),
    path: [dirtMat, dirtMat, lambert(tex.pathTop), dirtMat, dirtMat, dirtMat],
    glass: new THREE.MeshLambertMaterial({ map: tex.glass, transparent: true, depthWrite: false }),
    hay: [lambert(tex.haySide), lambert(tex.haySide), lambert(tex.hayTop), lambert(tex.hayTop), lambert(tex.haySide), lambert(tex.haySide)],
    water: new THREE.MeshLambertMaterial({ map: tex.water, transparent: true, depthWrite: false }),
    crying: new THREE.MeshLambertMaterial({ map: tex.crying, emissive: '#2a0a44' }),
    goldBlock: lambert(tex.goldBlock),
    deepslate: lambert(tex.deepslate),
    deepBricks: lambert(tex.deepBricks),
    reinforced: [
      lambert(tex.reinforcedSide),
      lambert(tex.reinforcedSide),
      lambert(tex.reinforcedTop),
      lambert(tex.reinforcedTop),
      lambert(tex.reinforcedSide),
      lambert(tex.reinforcedSide),
    ],
    sculk: new THREE.MeshLambertMaterial({ map: tex.sculk, emissive: '#021016' }),
    sand: lambert(tex.sand),
    sandstone: [sandstoneSideMat, sandstoneSideMat, lambert(tex.sandstoneTop), lambert(tex.sandstoneTop), sandstoneSideMat, sandstoneSideMat],
    snowyGrass: [snowySideMat, snowySideMat, snowMat, dirtMat, snowySideMat, snowySideMat],
    snow: snowMat,
    ice: new THREE.MeshLambertMaterial({ map: tex.ice, transparent: true, depthWrite: false }),
    spruceLog: [spruceSideMat, spruceSideMat, spruceTopMat, spruceTopMat, spruceSideMat, spruceSideMat],
    spruceLeaves: new THREE.MeshLambertMaterial({ map: tex.spruceLeaves, alphaTest: 0.5 }),
    cactus: [cactusSideMat, cactusSideMat, lambert(tex.cactusTop), lambert(tex.cactusTop), cactusSideMat, cactusSideMat],
    tnt: [tntSideMat, tntSideMat, lambert(tex.tntTop), lambert(tex.tntTop), tntSideMat, tntSideMat],
    flower: new THREE.MeshLambertMaterial({ map: tex.flower, alphaTest: 0.5, side: THREE.DoubleSide }),
    fern: new THREE.MeshLambertMaterial({ map: tex.fern, alphaTest: 0.5, side: THREE.DoubleSide }),
    deadBush: new THREE.MeshLambertMaterial({ map: tex.deadBush, alphaTest: 0.5, side: THREE.DoubleSide }),
    cracks: tex.cracks.map(
      (map) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
    ),
  };
  return { tex, mat };
}

let cached: ReturnType<typeof buildOverworldKit> | null = null;

export function overworldKit() {
  cached ??= buildOverworldKit();
  return cached;
}

// two quads crossed at 45 degrees, the way the game draws grass and flowers
export function crossGeometry() {
  const geometry = new THREE.BufferGeometry();
  const h = Math.SQRT1_2 / 2;
  const positions = [-h, -0.5, -h, h, -0.5, h, h, 0.5, h, -h, 0.5, -h, -h, -0.5, h, h, -0.5, -h, h, 0.5, -h, -h, 0.5, h];
  const uvs = [0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1];
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(Array.from({ length: 8 }, () => [0, 1, 0]).flat(), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
  return geometry;
}
