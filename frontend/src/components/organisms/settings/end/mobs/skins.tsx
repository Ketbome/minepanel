'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { castsShadow } from '../engine/shading';
import { rng } from '../voxels';
import { PX } from './parts';

// Mob skins painted in code and laid out the way the game lays out its model textures: every box
// unfolds into its six faces at one texel per model pixel, and all the boxes of a mob share one
// atlas, so a mob is a single material that can flash red as a whole.

type Vec3 = readonly [number, number, number];
// a palette entry is one color, or several the painter picks from at random for texture
export type Palette = Readonly<Record<string, string | readonly string[]>>;
export type FaceName = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

export interface BoxArt {
  // width, height and depth in model pixels; the mob faces +z
  readonly size: Vec3;
  // the palette key that fills every face before its drawing
  readonly base: string;
  // rows of palette keys drawn over a face as seen from outside, sides with +y up, the top with
  // the front edge at the bottom; '.' keeps the base
  readonly faces?: Partial<Record<FaceName, readonly string[]>>;
}

export interface SkinArt {
  readonly palette: Palette;
  readonly boxes: Readonly<Record<string, BoxArt>>;
}

export interface Skin {
  readonly texture: THREE.CanvasTexture;
  readonly boxes: Readonly<Record<string, THREE.BufferGeometry>>;
}

type Rect = readonly [number, number, number, number];

// where each face sits inside a box's unfolded layout, in the game's order
function unfold(w: number, h: number, d: number): Record<FaceName, Rect> {
  return {
    top: [d, 0, w, d],
    bottom: [d + w, 0, w, d],
    right: [0, d, d, h],
    front: [d, d, w, h],
    left: [d + w, d, d, h],
    back: [2 * d + w, d, w, h],
  };
}

// three's box face order: +x (the mob's left), -x, +y, -y, +z (front), -z
const FACE_ORDER: readonly FaceName[] = ['left', 'right', 'top', 'bottom', 'front', 'back'];

const skins = new Map<SkinArt, Skin>();

export function skinOf(art: SkinArt, seed = 7): Skin {
  const cached = skins.get(art);
  if (cached) return cached;
  const rand = rng(seed);
  const entries = Object.entries(art.boxes).map(([name, box]) => {
    const [w, h, d] = box.size.map((value) => Math.ceil(value));
    return { name, box, w, h, d, width: 2 * (w + d), height: d + h, x: 0, y: 0 };
  });
  // shelf packing with a one-texel gutter, so no face ever samples its neighbour
  const width = Math.max(64, ...entries.map((entry) => entry.width + 1));
  let x = 0;
  let y = 0;
  let shelf = 0;
  entries.forEach((entry) => {
    if (x + entry.width > width) {
      x = 0;
      y += shelf + 1;
      shelf = 0;
    }
    entry.x = x;
    entry.y = y;
    x += entry.width + 1;
    shelf = Math.max(shelf, entry.height);
  });
  const height = y + shelf;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const color = (key: string) => {
    const value = art.palette[key];
    if (value === undefined) return '#ff00ff';
    return typeof value === 'string' ? value : value[Math.floor(rand() * value.length)];
  };
  const boxes: Record<string, THREE.BufferGeometry> = {};
  entries.forEach(({ name, box, w, h, d, x: ox, y: oy }) => {
    const faces = unfold(w, h, d);
    (Object.keys(faces) as FaceName[]).forEach((face) => {
      const [fx, fy, fw, fh] = faces[face];
      const rows = box.faces?.[face];
      for (let row = 0; row < fh; row += 1) {
        for (let col = 0; col < fw; col += 1) {
          const key = rows?.[row]?.[col];
          ctx.fillStyle = color(key && key !== '.' ? key : box.base);
          ctx.fillRect(ox + fx + col, oy + fy + row, 1, 1);
        }
      }
    });
    const geometry = new THREE.BoxGeometry(box.size[0] * PX, box.size[1] * PX, box.size[2] * PX);
    const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
    const inset = 0.02;
    FACE_ORDER.forEach((face, index) => {
      const [fx, fy, fw, fh] = faces[face];
      const u0 = (ox + fx + inset) / width;
      const u1 = (ox + fx + fw - inset) / width;
      const top = 1 - (oy + fy + inset) / height;
      const bottom = 1 - (oy + fy + fh - inset) / height;
      for (let vertex = index * 4; vertex < index * 4 + 4; vertex += 1) uv.setXY(vertex, u0 + uv.getX(vertex) * (u1 - u0), bottom + uv.getY(vertex) * (top - bottom));
    });
    uv.needsUpdate = true;
    boxes[name] = geometry;
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  const skin = { texture, boxes };
  skins.set(art, skin);
  return skin;
}

// the same face drawing on all four sides, for legs and rods
export function sides(rows: readonly string[]): Partial<Record<FaceName, readonly string[]>> {
  return { front: rows, back: rows, left: rows, right: rows };
}

// a face of `w` by `h` in `base` with rectangles [x, y, width, height, key] painted over it, for
// patches too big to spell out row by row
export function paint(w: number, h: number, base: string, spots: readonly (readonly [number, number, number, number, string])[] = []) {
  const rows = Array.from({ length: h }, () => Array.from({ length: w }, () => base));
  spots.forEach(([x, y, sw, sh, key]) => {
    for (let row = Math.max(0, y); row < Math.min(h, y + sh); row += 1) {
      for (let col = Math.max(0, x); col < Math.min(w, x + sw); col += 1) rows[row][col] = key;
    }
  });
  return rows.map((row) => row.join(''));
}

// one material per mob, so its red flash is its own; the painted skin is shared by every mob of
// its kind
export function useSkin(art: SkinArt, options: THREE.MeshLambertMaterialParameters = {}) {
  const skin = useMemo(() => skinOf(art), [art]);
  // the options are fixed for a mob's lifetime
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const material = useMemo(() => new THREE.MeshLambertMaterial({ map: skin.texture, ...options }), [skin]);
  useEffect(() => () => material.dispose(), [material]);
  return { skin, material };
}

// one box of a skin, placed in model pixels like `Part`
export function Box({ skin, name, at = [0, 0, 0], material }: { readonly skin: Skin; readonly name: string; readonly at?: Vec3; readonly material: THREE.Material }) {
  return <mesh geometry={skin.boxes[name]} material={material} position={[at[0] * PX, at[1] * PX, at[2] * PX]} castShadow={castsShadow(material)} receiveShadow />;
}
