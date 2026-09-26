'use client';

import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';

// Procedural 16x16 block textures. Painting them at runtime keeps the easter egg free of
// Mojang art while still reading as the real blocks: same palette, same pixel grid.

export const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

export function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(x: number, y: number, z = 0) {
  const value = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function pick(colors: readonly string[], value: number) {
  return colors[Math.min(colors.length - 1, Math.floor(value * colors.length))];
}

const CLEAR = 'clear';

type Painter = (dot: (x: number, y: number, color: string) => void, rand: () => number, size: number) => void;

interface TextureOptions {
  readonly size?: number;
  readonly data?: boolean;
  readonly smooth?: boolean;
}

function paint(seed: number, painter: Painter, { size = 16, data = false, smooth = false }: TextureOptions = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  painter(
    (x, y, color) => {
      if (color === CLEAR) {
        ctx.clearRect(x, y, 1, 1);
        return;
      }
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    },
    rng(seed),
    size
  );
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = smooth ? THREE.LinearFilter : THREE.NearestFilter;
  texture.minFilter = data ? THREE.NearestFilter : THREE.NearestMipmapLinearFilter;
  texture.generateMipmaps = !data;
  if (!data) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function fill(dot: Parameters<Painter>[0], rand: () => number, size: number, colors: readonly string[]) {
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) dot(x, y, pick(colors, rand()));
}

function line(dot: Parameters<Painter>[0], x0: number, y0: number, x1: number, y1: number, color: string) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i += 1) {
    dot(Math.round(x0 + ((x1 - x0) * i) / steps), Math.round(y0 + ((y1 - y0) * i) / steps), color);
  }
}

const endStone: Painter = (dot, rand, size) => {
  fill(dot, rand, size, ['#dcd9a3', '#d8d59d', '#e0dda8', '#d4d197', '#dedba6']);
  for (let pit = 0; pit < 7; pit += 1) {
    const x = Math.floor(rand() * 15);
    const y = Math.floor(rand() * 15);
    dot(x, y, '#b9b57c');
    dot(x + 1, y, rand() < 0.5 ? '#c4c087' : '#b9b57c');
    dot(x, y + 1, '#c4c087');
    if (x > 0 && y > 0) dot(x - 1, y - 1, '#eeebc3');
  }
};

const obsidian: Painter = (dot, rand, size) => {
  fill(dot, rand, size, ['#140f1d', '#191223', '#100c17', '#1d1528']);
  for (let streak = 0; streak < 7; streak += 1) {
    const x = Math.floor(rand() * 14);
    const y = Math.floor(rand() * 14);
    const length = 2 + Math.floor(rand() * 3);
    line(dot, x, y, x + length, y + (rand() < 0.5 ? 1 : 0), '#34254a');
    dot(x, y, '#5a4485');
  }
};

const bedrock: Painter = (dot, rand, size) => fill(dot, rand, size, ['#575757', '#3c3c3c', '#2b2b2b', '#6f6f6f', '#4a4a4a', '#1f1f1f']);

const stoneBricks: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const seam = y < 8 ? 15 : 7;
      const mortar = y === 7 || y === 15 || x === seam;
      let color = pick(['#838383', '#7b7b7b', '#8a8a8a', '#777777'], rand());
      if (mortar) color = rand() < 0.5 ? '#5a5a5a' : '#545454';
      else if (y === 0 || y === 8 || x === (seam + 1) % 16) color = '#9b9b9b';
      else if (y === 6 || y === 14 || x === seam - 1) color = '#6a6a6a';
      dot(x, y, color);
    }
  }
};

const mossyBricks: Painter = (dot, rand, size) => {
  stoneBricks(dot, rand, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (rand() < (y < 9 ? 0.34 : 0.1)) dot(x, y, pick(['#5b7a36', '#4d6b2d', '#6a8a3f'], rand()));
    }
  }
};

