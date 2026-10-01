'use client';

import { Hud, PerspectiveCamera } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ITEMS, type ItemId } from '../items';
import { SPRITES, type Pixel } from '../PixelIcons';
import { useEndGame, type Zone } from '../store';
import { QUALITY, useQuality } from './quality';
import { runtime } from './runtime';
import { materialFor } from './WorldMesh';

// The first-person hand, drawn over the world in its own pass (so it never clips into a wall)
// with the game's own poses: the bare arm, a held item, the sword swing, the bow draw and eating.

const DEG = Math.PI / 180;
const SWING_S = 0.3;
const WALK = 4.3;
// how lit the hand is in each zone, so it does not glow in the deep dark
const LIGHT: Partial<Record<Zone, number>> = { overworld: 1, nether: 0.9, ancient: 0.5, sift: 1, stronghold: 0.6, end: 0.8, endcity: 0.9 };

// the bow's 16x16 texture; drawing it bends the string back and nocks an arrow
const BOW_ROWS = [
  '................',
  '...........aaaa.',
  '........aaabccbd',
  '......aabcbdddd.',
  '.....aecddd..f..',
  '....aege....f...',
  '...aege....f....',
  '...ace....f.....',
  '..abd....f......',
  '..acd...f.......',
  '..abd..f........',
  '.abd..f.........',
  '.ahd.f..........',
  '.acdf...........',
  '.abd............',
  '..d.............',
];
const BOW_COLORS: Record<string, string> = { a: '#522f0b', b: '#e79138', c: '#8c5213', d: '#412404', e: '#6c6c6c', f: '#666666', g: '#848484', h: '#8d5113' };
const STRING = '#666666';

function bowPixels(pull: number): Pixel[] {
  const pixels = new Map<string, Pixel>();
  const put = (x: number, y: number, color: string) => pixels.set(`${x}:${y}`, [x, y, color]);
  BOW_ROWS.forEach((row, y) =>
    [...row].forEach((cell, x) => {
      if (cell !== '.' && !(pull > 0 && cell === 'f')) put(x, y, BOW_COLORS[cell]);
    })
  );
  if (pull === 0) return [...pixels.values()];
  // the string runs from both tips to the nock, which slides back as you pull
  const [nx, ny] = [8 + pull, 9 + pull];
  [
    [13, 4],
    [4, 13],
  ].forEach(([x0, y0]) => {
    const steps = Math.max(Math.abs(nx - x0), Math.abs(ny - y0));
    for (let i = 0; i <= steps; i += 1) put(Math.round(x0 + ((nx - x0) * i) / steps), Math.round(y0 + ((ny - y0) * i) / steps), STRING);
  });
  // the arrow lies on the diagonal: fletching at the nock, the head past the grip
  for (let i = 0; i <= 9; i += 1) put(nx - i, ny - i, i < 2 ? '#e8e8e8' : i < 8 ? '#8a6337' : '#c8c8c8');
  put(nx + 1, ny, '#bdbdbd');
  put(nx, ny + 1, '#bdbdbd');
  put(nx - 9, ny - 8, '#8a8a8a');
  put(nx - 8, ny - 9, '#8a8a8a');
  return [...pixels.values()];
}

export interface Sprite {
  readonly geometry: THREE.BufferGeometry;
  readonly material: THREE.Material;
}

