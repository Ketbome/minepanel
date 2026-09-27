'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { runtime } from '../engine/runtime';
import { Glow, useHop, useMonster, zombieArms, type SlimeSize } from './monsters';
import { useAnimal } from './overworld';
import { flat, Part, PX, type Wander } from './parts';
import { Box, paint, sides, useSkin, type SkinArt } from './skins';

// The Nether's other mobs, boxed like the game's models: zombified piglins, hoglins, magma
// cubes, wither skeletons and striders. The monsters only walk (or hop), spot you and hit.

// the game's zombified piglin: a piglin gone grey-green and rotten, the skull showing through one
// side of the face, ribs through the chest, still holding its golden sword
const ZOMBIFIED_PIGLIN: SkinArt = {
  palette: {
    p: ['#e0a095', '#d89486', '#e6ab9f', '#d38d80'],
    d: ['#b8766b', '#ad6c61'],
    g: ['#8aa866', '#7a9a58', '#96b372'],
    b: ['#e3dccb', '#d6cebb'],
    K: '#1c1210',
    k: '#3a1f1c',
    n: ['#efb9ae', '#e8ada1'],
    w: '#d8d4c8',
    l: ['#6b4a2b', '#5c3f24', '#735032'],
    y: '#f2c230',
    B: ['#3f2a1a', '#35231a'],
  },
  boxes: {
    head: {
      size: [10, 8, 8],
      base: 'p',
      faces: {
        front: ['bbbpppppgp', 'bbbbpppppp', 'bkkbppkkkp', 'bKKbppwkpp', 'bbbbpppppp', 'bbbppppgpp', 'bkbkppppdp', 'bbbbdddddp'],
        right: paint(8, 8, 'p', [[4, 0, 4, 8, 'b'], [5, 2, 2, 2, 'K'], [1, 5, 2, 2, 'g']]),
        left: paint(8, 8, 'p', [[2, 1, 2, 2, 'g'], [5, 5, 2, 1, 'g']]),
        top: paint(10, 8, 'p', [[0, 2, 4, 6, 'b'], [6, 1, 2, 2, 'g']]),
      },
    },
    snout: { size: [4, 4, 1], base: 'n', faces: { front: ['nnnn', 'knnk', 'nnnn', 'nnnn'] } },
    ear: { size: [1, 5, 4], base: 'p', faces: sides(['p', 'g', 'd', 'd', 'd']) },
    body: {
      size: [8, 12, 4],
      base: 'p',
      faces: {
        front: paint(8, 12, 'p', [[1, 1, 3, 5, 'K'], [1, 1, 3, 1, 'b'], [1, 3, 3, 1, 'b'], [1, 5, 3, 1, 'b'], [5, 2, 2, 2, 'g'], [0, 6, 8, 6, 'l'], [0, 7, 8, 1, 'B'], [3, 7, 2, 1, 'y']]),
        back: paint(8, 12, 'p', [[2, 2, 3, 2, 'g'], [0, 6, 8, 6, 'l'], [0, 7, 8, 1, 'B']]),
        left: paint(4, 12, 'p', [[0, 6, 4, 6, 'l'], [0, 7, 4, 1, 'B']]),
        right: paint(4, 12, 'p', [[0, 6, 4, 6, 'l'], [0, 7, 4, 1, 'B']]),
      },
    },
    arm: { size: [4, 12, 4], base: 'p', faces: sides(paint(4, 12, 'p', [[1, 3, 2, 3, 'g'], [0, 9, 1, 2, 'b']])) },
    leg: { size: [4, 12, 4], base: 'l', faces: { ...sides(paint(4, 12, 'l', [[1, 2, 2, 2, 'g'], [0, 8, 4, 4, 'B']])), bottom: paint(4, 4, 'B') } },
  },
};