const crackedBricks: Painter = (dot, rand, size) => {
  stoneBricks(dot, rand, size);
  for (let crack = 0; crack < 2; crack += 1) {
    let x = 2 + Math.floor(rand() * 12);
    for (let y = crack * 8; y < crack * 8 + 7; y += 1) {
      dot(x, y, '#474747');
      x = Math.max(0, Math.min(15, x + Math.round(rand() * 2 - 1)));
    }
  }
};

const frameTop: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const edge = x === 0 || y === 0 || x === 15 || y === 15;
      const socket = x >= 4 && x <= 11 && y >= 4 && y <= 11;
      const socketEdge = socket && (x === 4 || x === 11 || y === 4 || y === 11);
      let color = pick(['#3f7a63', '#397058', '#44826a', '#346652'], rand());
      if (edge) color = '#27463b';
      else if (socketEdge) color = '#2a4f42';
      else if (socket) color = pick(['#10251f', '#132b24'], rand());
      else if ((x + y) % 4 === 0) color = '#58997d';
      dot(x, y, color);
    }
  }
};

const frameSide: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (y === 0 || y === 4) dot(x, y, '#27463b');
      else if (y < 4) dot(x, y, pick(['#3f7a63', '#346652', '#44826a'], rand()));
      else dot(x, y, pick(['#c9c58d', '#c1bd84', '#cfcb93', '#b6b27a'], rand()));
    }
  }
};

const eye: Painter = (dot, _rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = Math.abs(x - 7.5);
      const dy = Math.abs(y - 7.5);
      const d = Math.hypot(dx, dy);
      let color = '#1d5a3a';
      if (dx < 1.6 && dy < 3.2) color = '#06140e';
      else if (d < 4.2) color = x + y < 14 ? '#23885a' : '#1f7a4f';
      else if (d < 6.6) color = x + y < 13 ? '#58cc8a' : '#3fb573';
      dot(x, y, color);
    }
  }
  dot(4, 4, '#c8ffe0');
  dot(5, 4, '#b8f5cf');
  dot(4, 5, '#b8f5cf');
};

const lava: Painter = (dot, rand, size) => {
  const tau = Math.PI * 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const n = Math.sin(tau * (x / size) * 2 + tau * (y / size)) + Math.sin(tau * (y / size) * 2 - tau * (x / size)) + rand() * 0.9;
      const color = n > 1.5 ? '#ffd45e' : n > 0.8 ? '#ffab30' : n > 0.1 ? '#f0801d' : n > -0.7 ? '#d9621a' : '#b8430f';
      dot(x, y, color);
    }
  }
};

const spawner: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const bar = x % 5 === 0 || y % 5 === 0 || x === 15 || y === 15;
      if (!bar) continue;
      dot(x, y, x % 5 === 0 && y % 5 === 0 ? '#4c5360' : pick(['#2a2e35', '#343941'], rand()));
    }
  }
};

const glass: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const edge = x === 0 || y === 0 || x === 15 || y === 15;
      const inner = x === 1 || y === 1 || x === 14 || y === 14;
      let color = 'rgba(200,160,255,0.06)';
      if (edge) color = 'rgba(255,240,255,0.95)';
      else if (inner) color = 'rgba(230,190,255,0.35)';
      else if (rand() < 0.07) color = 'rgba(255,255,255,0.35)';
      dot(x, y, color);
    }
  }
};

const crystalCore: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const band = (x ^ y) & 4;
      dot(x, y, band ? pick(['#b14ee6', '#8f2fc4'], rand()) : pick(['#e9a6ff', '#d170ff'], rand()));
    }
  }
};

const scales: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const v = rand();
      dot(x, y, v < 0.04 ? '#303030' : v < 0.16 ? '#232323' : pick(['#141414', '#101010', '#181818'], rand()));
    }
  }
};

const bone: Painter = (dot, rand, size) => fill(dot, rand, size, ['#6f6f6f', '#777777', '#666666', '#808080', '#5e5e5e']);

