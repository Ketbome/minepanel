// Christmas art: a pine with ornaments, gifts, string-light bulbs and a snowman, on a navy night.
import { front, inside, Model, render } from './engine.mjs';

const NIGHT = [14, 26, 48];
const draw = (m, opts) => render(m, { night: NIGHT, ground: '#050a14', ...opts });

const NEEDLES = ['#23704a', '#2a7d52', '#1e6140'];
const SNOW = '#eef3fb';
const SNOW_SHADE = '#d9e3f1';
const BARK = '#5a3a1c';
const GOLD = '#ffd34d';
const COAL = '#1b1d24';

const ORNAMENTS = ['#ff4a5c', '#ffc43d', '#4aa8ff'];
const BULBS = { red: '#ff4a5c', green: '#5dff8a', gold: '#ffc43d', blue: '#4aa8ff' };
const GIFTS = {
  red: ['#c92f3d', '#ffd34d'],
  green: ['#1f8a52', '#f2f6fc'],
  blue: ['#2d6fd6', '#ff7ab6'],
};

// three stacked tiers, each a rounded cone whose overhanging rim catches the snow
function pine(m, ox, oy, oz, scale = 1) {
  const c = Math.round(7 * scale);
  const s = (v) => Math.round(v * scale);
  const tiers = [
    [s(3), s(9), 7 * scale, 3.6 * scale],
    [s(9), s(15), 5.4 * scale, 2.2 * scale],
    [s(15), s(21), 4 * scale, 0.5],
  ];
  m.box(ox + c - 1, oy + c - 1, oz, ox + c + 1, oy + c + 1, oz + s(3) - 1, BARK, { grain: 0.1 });
  for (const [z0, z1, rb, rt] of tiers)
    for (let z = z0; z < z1; z++) {
      const r = rb + (rt - rb) * ((z - z0) / (z1 - z0 - 1 || 1));
      for (let x = 0; x <= 2 * c; x++)
        for (let y = 0; y <= 2 * c; y++) {
          if (!inside([x - c, y - c], [r + 0.5, r + 0.5], 2.2)) continue;
          const rim = z === z0 && !inside([x - c, y - c], [r - 1, r - 1], 2.2);
          const snowy = rim && (x * 3 + y * 5) % 5 !== 0;
          m.set(ox + x, oy + y, oz + z, snowy ? (z0 === s(3) ? SNOW_SHADE : SNOW) : NEEDLES[(x + y * 2 + z) % 3], { grain: snowy ? 0.02 : 0.07 });
        }
    }
  const top = oz + s(21);
  return [ox + c, oy + c, top];
}

function star(m, x, y, z) {
  for (let k = 0; k < 5; k++) m.set(x, y, z + k, k === 2 ? '#fff1b8' : GOLD, { glow: true, part: 'star' });
  for (const k of [-1, 1]) m.set(x + k, y - k, z + 2, GOLD, { glow: true, part: 'star' });
}

// eight baubles from the bottom up: the tree lights them one per poke, the star last
const BAUBLES = [
  [-5, 5],
  [4, 4],
  [0, 6],
  [-3, 10],
  [3, 11],
  [0, 13],
  [-2, 16],
  [2, 18],
];

function tree() {
  const m = new Model();
  const [x, y, top] = pine(m, 0, 0, 0);
  star(m, x, y, top);
  BAUBLES.forEach(([d, z], i) => {
    const hit = front(m, d, z);
    if (hit) m.set(hit[0] + 1, hit[1] + 1, z + 1, ORNAMENTS[i % 3], { glow: true, part: `o${i}` });
  });
  m.anchors.star = [x, y, top + 1];
  return draw(m, { shadow: [2, 0] });
}

function bulb(color) {
  const m = new Model();
  m.set(0, 0, 4, '#1c3a28', { part: 'socket', grain: 0 });
  m.box(0, 0, 1, 1, 1, 3, color, { glow: true, part: 'glass' });
  m.set(0, 0, 0, color, { glow: true, part: 'glass' });
  m.anchors.glass = [1, 1, 2];
  return draw(m);
}

