'use client';

import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { useAnimal } from './overworld';
import { NameTag, PX, type Wander } from './parts';
import { Box, paint, sides, useSkin, type Skin, type SkinArt } from './skins';

// The Overworld's other animals, boxed like the game's models: cow, chicken, wolf, cat, horse and
// the iron golem. They wander, look around and run when hit, like the pig and the sheep.

type Refs = React.RefObject<(THREE.Group | null)[]>;

// legs listed in the game's trot order (right hind, left hind, left front, right front), so the
// diagonal pairs swing together
function Legs({ skin, material, name, legs, spots, top, drop, first = 0 }: { readonly skin: Skin; readonly material: THREE.Material; readonly name: string; readonly legs: Refs; readonly spots: readonly (readonly [number, number])[]; readonly top: number; readonly drop: number; readonly first?: number }) {
  return spots.map(([x, z], index) => (
    <group
      key={index}
      ref={(leg) => {
        legs.current[first + index] = leg;
      }}
      position={[x * PX, top * PX, z * PX]}
    >
      <Box skin={skin} name={name} at={[0, drop, 0]} material={material} />
    </group>
  ));
}

// the game's cow: dark brown with white patches, a white blaze down the face, a pale muzzle, horns
// and the udder
const COW: SkinArt = {
  palette: {
    b: ['#4b3727', '#43301f', '#523c2b', '#3d2c1e'],
    w: ['#e9e9e9', '#dedede', '#f2f2f2'],
    k: '#161616',
    m: ['#c4a597', '#bb9b8d'],
    n: '#5e433a',
    h: ['#d9d3c3', '#cfc8b8'],
    H: '#8f887a',
    u: ['#e8a3a3', '#dc9696'],
    f: '#353535',
  },
  boxes: {
    head: {
      size: [8, 8, 6],
      base: 'b',
      faces: {
        front: ['bbbbbbbb', 'bbbwwbbb', 'bbwwwwbb', 'bkwwwwkb', 'bbwwwwbb', 'bmmmmmmb', 'bmnmmnmb', 'bmmmmmmb'],
        left: paint(6, 8, 'b', [[2, 2, 3, 2, 'w']]),
        top: paint(8, 6, 'b', [[3, 3, 2, 3, 'w']]),
        bottom: paint(8, 6, 'b', [[1, 0, 6, 2, 'm']]),
      },
    },
    horn: { size: [1, 3, 1], base: 'h', faces: { ...sides(['H', 'h', 'h']), top: ['H'] } },
    body: {
      size: [12, 10, 18],
      base: 'b',
      faces: {
        left: paint(18, 10, 'b', [[2, 1, 4, 3, 'w'], [9, 5, 5, 3, 'w'], [14, 0, 3, 2, 'w'], [3, 6, 2, 2, 'w']]),
        right: paint(18, 10, 'b', [[1, 4, 5, 3, 'w'], [8, 1, 4, 3, 'w'], [14, 5, 3, 4, 'w']]),
        top: paint(12, 18, 'b', [[1, 2, 4, 4, 'w'], [6, 9, 5, 4, 'w'], [2, 14, 3, 3, 'w']]),
        back: paint(12, 10, 'b', [[3, 2, 6, 4, 'w']]),
      },
    },
    udder: { size: [4, 1, 6], base: 'u' },
    leg: { size: [4, 12, 4], base: 'b', faces: { ...sides(paint(4, 12, 'b', [[0, 6, 4, 5, 'w'], [0, 11, 4, 1, 'f']])), bottom: paint(4, 4, 'f') } },
  },
};

export function Cow({ wander, name }: { readonly wander: Wander; readonly name?: string }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const { skin, material } = useSkin(COW);
  const materials = useMemo(() => [material], [material]);
  useAnimal(root, wander, legs, materials, 10, null, name, head, [0.9, 1.4]);

  return (
    <group ref={root} position={wander.home}>
      <Legs
        skin={skin}
        material={material}
        name="leg"
        legs={legs}
        spots={[
          [-4, -7],
          [4, -7],
          [4, 6],
          [-4, 6],
        ]}
        top={12}
        drop={-6}
      />
      <Box skin={skin} name="body" at={[0, 17, -1]} material={material} />
      <Box skin={skin} name="udder" at={[0, 11.5, -7]} material={material} />
      <group ref={head} position={[0, 20 * PX, 8 * PX]}>
        <Box skin={skin} name="head" at={[0, 0, 3]} material={material} />
        <Box skin={skin} name="horn" at={[-4.5, 3.5, 3.5]} material={material} />
        <Box skin={skin} name="horn" at={[4.5, 3.5, 3.5]} material={material} />
      </group>
      {name && <NameTag text={name} y={1.75} />}
    </group>
  );
}