export function ZombifiedPiglin({ wander, onDeath }: { readonly wander: Wander; readonly onDeath?: () => void }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const arms = useRef<(THREE.Group | null)[]>([]);
  const { skin, material } = useSkin(ZOMBIFIED_PIGLIN);
  const materials = useMemo(() => [material], [material]);
  const { state } = useMonster(root, wander, legs, materials, { hp: 20, strike: 5, cause: 'zombifiedPiglin', size: [0.6, 1.95], speed: 3, onDeath }, head);
  const gold = flat('#f2c230');
  const guard = flat('#b8860b');
  const handle = flat('#5c3f24');
  const tusk = flat('#f2eadc');
  useFrame(() => zombieArms(arms.current, state.current.hunting, state.current.swingAt));

  return (
    <group ref={root} position={wander.home}>
      {[-2, 2].map((x, index) => (
        <group
          key={x}
          ref={(leg) => {
            legs.current[index] = leg;
          }}
          position={[x * PX, 12 * PX, 0]}
        >
          <Box skin={skin} name="leg" at={[0, -6, 0]} material={material} />
        </group>
      ))}
      <Box skin={skin} name="body" at={[0, 18, 0]} material={material} />
      {[-5, 5].map((x, index) => (
        <group
          key={x}
          ref={(arm) => {
            arms.current[index] = arm;
          }}
          position={[x * PX, 22 * PX, 0]}
        >
          <Box skin={skin} name="arm" at={[Math.sign(x), -4, 0]} material={material} />
          {x < 0 && (
            <group position={[-1 * PX, -9 * PX, 2 * PX]} rotation={[Math.PI / 2, 0, 0]}>
              <Part size={[1, 3, 1]} at={[0, -1, 0]} material={handle} />
              <Part size={[4, 1, 1]} at={[0, 1, 0]} material={guard} />
              <Part size={[1, 9, 2]} at={[0, 6, 0]} material={gold} />
            </group>
          )}
        </group>
      ))}
      <group ref={head} position={[0, 24 * PX, 0]}>
        <Box skin={skin} name="head" at={[0, 4, 0]} material={material} />
        <Box skin={skin} name="snout" at={[0, 2, 4.5]} material={material} />
        <Part size={[1, 2, 1]} at={[-2.5, 1, 4.5]} material={tusk} />
        <Part size={[1, 2, 1]} at={[2.5, 1, 4.5]} material={tusk} />
        <group position={[-4.5 * PX, 6 * PX, 0]} rotation={[0, 0, -Math.PI / 6]}>
          <Box skin={skin} name="ear" at={[-0.5, -2.5, 0]} material={material} />
        </group>
        <group position={[4.5 * PX, 6 * PX, 0]} rotation={[0, 0, Math.PI / 6]}>
          <Box skin={skin} name="ear" at={[0.5, -2.5, 0]} material={material} />
        </group>
      </group>
    </group>
  );
}

// the game's hoglin: a huge pinkish boar with a bristly dark mane along its neck, the long head
// hung low with a flat snout, two bone tusks and flat ears
const MANE = Array.from({ length: 10 }, (_, row) => Array.from({ length: 19 }, (_, col) => (row >= (col * 7) % 5 ? 'b' : 'x')).join(''));
const HOGLIN: SkinArt = {
  palette: {
    p: ['#c98c73', '#c08268', '#d0967c', '#b87a61'],
    d: ['#9c6450', '#a36a55'],
    b: ['#5c3b28', '#4d3021', '#6b4632'],
    t: ['#eee6d6', '#e3dac8'],
    s: ['#e3a591', '#dc9c88'],
    k: '#2a1a14',
    w: '#f0e8e0',
    h: ['#3d2a20', '#34241b'],
    x: 'rgba(0,0,0,0)',
  },
  boxes: {
    head: {
      size: [14, 6, 19],
      base: 'p',
      faces: {
        front: paint(14, 6, 's', [[3, 2, 2, 2, 'k'], [9, 2, 2, 2, 'k'], [0, 0, 14, 1, 'p']]),
        left: paint(19, 6, 'p', [[14, 1, 1, 1, 'w'], [15, 1, 1, 1, 'k'], [0, 0, 3, 6, 's']]),
        right: paint(19, 6, 'p', [[4, 1, 1, 1, 'w'], [3, 1, 1, 1, 'k'], [16, 0, 3, 6, 's']]),
        top: paint(14, 19, 'p', [[5, 0, 4, 8, 'b'], [2, 10, 2, 3, 'd'], [10, 6, 2, 2, 'd']]),
        bottom: paint(14, 19, 'd'),
      },
    },
    ear: { size: [6, 1, 4], base: 'p', faces: { bottom: paint(6, 4, 'd') } },
    horn: { size: [2, 11, 2], base: 't' },
    body: {
      size: [16, 14, 26],
      base: 'p',
      faces: {
        ...sides(paint(26, 14, 'p', [[0, 0, 26, 2, 'b'], [4, 5, 3, 2, 'd'], [15, 8, 4, 2, 'd'], [9, 11, 2, 1, 'd']])),
        top: paint(16, 26, 'p', [[5, 0, 6, 26, 'b'], [2, 6, 2, 4, 'd'], [12, 15, 2, 3, 'd']]),
        bottom: paint(16, 26, 'd'),
      },
    },
    // the mane is a flat card of bristles standing on the neck
    mane: { size: [0, 10, 19], base: 'x', faces: { left: MANE, right: MANE.map((row) => [...row].reverse().join('')) } },
    front: { size: [6, 14, 6], base: 'p', faces: { ...sides(paint(6, 14, 'p', [[0, 12, 6, 2, 'h']])), bottom: paint(6, 6, 'h') } },
    hind: { size: [5, 11, 5], base: 'p', faces: { ...sides(paint(5, 11, 'p', [[0, 9, 5, 2, 'h']])), bottom: paint(5, 5, 'h') } },
  },
};

