'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cue } from '../end-audio';
import { isBright } from '../engine/clock';
import { dropLoot, type Loot } from '../engine/Drops';
import { castBlocks, solidCell } from '../engine/raycast';
import { playerCenter, runtime } from '../engine/runtime';
import { useEndGame, type DeathCause } from '../store';
import { PX, useDamage, useMob, useMobTarget, type MobControl, type Wander } from './parts';
import { Box, paint, sides, skinOf, useSkin, type SkinArt } from './skins';
import { useSunBurn } from './sunburn';

// The Overworld's monsters, boxed like the game's models. For now they only walk, spot you
// within sixteen blocks, come for you and hit when close; slimes hop instead of walking.

const RANGE = 16;
const STRIKE_COOLDOWN = 1;
const center = new THREE.Vector3();
const toward = new THREE.Vector3();
const eye = new THREE.Vector3();

function sees(from: THREE.Vector3, range: number) {
  const world = runtime.world;
  playerCenter(center);
  const distance = from.distanceTo(center);
  if (!world || distance > range) return false;
  toward.copy(center).sub(from).normalize();
  return !castBlocks(world, from, toward, distance - 0.5, solidCell(world));
}

export interface MonsterOptions {
  readonly hp: number;
  // damage per hit; 0 never hurts (the smallest slimes)
  readonly strike: number;
  readonly cause: DeathCause;
  // hit box width and height in blocks
  readonly size: readonly [number, number];
  readonly speed?: number;
  readonly onDeath?: () => void;
  readonly loot?: readonly Loot[];
  // the undead catch fire by day under the open sky
  readonly burns?: boolean;
  // while calm (a spider by day) it leaves you alone until you hit it
  readonly calm?: () => boolean;
  // told when you hit it (zombified piglins call the others)
  readonly onHurt?: () => void;
}

// what every monster shares: the hit box, the hurt flash and death, and a plain hunt (spot you,
// walk up, hit, wait a second)
export function useMonster(root: React.RefObject<THREE.Group | null>, wander: Wander, legs: React.RefObject<(THREE.Group | null)[]>, materials: readonly THREE.MeshLambertMaterial[], { hp, strike, cause, size: [width, height], speed = 3, onDeath, loot, burns = false, calm, onHurt }: MonsterOptions, head?: React.RefObject<THREE.Group | null>) {
  const control = useMob(root, wander, legs, { half: Math.max(0.15, width / 2 - 0.05), height }, head);
  const damage = useDamage(root, materials, height);
  const state = useRef({ hp, strikeAt: 0, swingAt: -9, hunting: false, provoked: false });

  const harm = (amount: number) => {
    const s = state.current;
    if (control.dead) return;
    s.hp -= amount;
    damage.hurt();
    cue('hit');
    if (s.hp > 0) return;
    control.dead = true;
    const at = root.current?.position;
    if (loot && at) dropLoot(loot, at.clone().setY(at.y + 0.6));
    damage.die(onDeath);
  };

  useMobTarget(root, [width, height, width], {
    label: () => null,
    solid: true,
    hostile: true,
    hit: (amount) => {
      if (control.dead) return;
      state.current.provoked = true;
      onHurt?.();
      control.knock(runtime.player.pos);
      harm(amount);
    },
  });
  useSunBurn(root, () => control.dead, harm, burns);

  useFrame(() => {
    const group = root.current;
    const s = state.current;
    if (!group || control.dead) return;
    const game = useEndGame.getState();
    eye.copy(group.position).setY(group.position.y + height * 0.85);
    const distance = group.position.distanceTo(runtime.player.pos);
    s.hunting = !game.dead && (s.provoked || !calm?.()) && sees(eye, RANGE);
    control.chase = s.hunting ? runtime.player.pos : null;
    control.chaseSpeed = speed;
    control.lookAt = s.hunting ? runtime.player.eye : null;
    if (!s.hunting || strike <= 0 || distance > width / 2 + 1.2 || Math.abs(runtime.player.pos.y - group.position.y) > 1.5 || runtime.time < s.strikeAt) return;
    s.strikeAt = runtime.time + STRIKE_COOLDOWN;
    s.swingAt = runtime.time;
    game.hurt(strike, cause);
    toward.copy(runtime.player.pos).sub(group.position).setY(0).normalize();
    runtime.player.vel.addScaledVector(toward, 5).setY(4);
    cue('hit');
  });

  return { control, state };
}