// the game's chicken: white, a yellow beak, the red wattle, and legs that are one stick and three
// toes painted on a hollow box
const CHICKEN: SkinArt = {
  palette: {
    w: ['#ffffff', '#f6f6f6', '#eeeeee'],
    g: ['#d9d9d9', '#d2d2d2'],
    k: '#141414',
    y: ['#f7b12f', '#f2a826'],
    Y: '#d98a1c',
    r: ['#d8211f', '#c91b19'],
    l: ['#e8a032', '#df962b'],
    x: 'rgba(0,0,0,0)',
  },
  boxes: {
    head: { size: [4, 6, 3], base: 'w', faces: { front: ['wwww', 'kwwk', 'wwww', 'wwww', 'wwww', 'gwwg'], left: ['www', 'kww', 'www', 'www', 'www', 'www'], right: ['www', 'wwk', 'www', 'www', 'www', 'www'] } },
    beak: { size: [4, 2, 2], base: 'y', faces: { bottom: paint(4, 2, 'Y') } },
    wattle: { size: [2, 2, 2], base: 'r' },
    body: { size: [6, 6, 8], base: 'w', faces: { ...sides(['wwwwwwww', 'wwwwwwww', 'wwwwwwww', 'wwwwwwww', 'wwwwwwww', 'gggggggg']), bottom: paint(6, 8, 'g') } },
    wing: { size: [1, 4, 6], base: 'w', faces: { left: ['wwwwww', 'wwwwww', 'wwwwww', 'gggggg'], right: ['wwwwww', 'wwwwww', 'wwwwww', 'gggggg'] } },
    leg: { size: [3, 5, 3], base: 'x', faces: sides(['.l.', '.l.', '.l.', '.l.', 'lll']) },
  },
};

export function Chicken({ wander, name }: { readonly wander: Wander; readonly name?: string }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const { skin, material } = useSkin(CHICKEN, { alphaTest: 0.5 });
  const materials = useMemo(() => [material], [material]);
  useAnimal(root, wander, legs, materials, 4, null, name, head, [0.4, 0.7]);

  return (
    <group ref={root} position={wander.home}>
      <Legs
        skin={skin}
        material={material}
        name="leg"
        legs={legs}
        spots={[
          [-1.5, -1],
          [1.5, -1],
        ]}
        top={5}
        drop={-2.5}
      />
      <Box skin={skin} name="body" at={[0, 8, 0]} material={material} />
      <Box skin={skin} name="wing" at={[-3.5, 9, 0]} material={material} />
      <Box skin={skin} name="wing" at={[3.5, 9, 0]} material={material} />
      <group ref={head} position={[0, 9 * PX, 4 * PX]}>
        <Box skin={skin} name="head" at={[0, 3, 0.5]} material={material} />
        <Box skin={skin} name="beak" at={[0, 3, 3]} material={material} />
        <Box skin={skin} name="wattle" at={[0, 1, 2]} material={material} />
      </group>
      {name && <NameTag text={name} y={1.05} />}
    </group>
  );
}

// the game's wolf: pale grey with a darker back, a thick mane over the shoulders, a long snout
// with a black nose; a tamed one wears the red collar and carries its tail high
const WOLF_PALETTE = {
  w: ['#d9d5d0', '#d1ccc6', '#e0ddd8', '#cbc6c0'],
  g: ['#aaa49d', '#9e9891', '#b3ada6'],
  m: ['#ece9e5', '#e5e1dc'],
  k: '#262626',
  c: ['#b3312c', '#a02b26'],
};

