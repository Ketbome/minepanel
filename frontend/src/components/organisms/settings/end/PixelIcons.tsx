// 16x16 item sprites drawn as SVG pixels: these items have no art in public/images, and
// drawing them keeps them crisp at any HUD size.

export type Pixel = readonly [number, number, string];

function eyePixels() {
  const pixels: Pixel[] = [];
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d > 6.3) continue;
      let color = d > 5.3 ? '#1c5c3b' : d < 3.6 ? '#1f7a4f' : '#3fb573';
      if (Math.abs(x - 7.5) < 1.2 && Math.abs(y - 7.5) < 2.6) color = '#06140e';
      if ((x === 5 && y === 4) || (x === 4 && y === 5)) color = '#c8ffe0';
      pixels.push([x, y, color]);
    }
  }
  return pixels;
}

const EGG_ROWS = [4, 6, 8, 8, 10, 10, 12, 12, 12, 12, 12, 10, 8, 6];

function eggPixels() {
  const pixels: Pixel[] = [];
  EGG_ROWS.forEach((width, row) => {
    const y = row + 1;
    const start = 8 - width / 2;
    for (let x = start; x < start + width; x += 1) {
      const speck = (x * 7 + y * 13) % 11;
      let color = speck === 0 ? '#43246a' : speck === 5 ? '#2d1846' : (x + y) % 2 ? '#0c0a10' : '#120e18';
      if (x === start || x === start + width - 1) color = '#07060a';
      else if (x === start + 1 && row > 1 && row < 8) color = '#2a2233';
      pixels.push([x, y, color]);
    }
  });
  return pixels;
}

// the dragon's head from the front: gray horns, black skull, purple eyes, long snout
const HEAD_ROWS = [
  '..hh......hh....',
  '..hh......hh....',
  '..kkkkkkkkkkkk..',
  '..kssssssssssk..',
  '..kseeeskseeesk.',
  '..kspppskspppsk.',
  '..kssssssssssk..',
  '..kkkkssssskkk..',
  '....kssssssk....',
  '....ksnssnsk....',
  '....kssssssk....',
  '....kkkkkkkk....',
  '....kjjjjjjk....',
  '....kkkkkkkk....',
];
const HEAD_COLORS: Record<string, string> = {
  h: '#6f6f6f',
  k: '#0b0b0b',
  s: '#1c1c1c',
  e: '#e79bff',
  p: '#cc33ff',
  n: '#000000',
  j: '#141414',
};

function headPixels() {
  const pixels: Pixel[] = [];
  HEAD_ROWS.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell !== '.') pixels.push([x, y + 1, HEAD_COLORS[cell]]);
    });
  });
  return pixels;
}

// sticks, rods and arrow shafts are two-pixel diagonals from bottom-left to top-right,
// shaded on their lower edge
function diagonal(light: string, body: string, edge: string, from = 0, to = 11) {
  const pixels: Pixel[] = [];
  for (let step = from; step < to; step += 1) {
    const x = 3 + step;
    const y = 13 - step;
    pixels.push([x, y, step % 3 === 0 ? light : body], [x - 1, y, edge]);
  }
  return pixels;
}

function arrowPixels() {
  const pixels = diagonal('#a8a8a8', '#8a6337', '#5f4122', 2, 10);
  [
    [12, 1],
    [13, 1],
    [14, 1],
    [13, 2],
    [14, 2],
    [14, 3],
    [12, 2],
    [13, 3],
  ].forEach(([x, y]) => pixels.push([x, y, x + y > 15 ? '#6f6f6f' : '#d8d8d8']));
  [
    [1, 12],
    [2, 13],
    [1, 14],
    [3, 14],
    [2, 12],
    [3, 13],
  ].forEach(([x, y]) => pixels.push([x, y, '#f0f0f0']));
  return pixels;
}

// a steel C-ring over a dark flint chip
function flintPixels() {
  const pixels: Pixel[] = [];
  for (let y = 2; y <= 9; y += 1) {
    for (let x = 2; x <= 9; x += 1) {
      const d = Math.hypot(x - 5.5, y - 5.5);
      if (d > 2.2 && d < 4 && !(x > 6 && y > 3 && y < 8)) pixels.push([x, y, x + y < 11 ? '#e6e6e6' : '#8f8f8f']);
    }
  }
  for (let y = 8; y <= 14; y += 1) {
    for (let x = 8; x <= 14; x += 1) {
      if (x + y < 18 || x + y > 26) continue;
      pixels.push([x, y, (x * 3 + y) % 5 === 0 ? '#5a5a5a' : '#2f2f2f']);
    }
  }
  return pixels;
}