// An item in the hand is its sprite pressed one pixel thick, as the game draws it: the picture
// on both faces and, along every border, a strip in the color of the pixel it edges.
function extrude(canvas: HTMLCanvasElement): Sprite {
  const n = canvas.width;
  const data = canvas.getContext('2d')!.getImageData(0, 0, n, n).data;
  const opaque = (x: number, y: number) => x >= 0 && y >= 0 && x < n && y < n && data[(y * n + x) * 4 + 3] > 127;
  const t = 1 / 32;
  const position: number[] = [];
  const normal: number[] = [];
  const uv: number[] = [];
  const quad = (corners: number[][], facing: number[], uvs: number[][]) =>
    [0, 1, 2, 0, 2, 3].forEach((i) => {
      position.push(...corners[i]);
      normal.push(...facing);
      uv.push(...uvs[i]);
    });
  quad(
    [
      [-0.5, -0.5, t],
      [0.5, -0.5, t],
      [0.5, 0.5, t],
      [-0.5, 0.5, t],
    ],
    [0, 0, 1],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]
  );
  quad(
    [
      [0.5, -0.5, -t],
      [-0.5, -0.5, -t],
      [-0.5, 0.5, -t],
      [0.5, 0.5, -t],
    ],
    [0, 0, -1],
    [
      [1, 0],
      [0, 0],
      [0, 1],
      [1, 1],
    ]
  );
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      if (!opaque(x, y)) continue;
      const x0 = x / n - 0.5;
      const x1 = x0 + 1 / n;
      const y1 = 0.5 - y / n;
      const y0 = y1 - 1 / n;
      const texel = [(x + 0.5) / n, 1 - (y + 0.5) / n];
      const edge = [texel, texel, texel, texel];
      if (!opaque(x - 1, y)) quad([[x0, y0, -t], [x0, y0, t], [x0, y1, t], [x0, y1, -t]], [-1, 0, 0], edge);
      if (!opaque(x + 1, y)) quad([[x1, y0, t], [x1, y0, -t], [x1, y1, -t], [x1, y1, t]], [1, 0, 0], edge);
      if (!opaque(x, y - 1)) quad([[x0, y1, t], [x1, y1, t], [x1, y1, -t], [x0, y1, -t]], [0, 1, 0], edge);
      if (!opaque(x, y + 1)) quad([[x0, y0, -t], [x1, y0, -t], [x1, y0, t], [x0, y0, t]], [0, -1, 0], edge);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return { geometry, material: new THREE.MeshLambertMaterial({ map: texture, alphaTest: 0.5 }) };
}

function canvasOf(size: number) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function pixelCanvas(pixels: readonly Pixel[]) {
  const canvas = canvasOf(16);
  const ctx = canvas.getContext('2d')!;
  pixels.forEach(([x, y, color]) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  });
  return canvas;
}

// sprites are built once per item and kept for the whole run, like the voxel kits
const sprites = new Map<ItemId, Promise<Sprite>>();
let bows: Sprite[] | null = null;

export function spriteOf(item: ItemId) {
  let sprite = sprites.get(item);
  if (!sprite) {
    const pixels = SPRITES[item as keyof typeof SPRITES];
    sprite = pixels
      ? Promise.resolve(extrude(pixelCanvas(pixels)))
      : new THREE.ImageLoader().loadAsync(ITEMS[item].image!).then((image) => {
          const canvas = canvasOf(128);
          canvas.getContext('2d')!.drawImage(image, 0, 0, 128, 128);
          return extrude(canvas);
        });
    sprites.set(item, sprite);
  }
  return sprite;
}

// blocks are held as a small cube, the way the game shows them
export function blockMaterial(item: ItemId | undefined) {
  const block = item && ITEMS[item].block;
  return block ? materialFor(block) : null;
}

let arm: THREE.Material[] | null = null;