function wolfArt(collar: boolean): SkinArt {
  const ring = collar ? 'c' : '.';
  return {
    palette: WOLF_PALETTE,
    boxes: {
      head: { size: [6, 6, 4], base: 'w', faces: { front: ['wwwwww', 'wwwwww', 'wkwwkw', 'wwwwww', 'wwwwww', 'mmmmmm'], top: paint(6, 4, 'w', [[1, 0, 4, 2, 'g']]), back: paint(6, 6, 'g') } },
      ear: { size: [2, 2, 1], base: 'g' },
      snout: { size: [3, 3, 4], base: 'm', faces: { front: ['wkw', 'mmm', 'mmm'], top: ['www', 'www', 'www', 'wkw'] } },
      body: { size: [6, 6, 9], base: 'w', faces: { ...sides(paint(9, 6, 'w', [[0, 0, 9, 2, 'g']])), top: paint(6, 9, 'g'), bottom: paint(6, 9, 'm') } },
      mane: {
        size: [8, 7, 6],
        base: 'w',
        faces: {
          left: Array.from({ length: 7 }, (_, row) => (row < 2 ? 'g' : ring) + (row < 2 ? 'ggggg' : '.....')),
          right: Array.from({ length: 7 }, (_, row) => (row < 2 ? 'ggggg' : '.....') + (row < 2 ? 'g' : ring)),
          top: [...paint(8, 5, 'g'), (collar ? 'c' : 'g').repeat(8)],
          bottom: [ring.repeat(8)],
          front: [ring.repeat(8), ...Array.from({ length: 5 }, () => `${ring}......${ring}`), ring.repeat(8)],
        },
      },
      leg: { size: [2, 8, 2], base: 'w', faces: { ...sides(['ww', 'ww', 'ww', 'ww', 'ww', 'ww', 'mm', 'mm']), bottom: ['mm', 'mm'] } },
      tail: { size: [2, 8, 2], base: 'w', faces: sides(['gg', 'gg', 'ww', 'ww', 'ww', 'ww', 'mm', 'mm']) },
    },
  };
}

const WOLF = wolfArt(false);
const WOLF_TAME = wolfArt(true);

export function Wolf({ wander, tamed = false, name }: { readonly wander: Wander; readonly tamed?: boolean; readonly name?: string }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const { skin, material } = useSkin(tamed ? WOLF_TAME : WOLF);
  const materials = useMemo(() => [material], [material]);
  useAnimal(root, wander, legs, materials, 8, null, name, head, [0.6, 0.85]);

  return (
    <group ref={root} position={wander.home}>
      <Legs
        skin={skin}
        material={material}
        name="leg"
        legs={legs}
        spots={[
          [-1.5, -7],
          [1.5, -7],
          [1.5, 4],
          [-1.5, 4],
        ]}
        top={8}
        drop={-4}
      />
      <Box skin={skin} name="body" at={[0, 10, -4.5]} material={material} />
      <Box skin={skin} name="mane" at={[0, 10.5, 3]} material={material} />
      {/* a wild wolf's tail droops; a tamed one's stands out behind it */}
      <group position={[0, 12 * PX, -8 * PX]} rotation={[tamed ? 1.73 : Math.PI / 5, 0, 0]}>
        <Box skin={skin} name="tail" at={[0, -4, 0]} material={material} />
      </group>
      <group ref={head} position={[0, 10.5 * PX, 7 * PX]}>
        <Box skin={skin} name="head" material={material} />
        <Box skin={skin} name="ear" at={[-2, 4, -0.5]} material={material} />
        <Box skin={skin} name="ear" at={[2, 4, -0.5]} material={material} />
        <Box skin={skin} name="snout" at={[0, -1.5, 3]} material={material} />
      </group>
      {name && <NameTag text={name} y={1.3} />}
    </group>
  );
}

