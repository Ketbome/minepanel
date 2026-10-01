'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { cue } from '../end-audio';
import type { Loot } from '../engine/Drops';
import { runtime } from '../engine/runtime';
import { Glow, useMonster, zombieArms } from './monsters';
import { useAnimal } from './overworld';
import { PX, type Wander } from './parts';
import { Box, paint, sides, skinOf, useSkin, type SkinArt } from './skins';

// The Sift's mobs. The Blub is the one Mojang has shown for the game: a boxy, pale blue,
// rabbit-like thing with long ears and wide dark eyes. The Sifter is ours: Mojang has not shown
// one for the game yet, so it is a hunched walker of bone grown over with sculk.

const BLUB: SkinArt = {
  palette: {
    b: ['#9fd3f0', '#a8d9f2', '#97cbe8'],
    t: ['#cfeaf8', '#d8eff9', '#c6e5f6'],
    s: ['#7fb5d6', '#86bcdc'],
    w: ['#eef7fc', '#e6f3fa'],
    e: '#4a2340',
    E: '#7a4468',
    m: '#5a2b4c',
    i: ['#c4e6f7', '#bfe3f6'],
  },
  boxes: {
    body: {
      size: [10, 8, 10],
      base: 'b',
      faces: {
        front: ['tttttttttt', 'bbbbbbbbbb', 'bEeebbEeeb', 'beeebbeeeb', 'bbbbmmbbbb', 'bbbbbbbbbb', 'swwwwwwwws', 'ssssssssss'],
        left: paint(10, 8, 'b', [[0, 0, 10, 1, 't'], [0, 7, 10, 1, 's']]),
        right: paint(10, 8, 'b', [[0, 0, 10, 1, 't'], [0, 7, 10, 1, 's']]),
        back: paint(10, 8, 'b', [[0, 0, 10, 1, 't'], [0, 7, 10, 1, 's']]),
        top: paint(10, 10, 't'),
        bottom: paint(10, 10, 's'),
      },
    },
    ear: { size: [2, 7, 1], base: 'b', faces: { front: ['bb', 'bi', 'bi', 'bi', 'bi', 'bi', 'bb'], top: ['tt'] } },
    foot: { size: [3, 2, 3], base: 's' },
  },
};

export function Blub({ wander, baby = false }: { readonly wander: Wander; readonly baby?: boolean }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const ears = useRef<(THREE.Group | null)[]>([]);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const hop = useRef({ phase: 0, twitchAt: 2, twitch: 0, ear: 0 });
  const { skin, material } = useSkin(BLUB);
  const materials = useMemo(() => [material], [material]);
  const control = useAnimal(root, wander, legs, materials, baby ? 3 : 6, 'squeak', undefined, undefined, baby ? [0.4, 0.5] : [0.7, 0.9]);
  // it moves in hops like a rabbit, and now and then flicks an ear
  useFrame((_, delta) => {
    const h = hop.current;
    const moving = Math.hypot(control.vel.x, control.vel.z) > 0.3 && !control.dead;
    h.phase += Math.min(delta, 0.05) * (moving ? 10 : 0);
    if (body.current) {
      body.current.position.y = moving ? Math.abs(Math.sin(h.phase)) * 0.2 : 0;
      body.current.rotation.x = moving ? -Math.cos(h.phase * 2) * 0.1 : 0;
    }
    if (runtime.time > h.twitchAt) {
      h.twitchAt = runtime.time + 1.5 + Math.random() * 4;
      h.twitch = runtime.time;
      h.ear = Math.random() < 0.5 ? 0 : 1;
    }
    const flick = Math.max(0, 1 - (runtime.time - h.twitch) / 0.25);
    ears.current.forEach((ear, index) => ear?.rotation.set(index === h.ear ? -flick * 0.5 : 0, 0, (index ? -1 : 1) * 0.08));
  });

  return (
    <group ref={root} position={wander.home}>
      <group ref={body} scale={baby ? 0.55 : 1}>
        {[
          [-3, -3],
          [3, -3],
          [3, 3],
          [-3, 3],
        ].map(([x, z], index) => (
          <group
            key={index}
            ref={(leg) => {
              legs.current[index] = leg;
            }}
            position={[x * PX, 2 * PX, z * PX]}
          >
            <Box skin={skin} name="foot" at={[0, -1, 0]} material={material} />
          </group>
        ))}
        <Box skin={skin} name="body" at={[0, 6, 0]} material={material} />
        {[-2.5, 2.5].map((x, index) => (
          <group
            key={x}
            ref={(ear) => {
              ears.current[index] = ear;
            }}
            position={[x * PX, 10 * PX, -1 * PX]}
          >
            <Box skin={skin} name="ear" at={[0, 3.5, 0]} material={material} />
          </group>
        ))}
      </group>
    </group>
  );
}