function giftBox(m, box, ribbon, { lid, open }) {
  const band = (x, y) => x === 3 || x === 4 || y === 3 || y === 4;
  for (let x = 0; x < 8; x++)
    for (let y = 0; y < 8; y++)
      for (let z = 0; z < 6; z++) {
        if (open && z > 0 && x > 0 && x < 7 && y > 0 && y < 7) continue;
        m.set(x, y, z, band(x, y) ? ribbon : box, { grain: 0.04 });
      }
  if (open) m.box(1, 1, 0, 6, 6, 0, '#2a1a1a', { grain: 0.06 });
  if (!lid) return;
  for (let x = -1; x < 9; x++) for (let y = -1; y < 9; y++) for (const z of [6, 7]) m.set(x, y, z, band(x, y) ? ribbon : box, { part: 'lid', grain: 0.04 });
  // a bow: a knot and two loops leaning toward the viewer's left and right
  for (const [x, y, z] of [[3, 4, 8], [4, 3, 8], [4, 4, 8], [2, 5, 9], [1, 5, 9], [5, 2, 9], [5, 1, 9], [3, 5, 8], [5, 3, 8]])
    m.set(x, y, z, ribbon, { part: 'lid', grain: 0.04 });
}

// closed, open and lid share one viewBox so the open box and its lid stack exactly where the
// closed gift was
function gifts(name, [box, ribbon]) {
  const make = (opts) => {
    const m = new Model();
    giftBox(m, box, ribbon, opts);
    return draw(m, { shadow: [2, 0] });
  };
  const closed = make({ lid: true, open: false });
  const open = make({ lid: false, open: true });
  const lid = (() => {
    const m = new Model();
    giftBox(m, box, ribbon, { lid: true, open: false });
    for (const [k, c] of m.cells) if (c.part !== 'lid') m.cells.delete(k);
    return draw(m);
  })();
  open.viewBox = lid.viewBox = closed.viewBox;
  return { [`gift${name}`]: closed, [`gift${name}Open`]: open, [`gift${name}Lid`]: lid };
}

// eyes and buttons one column wide each (a voxel spans two x - y columns)
function snowman(pose) {
  const m = new Model();
  const ball = (cz, r, z0, z1) => {
    for (let x = 0; x < 14; x++)
      for (let y = 0; y < 14; y++)
        for (let z = z0; z <= z1; z++)
          if (inside([x + 0.5 - 7, y + 0.5 - 7, z + 0.5 - cz], [r, r, r * 0.95], 2.3))
            m.set(x, y, z, SNOW, { grain: 0.03 });
  };
  ball(6, 6.5, 0, 12);
  ball(15.5, 5, 11, 20);
  ball(23.5, 4.3, 19, 27);
  const paint = (d, z, color, part) => {
    const hit = front(m, d, z);
    if (hit) m.set(hit[0], hit[1], z, color, { part, grain: 0 });
  };
  for (const z of [13, 15, 17]) paint(0, z, COAL, 'buttons');

  // a striped scarf at the neck
  for (let x = 0; x < 14; x++)
    for (let y = 0; y < 14; y++)
      for (const z of [19, 20])
        if (inside([x + 0.5 - 7, y + 0.5 - 7], [4, 4], 2.3)) m.set(x, y, z, (x + y + z) % 3 ? '#2f9a5e' : SNOW, { part: 'scarf', grain: 0.03 });

  // a knitted hat down to `brim`: over one eye to peek, over both to hide
  const brim = (d) => (pose === 'cover' || (pose === 'peek' && d < 0) ? 23 : 26);
  for (let x = 0; x < 14; x++)
    for (let y = 0; y < 14; y++)
      for (let z = 23; z <= 30; z++) {
        const d = x - y;
        if (z < brim(d)) continue;
        const r = z === brim(d) ? 4.6 : 4.4 - Math.max(0, z - 27) * 1.1;
        if (r <= 0 || !inside([x + 0.5 - 7, y + 0.5 - 7], [r, r], 2.3)) continue;
        m.set(x, y, z, z === brim(d) ? '#2f9a5e' : (z + d) % 4 ? '#d8343f' : '#b72734', { part: 'hat', grain: 0.03 });
      }
  m.box(6, 6, 31, 7, 7, 32, SNOW, { part: 'hat', grain: 0.02 });

  for (const d of [-2, 2]) if (brim(d) > 24) paint(d, 24, COAL, 'eyes');
  const nose = front(m, 0, 23);
  if (nose) for (let k = 1; k <= 2; k++) m.set(nose[0] + k, nose[1], 23, k === 1 ? '#f07c1e' : '#ff9a3d', { part: 'face', grain: 0 });

  // stick arms along x - y (the screen's horizontal); the right one waves
  const arm = (side, lift) => {
    let edge = null;
    for (const c of m.cells.values()) if (c.z === 17 && (!edge || side * (c.x - c.y) > side * (edge.x - edge.y))) edge = c;
    const [dx, dy] = side > 0 ? [1, 0] : [0, 1];
    for (let k = 1; k <= 5; k++) m.set(edge.x + dx * k, edge.y + dy * k, 17 + Math.floor(k * lift), '#6b4a2a', { part: 'arms', grain: 0 });
    m.set(edge.x + dx * 4, edge.y + dy * 4, 18 + Math.floor(4 * lift), '#6b4a2a', { part: 'arms', grain: 0 });
  };
  arm(-1, 0.25);
  arm(1, 0.9);
  m.anchors.eyes = [7, 7, 24];
  return draw(m, { shadow: [2, 0] });
}