// the right arm: skin, with the short teal sleeve at the shoulder end
function armMaterials() {
  if (arm) return arm;
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 12;
  const ctx = canvas.getContext('2d')!;
  for (let y = 0; y < 12; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      ctx.fillStyle = y >= 8 ? (x === 3 ? '#008080' : '#00a8a8') : (x * 3 + y * 5) % 7 === 0 ? '#b8784f' : x === 3 ? '#b47a55' : '#c68863';
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  const side = new THREE.MeshLambertMaterial({ map: texture });
  const fist = new THREE.MeshLambertMaterial({ color: '#bd7f5a' });
  const shoulder = new THREE.MeshLambertMaterial({ color: '#00a8a8' });
  // box faces: +x, -x, +y (the fist), -y (the shoulder), +z, -z
  arm = [side, side, fist, shoulder, side, side];
  return arm;
}

const ARM_BOX = new THREE.BoxGeometry(4 / 16, 12 / 16, 4 / 16);
const CUBE = new THREE.BoxGeometry(1, 1, 1);
const op = new THREE.Matrix4();

function useItemSprite(item: ItemId | undefined) {
  const [loaded, setLoaded] = useState<{ item: ItemId; sprite: Sprite } | null>(null);
  useEffect(() => {
    if (!item || item === 'bow' || ITEMS[item].block) return;
    let live = true;
    void spriteOf(item).then((sprite) => {
      if (live) setLoaded({ item, sprite });
    });
    return () => {
      live = false;
    };
  }, [item]);
  return loaded && loaded.item === item ? loaded.sprite : null;
}

export function Hand() {
  const item = useEndGame((state) => state.inventory[state.selected]?.item);
  const zone = useEndGame((state) => state.zone);
  // with post-processing the composer draws the world first, then the hand goes on top
  const post = useQuality((state) => QUALITY[state.quality].post);
  const root = useRef<THREE.Group>(null);
  const bowRefs = useRef<(THREE.Mesh | null)[]>([]);
  const sprite = useItemSprite(item);
  const bowSprites = useMemo(() => (bows ??= [0, 1, 2, 3].map((pull) => extrude(pixelCanvas(bowPixels(pull))))), []);
  const block = blockMaterial(item);
  const motion = useRef({ item: undefined as ItemId | undefined, equip: 1, seen: -1, swingAt: -1, charge: 0, stride: 0, bob: 0, yaw: 0, pitch: 0 });

  useFrame((_, delta) => {
    const group = root.current;
    if (!group) return;
    const dt = Math.min(delta, 0.05);
    const game = useEndGame.getState();
    const m = motion.current;
    const p = runtime.player;
    const held = game.inventory[game.selected]?.item;
    group.visible = !game.dead && game.zone !== 'poem';

    if (held !== m.item) {
      m.item = held;
      m.equip = 1;
    }
    m.equip = Math.max(0, m.equip - dt * 5);
    // a new swing only starts once the last one is halfway through, as in the game
    const age = (runtime.time - m.swingAt) / SWING_S;
    if (m.seen < 0) m.seen = game.swing;
    if (game.swing !== m.seen) {
      m.seen = game.swing;
      if (held !== 'bow' && (age >= 0.5 || m.swingAt < 0)) m.swingAt = runtime.time;
    }
    const swing = age >= 0 && age < 1 ? age : 0;
    m.charge = game.charge === 0 ? 0 : m.charge + (game.charge - m.charge) * (1 - Math.exp(-dt * 10));
    const horizontal = Math.hypot(p.vel.x, p.vel.z);
    if (p.onGround && horizontal > 0.5) m.stride += horizontal * dt;
    const still = runtime.reducedMotion;
    m.bob += ((p.onGround && !still ? Math.min(1, horizontal / WALK) : 0) - m.bob) * Math.min(1, dt * 8);
    m.yaw = still ? p.yaw : m.yaw + (p.yaw - m.yaw) * Math.min(1, dt * 14);
    m.pitch = still ? p.pitch : m.pitch + (p.pitch - m.pitch) * Math.min(1, dt * 14);

    const pose = group.matrix.identity();
    const translate = (x: number, y: number, z: number) => pose.multiply(op.makeTranslation(x, y, z));
    const rotate = (axis: 'x' | 'y' | 'z', degrees: number) =>
      pose.multiply(axis === 'x' ? op.makeRotationX(degrees * DEG) : axis === 'y' ? op.makeRotationY(degrees * DEG) : op.makeRotationZ(degrees * DEG));

    // the hand trails the view a little when you turn, and bobs with your steps
    rotate('x', (m.pitch - p.pitch) * 0.15 * (180 / Math.PI));
    rotate('y', (m.yaw - p.yaw) * 0.15 * (180 / Math.PI));
    const phase = m.stride * Math.PI;
    const bob = m.bob * 0.1;
    translate(Math.sin(phase) * bob * 0.5, -Math.abs(Math.cos(phase) * bob), 0);
    rotate('z', Math.sin(phase) * bob * 3);
    rotate('x', Math.abs(Math.cos(phase - 0.2) * bob) * 5);

    const early = Math.sqrt(swing);
    const drawing = held === 'bow' && m.charge > 0;
    let frame = 0;
    if (!held) {
      translate(-0.3 * Math.sin(early * Math.PI) + 0.64, 0.4 * Math.sin(early * Math.PI * 2) - 0.6 - m.equip * 0.6, -0.4 * Math.sin(swing * Math.PI) - 0.72);
      rotate('y', 45);
      rotate('y', Math.sin(early * Math.PI) * 70);
      rotate('z', Math.sin(swing * swing * Math.PI) * -20);
      translate(-1, 3.6, 3.5);
      rotate('z', 120);
      rotate('x', 200);
      rotate('y', -135);
      translate(5.6, 0, 0);
      translate(-5 / 16, 2 / 16, 0);
    } else {
      // the sprite's own turn about its center: edge-on like the game's, flat while eating,
      // and nearly face-on while drawing, the arrow aimed at the crosshair
      let yaw = 100;
      let roll = 0;
      if (held && ITEMS[held].food && m.charge > 0) {
        // up to the mouth, bobbing while you chew
        const lift = Math.min(1, m.charge * 6);
        const chew = m.charge > 0.2 ? Math.abs(Math.cos(m.charge * 7 * Math.PI)) * 0.04 : 0;
        translate(0.61 - lift * 0.53, -0.27 - lift * 0.04 + chew - m.equip * 0.6, -1.02 + lift * 0.22);
        yaw -= lift * 80;
      } else if (held === 'shield' && game.blocking) {
        // raised in front of you, face on
        translate(0.3, -0.36 - m.equip * 0.6, -0.78);
        yaw = 10;
      } else if (drawing) {
        // pulled toward the eye, trembling once the string is taut
        const pull = Math.min(1, (m.charge * m.charge + m.charge * 2) / 3);
        const shake = pull > 0.1 ? Math.sin(runtime.time * 26) * (pull - 0.1) * 0.006 : 0;
        translate(0.38, -0.22 + shake - m.equip * 0.6, -1 + pull * 0.05);
        yaw = -40;
        roll = 10;
        frame = pull < 0.65 ? 1 : pull < 0.9 ? 2 : 3;
      } else {
        // a trident about to be thrown is drawn back and up
        const pull = held === 'trident' ? Math.min(1, m.charge * 2) : 0;
        translate(-0.4 * Math.sin(early * Math.PI), 0.2 * Math.sin(early * Math.PI * 2) + pull * 0.1, -0.2 * Math.sin(swing * Math.PI) + pull * 0.15);
        translate(0.56, -0.52 - m.equip * 0.6, -0.72);
        rotate('y', 45 + Math.sin(swing * swing * Math.PI) * -20);
        rotate('z', Math.sin(early * Math.PI) * -20);
        rotate('x', Math.sin(early * Math.PI) * -80);
        rotate('y', -45);
        // tuned so the sword rests like the game's: grip in the corner, blade up toward the crosshair
        translate(0.05, block ? 0.18 : 0.25, block ? -0.1 : -0.3);
      }
      if (block) {
        rotate('y', 45);
        pose.multiply(op.makeScale(0.4, 0.4, 0.4));
      } else {
        rotate('y', yaw);
        rotate('z', roll);
        pose.multiply(op.makeScale(0.62, 0.62, 0.62));
      }
    }
    group.matrixWorldNeedsUpdate = true;
    bowRefs.current.forEach((mesh, index) => {
      if (mesh) mesh.visible = index === frame;
    });
  });

  const light = LIGHT[zone] ?? 1;
  return (
    <Hud renderPriority={post ? 2 : 1}>
      <PerspectiveCamera makeDefault fov={70} near={0.01} far={10} />
      <ambientLight intensity={0.9 * light} />
      <directionalLight position={[-0.6, 1, 0.8]} intensity={1.6 * light} />
      <group ref={root} matrixAutoUpdate={false}>
        {!item && <mesh geometry={ARM_BOX} material={armMaterials()} position={[-1 / 16, 6 / 16, 0]} />}
        {item === 'bow' &&
          bowSprites.map((bow, index) => (
            <mesh
              key={index}
              ref={(mesh) => {
                bowRefs.current[index] = mesh;
              }}
              geometry={bow.geometry}
              material={bow.material}
              visible={index === 0}
            />
          ))}
        {block && <mesh geometry={CUBE} material={block} />}
        {sprite && <mesh geometry={sprite.geometry} material={sprite.material} />}
      </group>
    </Hud>
  );
}