const SIFTER: SkinArt = {
  palette: {
    w: ['#e8e0c8', '#ded5bb', '#efe8d4'],
    k: ['#0d2a30', '#0f3037', '#0a2227'],
    t: ['#1f7f73', '#23897b', '#1b7368'],
    c: '#29dfeb',
    x: '#05100f',
  },
  boxes: {
    head: {
      size: [8, 7, 8],
      base: 'w',
      faces: {
        front: ['wwwwwwww', 'wtwwwwww', 'wxxwwxxw', 'wxxwwxxw', 'wwwxxwww', 'wwkwkwkw', 'wwwwwwww'],
        top: paint(8, 8, 'w', [[1, 1, 3, 2, 't'], [5, 4, 2, 3, 'k'], [2, 5, 1, 1, 'c']]),
        back: paint(8, 7, 'w', [[0, 0, 8, 3, 'k'], [3, 1, 1, 1, 'c']]),
      },
    },
    body: {
      size: [8, 11, 5],
      base: 'k',
      faces: {
        front: ['kkkwwkkk', 'kwwwwwwk', 'kkkkkkck', 'kwwwwwwk', 'kkkkkkkk', 'kwwwwwwk', 'kckkkkkk', 'kkwwwwkk', 'kkkkkkkk', 'kkkttkkk', 'kkkkkkkk'],
        back: paint(8, 11, 'k', [[3, 0, 2, 11, 'w'], [1, 4, 1, 1, 'c'], [6, 8, 1, 1, 'c']]),
      },
    },
    arm: { size: [3, 16, 3], base: 'w', faces: { ...sides(paint(3, 16, 'w', [[0, 3, 3, 2, 'k'], [1, 4, 1, 1, 'c'], [0, 9, 3, 1, 'k'], [0, 14, 3, 2, 't']])), bottom: paint(3, 3, 't') } },
    leg: { size: [3, 12, 3], base: 'k', faces: { ...sides(paint(3, 12, 'k', [[1, 0, 1, 5, 'w'], [0, 5, 3, 2, 'w'], [1, 8, 1, 1, 'c']])), bottom: paint(3, 3, 'w') } },
  },
};

const SIFTER_EYES: SkinArt = {
  palette: { x: 'rgba(0,0,0,0)', e: '#7ff6ff' },
  boxes: { eyes: { size: [8, 2, 0.2], base: 'x', faces: { front: ['.ee..ee.', '.ee..ee.'] } } },
};

const BONES: readonly Loot[] = [{ item: 'bone', min: 0, max: 2 }];

export function Sifter({ wander, onDeath }: { readonly wander: Wander; readonly onDeath?: () => void }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const arms = useRef<(THREE.Group | null)[]>([]);
  const { material } = useSkin(SIFTER);
  const materials = useMemo(() => [material], [material]);
  const { state } = useMonster(root, wander, legs, materials, { hp: 24, strike: 4, cause: 'sifter', size: [0.7, 1.9], speed: 2.6, onDeath, loot: BONES }, head);
  useFrame(() => zombieArms(arms.current, state.current.hunting, state.current.swingAt));
  const skin = skinOf(SIFTER);

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
      {/* hunched: everything above the hips leans forward */}
      <group position={[0, 12 * PX, 0]} rotation={[0.45, 0, 0]}>
        <Box skin={skin} name="body" at={[0, 5.5, 0]} material={material} />
        {[-5.5, 5.5].map((x, index) => (
          <group
            key={x}
            ref={(arm) => {
              arms.current[index] = arm;
            }}
            position={[x * PX, 10 * PX, 0]}
          >
            <Box skin={skin} name="arm" at={[0, -6.5, 0]} material={material} />
          </group>
        ))}
        <group ref={head} position={[0, 11 * PX, 1 * PX]}>
          <Box skin={skin} name="head" at={[0, 3.5, 0]} material={material} />
          <Glow art={SIFTER_EYES} at={[0, 4, 4.12]} />
        </group>
      </group>
    </group>
  );
}

