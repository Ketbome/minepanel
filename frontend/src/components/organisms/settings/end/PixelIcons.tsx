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

// a bone: a pale diagonal with a knuckle at each end
function bonePixels() {
  const pixels = diagonal('#fbf8ee', '#e8e3d0', '#b9b39c', 2, 10);
  [
    [3, 12],
    [4, 13],
    [3, 11],
    [12, 3],
    [13, 4],
    [13, 3],
  ].forEach(([x, y]) => pixels.push([x, y, '#e8e3d0']));
  return pixels;
}

// an iron sword: a brown grip and pommel, a dark crossguard, and a pale blade shaded on one edge
function ironSwordPixels() {
  const pixels: Pixel[] = [
    [2, 14, '#3b2a14'],
    [3, 14, '#4a3218'],
    [2, 13, '#4a3218'],
  ];
  for (let step = 0; step < 3; step += 1) pixels.push([3 + step, 13 - step, step % 2 ? '#6b4a2b' : '#8a6337']);
  [
    [4, 8],
    [5, 9],
    [7, 11],
    [8, 12],
  ].forEach(([x, y]) => pixels.push([x, y, '#4c4c4c']));
  pixels.push([6, 10, '#6f6f6f']);
  for (let step = 4; step < 12; step += 1) {
    const x = 3 + step;
    const y = 13 - step;
    pixels.push([x, y, step % 3 === 0 ? '#ffffff' : '#e3e3e3'], [x - 1, y, '#c4c4c4'], [x, y + 1, '#8c8c8c']);
  }
  pixels.push([15, 1, '#e3e3e3'], [14, 1, '#c4c4c4']);
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

// a block item: a textured square with a dark rim, the way the flat icons of the pack read
function blockPixels(texel: (x: number, y: number) => string, rim: string) {
  const pixels: Pixel[] = [];
  for (let y = 2; y <= 13; y += 1) {
    for (let x = 2; x <= 13; x += 1) pixels.push([x, y, x === 2 || y === 2 || x === 13 || y === 13 ? rim : texel(x, y)]);
  }
  return pixels;
}

const LOG = blockPixels((x, y) => ((x * 3 + (y >> 2)) % 5 === 0 ? '#3b2a17' : x % 3 === 0 ? '#5a4125' : (x + y) % 4 ? '#6b4f2e' : '#735633'), '#2e2112');
const PLANKS = blockPixels((x, y) => (y % 4 === 1 ? '#6e5530' : (y % 8 < 4 ? x === 9 : x === 5) ? '#7a5e34' : (x * 7 + y) % 9 === 0 ? '#9a7a45' : '#b08f55'), '#5a4424');
const COBBLE = blockPixels((x, y) => {
  const blob = (Math.floor(x / 3) * 7 + Math.floor(y / 3) * 11) % 5;
  return (x % 3 === 0 && y % 2 === 0) || (y % 3 === 0 && x % 2 === 1) ? '#4f4f4f' : blob === 0 ? '#9a9a9a' : blob === 2 ? '#6f6f6f' : '#838383';
}, '#3a3a3a');
const NETHERRACK = blockPixels((x, y) => ((x * 5 + y * 3) % 7 === 0 ? '#9e4a4a' : (x + y) % 3 ? '#6f2a2a' : '#5a2020'), '#3a1414');
const END_STONE = blockPixels((x, y) => ((x * 7 + y * 5) % 9 === 0 ? '#c9c28a' : (x + y * 2) % 5 === 0 ? '#e9e6b0' : '#dcd79e'), '#a39d68');

// the golden helmet: a dome of gold with a darker brim and an open face
const HELMET_ROWS = ['................', '................', '................', '.....dddddd.....', '....dyYYYYyd....', '...dyYYyyyyyd...', '...dyyyyyyyyd...', '...dyyyyyyyyd...', '...dyyd..dyyd...', '...dyyd..dyyd...', '...doo....ood...', '...dd......dd...'];
const HELMET_COLORS: Record<string, string> = { d: '#6e4e0a', y: '#f2c230', Y: '#fff08a', o: '#c78a14' };

function helmetPixels() {
  const pixels: Pixel[] = [];
  HELMET_ROWS.forEach((row, y) =>
    [...row].forEach((cell, x) => {
      if (cell !== '.') pixels.push([x, y + 2, HELMET_COLORS[cell]]);
    })
  );
  return pixels;
}

// the mob drops, drawn from rows of color letters like the helmet
function rowPixels(rows: readonly string[], colors: Record<string, string>, top: number) {
  const pixels: Pixel[] = [];
  rows.forEach((row, y) =>
    [...row].forEach((cell, x) => {
      if (cell !== '.') pixels.push([x, y + top, colors[cell]]);
    })
  );
  return pixels;
}

// a lumpy brown scrap with green rot and a dark rim
const FLESH_ROWS = ['......oooo......', '....oogggGoo....', '...ogGgbggggo...', '..ogggggbgGgo...', '..obggGggggbo...', '...oggggbgggo...', '....ogbgggGo....', '...ogggggbgo....', '..ogGgbggggo....', '..obggggggo.....', '...oooggoo......', '......oo........'];
const FLESH_COLORS: Record<string, string> = { o: '#3d2415', g: '#8a4f35', G: '#b06a45', b: '#6b7d3a' };
// a raw chop: pink meat, a darker vein, a pale rind of fat
const PORK_ROWS = ['.......oooo.....', '.....ooffffo....', '....offpPppfo...', '...ofpPpppppfo..', '...ofppppprppfo.', '..ofpppprrpppfo.', '..ofppprrpppfo..', '.ofpppppppffo...', '.ofppppppfoo....', '.ofpppppfo......', '..offfffo.......', '...ooooo........'];
const PORK_COLORS: Record<string, string> = { o: '#6e2a2a', f: '#f6dcd2', p: '#e8878a', P: '#f7b3ad', r: '#bf5157' };
// a small gold nugget
const NUGGET_ROWS = ['.......dd.......', '......dyYd......', '....ddyYYyd.....', '...dyyYyyyod....', '...dyyyyyood....', '....doyyoodd....', '.....ddoodd.....', '.......dd.......'];
const NUGGET_COLORS: Record<string, string> = { d: '#7a520a', y: '#f2c230', Y: '#fff08a', o: '#c78a14' };

// a loose white thread
const STRING_ROWS = ['...........ww...', '..........w..s..', '..........w..s..', '...........w.s..', '.......ww...s...', '......w..s......', '......w...s.....', '.......w...s....', '...ww...w..s....', '..w..s...ss.....', '..w...s.........', '...w...s........', '........s.......'];
const STRING_COLORS: Record<string, string> = { w: '#ececec', s: '#a9a9a9' };
// the blaze powder's heap in grays
const GUNPOWDER_COLORS: Record<string, string> = { y: '#9a9a9a', Y: '#cfcfcf', o: '#6f6f6f', O: '#858585', r: '#3a3a3a' };
// the raw chop's shape, browned
const COOKED_COLORS: Record<string, string> = { o: '#43230f', f: '#d8b184', p: '#a4603a', P: '#c98654', r: '#76391c' };
// the gold armor, in the helmet's colors
const CHESTPLATE_ROWS = ['..ddd......ddd..', '.dyYyd....dyyod.', '.dyYyyddddyyyod.', '.ddYyyyyyyyyyod.', '...dYyyyyyyyod..', '...dYyyyyyyyod..', '...dyyyyyyyyod..', '...dyyyyyyyyod..', '...dyyyyyyyyod..', '...doooooooood..', '....dddddddd....'];
const LEGGINGS_ROWS = ['...ddddddddddd..', '...dYyyyyyyyod..', '...dYyyyyyyyod..', '...dYyod.dyyod..', '...dYyod.dyyod..', '...dYyod.dyyod..', '...dYyod.dyyod..', '...dyyod.dyyod..', '...dyyod.dyyod..', '...ddddd.ddddd..'];
const BOOTS_ROWS = ['..dddd....dddd..', '..dYyd....dyyd..', '..dYyd....dyyd..', '.ddYyd...ddyyd..', '.dyyyd...dyyyd..', '.ddddd...ddddd..'];
// an iron ingot, and the shield: planks in an iron rim with an iron boss
const IRON_ROWS = ['......ddddddd...', '.....dwWwwwwd...', '....dwWwwwwwgd..', '...dwwwwwwwggd..', '...dgggggggggd..', '...ddddddddddd..'];
const IRON_COLORS: Record<string, string> = { d: '#4a4a4a', w: '#d8d8d8', W: '#ffffff', g: '#a0a0a0' };
const SHIELD_ROWS = ['...iiiiiiiiii...', '...ipPpppppPi...', '...ipPpppppPi...', '...ipPpiipPPi...', '...ipPiIIipPi...', '...ipPiIIipPi...', '...ipPpiippPi...', '...ipPpppppPi...', '...ipPpppppPi...', '....ipPpppPi....', '.....ipPpPi.....', '......iiii......'];
const SHIELD_COLORS: Record<string, string> = { i: '#6f6f6f', I: '#cfcfcf', p: '#a07a45', P: '#7a5a30' };
const SAND = blockPixels((x, y) => ((x * 7 + y * 3) % 8 === 0 ? '#c4b27a' : (x + y * 5) % 11 === 0 ? '#efe4b6' : '#dccf9c'), '#a8955c');

// the Blub from the front: long ears, a boxy pale blue body, wide dark eyes
const BLUB_ROWS = [
  '....kk....kk....',
  '....kbk..kbk....',
  '....kik..kik....',
  '....kik..kik....',
  '...kkbkkkkbkk...',
  '..kttttttttttk..',
  '..kbbbbbbbbbbk..',
  '..kbeebbbbeebk..',
  '..kbEebbbbEebk..',
  '..kbbbbmmbbbbk..',
  '..kswwwwwwwwsk..',
  '..kkskkkkkkskk..',
];
const BLUB_COLORS: Record<string, string> = { k: '#3b6f8f', b: '#9fd3f0', t: '#d8eff9', i: '#c4e6f7', s: '#7fb5d6', w: '#eef7fc', e: '#4a2340', E: '#7a4468', m: '#5a2b4c' };

const EYE = eyePixels();
const EGG = eggPixels();
const HEAD = headPixels();
const STICK = diagonal('#9b7240', '#896237', '#5f4122');
const ROD = diagonal('#fff1a8', '#ffc233', '#c26a00');
const ARROW = arrowPixels();
const BONE = bonePixels();
const FLINT = flintPixels();
const OBSIDIAN = obsidianPixels();
const DIRT = dirtPixels();
const BLAZE = blazePixels();
const HELMET = helmetPixels();
const BLUB = rowPixels(BLUB_ROWS, BLUB_COLORS, 2);
const IRON_SWORD = ironSwordPixels();

// the same pixels, for the item pressed into a solid sprite in your hand
export const SPRITES = {
  eye: EYE,
  egg: EGG,
  stick: STICK,
  blaze: BLAZE,
  rod: ROD,
  arrow: ARROW,
  ironSword: IRON_SWORD,
  bone: BONE,
  flint: FLINT,
  obsidian: OBSIDIAN,
  dirt: DIRT,
  log: LOG,
  planks: PLANKS,
  cobble: COBBLE,
  netherrack: NETHERRACK,
  endStone: END_STONE,
  helmet: HELMET,
  rottenFlesh: rowPixels(FLESH_ROWS, FLESH_COLORS, 2),
  porkchop: rowPixels(PORK_ROWS, PORK_COLORS, 2),
  nugget: rowPixels(NUGGET_ROWS, NUGGET_COLORS, 4),
  string: rowPixels(STRING_ROWS, STRING_COLORS, 2),
  gunpowder: rowPixels(BLAZE_ROWS, GUNPOWDER_COLORS, 7),
  sand: SAND,
  cookedPorkchop: rowPixels(PORK_ROWS, COOKED_COLORS, 2),
  chestplate: rowPixels(CHESTPLATE_ROWS, HELMET_COLORS, 3),
  leggings: rowPixels(LEGGINGS_ROWS, HELMET_COLORS, 3),
  boots: rowPixels(BOOTS_ROWS, HELMET_COLORS, 6),
  iron: rowPixels(IRON_ROWS, IRON_COLORS, 5),
  shield: rowPixels(SHIELD_ROWS, SHIELD_COLORS, 2),
};

export function PixelSprite({ pixels, className }: { readonly pixels: readonly Pixel[]; readonly className?: string }) {
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

export function BlubIcon({ className }: { readonly className?: string }) {
  return <PixelSprite pixels={BLUB} className={className} />;
}

export function DragonHeadIcon({ className }: { readonly className?: string }) {
  return <PixelSprite pixels={HEAD} className={className} />;
}

export function BoneIcon({ className }: { readonly className?: string }) {
  return <PixelSprite pixels={BONE} className={className} />;
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