// Slimes and magma cubes never walk: they wait on the ground, then hop toward where they are
// going (you, once they have seen you). Returns how far into the air they are, 0 to 1, for the
// squash and stretch.
export function useHop(root: React.RefObject<THREE.Group | null>, control: MobControl, wander: Wander, { jump, reach, rest }: { readonly jump: number; readonly reach: number; readonly rest: number }) {
  const hop = useRef({ next: 0.5 + Math.random() * rest, air: 0 });
  useFrame((_, delta) => {
    const group = root.current;
    const h = hop.current;
    if (!group || control.dead || !runtime.world) return;
    // useMob keeps the physics; the hops are all ours
    control.stopped = true;
    const grounded = control.vel.y === 0;
    h.air += ((grounded ? 0 : 1) - h.air) * Math.min(1, delta * 12);
    if (!grounded || runtime.time < h.next) return;
    h.next = runtime.time + (control.chase ? rest * 0.5 : rest) + Math.random() * rest;
    const goal = control.chase ?? toward.set(wander.home.x + (Math.random() - 0.5) * 2 * wander.radius, 0, wander.home.z + (Math.random() - 0.5) * 2 * wander.radius);
    toward.set(goal.x - group.position.x, 0, goal.z - group.position.z);
    if (toward.lengthSq() < 0.1) return;
    toward.normalize().multiplyScalar(reach);
    control.vel.set(toward.x, jump, toward.z);
  });
  return hop;
}

// what glows in the dark, like the game's emissive layers: eyes are a thin painted plate just in
// front of the face; lit by nothing, so the hurt flash leaves them alone
const glows = new Map<SkinArt, THREE.MeshBasicMaterial>();

export function Glow({ art, name = 'eyes', at }: { readonly art: SkinArt; readonly name?: string; readonly at: readonly [number, number, number] }) {
  let material = glows.get(art);
  if (!material) {
    material = new THREE.MeshBasicMaterial({ map: skinOf(art).texture, alphaTest: 0.5 });
    glows.set(art, material);
  }
  return <mesh geometry={skinOf(art).boxes[name]} material={material} position={[at[0] * PX, at[1] * PX, at[2] * PX]} />;
}

// the zombie's arms: out in front, a little inward, raised higher when it has seen you, swaying
// as it walks, and a chop when it hits
export function zombieArms(arms: readonly (THREE.Group | null)[], hunting: boolean, swingAt: number) {
  const t = runtime.time * 20;
  const chop = Math.max(0, 1 - (runtime.time - swingAt) / 0.3);
  const lift = -Math.PI / (hunting ? 1.5 : 2.25) + Math.sin(chop * Math.PI) * 0.8;
  arms.forEach((arm, index) => {
    if (!arm) return;
    const side = index === 0 ? 1 : -1;
    arm.rotation.set(lift + side * Math.sin(t * 0.067) * 0.05, side * 0.1, -side * (Math.cos(t * 0.09) * 0.05 + 0.05));
  });
}

// A biped wearing the game's humanoid boxes: head, body, arms at the shoulders and legs at the
// hips. The arms and legs register their groups for the walk and the zombie reach.
function Biped({ art, root, head, legs, arms, material, wander, children }: { readonly art: SkinArt; readonly root: React.RefObject<THREE.Group | null>; readonly head: React.RefObject<THREE.Group | null>; readonly legs: React.RefObject<(THREE.Group | null)[]>; readonly arms: React.RefObject<(THREE.Group | null)[]>; readonly material: THREE.Material; readonly wander: Wander; readonly children?: React.ReactNode }) {
  const skin = skinOf(art);
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
        </group>
      ))}
      <group ref={head} position={[0, 24 * PX, 0]}>
        <Box skin={skin} name="head" at={[0, 4, 0]} material={material} />
        {children}
      </group>
    </group>
  );
}

// the game's zombie: green skin, dark eyes and a frown, the cyan shirt with short sleeves, blue
// trousers and grey shoes
const ZOMBIE: SkinArt = {
  palette: {
    g: ['#5f9146', '#57883f', '#4f7e39', '#679b4d'],
    d: ['#44702f', '#3e6a2b'],
    k: ['#1c2a18', '#22321d'],
    c: ['#2c8a8c', '#288083', '#319597'],
    C: ['#216a6c', '#1e6264'],
    p: ['#3d3b8f', '#383685', '#434199'],
    P: '#2d2b6e',
    h: ['#4f4f4f', '#474747'],
  },
  boxes: {
    head: { size: [8, 8, 8], base: 'g', faces: { front: ['gdgggdgg', 'gggggggg', 'gggggggg', 'gddggddg', 'gkkggkkg', 'gggddggg', 'ggddddgg', 'gggggggg'], top: paint(8, 8, 'g', [[1, 1, 2, 2, 'd'], [5, 4, 2, 1, 'd']]) } },
    body: { size: [8, 12, 4], base: 'c', faces: { front: paint(8, 12, 'c', [[3, 0, 2, 1, 'g'], [0, 11, 8, 1, 'C'], [2, 4, 1, 1, 'C'], [5, 7, 1, 1, 'C']]), back: paint(8, 12, 'c', [[0, 11, 8, 1, 'C']]) } },
    arm: { size: [4, 12, 4], base: 'g', faces: { ...sides(paint(4, 12, 'g', [[0, 0, 4, 4, 'c'], [0, 3, 4, 1, 'C'], [0, 11, 4, 1, 'd']])), top: paint(4, 4, 'c'), bottom: paint(4, 4, 'd') } },
    leg: { size: [4, 12, 4], base: 'p', faces: { ...sides(paint(4, 12, 'p', [[0, 9, 4, 1, 'P'], [0, 10, 4, 2, 'h']])), bottom: paint(4, 4, 'h') } },
  },
};