// one texture spans a whole wing panel: two ribs fanning from the shoulder and a sawtooth
// trailing edge cut out with alphaTest
const membrane: Painter = (dot, rand, size) => {
  fill(dot, rand, size, ['#0d0d0d', '#121212', '#0f0f0f']);
  line(dot, 1, size - 1, size - 6, 3, '#5c5c5c');
  line(dot, 2, size - 1, size - 5, 3, '#3e3e3e');
  line(dot, size / 2, size - 1, size - 1, size / 2 - 4, '#5c5c5c');
  for (let x = 0; x < size; x += 1) {
    const tooth = x % 4;
    for (let y = 0; y < 3; y += 1) if (tooth < 3 - y) dot(x, y, CLEAR);
  }
};

const enderman: Painter = (dot, rand, size) => fill(dot, rand, size, ['#050505', '#0b0b0b', '#111111', '#0b0b0b', '#1a1a1a']);

const egg: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const v = rand();
      dot(x, y, v < 0.03 ? '#5b2f86' : v < 0.1 ? '#40205f' : v < 0.22 ? '#2d1846' : pick(['#0c0a10', '#0f0c15'], rand()));
    }
  }
};

const purpur: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let color = pick(['#a97ea9', '#b085b0', '#a37aa3'], rand());
      if (x % 8 === 0 || y % 8 === 0) color = '#8c618c';
      else if (x % 8 === 7 || y % 8 === 7) color = '#bb97bb';
      dot(x, y, color);
    }
  }
};

const chorus: Painter = (dot, rand, size) => fill(dot, rand, size, ['#7e4f8f', '#6a3f7a', '#8d5d9f', '#5a3368']);
const chorusFlower: Painter = (dot, rand, size) => fill(dot, rand, size, ['#d8b2e4', '#c9a0d6', '#e7ccee', '#b98bc9']);

const specks: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) dot(x, y, '#000');
  for (let speck = 0; speck < 70; speck += 1) {
    const x = Math.floor(rand() * size);
    const y = Math.floor(rand() * size);
    const level = Math.round(150 + rand() * 105);
    const color = `rgb(${level},${level},${level})`;
    dot(x, y, color);
    if (rand() < 0.3) {
      dot((x + 1) % size, y, color);
      dot(x, (y + 1) % size, color);
      dot((x + 1) % size, (y + 1) % size, color);
    }
  }
};

const skyNoise: Painter = (dot, rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const level = Math.round(40 + rand() * 80);
      dot(x, y, `rgb(${level},${level},${level})`);
    }
  }
};

