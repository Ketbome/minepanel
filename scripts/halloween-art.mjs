// Generates the voxel art for the Halloween season theme (panel + docs).
// Every model is a small 3D grid of blocks, projected to 2:1 isometric SVG paths with
// four-tone shading (top / left / right / emissive), corner occlusion and baked candle light.
// Output is committed in both apps because the docs build cannot read files outside doc/.
//
//   node scripts/halloween-art.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = [
  join(root, 'frontend/src/components/organisms/halloween/art.json'),
  join(root, 'doc/.vitepress/theme/halloween/art.json'),
];

const NIGHT = [42, 24, 62];

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// deterministic per-voxel grain, quantized so neighbouring faces can share a path
const grain = (x, y, z) => {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return [-1, 0, 0, 1][(h >>> 0) % 4];
};

class Model {
  constructor() {
    this.cells = new Map();
    this.lights = [];
    this.anchors = {};
  }
  key(x, y, z) {
    return `${x},${y},${z}`;
  }
  set(x, y, z, color, opts = {}) {
    this.cells.set(this.key(x, y, z), { x, y, z, color, part: opts.part ?? 'body', glow: !!opts.glow, grain: opts.grain ?? 0.05 });
  }
  get(x, y, z) {
    return this.cells.get(this.key(x, y, z));
  }
  del(x, y, z) {
    this.cells.delete(this.key(x, y, z));
  }
  box(x0, y0, z0, x1, y1, z1, color, opts) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.set(x, y, z, color, opts);
  }
  light(x, y, z, color, radius, strength) {
    this.lights.push({ p: [x, y, z], color: rgb(color), radius, strength });
  }
}

const P = (x, y, z) => [2 * (x - y), x + y - 2 * z];

// face normal for the three faces an isometric viewer can see
const FACES = {
  top: { n: [0, 0, 1], k: 1, night: 0, c: (x, y, z) => [x + 0.5, y + 0.5, z + 1] },
  left: { n: [0, 1, 0], k: 0.8, night: 0.14, c: (x, y, z) => [x + 0.5, y + 1, z + 0.5] },
  right: { n: [1, 0, 0], k: 0.62, night: 0.26, c: (x, y, z) => [x + 1, y + 0.5, z + 0.5] },
};

function path(face, x, y, z) {
  if (face === 'top') {
    const [a, b] = P(x, y, z + 1);
    return `M${a} ${b}l2 1l-2 1l-2-1z`;
  }
  if (face === 'right') {
    const [a, b] = P(x + 1, y, z + 1);
    return `M${a} ${b}l-2 1l0 2l2-1z`;
  }
  const [a, b] = P(x, y + 1, z + 1);
  return `M${a} ${b}l2 1l0 2l-2-1z`;
}

function occlusion(m, face, { x, y, z }) {
  const around =
    face === 'top'
      ? [[x - 1, y, z + 1], [x, y - 1, z + 1], [x + 1, y, z + 1], [x, y + 1, z + 1]]
      : face === 'right'
        ? [[x + 1, y - 1, z], [x + 1, y + 1, z], [x + 1, y, z + 1], [x + 1, y, z - 1]]
        : [[x - 1, y + 1, z], [x + 1, y + 1, z], [x, y + 1, z + 1], [x, y + 1, z - 1]];
  return around.filter(([a, b, c]) => m.get(a, b, c)).length;
}

function shade(m, face, cell) {
  const f = FACES[face];
  const base = rgb(cell.color);
  if (cell.glow) return mix(base, [255, 255, 235], face === 'top' ? 0.12 : 0).map((v) => v * (face === 'right' ? 0.88 : 1));
  let c = mix(base.map((v) => v * f.k), NIGHT, f.night);
  c = c.map((v) => v * (1 - 0.09 * occlusion(m, face, cell)) * (1 + cell.grain * grain(cell.x, cell.y, cell.z)));
  const center = f.c(cell.x, cell.y, cell.z);
  for (const l of m.lights) {
    const d = l.p.map((v, i) => v - center[i]);
    const dist = Math.hypot(...d);
    const facing = (d[0] * f.n[0] + d[1] * f.n[1] + d[2] * f.n[2]) / (dist || 1);
    if (facing <= 0 || dist > l.radius) continue;
    const t = l.strength * (1 - dist / l.radius) ** 2 * (0.4 + 0.6 * facing);
    c = c.map((v, i) => v + l.color[i] * t);
  }
  return c;
}