// the game's drowned: teal, waterlogged skin, ragged clothes with seaweed caught in them, and
// eyes that glow cyan
const DROWNED: SkinArt = {
  palette: {
    s: ['#55a39a', '#4d998f', '#5dada3', '#48918a'],
    d: ['#3a7a73', '#346f69'],
    k: ['#1d3b38', '#224440'],
    c: ['#4f7f8f', '#467685', '#58899a'],
    p: ['#2f4f66', '#2a475c'],
    w: ['#3f7d34', '#356b2c', '#4a8a3c'],
  },
  boxes: {
    head: {
      size: [8, 8, 8],
      base: 's',
      faces: {
        front: ['wwsswwsw', 'swssssws', 'ssssssss', 'sddssdds', 'skksskks', 'ssssssss', 'sskkkkss', 'ssssssss'],
        top: paint(8, 8, 'w', [[2, 2, 3, 3, 's'], [6, 5, 2, 2, 's']]),
        left: paint(8, 8, 's', [[0, 0, 8, 2, 'w'], [2, 2, 1, 3, 'w']]),
        right: paint(8, 8, 's', [[0, 0, 8, 2, 'w'], [5, 2, 1, 4, 'w']]),
        back: paint(8, 8, 's', [[0, 0, 8, 3, 'w'], [3, 3, 2, 3, 'w']]),
      },
    },
    body: { size: [8, 12, 4], base: 'c', faces: { front: paint(8, 12, 'c', [[3, 0, 2, 2, 's'], [1, 6, 2, 3, 's'], [5, 8, 2, 4, 's'], [6, 1, 1, 6, 'w'], [0, 9, 1, 3, 'w']]), back: paint(8, 12, 'c', [[2, 3, 3, 2, 's'], [1, 8, 1, 4, 'w']]) } },
    arm: { size: [4, 12, 4], base: 's', faces: { ...sides(paint(4, 12, 's', [[0, 0, 4, 3, 'c'], [1, 3, 1, 5, 'w'], [0, 11, 4, 1, 'd']])), top: paint(4, 4, 'c') } },
    leg: { size: [4, 12, 4], base: 'p', faces: { ...sides(paint(4, 12, 'p', [[0, 8, 4, 4, 's'], [2, 6, 1, 4, 'w'], [0, 11, 4, 1, 'd']])), bottom: paint(4, 4, 'd') } },
  },
};

const DROWNED_EYES: SkinArt = {
  palette: { x: 'rgba(0,0,0,0)', e: '#8ef0e6' },
  boxes: { eyes: { size: [8, 1, 0.2], base: 'x', faces: { front: ['.ee..ee.'] } } },
};

const FLESH: readonly Loot[] = [{ item: 'rottenFlesh', min: 0, max: 2 }];

function useZombie(art: SkinArt, wander: Wander, options: MonsterOptions) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const arms = useRef<(THREE.Group | null)[]>([]);
  const { material } = useSkin(art);
  const materials = useMemo(() => [material], [material]);
  const { state } = useMonster(root, wander, legs, materials, options, head);
  useFrame(() => zombieArms(arms.current, state.current.hunting, state.current.swingAt));
  return { root, head, legs, arms, material };
}

export function Zombie({ wander, onDeath }: { readonly wander: Wander; readonly onDeath?: () => void }) {
  const parts = useZombie(ZOMBIE, wander, { hp: 20, strike: 3, cause: 'zombie', size: [0.6, 1.95], speed: 2.4, onDeath, loot: FLESH, burns: true });
  return <Biped art={ZOMBIE} wander={wander} {...parts} />;
}

export function Drowned({ wander, onDeath }: { readonly wander: Wander; readonly onDeath?: () => void }) {
  const parts = useZombie(DROWNED, wander, { hp: 20, strike: 3, cause: 'drowned', size: [0.6, 1.95], speed: 2.4, onDeath, loot: FLESH });
  return (
    <Biped art={DROWNED} wander={wander} {...parts}>
      <Glow art={DROWNED_EYES} at={[0, 3.5, 4.12]} />
    </Biped>
  );
}