export function Hoglin({ wander, onDeath }: { readonly wander: Wander; readonly onDeath?: () => void }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const { skin, material } = useSkin(HOGLIN, { alphaTest: 0.5 });
  const materials = useMemo(() => [material], [material]);
  useMonster(root, wander, legs, materials, { hp: 40, strike: 6, cause: 'hoglin', size: [1.4, 1.4], speed: 3, onDeath }, head);

  return (
    <group ref={root} position={wander.home}>
      {(
        [
          [-5, -10, 'hind', 11, -5.5],
          [5, -10, 'hind', 11, -5.5],
          [4, 8.5, 'front', 14, -7],
          [-4, 8.5, 'front', 14, -7],
        ] as const
      ).map(([x, z, name, top, drop], index) => (
        <group
          key={index}
          ref={(leg) => {
            legs.current[index] = leg;
          }}
          position={[x * PX, top * PX, z * PX]}
        >
          <Box skin={skin} name={name} at={[0, drop, 0]} material={material} />
        </group>
      ))}
      <Box skin={skin} name="body" at={[0, 17, 0]} material={material} />
      <Box skin={skin} name="mane" at={[0, 26, 6.5]} material={material} />
      <group ref={head} position={[0, 22 * PX, 12 * PX]}>
        <group rotation={[0.8727, 0, 0]}>
          <Box skin={skin} name="head" at={[0, 0, 9.5]} material={material} />
          <group position={[-6 * PX, 2 * PX, 3 * PX]} rotation={[0, 0, 0.6981]}>
            <Box skin={skin} name="ear" at={[-3, 0.5, 0]} material={material} />
          </group>
          <group position={[6 * PX, 2 * PX, 3 * PX]} rotation={[0, 0, -0.6981]}>
            <Box skin={skin} name="ear" at={[3, 0.5, 0]} material={material} />
          </group>
          <Box skin={skin} name="horn" at={[-7, 3.5, 12]} material={material} />
          <Box skin={skin} name="horn" at={[7, 3.5, 12]} material={material} />
        </group>
      </group>
    </group>
  );
}

// the game's magma cube: eight dark slabs veined with lava around a glowing core; the slabs
// spread apart while it is in the air
const SLAB_ROWS = ['kkrokkrk', 'rokkkork', 'kyyrryyk', 'koykkyok', 'kkkookkk', 'rkokkokr', 'kokrrkok', 'krkookrk'];
const shift = (row: string, by: number) => row.slice(by) + row.slice(0, by);
const MAGMA: SkinArt = {
  palette: {
    k: ['#2e0f0a', '#3a140d', '#24100b', '#43170f'],
    r: ['#6e2213', '#5c1a0f'],
    o: ['#e2621c', '#f07a24', '#d9561a'],
    y: ['#f9c23c', '#ffd84a'],
  },
  boxes: Object.fromEntries(
    SLAB_ROWS.map((row, index) => {
      const plain = shift(SLAB_ROWS[(index + 3) % 8], 2).replace(/y/g, 'o');
      return [
        `s${index}`,
        {
          size: [8, 1, 8] as const,
          base: 'k',
          faces: {
            front: [row],
            back: [plain],
            left: [shift(plain, 3)],
            right: [shift(plain, 5)],
            ...(index === 0 ? { top: paint(8, 8, 'k', [[1, 2, 3, 1, 'o'], [5, 1, 1, 3, 'o'], [2, 5, 4, 1, 'r'], [6, 6, 1, 1, 'o']]) } : {}),
            ...(index === 7 ? { bottom: paint(8, 8, 'k', [[2, 2, 4, 1, 'r'], [3, 5, 1, 2, 'o']]) } : {}),
          },
        },
      ];
    })
  ),
};

const MAGMA_CORE: SkinArt = {
  palette: { c: ['#fca13a', '#ffb84d', '#f58f2c'], y: '#ffe07a' },
  boxes: { core: { size: [4, 4, 4], base: 'c', faces: sides(['cyyc', 'yccy', 'ycyy', 'cyyc']) } },
};

