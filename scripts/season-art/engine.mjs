// The voxel engine behind the season themes' art (panel + docs).
// Every model is a small 3D grid of blocks, projected to 2:1 isometric SVG paths with
// four-tone shading (top / left / right / emissive), corner occlusion and baked light.
// Each season sets its own night tint and ground shadow in render().

export const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
export const hex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// deterministic per-voxel grain, quantized so neighbouring faces can share a path
const grain = (x, y, z) => {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return [-1, 0, 0, 1][(h >>> 0) % 4];
};

export class Model {
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

export const P = (x, y, z) => [2 * (x - y), x + y - 2 * z];

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

function shade(m, face, cell, night) {
  const f = FACES[face];
  const base = rgb(cell.color);
  if (cell.glow) return mix(base, [255, 255, 235], face === 'top' ? 0.12 : 0).map((v) => v * (face === 'right' ? 0.88 : 1));
  let c = mix(base.map((v) => v * f.k), night, f.night);
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

export function render(m, { night, ground, shadow = null }) {
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
    runs.push(['shadow', ground, d]);
  }

  for (const c of cells) {
    const visible = [
      ['top', !m.get(c.x, c.y, c.z + 1)],
      ['left', !m.get(c.x, c.y + 1, c.z)],
      ['right', !m.get(c.x + 1, c.y, c.z)],
    ];
    for (const [face, show] of visible) if (show) faces.push([c.x + c.y + c.z, c.part, hex(shade(m, face, c, night)), path(face, c.x, c.y, c.z)]);
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

// superellipse test: blocky but rounded, the way a carved pumpkin reads in blocks
export const inside = (v, r, p = 4) => v.reduce((s, x, i) => s + Math.abs(x / r[i]) ** p, 0) <= 1;

// A face carved on the corner that points at the viewer: columns run along x - y (screen
// horizontal) and rows along z, so a mask pixel is square on screen and the face looks at you.
export function front(m, d, z) {
  for (let s = 120; s >= -20; s--) {
    if ((s + d) % 2) continue;
    const x = (s + d) / 2;
    const y = (s - d) / 2;
    if (m.get(x, y, z)) return [x, y];
  }
  return null;
}

export function carve(m, mask, d0, z0, paint) {
  const half = (mask[0].length - 1) / 2;
  mask.forEach((row, i) =>
    [...row].forEach((ch, u) => {
      const z = z0 + mask.length - 1 - i;
      const hit = ch !== '.' && front(m, d0 + u - half, z);
      if (hit) paint(hit[0], hit[1], z, ch, i);
    }),
  );
}