// the game's zombie villager: a villager's head, nose and robe gone green, red eyes, and the
// zombie's arms reaching out of the sleeves
const ZOMBIE_VILLAGER: SkinArt = {
  palette: {
    g: ['#5f9146', '#57883f', '#4f7e39', '#679b4d'],
    n: ['#4f8440', '#4a7d3b'],
    b: '#2c4a22',
    r: '#c42a1c',
    k: '#1c2a18',
    o: ['#6b4a2b', '#634427', '#735031'],
    t: '#4a3219',
    l: ['#4e3524', '#553a28', '#47301f'],
    f: '#33231a',
  },
  boxes: {
    head: { size: [8, 10, 8], base: 'g', faces: { front: ['gggggggg', 'gggggggg', 'gggggggg', 'gbbbbbbg', 'gkrggrkg', 'gggggggg', 'gggggggg', 'gggggggg', 'gggggggg', 'gggggggg'] } },
    nose: { size: [2, 4, 2], base: 'n' },
    robe: { size: [9, 19, 7], base: 'o', faces: sides(paint(9, 19, 'o', [[0, 18, 9, 1, 't'], [4, 11, 1, 7, 't']])) },
    arm: { size: [4, 12, 4], base: 'o', faces: { ...sides(paint(4, 12, 'o', [[0, 7, 4, 1, 't'], [0, 8, 4, 4, 'g']])), bottom: paint(4, 4, 'g') } },
    leg: { size: [4, 12, 4], base: 'l', faces: { ...sides(paint(4, 12, 'l', [[0, 10, 4, 2, 'f']])), bottom: paint(4, 4, 'f') } },
  },
};

export function ZombieVillager({ wander, onDeath }: { readonly wander: Wander; readonly onDeath?: () => void }) {
  const { root, head, legs, arms, material } = useZombie(ZOMBIE_VILLAGER, wander, { hp: 20, strike: 3, cause: 'zombieVillager', size: [0.6, 1.95], speed: 2.4, onDeath, loot: FLESH, burns: true });
  const skin = skinOf(ZOMBIE_VILLAGER);
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
      <Box skin={skin} name="robe" at={[0, 15, 0]} material={material} />
      {[-5, 5].map((x, index) => (
        <group
          key={x}
          ref={(arm) => {
            arms.current[index] = arm;
          }}
          position={[x * PX, 22 * PX, 0]}
        >
          <Box skin={skin} name="arm" at={[Math.sign(x), -4, 0]} material={material} />
        </group>
      ))}
      <group ref={head} position={[0, 24 * PX, 0]}>
        <Box skin={skin} name="head" at={[0, 5, 0]} material={material} />
        <Box skin={skin} name="nose" at={[0, 1, 5]} material={material} />
      </group>
    </group>
  );
}

// the game's spider: a dark, hairy head and abdomen on a small neck, eight legs out to the
// sides, and eight red eyes glowing in the dark
const SPIDER: SkinArt = {
  palette: {
    b: ['#35291f', '#2e241b', '#3b2e23', '#281f17', '#3f3226'],
    h: ['#56463a', '#4d3f33', '#605043'],
    k: '#1a1411',
  },
  boxes: {
    head: { size: [8, 8, 8], base: 'b', faces: { front: ['bbhbbhbb', 'bbbbbbbb', 'bbkbbkbb', 'kbbbbbbk', 'bkkbbkkb', 'bkkbbkkb', 'bbbhhbbb', 'bbhbbhbb'] } },
    neck: { size: [6, 6, 6], base: 'b', faces: sides(['bhbbhb', 'bbbbbb', 'hbbbbh', 'bbbbbb', 'bbhhbb', 'bbbbbb']) },
    abdomen: {
      size: [10, 8, 12],
      base: 'b',
      faces: {
        top: paint(10, 12, 'b', [[4, 1, 2, 3, 'h'], [2, 4, 2, 2, 'h'], [6, 4, 2, 2, 'h'], [3, 7, 4, 1, 'h'], [4, 9, 2, 2, 'h'], [1, 10, 1, 1, 'h'], [8, 1, 1, 1, 'h']]),
        ...sides(paint(12, 8, 'b', [[1, 1, 1, 1, 'h'], [4, 3, 1, 1, 'h'], [8, 2, 1, 1, 'h'], [10, 5, 1, 1, 'h'], [2, 6, 1, 1, 'h'], [6, 6, 1, 1, 'h']])),
        back: paint(10, 8, 'b', [[2, 2, 1, 1, 'h'], [6, 4, 1, 1, 'h'], [4, 6, 2, 1, 'h']]),
      },
    },
    leg: { size: [16, 2, 2], base: 'b', faces: { ...sides(paint(16, 2, 'b', [[5, 0, 1, 2, 'h'], [10, 0, 1, 2, 'h']])), top: paint(16, 2, 'b', [[2, 0, 1, 1, 'h'], [5, 0, 1, 2, 'h'], [10, 0, 1, 2, 'h'], [13, 1, 1, 1, 'h']]) } },
  },
};

