// 16x16 item sprites drawn as SVG pixels: the Eye of Ender and the Dragon Egg have no
// art in public/images, and drawing them keeps them crisp at any HUD size.

type Pixel = readonly [number, number, string];

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

const EYE = eyePixels();
const EGG = eggPixels();
const HEAD = headPixels();

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