export function MagmaCube({ wander, size = 2, onDeath }: { readonly wander: Wander; readonly size?: SlimeSize; readonly onDeath?: () => void }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const slabs = useRef<(THREE.Group | null)[]>([]);
  const none = useRef<(THREE.Group | null)[]>([]);
  const { skin, material } = useSkin(MAGMA);
  const materials = useMemo(() => [material], [material]);
  const width = 0.52 * size;
  const { control } = useMonster(root, wander, none, materials, { hp: size * size, strike: size + 2, cause: 'magmaCube', size: [width, width], speed: 2.4, onDeath });
  const hop = useHop(root, control, wander, { jump: 7 + size, reach: 2.4 + size * 0.6, rest: 1.4 });

  useFrame(() => {
    const air = hop.current.air;
    slabs.current.forEach((slab, index) => slab?.position.setY((7.5 - index + (4 - index) * air * 1.7) * PX));
  });

  return (
    <group ref={root} position={wander.home}>
      <group ref={body} scale={size}>
        {SLAB_ROWS.map((_, index) => (
          <group
            key={index}
            ref={(slab) => {
              slabs.current[index] = slab;
            }}
            position={[0, (7.5 - index) * PX, 0]}
          >
            <Box skin={skin} name={`s${index}`} material={material} />
          </group>
        ))}
        <Glow art={MAGMA_CORE} name="core" at={[0, 4, 0]} />
      </group>
    </group>
  );
}

// the game's wither skeleton: the skeleton's model a fifth taller, near-black bones, and a stone
// sword; both arms reach out for you when it has seen you
const WITHER_SKELETON: SkinArt = {
  palette: {
    b: ['#4a4a4a', '#424242', '#525252', '#3a3a3a'],
    k: ['#121212', '#171717', '#0e0e0e'],
    j: '#262626',
  },
  boxes: {
    head: { size: [8, 8, 8], base: 'b', faces: { front: ['bbbbbbbb', 'bbbbbbbb', 'bbbbbbbb', 'bkkbbkkb', 'bkkbbkkb', 'bbbkkbbb', 'bkkkkkkb', 'bbkbkbkb'] } },
    body: {
      size: [8, 12, 4],
      base: 'k',
      faces: sides(['bbbbbbbb', 'kkkbbkkk', 'bbbbbbbb', 'kkkbbkkk', 'bbbbbbbb', 'kkkbbkkk', 'kbbbbbbk', 'kkkbbkkk', 'kkkbbkkk', 'kkkbbkkk', 'kbbbbbbk', 'kbbkkbbk']),
    },
    limb: { size: [2, 12, 2], base: 'b', faces: sides(['bb', 'bb', 'bb', 'bb', 'bb', 'jj', 'bb', 'bb', 'bb', 'bb', 'bb', 'jj']) },
  },
};

export function WitherSkeleton({ wander, onDeath }: { readonly wander: Wander; readonly onDeath?: () => void }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const arms = useRef<(THREE.Group | null)[]>([]);
  const { skin, material } = useSkin(WITHER_SKELETON);
  const materials = useMemo(() => [material], [material]);
  const { state } = useMonster(root, wander, legs, materials, { hp: 20, strike: 8, cause: 'witherSkeleton', size: [0.7, 2.4], speed: 3, onDeath }, head);
  const blade = flat('#8f8f8f');
  const edge = flat('#6b6b6b');
  const handle = flat('#5c3f24');

  // the game's melee skeleton: arms straight out while it hunts, the sword arm chopping on a hit
  useFrame(() => {
    const s = state.current;
    const chop = Math.max(0, 1 - (runtime.time - s.swingAt) / 0.3);
    arms.current.forEach((arm, index) => {
      if (!arm) return;
      const goal = s.hunting ? -Math.PI / 2 + (index === 0 ? Math.sin(chop * Math.PI) * 1.2 : 0) : 0;
      arm.rotation.x += (goal - arm.rotation.x) * 0.3;
    });
  });

  return (
    <group ref={root} position={wander.home}>
      <group scale={1.2}>
        {[-2, 2].map((x, index) => (
          <group
            key={x}
            ref={(leg) => {
              legs.current[index] = leg;
            }}
            position={[x * PX, 12 * PX, 0]}
          >
            <Box skin={skin} name="limb" at={[0, -6, 0]} material={material} />
          </group>
        ))}
        <Box skin={skin} name="body" at={[0, 18, 0]} material={material} />
        {[-5, 5].map((x, index) => (
          <group
            key={x}
            ref={(arm) => {
              arms.current[index] = arm;
            }}
            position={[x * PX, 22 * PX, 0]}
          >
            <Box skin={skin} name="limb" at={[0, -4, 0]} material={material} />
            {x < 0 && (
              <group position={[0, -9 * PX, 1 * PX]} rotation={[Math.PI / 2, 0, 0]}>
                <Part size={[1, 3, 1]} at={[0, -1, 0]} material={handle} />
                <Part size={[4, 1, 1]} at={[0, 1, 0]} material={handle} />
                <Part size={[1, 9, 2]} at={[0, 6, 0]} material={blade} />
                <Part size={[1.1, 1, 1]} at={[0, 10.5, 0]} material={edge} />
              </group>
            )}
          </group>
        ))}
        <group ref={head} position={[0, 24 * PX, 0]}>
          <Box skin={skin} name="head" at={[0, 4, 0]} material={material} />
        </group>
      </group>
    </group>
  );
}