const SPIDER_EYES: SkinArt = {
  palette: { x: 'rgba(0,0,0,0)', r: '#d4161b', R: '#ff5147' },
  boxes: { eyes: { size: [8, 8, 0.2], base: 'x', faces: { front: ['........', '........', '..r..r..', 'r......r', '.rr..rr.', '.rR..Rr.', '........', '........'] } } },
};

// the game's leg rest pose: [x, z, yaw, roll] per leg, right side first, hind to front; the left
// side mirrors it
const SPIDER_LEGS = [
  [-2, -Math.PI / 4, Math.PI / 4],
  [-1, -0.3927, 0.5812],
  [0, 0.3927, 0.5812],
  [1, Math.PI / 4, Math.PI / 4],
] as const;
const PHASES = [0, Math.PI, Math.PI / 2, (3 * Math.PI) / 2];

export function Spider({ wander, onDeath }: { readonly wander: Wander; readonly onDeath?: () => void }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const none = useRef<(THREE.Group | null)[]>([]);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const walk = useRef(0);
  const { skin, material } = useSkin(SPIDER);
  const materials = useMemo(() => [material], [material]);
  const { control } = useMonster(root, wander, none, materials, { hp: 16, strike: 2, cause: 'spider', size: [1.4, 0.9], speed: 3.6, onDeath, calm: isBright }, head);

  // the game's scuttle: legs sweep back and forth in four pairs and lift off the ground in turn
  useFrame((_, delta) => {
    const speed = Math.hypot(control.vel.x, control.vel.z);
    walk.current += Math.min(delta, 0.05) * speed * 2.2;
    const amount = Math.min(1, speed / 2);
    const w = walk.current;
    legs.current.forEach((leg, index) => {
      if (!leg) return;
      const pair = index % 4;
      const side = index < 4 ? 1 : -1;
      const [, yaw, roll] = SPIDER_LEGS[pair];
      const sweep = -Math.cos(w * 2 + PHASES[pair]) * 0.4 * amount;
      const lift = Math.abs(Math.sin(w + PHASES[pair]) * 0.4) * amount;
      leg.rotation.set(0, side * (yaw - sweep), side * (roll - lift), 'ZYX');
    });
  });

  return (
    <group ref={root} position={wander.home}>
      {[1, -1].flatMap((side, sideIndex) =>
        SPIDER_LEGS.map(([z, yaw, roll], pair) => (
          <group
            key={`${side}${pair}`}
            ref={(leg) => {
              legs.current[sideIndex * 4 + pair] = leg;
            }}
            position={[-side * 4 * PX, 9 * PX, z * PX]}
            rotation={[0, side * yaw, side * roll, 'ZYX']}
          >
            <Box skin={skin} name="leg" at={[-side * 7, 0, 0]} material={material} />
          </group>
        ))
      )}
      <Box skin={skin} name="neck" at={[0, 9, 0]} material={material} />
      <Box skin={skin} name="abdomen" at={[0, 9, -9]} material={material} />
      <group ref={head} position={[0, 9 * PX, 3 * PX]}>
        <Box skin={skin} name="head" at={[0, 0, 4]} material={material} />
        <Glow art={SPIDER_EYES} at={[0, 0, 8.12]} />
      </group>
    </group>
  );
}