// The Carapace's turtle, ours too: a big slow tortoise under a shell of bone plates with sculk in
// the seams. Hit it and it pulls its head and legs in for a few seconds instead of running.
const TURTLE: SkinArt = {
  palette: {
    w: ['#e8e0c8', '#ded5bb', '#efe8d4'],
    k: ['#0d2a30', '#0f3037'],
    c: '#29dfeb',
    g: ['#5d7f7a', '#56766f', '#638680'],
    d: ['#3f5a55', '#3a524e'],
    b: ['#b9c7c0', '#aebcb5'],
  },
  boxes: {
    shell: {
      size: [16, 5, 20],
      base: 'w',
      faces: {
        ...sides(paint(20, 5, 'w', [[0, 4, 20, 1, 'k'], [6, 0, 1, 4, 'k'], [13, 0, 1, 4, 'k'], [3, 1, 1, 1, 'c'], [16, 2, 1, 1, 'c']])),
        front: paint(16, 5, 'w', [[0, 4, 16, 1, 'k'], [5, 0, 1, 4, 'k'], [10, 0, 1, 4, 'k']]),
        back: paint(16, 5, 'w', [[0, 4, 16, 1, 'k'], [5, 0, 1, 4, 'k'], [10, 0, 1, 4, 'k'], [7, 1, 1, 1, 'c']]),
        bottom: paint(16, 20, 'b'),
      },
    },
    dome: {
      size: [12, 4, 15],
      base: 'w',
      faces: {
        top: paint(12, 15, 'w', [[0, 5, 12, 1, 'k'], [0, 10, 12, 1, 'k'], [6, 0, 1, 15, 'k'], [3, 2, 1, 1, 'c'], [9, 7, 1, 1, 'c'], [2, 12, 1, 1, 'c']]),
        ...sides(paint(15, 4, 'w', [[5, 0, 1, 4, 'k'], [10, 0, 1, 4, 'k']])),
      },
    },
    head: { size: [6, 5, 7], base: 'g', faces: { front: ['gggggg', 'gggggg', 'gggggg', 'gddddg', 'dddddd'], top: paint(6, 7, 'g', [[2, 2, 2, 3, 'd']]) } },
    neck: { size: [4, 4, 4], base: 'g' },
    leg: { size: [4, 5, 4], base: 'g', faces: { ...sides(['gggg', 'gggg', 'gdgd', 'gggg', 'dddd']), bottom: paint(4, 4, 'd') } },
    tail: { size: [2, 2, 3], base: 'g' },
  },
};

const TURTLE_EYES: SkinArt = {
  palette: { x: 'rgba(0,0,0,0)', e: '#7ff6ff' },
  boxes: { eyes: { size: [6, 1, 0.2], base: 'x', faces: { front: ['e....e'] } } },
};

const HIDE_S = 5;

export function Turtle({ wander, baby = false }: { readonly wander: Wander; readonly baby?: boolean }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const tuck = useRef({ until: 0, amount: 0 });
  const { skin, material } = useSkin(TURTLE);
  const materials = useMemo(() => [material], [material]);
  const control = useAnimal(root, wander, legs, materials, baby ? 10 : 30, null, undefined, head, baby ? [0.6, 0.5] : [1.3, 1.2], {
    hit: () => {
      tuck.current.until = runtime.time + HIDE_S;
      cue('hit');
      return true;
    },
  });
  useFrame((_, delta) => {
    const t = tuck.current;
    const hiding = runtime.time < t.until && !control.dead;
    control.stopped = hiding;
    t.amount += ((hiding ? 1 : 0) - t.amount) * Math.min(1, delta * 8);
    const out = 1 - t.amount * 0.85;
    if (head.current) {
      head.current.scale.setScalar(out);
      head.current.position.z = (8 - t.amount * 6) * PX;
    }
    legs.current.forEach((leg) => leg?.scale.set(out, out, out));
  });

  return (
    <group ref={root} position={wander.home}>
      <group scale={baby ? 0.5 : 1.3}>
        {[
          [-6, -7],
          [6, -7],
          [6, 7],
          [-6, 7],
        ].map(([x, z], index) => (
          <group
            key={index}
            ref={(leg) => {
              legs.current[index] = leg;
            }}
            position={[x * PX, 5 * PX, z * PX]}
          >
            <Box skin={skin} name="leg" at={[0, -2.5, 0]} material={material} />
          </group>
        ))}
        <Box skin={skin} name="shell" at={[0, 8.5, 0]} material={material} />
        <Box skin={skin} name="dome" at={[0, 13, 0]} material={material} />
        <Box skin={skin} name="tail" at={[0, 6, -11]} material={material} />
        <group ref={head} position={[0, 7 * PX, 8 * PX]}>
          <Box skin={skin} name="neck" at={[0, 0, 2]} material={material} />
          <Box skin={skin} name="head" at={[0, 1.5, 6]} material={material} />
          <Glow art={TURTLE_EYES} at={[0, 3, 9.6]} />
        </group>
      </group>
    </group>
  );
}