// the game's tabby cat: brown-grey fur with dark stripes, a pale belly and paws, green eyes and a
// pink nose; the ocelot's model at four fifths of its size
const CAT_SIDE = Array.from({ length: 6 }, (_, row) => (row > 3 ? 'l'.repeat(16) : Array.from({ length: 16 }, (_, col) => (col % 3 === 1 && row < 3 ? 's' : 'f')).join('')));
const CAT: SkinArt = {
  palette: {
    f: ['#8e7a64', '#86725c', '#97836c'],
    s: ['#554434', '#4d3d2e'],
    l: ['#cdbca5', '#c4b39b'],
    e: '#63b83a',
    k: '#1d1d1d',
    n: '#e3a0a0',
    m: ['#d6c6b0', '#cfbfa8'],
  },
  boxes: {
    head: {
      size: [5, 4, 5],
      base: 'f',
      faces: { front: ['sfsfs', 'ekfke', 'fffff', 'flllf'], top: ['fsfsf', 'fsfsf', 'fffff', 'fsfsf', 'fffff'], left: ['sffsf', 'fffff', 'ffsff', 'lllll'], right: ['fsffs', 'fffff', 'ffsff', 'lllll'], bottom: paint(5, 5, 'l') },
    },
    nose: { size: [3, 2, 2], base: 'm', faces: { front: ['mnm', 'mmm'] } },
    ear: { size: [1, 1, 2], base: 's' },
    body: {
      size: [4, 6, 16],
      base: 'f',
      faces: {
        top: Array.from({ length: 16 }, (_, row) => (row % 3 === 0 ? 'ssss' : 'ffff')),
        left: CAT_SIDE,
        right: CAT_SIDE,
        bottom: paint(4, 16, 'l'),
      },
    },
    hind: { size: [2, 6, 2], base: 'f', faces: { ...sides(['ff', 'ss', 'ff', 'ff', 'ss', 'll']), bottom: ['ll', 'll'] } },
    front: { size: [2, 10, 2], base: 'f', faces: { ...sides(['ff', 'ff', 'ss', 'ff', 'ff', 'ss', 'ff', 'ff', 'll', 'll']), bottom: ['ll', 'll'] } },
    tail1: { size: [1, 8, 1], base: 'f', faces: sides(['f', 'f', 's', 'f', 'f', 's', 'f', 'f']) },
    tail2: { size: [1, 8, 1], base: 'f', faces: { ...sides(['s', 'f', 'f', 's', 'f', 'f', 's', 's']), bottom: ['s'] } },
  },
};

export function Cat({ wander, name }: { readonly wander: Wander; readonly name?: string }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const { skin, material } = useSkin(CAT);
  const materials = useMemo(() => [material], [material]);
  useAnimal(root, wander, legs, materials, 10, null, name, head, [0.6, 0.7]);

  return (
    <group ref={root} position={wander.home}>
      <group scale={0.8}>
        <Legs
          skin={skin}
          material={material}
          name="hind"
          legs={legs}
          spots={[
            [-1.1, -7],
            [1.1, -7],
          ]}
          top={6}
          drop={-3}
        />
        <Legs
          skin={skin}
          material={material}
          name="front"
          legs={legs}
          spots={[
            [1.2, 4],
            [-1.2, 4],
          ]}
          top={9.9}
          drop={-5}
          first={2}
        />
        <Box skin={skin} name="body" at={[0, 7, -1]} material={material} />
        {/* the tail curls: down and back, then back and up */}
        <group position={[0, 9 * PX, -8 * PX]} rotation={[0.9, 0, 0]}>
          <Box skin={skin} name="tail1" at={[0, -4, -0.5]} material={material} />
        </group>
        <group position={[0, 4 * PX, -14 * PX]} rotation={[1.73, 0, 0]}>
          <Box skin={skin} name="tail2" at={[0, -4, -0.5]} material={material} />
        </group>
        <group ref={head} position={[0, 9 * PX, 9 * PX]}>
          <Box skin={skin} name="head" at={[0, 0, 0.5]} material={material} />
          <Box skin={skin} name="nose" at={[0, -1, 3]} material={material} />
          <Box skin={skin} name="ear" at={[-1.5, 2.5, -1]} material={material} />
          <Box skin={skin} name="ear" at={[1.5, 2.5, -1]} material={material} />
        </group>
      </group>
      {name && <NameTag text={name} y={1} />}
    </group>
  );
}