function render(m, { shadow = null } = {}) {
  const cells = [...m.cells.values()].sort((a, b) => a.x + a.y + a.z - (b.x + b.y + b.z));
  const faces = [];
  const runs = [];
  const push = (part, fill, d) => {
    const last = runs.at(-1);
    if (last && last[0] === part && last[1] === fill) last[2] += d;
    else runs.push([part, fill, d]);
  };
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];
  const grow = (x, y, z) => {
    const [a, b] = P(x, y, z);
    bounds[0] = Math.min(bounds[0], a);
    bounds[1] = Math.min(bounds[1], b);
    bounds[2] = Math.max(bounds[2], a);
    bounds[3] = Math.max(bounds[3], b);
  };

  if (shadow) {
    // hard offset shadow on the ground, like the docs' offset box shadows
    const seen = new Set();
    let d = '';
    for (const c of cells) {
      const k = `${c.x},${c.y}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const [sx, sy] = [c.x + shadow[0], c.y + shadow[1]];
      d += path('top', sx, sy, -1);
      grow(sx, sy, 0);
      grow(sx + 1, sy + 1, 0);
    }
    runs.push(['shadow', '#07040c', d]);
  }

  for (const c of cells) {
    const visible = [
      ['top', !m.get(c.x, c.y, c.z + 1)],
      ['left', !m.get(c.x, c.y + 1, c.z)],
      ['right', !m.get(c.x + 1, c.y, c.z)],
    ];
    for (const [face, show] of visible) if (show) faces.push([c.x + c.y + c.z, c.part, hex(shade(m, face, c)), path(face, c.x, c.y, c.z)]);
    grow(c.x, c.y, c.z + 1);
    grow(c.x + 1, c.y + 1, c.z);
    grow(c.x + 1, c.y, c.z);
    grow(c.x, c.y + 1, c.z);
  }

  // cubes on the same x+y+z plane never overlap on screen, so a plane can be grouped by colour
  faces.sort((a, b) => a[0] - b[0] || (a[1] + a[2] < b[1] + b[2] ? -1 : a[1] + a[2] > b[1] + b[2] ? 1 : 0));
  for (const [, part, fill, d] of faces) push(part, fill, d);

  const pad = 1;
  const anchors = Object.fromEntries(Object.entries(m.anchors).map(([k, p]) => [k, P(...p)]));
  return {
    viewBox: [bounds[0] - pad, bounds[1] - pad, bounds[2] - bounds[0] + pad * 2, bounds[3] - bounds[1] + pad * 2],
    runs,
    anchors,
  };
}

// ---------------------------------------------------------------- models

// superellipse test: blocky but rounded, the way a carved pumpkin reads in blocks
const inside = (v, r, p = 4) => v.reduce((s, x, i) => s + Math.abs(x / r[i]) ** p, 0) <= 1;

const ORANGE = '#e8681a';
const GROOVE = '#c95414';
const EMBER = '#ffd36a';
const SOUL = '#5fe0ff';

// face masks, top row first, read left to right on the side facing the viewer (+y)
// A face carved on the corner that points at the viewer: columns run along x - y (screen
// horizontal) and rows along z, so a mask pixel is square on screen and the face looks at you.
function front(m, d, z) {
  for (let s = 120; s >= -20; s--) {
    if ((s + d) % 2) continue;
    const x = (s + d) / 2;
    const y = (s - d) / 2;
    if (m.get(x, y, z)) return [x, y];
  }
  return null;
}

function carve(m, mask, d0, z0, paint) {
  const half = (mask[0].length - 1) / 2;
  mask.forEach((row, i) =>
    [...row].forEach((ch, u) => {
      const z = z0 + mask.length - 1 - i;
      const hit = ch !== '.' && front(m, d0 + u - half, z);
      if (hit) paint(hit[0], hit[1], z, ch, i);
    }),
  );
}

// face masks, top row first
const MASKS = {
  calm: [
    '...#.......#...',
    '..###.....###..',
    '.#####...#####.',
    '...............',
    '.......#.......',
    '......###......',
    '...............',
    '.#.#########.#.',
    '..###########..',
    '....###.###....',
  ],
  angry: [
    '.#...........#.',
    '.###.......###.',
    '..####...####..',
    '...###...###...',
    '.......#.......',
    '......###......',
    '...............',
    '.#############.',
    '.##.##.#.##.##.',
    '..#.........#..',
  ],
};

function pumpkin(m, ox, oy, oz, { face = 'calm', soul = false, size = 16 } = {}) {
  const r = size / 2;
  const h = Math.round(size * 0.78);
  const cx = ox + r;
  const cy = oy + r;
  for (let x = 0; x < size; x++)
    for (let y = 0; y < size; y++)
      for (let z = 0; z < h; z++) {
        const dx = x + 0.5 - r;
        const dy = y + 0.5 - r;
        const dz = z + 0.5 - h / 2;
        if (!inside([dx, dy, dz], [r, r, h / 2 + 0.7], 2.5)) continue;
        // ribs fan out from the stem: every few degrees a darker groove
        const rib = Math.cos(10 * Math.atan2(dy, dx)) < -0.55;
        m.set(ox + x, oy + y, oz + z, rib ? GROOVE : ORANGE, { grain: 0.035 });
      }

  const mask = MASKS[face];
  const base = oz + Math.round((h - (mask?.length ?? 0)) / 2);
  if (mask) {
    const glow = soul ? SOUL : EMBER;
    carve(m, mask, ox - oy, base, (x, y, z, ch, row) => m.set(x, y, z, glow, { glow: true, part: row < 4 ? 'eyes' : 'mouth' }));
    m.light(cx, cy, oz + h / 2, soul ? SOUL : '#ff9a2e', size * 0.8, 0.5);
  }

  // a bent stem and a curl of vine
  const top = oz + h - 1;
  m.box(cx - 1, cy - 1, top, cx, cy, top + 1, '#5a3a1c', { grain: 0.1 });
  m.set(cx, cy - 1, top + 2, '#6b4a22');
  m.set(cx + 1, cy - 1, top + 2, '#6b4a22');
  for (const [a, b, c] of [[1, 1, 0], [2, 1, 0], [2, 2, 0], [3, 2, 1], [3, 3, 1], [2, 3, 1]]) m.set(cx + a, cy + b, top + c, '#4f8a2a', { grain: 0.12 });
  m.anchors.flame = [cx, cy, oz + h / 2];
  m.anchors.eyes = [cx + r * 0.72, cy + r * 0.72, base + 8.5];
}

function grassBlock(m, ox, oy, oz, sx, sy, sz) {
  const dirt = ['#6b4528', '#5c3a21', '#7a5030'];
  for (let x = 0; x < sx; x++)
    for (let y = 0; y < sy; y++)
      for (let z = 0; z < sz; z++) {
        const edge = x === sx - 1 || y === sy - 1;
        const drip = z === sz - 2 && edge && (x * 7 + y * 3) % 3 !== 0;
        const color = z === sz - 1 || drip ? '#4a9430' : dirt[(x * 5 + y * 3 + z * 7) % 3];
        m.set(ox + x, oy + y, oz + z, color, { grain: 0.08 });
      }
  for (const [x, y] of [[1, 2], [sx - 3, 1], [2, sy - 2], [sx - 2, sy - 6], [6, sy - 1]]) m.set(ox + x, oy + y, oz + sz, '#62b83c', { grain: 0.1 });
}

function lantern() {
  const m = new Model();
  const iron = '#2d2a33';
  const ironLit = '#4a4453';
  for (let i = 0; i < 3; i++) {
    const z = 12 + i * 2;
    if (i % 2) m.box(2, 3, z, 3, 3, z + 1, '#5d5866', { part: 'chain', grain: 0 });
    else m.box(3, 2, z, 3, 3, z + 1, '#5d5866', { part: 'chain', grain: 0 });
  }
  m.box(2, 2, 10, 4, 4, 11, ironLit);
  m.box(1, 1, 9, 5, 5, 9, iron);
  m.box(1, 1, 1, 5, 5, 1, iron);
  m.box(1, 1, 0, 5, 5, 0, ironLit);
  for (let z = 2; z <= 8; z++)
    for (let x = 1; x <= 5; x++)
      for (let y = 1; y <= 5; y++) {
        const corner = (x === 1 || x === 5) && (y === 1 || y === 5);
        const shell = x === 1 || x === 5 || y === 1 || y === 5;
        if (!shell) continue;
        if (corner || z === 5) m.set(x, y, z, iron);
        else m.set(x, y, z, z > 5 ? '#ffc65a' : '#ff9a2e', { glow: true, part: 'flame' });
      }
  m.box(2, 2, 2, 4, 4, 8, '#ffe2a0', { glow: true, part: 'flame' });
  m.anchors.flame = [3, 3, 5];
  return render(m);
}

function spider(frame) {
  const m = new Model();
  const body = '#3a2b49';
  const back = '#4d3a60';
  const leg = '#2f2340';
  // round abdomen behind, small head in front (+y), hanging from its back
  for (let x = 0; x < 8; x++)
    for (let y = 0; y < 8; y++)
      for (let z = 0; z < 6; z++)
        if (inside([x + 0.5 - 4, y + 0.5 - 4, z + 0.5 - 3], [4, 4, 3.2], 2.6)) m.set(6 + x, 2 + y, 4 + z, z > 3 ? back : body, { grain: 0.06 });
  m.box(8, 10, 5, 11, 13, 7, body, { grain: 0.06 });
  for (const x of [8, 9, 10, 11]) m.set(x, 13, 7, '#ff3b4e', { glow: true, part: 'eyes' });
  m.set(9, 13, 6, '#ff3b4e', { glow: true, part: 'eyes' });
  m.set(10, 13, 6, '#ff3b4e', { glow: true, part: 'eyes' });
  m.set(8, 14, 5, leg);
  m.set(11, 14, 5, leg);
  // four legs a side: out from the body, up to a knee, down to the tip
  for (let i = 0; i < 4; i++) {
    const y = 4 + i * 3;
    const lift = (i + frame) % 2;
    for (const [x0, dir] of [[5, -1], [14, 1]]) {
      m.set(x0, y, 6, leg, { part: 'legs', grain: 0 });
      m.set(x0 + dir, y, 7 + lift, leg, { part: 'legs', grain: 0 });
      m.set(x0 + dir * 2, y, 8 + lift, leg, { part: 'legs', grain: 0 });
      m.set(x0 + dir * 3, y, 7 + lift, leg, { part: 'legs', grain: 0 });
      for (let z = 6 + lift; z >= 3; z--) m.set(x0 + dir * 4, y, z, leg, { part: 'legs', grain: 0 });
    }
  }
  m.anchors.thread = [10, 6, 10];
  return render(m);
}

const GHOST_FACE = [
  '.##...##.',
  '.#@...#@.',
  '.##...##.',
  '.........',
  'c..oo..c.',
  '....o....',
];

function ghost(hands) {
  const m = new Model();
  const sheet = '#efeaff';
  const R = 5;
  const H = 15;
  for (let x = 0; x < 2 * R; x++)
    for (let y = 0; y < 2 * R; y++)
      for (let z = 0; z < H; z++) {
        const dx = x + 0.5 - R;
        const dy = y + 0.5 - R;
        const dome = z >= H - 6 ? inside([dx, dy, z + 0.5 - (H - 6)], [R, R, 6], 2.2) : inside([dx, dy], [R, R], 2.4);
        // ragged hem
        const hem = z < 2 && (z === 0 ? (x + y) % 2 === 0 : (x + 2 * y) % 5 === 0);
        if (dome && !hem) m.set(x, y, z, sheet, { grain: 0.025 });
      }
  const colors = { '#': '#1a1024', '@': '#8c7bb0', o: '#2a1a38', c: '#ff9fc2' };
  carve(m, GHOST_FACE, 0, 6, (x, y, z, ch) => m.set(x, y, z, colors[ch], { part: '#@'.includes(ch) ? 'eyes' : 'face', grain: 0 }));
  // nubby hands: at the sides, or held up in front of the eyes
  const nub = (d, s, z, tall = 2) => {
    const x = (s + d) / 2;
    const y = (s - d) / 2;
    m.box(x, y, z, x + 1, y + 1, z + tall - 1, sheet, { part: 'hands', grain: 0.025 });
  };
  const eyeFront = (d) => {
    const [x, y] = front(m, d, 10);
    return x + y;
  };
  if (hands === 'down') {
    nub(-7, 8, 5);
    nub(7, 8, 5);
  } else {
    nub(-2, eyeFront(-2) + 2, 9, 3);
    if (hands === 'cover') nub(2, eyeFront(2) + 2, 9, 3);
    else nub(7, 8, 6);
  }
  m.anchors.eyes = [R + 3.5, R + 3.5, 10];
  return render(m);
}

function bat(frame) {
  const m = new Model();
  const fur = '#3a2a47';
  const wing = '#4d3860';
  const bone = '#2c1f38';
  // wings run along x - y, which is the screen's horizontal in this projection
  const cx = 10;
  const cy = 10;
  m.box(cx - 1, cy - 1, 3, cx + 1, cy + 1, 7, fur, { grain: 0.08 });
  m.set(cx - 1, cy, 8, fur);
  m.set(cx, cy - 1, 8, fur);
  m.set(cx, cy + 2, 6, '#ff4f7a', { glow: true, part: 'eyes' });
  m.set(cx + 2, cy, 6, '#ff4f7a', { glow: true, part: 'eyes' });
  const tall = [5, 4, 4, 3, 3, 2, 1];
  for (let s = 0; s < tall.length; s++) {
    const top = 7 + (frame ? Math.round(s * 0.8) : -Math.round(s * 0.45));
    for (const [x, y] of [[cx + 2 + s, cy - 2 - s], [cx - 2 - s, cy + 2 + s]])
      for (let k = 0; k < tall[s]; k++) {
        if (k === tall[s] - 1 && s % 2 === 1) continue;
        m.set(x, y, top - k, k === 0 ? bone : wing, { part: 'wings', grain: 0.04 });
      }
  }
  return render(m);
}

function rake(cover) {
  const m = new Model();
  const skin = '#cfcfc6';
  const rib = '#9d9d94';
  const dark = '#2b2b28';
  for (const x of [1, 5]) {
    m.box(x, 3, 0, x + 1, 4, 1, dark);
    m.box(x, 3, 2, x + 1, 4, 10, skin);
    m.box(x, 4, 11, x + 1, 5, 18, skin);
  }
  for (let z = 19; z <= 30; z++) {
    const lean = Math.floor((z - 19) / 4);
    for (let x = 1; x <= 6; x++) for (let y = 3; y <= 5; y++) m.set(x, y + lean, z, z % 2 === 0 && y === 5 ? rib : skin, { grain: 0.04 });
  }
  const hy = 6;
  m.box(1, hy, 31, 6, hy + 4, 37, skin, { grain: 0.04 });
  const fy = hy + 4;
  // huge black eyes with a pinprick of light, a mouth full of teeth
  for (const ex of [1, 4]) for (const z of [33, 34, 35]) for (const dx of [0, 1, 2]) if (!(dx === 2 && ex === 1) && !(dx === 0 && ex === 4) || z === 34) m.set(ex + dx, fy, z, '#050505', { part: 'eyes', grain: 0 });
  m.set(2, fy, 34, '#f4f4ee', { glow: true, part: 'eyes' });
  m.set(5, fy, 34, '#f4f4ee', { glow: true, part: 'eyes' });
  for (let x = 1; x <= 6; x++) {
    m.set(x, fy, 32, x % 2 ? '#e9e4d2' : '#1a0303', { grain: 0 });
    m.set(x, fy, 31, x % 2 ? '#260505' : '#e9e4d2', { grain: 0 });
  }
  for (const x of [0, 7]) {
    if (cover) {
      m.box(x, 8, 26, x, 9, 30, skin);
      m.box(x, 10, 30, x, 11, 32, skin);
    } else {
      m.box(x, 6, 12, x, 7, 29, skin);
      m.box(x, 7, 7, x, 8, 11, dark);
    }
  }
  if (cover) {
    m.box(1, 11, 33, 3, 11, 36, dark, { part: 'hands' });
    m.box(4, 11, 33, 6, 11, 36, dark, { part: 'hands' });
  }
  m.anchors.eyes = [3.5, fy, 34];
  return render(m);
}

function cobweb() {
  // a corner web: spokes from the corner, sagging rungs between them
  const spokes = 6;
  const rings = 5;
  const len = 46;
  let d = '';
  const at = (i, r) => {
    const a = (Math.PI / 2) * (i / (spokes - 1));
    return [Math.cos(a) * r, Math.sin(a) * r];
  };
  for (let i = 0; i < spokes; i++) {
    const [x, y] = at(i, len + (i % 2) * 6);
    d += `M0 0L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  for (let k = 1; k <= rings; k++) {
    const r = (len * k) / (rings + 0.6);
    for (let i = 0; i < spokes - 1; i++) {
      const [x0, y0] = at(i, r);
      const [x1, y1] = at(i + 1, r);
      const sag = 0.78;
      d += `M${x0.toFixed(1)} ${y0.toFixed(1)}Q${(((x0 + x1) / 2) * sag).toFixed(1)} ${(((y0 + y1) / 2) * sag).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    }
  }
  return { viewBox: [-1, -1, 54, 54], d };
}

function pumpkinModel(opts) {
  const m = new Model();
  pumpkin(m, 0, 0, 0, opts);
  return render(m, { shadow: [2, 0] });
}

function patch() {
  const m = new Model();
  grassBlock(m, 0, 0, 0, 23, 18, 4);
  pumpkin(m, 2, 1, 4);
  const anchors = { ...m.anchors };
  pumpkin(m, 18, 2, 4, { face: null, size: 5 });
  m.anchors = anchors;
  return render(m, { shadow: [3, 0] });
}

const art = {
  pumpkin: pumpkinModel({ face: 'calm' }),
  pumpkinAngry: pumpkinModel({ face: 'angry', soul: true }),
  patch: patch(),
  lantern: lantern(),
  spider: spider(0),
  spiderStep: spider(1),
  ghost: ghost('down'),
  ghostCover: ghost('cover'),
  ghostPeek: ghost('peek'),
  bat: bat(0),
  batFlap: bat(1),
  rake: rake(false),
  rakeCover: rake(true),
  cobweb: cobweb(),
};

const json = JSON.stringify(art);
for (const file of OUT) writeFileSync(file, json + '\n');
console.log(`halloween art: ${Object.keys(art).length} models, ${(json.length / 1024).toFixed(1)} KB`);