function dirtPixels() {
  const pixels: Pixel[] = [];
  for (let y = 2; y <= 13; y += 1) {
    for (let x = 2; x <= 13; x += 1) {
      const edge = x === 2 || y === 2 || x === 13 || y === 13;
      const speck = (x * 5 + y * 7) % 11;
      pixels.push([x, y, edge ? '#4f3522' : speck === 0 ? '#5a3f2a' : speck === 4 ? '#a58466' : (x + y) % 2 ? '#866043' : '#79553a']);
    }
  }
  return pixels;
}

function obsidianPixels() {
  const pixels: Pixel[] = [];
  for (let y = 2; y <= 13; y += 1) {
    for (let x = 2; x <= 13; x += 1) {
      const edge = x === 2 || y === 2 || x === 13 || y === 13;
      const speck = (x * 7 + y * 11) % 13 === 0;
      pixels.push([x, y, edge ? '#0b0812' : speck ? '#5a4485' : (x + y) % 3 ? '#191223' : '#140f1d']);
    }
  }
  return pixels;
}

// a little heap of glowing dust: bright core, orange body, dark ember rim
const BLAZE_ROWS = ['......y.........', '.....yoy...y....', '...yoOOoy.yoy...', '..yoOOYOoyoOoy..', '.yoOOYYOOoOOOoy.', '.rooOOOOOOOOoor.', '..rrroooooorrr..'];
const BLAZE_COLORS: Record<string, string> = { y: '#ffe36b', Y: '#fff7c2', o: '#ff9a1f', O: '#ffc23d', r: '#b4480e' };

function blazePixels() {
  const pixels: Pixel[] = [];
  BLAZE_ROWS.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell !== '.') pixels.push([x, y + 7, BLAZE_COLORS[cell]]);
    });
  });
  return pixels;
}

const EYE = eyePixels();
const EGG = eggPixels();
const HEAD = headPixels();
const STICK = diagonal('#9b7240', '#896237', '#5f4122');
const ROD = diagonal('#fff1a8', '#ffc233', '#c26a00');
const ARROW = arrowPixels();
const FLINT = flintPixels();
const OBSIDIAN = obsidianPixels();
const DIRT = dirtPixels();
const BLAZE = blazePixels();

// the same pixels, for the item pressed into a solid sprite in your hand
export const SPRITES = { eye: EYE, egg: EGG, stick: STICK, blaze: BLAZE, rod: ROD, arrow: ARROW, flint: FLINT, obsidian: OBSIDIAN, dirt: DIRT };

function PixelSprite({ pixels, className }: { readonly pixels: readonly Pixel[]; readonly className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} shapeRendering="crispEdges" aria-hidden>
      {pixels.map(([x, y, color]) => (
        <rect key={`${x}:${y}`} x={x} y={y} width={1} height={1} fill={color} />
      ))}
    </svg>
  );
}

export function EyeOfEnderIcon({ className }: { readonly className?: string }) {
  return <PixelSprite pixels={EYE} className={className} />;
}

export function DragonEggIcon({ className }: { readonly className?: string }) {
  return <PixelSprite pixels={EGG} className={className} />;
}

export function DragonHeadIcon({ className }: { readonly className?: string }) {
  return <PixelSprite pixels={HEAD} className={className} />;
}

export function StickIcon({ className }: { readonly className?: string }) {
  return <PixelSprite pixels={STICK} className={className} />;
}

export function BlazePowderIcon({ className }: { readonly className?: string }) {
  return <PixelSprite pixels={BLAZE} className={className} />;
}

export function BlazeRodIcon({ className }: { readonly className?: string }) {
  return <PixelSprite pixels={ROD} className={className} />;
}

export function ArrowIcon({ className }: { readonly className?: string }) {
  return <PixelSprite pixels={ARROW} className={className} />;
}

export function FlintAndSteelIcon({ className }: { readonly className?: string }) {
  return <PixelSprite pixels={FLINT} className={className} />;
}

export function ObsidianIcon({ className }: { readonly className?: string }) {
  return <PixelSprite pixels={OBSIDIAN} className={className} />;
}

export function DirtIcon({ className }: { readonly className?: string }) {
  return <PixelSprite pixels={DIRT} className={className} />;
}