// the game's brown horse: a long body, the neck raised at thirty degrees with a dark mane down
// its back, a darker muzzle, hooves, and the whole model at eleven tenths
const HORSE: SkinArt = {
  palette: {
    b: ['#7a5236', '#714b31', '#835a3b', '#6a452c'],
    d: ['#5a3a24', '#523520'],
    m: ['#2f2016', '#281b12', '#382619'],
    h: ['#3b3b3b', '#333333'],
    e: '#121212',
    n: ['#4a3120', '#432c1c'],
    N: '#1e140d',
  },
  boxes: {
    body: { size: [10, 10, 22], base: 'b', faces: { bottom: paint(10, 22, 'd') } },
    neck: { size: [4, 12, 7], base: 'b' },
    head: { size: [6, 5, 7], base: 'b', faces: { left: paint(7, 5, 'b', [[2, 1, 1, 1, 'e']]), right: paint(7, 5, 'b', [[4, 1, 1, 1, 'e']]) } },
    mouth: { size: [4, 5, 5], base: 'b', faces: { front: ['bbbb', 'nnnn', 'NnnN', 'nnnn', 'nnnn'], left: paint(5, 5, 'b', [[0, 1, 2, 4, 'n']]), right: paint(5, 5, 'b', [[3, 1, 2, 4, 'n']]), bottom: paint(4, 5, 'n') } },
    mane: { size: [2, 16, 2], base: 'm' },
    ear: { size: [2, 3, 1], base: 'b', faces: sides(['dd', 'bb', 'bb']) },
    tail: { size: [3, 14, 4], base: 'm' },
    leg: { size: [4, 11, 4], base: 'b', faces: { ...sides(paint(4, 11, 'b', [[0, 7, 4, 2, 'd'], [0, 9, 4, 2, 'h']])), bottom: paint(4, 4, 'h') } },
  },
};

export function Horse({ wander, name }: { readonly wander: Wander; readonly name?: string }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const { skin, material } = useSkin(HORSE);
  const materials = useMemo(() => [material], [material]);
  useAnimal(root, wander, legs, materials, 20, null, name, head, [1.4, 1.6]);

  return (
    <group ref={root} position={wander.home}>
      <group scale={1.1}>
        <Legs
          skin={skin}
          material={material}
          name="leg"
          legs={legs}
          spots={[
            [-3, -8],
            [3, -8],
            [3, 9.9],
            [-3, 9.9],
          ]}
          top={10}
          drop={-4.49}
        />
        <Box skin={skin} name="body" at={[0, 16, 1]} material={material} />
        <group position={[0, 18 * PX, -7 * PX]} rotation={[Math.PI / 6, 0, 0]}>
          <Box skin={skin} name="tail" at={[0, -7, -2]} material={material} />
        </group>
        <group ref={head} position={[0, 20 * PX, 12 * PX]}>
          <group rotation={[Math.PI / 6, 0, 0]}>
            <Box skin={skin} name="neck" at={[0, 0, -1.5]} material={material} />
            <Box skin={skin} name="mane" at={[0, 3, -6]} material={material} />
            <Box skin={skin} name="head" at={[0, 8.5, -1.5]} material={material} />
            <Box skin={skin} name="mouth" at={[0, 8.5, 4.5]} material={material} />
            <Box skin={skin} name="ear" at={[-1.55, 11.5, -4.5]} material={material} />
            <Box skin={skin} name="ear" at={[1.55, 11.5, -4.5]} material={material} />
          </group>
        </group>
      </group>
      {name && <NameTag text={name} y={2.2} />}
    </group>
  );
}