// the game's strider: a red box of a body with a wide mouth and small eyes on two long legs, and
// six flat tufts of hair standing out of its sides
const STRIDER: SkinArt = {
  palette: {
    r: ['#a8413c', '#9e3a36', '#b04842', '#963431'],
    d: ['#7a2a26', '#6e2622'],
    w: '#f1dfd3',
    k: '#2a0f0f',
    m: '#4a1515',
    l: ['#8a3350', '#7d2d49', '#96395a'],
    L: '#5a1f35',
    h: ['#c95a55', '#b84d49', '#d46660'],
    x: 'rgba(0,0,0,0)',
  },
  boxes: {
    body: {
      size: [16, 14, 16],
      base: 'r',
      faces: {
        front: paint(16, 14, 'r', [[3, 3, 2, 2, 'w'], [4, 4, 1, 1, 'k'], [11, 3, 2, 2, 'w'], [11, 4, 1, 1, 'k'], [2, 8, 12, 1, 'd'], [3, 9, 10, 1, 'm'], [4, 10, 8, 1, 'd']]),
        top: paint(16, 16, 'r', [[3, 3, 2, 2, 'd'], [10, 6, 3, 2, 'd'], [5, 11, 2, 2, 'd']]),
        bottom: paint(16, 16, 'd'),
      },
    },
    bristle: { size: [12, 0, 16], base: 'x', faces: { top: Array.from({ length: 16 }, (_, row) => (row % 2 ? 'x'.repeat(12) : row % 4 ? 'xhhhhhhhhhhx' : 'h'.repeat(12))), bottom: Array.from({ length: 16 }, (_, row) => (row % 2 ? 'x'.repeat(12) : 'h'.repeat(12))) } },
    leg: { size: [4, 16, 4], base: 'l', faces: { ...sides(paint(4, 16, 'l', [[0, 4, 4, 1, 'L'], [0, 9, 4, 1, 'L'], [0, 14, 4, 2, 'L']])), bottom: paint(4, 4, 'L') } },
  },
};

// [pivot x, pivot y, roll] of the six tufts, bottom to top on the right and top to bottom on the left
const BRISTLES = [
  [-8, -4, -1.2217],
  [-8, 1, -1.1345],
  [-8, 5, -0.8727],
  [8, 6, 0.8727],
  [8, 2, 1.1345],
  [8, -3, 1.2217],
] as const;

export function Strider({ wander, name }: { readonly wander: Wander; readonly name?: string }) {
  const root = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const { skin, material } = useSkin(STRIDER, { alphaTest: 0.5 });
  const materials = useMemo(() => [material], [material]);
  useAnimal(root, wander, legs, materials, 20, null, name, undefined, [0.9, 1.7]);

  return (
    <group ref={root} position={wander.home}>
      {[-4, 4].map((x, index) => (
        <group
          key={x}
          ref={(leg) => {
            legs.current[index] = leg;
          }}
          position={[x * PX, 16 * PX, 0]}
        >
          <Box skin={skin} name="leg" at={[0, -8, 0]} material={material} />
        </group>
      ))}
      <group position={[0, 23 * PX, 0]}>
        <Box skin={skin} name="body" at={[0, -1, 0]} material={material} />
        {BRISTLES.map(([x, y, roll]) => (
          <group key={`${x}${y}`} position={[x * PX, y * PX, 8 * PX]} rotation={[0, 0, roll]}>
            <Box skin={skin} name="bristle" at={[Math.sign(x) * 6, 0, -8]} material={material} />
          </group>
        ))}
      </group>
    </group>
  );
}