// the game's witch: a villager in a purple robe with a wart on the end of her nose and the tall
// crooked hat
const WITCH: SkinArt = {
  palette: {
    s: ['#bd8b72', '#b98a6c', '#c29276', '#b58266'],
    n: ['#a8765a', '#ae7b5e'],
    b: '#3f2a1e',
    w: '#e9e9e9',
    e: '#6a3a8a',
    m: '#4f7a2e',
    r: ['#4d2f63', '#472b5c', '#55356b'],
    t: '#2f1c3f',
    l: ['#2b1d33', '#31223a'],
    h: ['#231a2a', '#2a2032', '#1d1623'],
    H: '#3a2a45',
  },
  boxes: {
    head: { size: [8, 10, 8], base: 's', faces: { front: ['........', '........', '........', '.bbbbbb.', '.we..ew.', '........', '........', '........', '........', '........'] } },
    nose: { size: [2, 4, 2], base: 'n', faces: { bottom: ['nn', 'nn'] } },
    mole: { size: [0.5, 0.5, 0.5], base: 'm' },
    robe: { size: [9, 19, 7], base: 'r', faces: sides(paint(9, 19, 'r', [[0, 0, 9, 1, 't'], [0, 18, 9, 1, 't'], [4, 10, 1, 8, 't']])) },
    sleeve: { size: [4, 8, 4], base: 'r', faces: sides(paint(4, 8, 'r', [[0, 7, 4, 1, 't']])) },
    hands: { size: [8, 4, 4], base: 's' },
    leg: { size: [4, 12, 4], base: 'l' },
    brim: { size: [10, 2, 10], base: 'h', faces: sides(['HHHHHHHHHH', 'hhhhhhhhhh']) },
    crown: { size: [7, 4, 7], base: 'h', faces: sides(['hhhhhhh', 'hhhhhhh', 'hhhhhhh', 'HHHHHHH']) },
    tip: { size: [4, 4, 4], base: 'h' },
    point: { size: [1.5, 2.5, 1.5], base: 'h' },
  },
};