const orb: Painter = (dot, _rand, size) => {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d > 5.5) continue;
      dot(x, y, d > 4.4 ? '#4f7a00' : d > 2.6 ? '#b8ec2c' : '#fff59a');
    }
  }
};

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildKit() {
  const tex = {
    endStone: paint(1, endStone),
    obsidian: paint(2, obsidian),
    bedrock: paint(3, bedrock),
    bricks: paint(4, stoneBricks),
    mossy: paint(5, mossyBricks),
    cracked: paint(6, crackedBricks),
    frameTop: paint(7, frameTop),
    frameSide: paint(8, frameSide),
    eye: paint(9, eye),
    lava: paint(10, lava),
    spawner: paint(11, spawner),
    glass: paint(12, glass),
    crystalCore: paint(13, crystalCore),
    scales: paint(14, scales),
    bone: paint(15, bone),
    membrane: paint(16, membrane, { size: 32 }),
    enderman: paint(17, enderman),
    egg: paint(18, egg),
    purpur: paint(19, purpur),
    chorus: paint(20, chorus),
    chorusFlower: paint(21, chorusFlower),
    specks: paint(22, specks, { size: 64, data: true }),
    skyNoise: paint(23, skyNoise, { size: 32, data: true }),
    orb: paint(24, orb),
    glow: glowTexture(),
  };
  const lambert = (map: THREE.Texture) => new THREE.MeshLambertMaterial({ map });
  const frameSideMat = lambert(tex.frameSide);
  const eyeSideMat = new THREE.MeshLambertMaterial({ color: '#1d5a3a' });
  const mat = {
    endStone: lambert(tex.endStone),
    obsidian: lambert(tex.obsidian),
    bedrock: lambert(tex.bedrock),
    bricks: lambert(tex.bricks),
    mossy: lambert(tex.mossy),
    cracked: lambert(tex.cracked),
    purpur: lambert(tex.purpur),
    chorus: lambert(tex.chorus),
    chorusFlower: lambert(tex.chorusFlower),
    lava: new THREE.MeshBasicMaterial({ map: tex.lava }),
    spawner: new THREE.MeshLambertMaterial({ map: tex.spawner, alphaTest: 0.5, side: THREE.DoubleSide }),
    iron: new THREE.MeshLambertMaterial({ color: '#8a8d93' }),
    torch: new THREE.MeshLambertMaterial({ color: '#6b4a2b' }),
    flame: new THREE.MeshBasicMaterial({ color: '#ffe08a' }),
    endRod: new THREE.MeshBasicMaterial({ color: '#fff6ee' }),
    silverfish: new THREE.MeshLambertMaterial({ color: '#7d8286' }),
    // box face order is +x, -x, +y, -y, +z, -z
    glass: new THREE.MeshBasicMaterial({ map: tex.glass, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    crystalCore: new THREE.MeshBasicMaterial({ map: tex.crystalCore }),
    crystalGlow: new THREE.SpriteMaterial({ map: tex.glow, color: '#e879f9', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    egg: new THREE.MeshLambertMaterial({ map: tex.egg, emissive: '#0d0616' }),
    enderman: new THREE.MeshLambertMaterial({ map: tex.enderman }),
    endermanEye: new THREE.MeshBasicMaterial({ color: '#e079fa' }),
    // raycast target that draws nothing: bigger than the model so moving things stay clickable
    hitbox: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    frame: [frameSideMat, frameSideMat, lambert(tex.frameTop), lambert(tex.endStone), frameSideMat, frameSideMat],
    eye: [eyeSideMat, eyeSideMat, new THREE.MeshBasicMaterial({ map: tex.eye }), eyeSideMat, eyeSideMat, eyeSideMat],
  };
  return { tex, mat };
}

let cached: ReturnType<typeof buildKit> | null = null;

export function kit() {
  cached ??= buildKit();
  return cached;
}

const boxes = new Map<string, THREE.BoxGeometry>();

// A box whose UVs repeat once per block unit, so a long dragon tail keeps the same
// texel size as a single block instead of stretching one texture across its length.
export function sizedBox(w: number, h: number, d: number) {
  const key = `${w}:${h}:${d}`;
  let geometry = boxes.get(key);
  if (!geometry) {
    geometry = new THREE.BoxGeometry(w, h, d);
    const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
    const faces = [
      [d, h],
      [d, h],
      [w, d],
      [w, d],
      [w, h],
      [w, h],
    ];
    faces.forEach(([fw, fh], face) => {
      for (let i = face * 4; i < face * 4 + 4; i += 1) uv.setXY(i, uv.getX(i) * fw, uv.getY(i) * fh);
    });
    boxes.set(key, geometry);
  }
  return geometry;
}

export interface Block {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly tint?: number;
  readonly scale?: readonly [number, number, number];
}

export function VoxelMesh({ blocks, material }: { readonly blocks: readonly Block[]; readonly material: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const color = new THREE.Color();
    blocks.forEach((block, index) => {
      position.set(block.x, block.y, block.z);
      scale.set(...(block.scale ?? ([1, 1, 1] as const)));
      mesh.setMatrixAt(index, matrix.compose(position, rotation, scale));
      const tint = block.tint ?? 1;
      mesh.setColorAt(index, color.setRGB(tint, tint, tint));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [blocks]);

  return <instancedMesh ref={ref} args={[UNIT_BOX, material, blocks.length]} />;
}

export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const easeIn = (t: number) => t * t * t;
export const easeOut = (t: number) => 1 - (1 - t) ** 3;
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