function snowBlock(m, ox, oy, oz, sx, sy, sz) {
  for (let x = 0; x < sx; x++)
    for (let y = 0; y < sy; y++)
      for (let z = 0; z < sz; z++) {
        const edge = x === sx - 1 || y === sy - 1;
        const drift = z === sz - 2 && edge && (x * 7 + y * 3) % 3 !== 0;
        const color = z === sz - 1 || drift ? SNOW : ['#6b4528', '#5c3a21', '#7a5030'][(x * 5 + y * 3 + z * 7) % 3];
        m.set(ox + x, oy + y, oz + z, color, { grain: z === sz - 1 ? 0.03 : 0.08 });
      }
  for (const [x, y] of [[1, 2], [sx - 3, 1], [2, sy - 2], [6, sy - 1]]) m.set(ox + x, oy + y, oz + sz, SNOW_SHADE, { grain: 0.02 });
}

// the docs' landing corner: a snowy block with a pine and two gifts under it
function patch() {
  const m = new Model();
  snowBlock(m, 0, 0, 0, 23, 18, 4);
  const [x, y, top] = pine(m, 2, 1, 4, 0.8);
  star(m, x, y, top);
  m.anchors.star = [x, y, top + 1];
  const small = (ox, oy, [box, ribbon]) => {
    for (let gx = 0; gx < 4; gx++) for (let gy = 0; gy < 4; gy++) for (let gz = 0; gz < 3; gz++) m.set(ox + gx, oy + gy, 4 + gz, gx === 1 || gy === 2 ? ribbon : box, { grain: 0.04 });
    m.set(ox + 1, oy + 2, 7, ribbon);
  };
  small(16, 4, GIFTS.red);
  small(17, 11, GIFTS.blue);
  return draw(m, { shadow: [3, 0] });
}

export const christmas = {
  tree: tree(),
  patch: patch(),
  ...gifts('Red', GIFTS.red),
  ...gifts('Green', GIFTS.green),
  ...gifts('Blue', GIFTS.blue),
  ...Object.fromEntries(Object.entries(BULBS).map(([name, color]) => [`bulb${name[0].toUpperCase()}${name.slice(1)}`, bulb(color)])),
  snowman: snowman('rest'),
  snowmanPeek: snowman('peek'),
  snowmanCover: snowman('cover'),
};