export function Witch({ wander, onDeath }: { readonly wander: Wander; readonly onDeath?: () => void }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const nose = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const { skin, material } = useSkin(WITCH);
  const materials = useMemo(() => [material], [material]);
  useMonster(root, wander, legs, materials, { hp: 26, strike: 3, cause: 'witch', size: [0.6, 1.95], speed: 2, onDeath }, head);

  // her nose wobbles, as in the game
  useFrame(() => {
    const t = runtime.time * 20 * 0.05;
    nose.current?.rotation.set((Math.sin(t) * 4.5 * Math.PI) / 180, 0, (-Math.cos(t) * 2.5 * Math.PI) / 180);
  });

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
      <Box skin={skin} name="robe" at={[0, 15, 0]} material={material} />
      <group position={[0, 21 * PX, 1 * PX]} rotation={[-0.75, 0, 0]}>
        <Box skin={skin} name="sleeve" at={[-6, -2, 0]} material={material} />
        <Box skin={skin} name="sleeve" at={[6, -2, 0]} material={material} />
        <Box skin={skin} name="hands" at={[0, -4, 0]} material={material} />
      </group>
      <group ref={head} position={[0, 24 * PX, 0]}>
        <Box skin={skin} name="head" at={[0, 5, 0]} material={material} />
        <group ref={nose} position={[0, 2 * PX, 0]}>
          <Box skin={skin} name="nose" at={[0, -1, 5]} material={material} />
          <Box skin={skin} name="mole" at={[0.5, -3.5, 6.25]} material={material} />
        </group>
        {/* the hat is four boxes, each tipped a little further back than the one below */}
        <group position={[-5 * PX, 10.03 * PX, 5 * PX]}>
          <Box skin={skin} name="brim" at={[5, -1, -5]} material={material} />
          <group position={[1.75 * PX, 4 * PX, -2 * PX]} rotation={[-0.05236, 0, -0.02618, 'ZYX']}>
            <Box skin={skin} name="crown" at={[3.5, -2, -3.5]} material={material} />
            <group position={[1.75 * PX, 4 * PX, -2 * PX]} rotation={[-0.10472, 0, -0.05236, 'ZYX']}>
              <Box skin={skin} name="tip" at={[2, -2, -2]} material={material} />
              <group position={[1.75 * PX, 2 * PX, -2 * PX]} rotation={[-0.20944, 0, -0.10472, 'ZYX']}>
                <Box skin={skin} name="point" at={[0.5, -1, -0.5]} material={material} />
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

// the game's slime: a see-through green cube around a solid core with two dark eyes and a mouth
const SLIME_SHELL: SkinArt = {
  palette: { o: ['#7ccf6a', '#76c763', '#84d673'], O: ['#9fe38f', '#98dd87'] },
  boxes: {
    shell: {
      size: [8, 8, 8],
      base: 'o',
      faces: (() => {
        const face = paint(8, 8, 'O', [[1, 1, 6, 6, 'o']]);
        return { ...sides(face), top: face, bottom: face };
      })(),
    },
  },
};

const SLIME: SkinArt = {
  palette: { i: ['#5aa84a', '#52a044', '#62b152'], k: ['#1f3d1b', '#244620'] },
  boxes: {
    core: { size: [6, 6, 6], base: 'i' },
    eye: { size: [2, 2, 2], base: 'k' },
    mouth: { size: [1, 1, 1], base: 'k' },
  },
};

export type SlimeSize = 1 | 2 | 4;

export function Slime({ wander, size = 2, onDeath }: { readonly wander: Wander; readonly size?: SlimeSize; readonly onDeath?: (at: THREE.Vector3) => void }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const none = useRef<(THREE.Group | null)[]>([]);
  const { skin, material } = useSkin(SLIME);
  const shell = useSkin(SLIME_SHELL, { transparent: true, opacity: 0.6, depthWrite: false });
  const materials = useMemo(() => [material, shell.material], [material, shell.material]);
  const width = 0.52 * size;
  const died = () => onDeath?.(root.current?.position.clone() ?? wander.home.clone());
  const { control } = useMonster(root, wander, none, materials, { hp: size * size, strike: size === 1 ? 0 : size, cause: 'slime', size: [width, width], speed: 2, onDeath: died });
  const hop = useHop(root, control, wander, { jump: 5 + size, reach: 2 + size * 0.6, rest: 1.2 });

  // stretched tall in the air, squashed flat on the ground, like the game's
  useFrame(() => {
    const k = 1 / (hop.current.air * 0.4 + 1);
    body.current?.scale.set(k * size, (size / k) * 0.999, k * size);
  });

  return (
    <group ref={root} position={wander.home}>
      <group ref={body} scale={size}>
        <Box skin={skin} name="core" at={[0, 4, 0]} material={material} />
        <Box skin={skin} name="eye" at={[-2.25, 5, 2.5]} material={material} />
        <Box skin={skin} name="eye" at={[2.25, 5, 2.5]} material={material} />
        <Box skin={skin} name="mouth" at={[0.5, 2.5, 3]} material={material} />
        <Box skin={shell.skin} name="shell" at={[0, 4, 0]} material={shell.material} />
      </group>
    </group>
  );
}

// the game's phantom: a flat, bony, blue-grey flyer with wide membrane wings in two joints, a
// tail in two pieces and glowing green eyes
const PHANTOM: SkinArt = {
  palette: {
    b: ['#3f4c73', '#3a466b', '#46547d', '#34405f'],
    m: ['#6f7fa6', '#67779e', '#7888b0'],
    v: ['#55638a', '#4e5c82'],
    r: ['#c7cfe0', '#bcc5d8'],
    k: '#1e2335',
  },
  boxes: {
    body: { size: [5, 3, 9], base: 'b', faces: { top: Array.from({ length: 9 }, () => 'bbrbb') } },
    tailBase: { size: [3, 2, 6], base: 'b', faces: { top: Array.from({ length: 6 }, () => 'brb') } },
    tailTip: { size: [1, 1, 6], base: 'b', faces: { back: ['r'] } },
    wingBase: { size: [6, 2, 9], base: 'm', faces: { top: paint(6, 9, 'm', [[0, 8, 6, 1, 'r'], [2, 2, 1, 6, 'v'], [4, 4, 1, 4, 'v']]), bottom: paint(6, 9, 'm', [[0, 0, 6, 1, 'r']]), front: paint(6, 2, 'r') } },
    wingTip: { size: [13, 1, 9], base: 'm', faces: { top: paint(13, 9, 'm', [[0, 8, 13, 1, 'r'], [3, 3, 1, 5, 'v'], [7, 2, 1, 6, 'v'], [10, 5, 1, 3, 'v'], [4, 2, 3, 1, 'v']]), bottom: paint(13, 9, 'm', [[0, 0, 13, 1, 'r']]), front: paint(13, 1, 'r') } },
    head: { size: [7, 3, 5], base: 'b', faces: { front: ['bbbbbbb', 'kkbbbkk', 'bbbbbbb'] } },
  },
};

const PHANTOM_EYES: SkinArt = {
  palette: { x: 'rgba(0,0,0,0)', e: '#7ef2c2' },
  boxes: { eyes: { size: [7, 3, 0.2], base: 'x', faces: { front: ['.......', 'ee...ee', '.......'] } } },
};

const SWOOP_S = 4;

// It circles over its spot and, when it sees you, now and then swoops down for a bite and climbs
// back up.
export function Phantom({ wander, onDeath }: { readonly wander: Wander; readonly onDeath?: () => void }) {
  const root = useRef<THREE.Group>(null);
  const wings = useRef<(THREE.Group | null)[]>([]);
  const tail = useRef<(THREE.Group | null)[]>([]);
  const { skin, material } = useSkin(PHANTOM);
  const materials = useMemo(() => [material], [material]);
  const damage = useDamage(root, materials, 0.5);
  const seed = useMemo(() => Math.random() * 100, []);
  const state = useRef({ hp: 20, dead: false, angle: seed, mode: 'circle' as 'circle' | 'swoop' | 'rise', swoopAt: 6 + Math.random() * 6, since: 0, vel: new THREE.Vector3() });

  const harm = (amount: number) => {
    const s = state.current;
    if (s.dead) return;
    s.hp -= amount;
    damage.hurt();
    cue('hit');
    if (s.hp > 0) return;
    s.dead = true;
    damage.die(onDeath);
  };

  useMobTarget(root, [0.9, 0.5, 0.9], {
    label: () => null,
    solid: true,
    hostile: true,
    hit: (amount) => {
      if (!state.current.dead) state.current.mode = 'rise';
      harm(amount);
    },
  });
  useSunBurn(root, () => state.current.dead, harm);

  useFrame((_, delta) => {
    const group = root.current;
    const s = state.current;
    if (!group) return;
    const t = runtime.time;
    // the game's flap: both joints beat together, the tail waves at twice the rate
    const f = (seed * 3 + t * 20) * 7.448451 * (Math.PI / 180);
    const beat = Math.cos(f) * (16 * Math.PI) / 180;
    wings.current.forEach((wing, index) => wing?.rotation.set(0, 0, index < 2 ? -beat : beat));
    tail.current.forEach((piece) => piece?.rotation.set((-(5 + Math.cos(f * 2) * 5) * Math.PI) / 180, 0, 0));
    if (s.dead || !runtime.world) return;
    const dt = Math.min(delta, 0.05);
    const radius = Math.max(4, wander.radius);
    const game = useEndGame.getState();
    playerCenter(center);
    if (s.mode === 'circle') {
      s.angle += (dt * wander.speed) / radius;
      toward.set(wander.home.x + Math.cos(s.angle) * radius, wander.home.y, wander.home.z + Math.sin(s.angle) * radius);
      if (t > s.swoopAt && !game.dead && sees(group.position, RANGE + 8)) {
        s.mode = 'swoop';
        s.since = t;
      }
    } else if (s.mode === 'swoop') {
      toward.copy(center);
      if (group.position.distanceTo(center) < 1.1) {
        game.hurt(2, 'phantom');
        cue('hit');
        s.mode = 'rise';
      } else if (t - s.since > SWOOP_S || game.dead) s.mode = 'rise';
    } else {
      toward.set(group.position.x, wander.home.y, group.position.z);
      if (Math.abs(group.position.y - wander.home.y) < 0.5) {
        s.mode = 'circle';
        s.swoopAt = t + 6 + Math.random() * 6;
      }
    }
    const speed = s.mode === 'swoop' ? 9 : 5;
    toward.sub(group.position);
    if (toward.lengthSq() > 1e-4) toward.normalize().multiplyScalar(speed);
    s.vel.lerp(toward, Math.min(1, dt * 2.5));
    group.position.addScaledVector(s.vel, dt);
    const flat = Math.hypot(s.vel.x, s.vel.z);
    if (flat > 0.2) group.rotation.y = Math.atan2(s.vel.x, s.vel.z);
    group.rotation.x = -Math.atan2(s.vel.y, flat) * 0.8;
  });

  return (
    <group ref={root} position={wander.home}>
      <group position={[0, 3.5 * PX, -2 * PX]} rotation={[-0.1, 0, 0]}>
        <Box skin={skin} name="body" at={[-0.5, 0.5, 3.5]} material={material} />
        <group
          ref={(piece) => {
            tail.current[0] = piece;
          }}
          position={[0, 2 * PX, -1 * PX]}
        >
          <Box skin={skin} name="tailBase" at={[-0.5, -1, -3]} material={material} />
          <group
            ref={(piece) => {
              tail.current[1] = piece;
            }}
            position={[0, -0.5 * PX, -6 * PX]}
          >
            <Box skin={skin} name="tailTip" at={[-0.5, -0.5, -3]} material={material} />
          </group>
        </group>
        {[1, -1].map((side, index) => (
          <group
            key={side}
            ref={(wing) => {
              wings.current[index * 2] = wing;
            }}
            position={[(side > 0 ? 2 : -3) * PX, 2 * PX, 8 * PX]}
          >
            <Box skin={skin} name="wingBase" at={[side * 3, -1, -4.5]} material={material} />
            <group
              ref={(wing) => {
                wings.current[index * 2 + 1] = wing;
              }}
              position={[side * 6 * PX, 0, 0]}
            >
              <Box skin={skin} name="wingTip" at={[side * 6.5, -0.5, -4.5]} material={material} />
            </group>
          </group>
        ))}
        <group position={[0, -1 * PX, 7 * PX]} rotation={[0.2, 0, 0]}>
          <Box skin={skin} name="head" at={[-0.5, 0.5, 2.5]} material={material} />
          <Glow art={PHANTOM_EYES} at={[-0.5, 0.5, 5.12]} />
        </group>
      </group>
    </group>
  );
}