// the game's iron golem: pale riveted iron with vines grown over it, a long face with a big
// nose and dark red eyes, a narrow waist and arms down to its knees
const GOLEM: SkinArt = {
  palette: {
    i: ['#dcd6cd', '#d2cbc1', '#e3ded6', '#c9c1b6', '#bfb6aa'],
    d: ['#a49a8e', '#9a9084', '#aea498'],
    k: ['#5e5850', '#4f4a43'],
    v: ['#4b7b2c', '#3e6b23', '#5b8b35'],
    r: '#7a1f16',
  },
  boxes: {
    head: {
      size: [8, 10, 8],
      base: 'i',
      faces: {
        front: ['iiiiiiii', 'iiiiiiii', 'iiiiiiii', 'dddddddd', 'irkiikri', 'iiiiiiii', 'iiiiiiii', 'iiiiiiii', 'iikkkkii', 'iiiiiiii'],
        left: paint(8, 10, 'i', [[5, 0, 1, 6, 'v'], [4, 5, 1, 2, 'v']]),
        top: paint(8, 8, 'i', [[1, 1, 6, 1, 'd'], [5, 0, 1, 4, 'v']]),
      },
    },
    nose: { size: [2, 4, 2], base: 'i', faces: { bottom: ['dd', 'dd'], front: ['ii', 'ii', 'ii', 'dd'] } },
    body: {
      size: [18, 12, 11],
      base: 'i',
      faces: {
        front: paint(18, 12, 'i', [[0, 0, 18, 1, 'd'], [8, 1, 2, 11, 'd'], [2, 2, 1, 6, 'v'], [3, 7, 2, 1, 'v'], [13, 3, 1, 7, 'v'], [14, 9, 2, 1, 'v'], [5, 10, 2, 1, 'k'], [11, 5, 1, 1, 'k']]),
        back: paint(18, 12, 'i', [[8, 0, 2, 12, 'd'], [3, 3, 1, 5, 'v'], [15, 6, 1, 6, 'v'], [12, 2, 2, 1, 'k']]),
        left: paint(11, 12, 'i', [[4, 0, 1, 7, 'v'], [5, 6, 2, 1, 'v']]),
        right: paint(11, 12, 'i', [[7, 2, 1, 8, 'v']]),
        top: paint(18, 11, 'i', [[2, 4, 12, 1, 'v'], [13, 0, 1, 5, 'v'], [8, 0, 2, 11, 'd']]),
      },
    },
    waist: { size: [10, 6, 7], base: 'd', faces: { front: paint(10, 6, 'd', [[2, 1, 6, 3, 'i'], [7, 2, 1, 4, 'v']]) } },
    arm: {
      size: [4, 30, 6],
      base: 'i',
      faces: {
        front: paint(4, 30, 'i', [[0, 0, 4, 2, 'd'], [1, 2, 1, 12, 'v'], [2, 9, 1, 3, 'v'], [0, 26, 4, 1, 'd'], [0, 29, 4, 1, 'k']]),
        left: paint(6, 30, 'i', [[0, 0, 6, 2, 'd'], [2, 4, 1, 7, 'v'], [0, 26, 6, 1, 'd']]),
        right: paint(6, 30, 'i', [[0, 0, 6, 2, 'd'], [3, 12, 1, 6, 'v'], [0, 26, 6, 1, 'd']]),
        back: paint(4, 30, 'i', [[0, 0, 4, 2, 'd'], [0, 26, 4, 1, 'd']]),
        bottom: paint(4, 6, 'd'),
      },
    },
    leg: { size: [6, 16, 5], base: 'i', faces: { ...sides(paint(6, 16, 'i', [[1, 3, 1, 8, 'v'], [2, 10, 1, 2, 'v'], [0, 15, 6, 1, 'd']])), bottom: paint(6, 5, 'd') } },
  },
};

export function IronGolem({ wander, name }: { readonly wander: Wander; readonly name?: string }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  // legs, then arms: each arm swings with the opposite leg
  const limbs = useRef<(THREE.Group | null)[]>([]);
  const { skin, material } = useSkin(GOLEM);
  const materials = useMemo(() => [material], [material]);
  useAnimal(root, wander, limbs, materials, 100, null, name, head, [1.4, 2.7]);

  return (
    <group ref={root} position={wander.home}>
      <Legs
        skin={skin}
        material={material}
        name="leg"
        legs={limbs}
        spots={[
          [-4.5, 0],
          [4.5, 0],
        ]}
        top={13}
        drop={-5}
      />
      <Legs
        skin={skin}
        material={material}
        name="arm"
        legs={limbs}
        spots={[
          [11, 0],
          [-11, 0],
        ]}
        top={31}
        drop={-12.5}
        first={2}
      />
      <Box skin={skin} name="waist" at={[0, 18.5, 0]} material={material} />
      <Box skin={skin} name="body" at={[0, 27, 0.5]} material={material} />
      <group ref={head} position={[0, 31 * PX, 2 * PX]}>
        <Box skin={skin} name="head" at={[0, 7, 1.5]} material={material} />
        <Box skin={skin} name="nose" at={[0, 3, 6.5]} material={material} />
      </group>
      {name && <NameTag text={name} y={3} />}
    </group>
  );
}
