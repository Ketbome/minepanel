'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cue, type CueName } from '../end-audio';
import { explode } from '../engine/explode';
import { castBlocks, solidCell } from '../engine/raycast';
import { playerCenter, runtime } from '../engine/runtime';
import { BFUUNY, useEndGame } from '../store';
import { NameTag, PX, useDamage, useMob, useMobTarget, type Wander } from './parts';
import { Box, sides, useSkin, type BoxArt, type Palette, type SkinArt } from './skins';

// Overworld mobs: villagers that say "hmm", jeb_ the rainbow sheep, Toast the rabbit, a pig
// named after production and Kevin, a creeper who only wants a hug.

const center = new THREE.Vector3();
const toward = new THREE.Vector3();

export type Profession = 'librarian' | 'farmer' | 'nitwit' | 'mason';

function sees(from: THREE.Vector3, range: number) {
  const world = runtime.world;
  playerCenter(center);
  const distance = from.distanceTo(center);
  if (!world || distance > range) return false;
  toward.copy(center).sub(from).normalize();
  return !castBlocks(world, from, toward, distance - 0.5, solidCell(world));
}

// Villagers share the game's body: a tall bald head with a unibrow, green eyes and the big nose,
// a robe from the shoulders to the shins, arms folded in the sleeves and trousers underneath.
// The profession is in the robe and the hat.
const VILLAGER_PALETTE: Palette = {
  s: ['#bd8b72', '#b98a6c', '#c29276', '#b58266'],
  n: ['#a8765a', '#ae7b5e'],
  b: '#3f2a1e',
  w: '#e9e9e9',
  e: '#1f8a3a',
  l: ['#4e3524', '#553a28', '#47301f'],
  f: '#33231a',
};
const FACE = ['........', '........', '........', '.bbbbbb.', '.we..ew.', '........', '........', '........', '........', '........'];
const ROBE_HEM = [...Array.from({ length: 18 }, () => '.........'), 'ttttttttt'];

interface Robe {
  readonly palette: Palette;
  // the robe's front, 9 wide by 19 tall; the folded arms cover rows 2 to 9
  readonly front: readonly string[];
  readonly hat?: 'straw' | 'cap';
}

const ROBES: Record<Profession, Robe> = {
  // white with a crimson trim, and a crimson cap
  librarian: {
    palette: { r: ['#e8e4d8', '#ded9cb', '#efece2'], t: ['#8a1f24', '#9a262b'], d: '#c9c3b3', c: ['#8a1f24', '#7a1a1f', '#9a262b'], k: '#5e1418' },
    front: ['ttttttttt', ...Array.from({ length: 9 }, () => '.........'), ...Array.from({ length: 8 }, () => '....t....'), 'ttttttttt'],
    hat: 'cap',
  },
  // brown work robe with a belt, and a straw hat
  farmer: {
    palette: { r: ['#6b4a2b', '#634427', '#735031'], t: '#4a3219', d: '#523820', y: '#c9a23a', h: ['#d9b54a', '#c9a23a', '#e6c55c', '#bf9632'], k: '#8a6a24' },
    front: ['ddddddddd', ...Array.from({ length: 10 }, () => '.........'), 'ddddydddd', ...Array.from({ length: 6 }, () => '....d....'), 'ttttttttt'],
    hat: 'straw',
  },
  // the green robe of the one who has no job
  nitwit: {
    palette: { r: ['#3f7a3a', '#3a7135', '#468240'], t: '#2a5226', d: '#315f2c' },
    front: ['ddddddddd', ...Array.from({ length: 9 }, () => '.........'), ...Array.from({ length: 8 }, () => '....d....'), 'ttttttttt'],
  },
  // grey robe under a black leather apron
  mason: {
    palette: { r: ['#5a5a66', '#53535e', '#62626e'], t: '#3a3a42', d: '#474751', a: ['#1f1f24', '#26262c', '#1a1a1e'], g: '#6e6e78' },
    front: ['ddddddddd', '..g...g..', '..g...g..', '..g...g..', '..g...g..', '..g...g..', '..g...g..', '..g...g..', '.aaaaaaa.', '.aaaaaaa.', '.aaaaaaa.', '.aaaaaaa.', '.aaaaaaa.', '.aaaaaaa.', '.aaaaaaa.', '.aaaaaaa.', '.aaaaaaa.', '.aaaaaaa.', 'taaaaaaat'],
  },
};

function villagerArt({ palette, front, hat }: Robe): SkinArt {
  const boxes: Record<string, BoxArt> = {
    head: { size: [8, 10, 8], base: 's', faces: { front: FACE } },
    nose: { size: [2, 4, 2], base: 'n', faces: { bottom: ['bb', 'nn'] } },
    robe: { size: [9, 19, 7], base: 'r', faces: { ...sides(ROBE_HEM), front } },
    sleeve: { size: [4, 8, 4], base: 'r', faces: sides(['....', '....', '....', '....', '....', '....', '....', 'tttt']) },
    hands: { size: [8, 4, 4], base: 's' },
    leg: { size: [4, 12, 4], base: 'l', faces: { ...sides(['....', '....', '....', '....', '....', '....', '....', '....', '....', '....', 'ffff', 'ffff']), bottom: ['ffff', 'ffff', 'ffff', 'ffff'] } },
  };
  if (hat === 'straw') {
    const weave = Array.from({ length: 16 }, (_, row) => Array.from({ length: 16 }, (_, col) => ((row + col) % 4 === 0 ? 'k' : 'h')).join(''));
    boxes.crown = { size: [9, 4, 9], base: 'h', faces: sides(['hhhhhhhhh', 'hhhhhhhhh', 'hhhhhhhhh', 'ddddddddd']) };
    boxes.brim = { size: [16, 1, 16], base: 'h', faces: { top: weave, bottom: weave } };
  }
  if (hat === 'cap') boxes.cap = { size: [9, 3, 9], base: 'c', faces: sides(['ccccccccc', 'ccccccccc', 'kkkkkkkkk']) };
  return { palette: { ...VILLAGER_PALETTE, ...palette }, boxes };
}

const VILLAGERS: Record<Profession, SkinArt> = {
  librarian: villagerArt(ROBES.librarian),
  farmer: villagerArt(ROBES.farmer),
  nitwit: villagerArt(ROBES.nitwit),
  mason: villagerArt(ROBES.mason),
};

const SHAKE_S = 0.9;

export function Villager({ wander, profession, name }: { readonly wander: Wander; readonly profession: Profession; readonly name?: string }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const nod = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const talking = useRef(0);
  const shaking = useRef(0);
  const { skin, material } = useSkin(VILLAGERS[profession]);
  const materials = useMemo(() => [material], [material]);
  const control = useMob(root, wander, legs, { half: 0.3, height: 1.9 }, head);
  const damage = useDamage(root, materials, 1.9);
  // the game's "no": a quick shake of the head
  const refuse = () => {
    shaking.current = runtime.time + SHAKE_S;
    cue('villagerNo');
  };

  useFrame(() => {
    const group = root.current;
    if (!group) return;
    control.stopped = runtime.time < talking.current;
    // villagers glance at players who come close, like the game's
    control.lookAt = group.position.distanceTo(runtime.player.pos) < 6 ? runtime.player.eye : null;
    const left = shaking.current - runtime.time;
    if (nod.current) nod.current.rotation.y = left > 0 ? Math.sin(left * 24) * 0.4 * (left / SHAKE_S) : 0;
  });

  useMobTarget(root, [0.7, 1.95, 0.7], {
    label: () => (profession === 'librarian' ? 'librarian' : profession === 'nitwit' ? 'nitwit' : 'villager'),
    reach: 4,
    solid: true,
    hit: () => {
      damage.hurt();
      control.knock(runtime.player.pos);
      refuse();
    },
    use: () => {
      const game = useEndGame.getState();
      talking.current = runtime.time + 3;
      if (profession === 'nitwit') refuse();
      else cue('villager');
      if (profession === 'librarian') game.openPanel({ kind: 'trade' });
      else game.showActionBar(profession === 'nitwit' ? 'nitwitHmm' : profession === 'farmer' ? 'farmerHmm' : 'villagerHmm');
    },
  });

  return (
    <group ref={root} position={wander.home}>
      {name && <NameTag text={name} y={2.2} />}
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
      {/* arms folded into the sleeves, tipped forward like the game's */}
      <group position={[0, 21 * PX, 1 * PX]} rotation={[-0.75, 0, 0]}>
        <Box skin={skin} name="sleeve" at={[-6, -2, 0]} material={material} />
        <Box skin={skin} name="sleeve" at={[6, -2, 0]} material={material} />
        <Box skin={skin} name="hands" at={[0, -4, 0]} material={material} />
      </group>
      <group ref={head} position={[0, 24 * PX, 0]}>
        <group ref={nod}>
          <Box skin={skin} name="head" at={[0, 5, 0]} material={material} />
          <Box skin={skin} name="nose" at={[0, 1, 5]} material={material} />
          {skin.boxes.crown && <Box skin={skin} name="crown" at={[0, 9.5, 0]} material={material} />}
          {skin.boxes.brim && <Box skin={skin} name="brim" at={[0, 7.5, 0]} material={material} />}
          {skin.boxes.cap && <Box skin={skin} name="cap" at={[0, 10, 0]} material={material} />}
        </group>
      </group>
    </group>
  );
}

// animals share everything but their shape: wandering, panic when hit, and a death in the chat
// when they carry a name, the way the game reports named mobs; `size` is the hit box's width and
// height in blocks
export function useAnimal(
  root: React.RefObject<THREE.Group | null>,
  wander: Wander,
  legs: React.RefObject<(THREE.Group | null)[]>,
  materials: readonly THREE.MeshLambertMaterial[],
  hp: number,
  sound: CueName | null,
  name?: string,
  head?: React.RefObject<THREE.Group | null>,
  [width, height]: readonly [number, number] = [0.9, 1.2],
  // a golem fights back instead of fleeing, a wolf takes a bone: returning true skips the default
  hooks: { readonly hit?: () => boolean; readonly use?: () => boolean; readonly died?: () => void } = {}
) {
  const control = useMob(root, wander, legs, { half: width / 2 - 0.1, height }, head);
  const damage = useDamage(root, materials, height);
  const health = useRef(hp);
  useMobTarget(root, [width, height, width], {
    label: () => null,
    solid: true,
    use: () => {
      if (hooks.use?.()) return;
      if (sound) cue(sound);
    },
    hit: (amount) => {
      if (control.dead) return;
      health.current -= amount;
      if (sound) cue(sound);
      damage.hurt();
      control.knock(runtime.player.pos);
      if (!hooks.hit?.()) control.panicUntil = runtime.time + 4;
      if (health.current > 0) return;
      control.dead = true;
      damage.die();
      hooks.died?.();
      // a named pig always saw it coming
      if (name) useEndGame.getState().obituary(name, sound === 'oink' ? 'pigDown' : 'mobSlain');
    },
  });
  return control;
}

// jeb_'s wool is painted white and tinted, so the rainbow runs through the curls; the face and
// legs underneath are the game's pale sheep skin
const SHEEP_WOOL: SkinArt = {
  palette: { w: ['#ffffff', '#f4f4f4', '#ececec', '#fafafa', '#e2e2e2'], c: ['#d6d6d6', '#dcdcdc'] },
  boxes: {
    body: { size: [11.5, 9.5, 19.5], base: 'w', faces: { top: Array.from({ length: 20 }, (_, row) => (row % 3 === 1 ? 'wcwwcwwcwwcw' : '............')) } },
    cap: { size: [7.2, 7.2, 7.2], base: 'w' },
    fleece: { size: [5, 7, 5], base: 'w' },
  },
};

const SHEEP: SkinArt = {
  palette: { f: ['#d7c2ac', '#cfb9a2', '#dcc9b4'], w: '#f0f0f0', k: '#141414', n: '#d9909a', h: ['#6e5b4b', '#5f4e40'] },
  boxes: {
    face: { size: [6, 6, 8], base: 'f', faces: { front: ['......', '......', 'wk..kw', '......', '..nn..', '......'] } },
    leg: { size: [4, 12, 4], base: 'f', faces: { ...sides(['....', '....', '....', '....', '....', '....', '....', '....', '....', '....', '....', 'hhhh']), bottom: ['hhhh', 'hhhh', 'hhhh', 'hhhh'] } },
  },
};

const GRAZE_S = 2;

export function Sheep({ wander }: { readonly wander: Wander }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const graze = useRef({ next: 8 + Math.random() * 12, until: 0 });
  const fleece = useSkin(SHEEP_WOOL);
  const body = useSkin(SHEEP);
  const wool = fleece.material;
  const materials = useMemo(() => [wool, body.material], [wool, body.material]);
  const control = useAnimal(root, wander, legs, materials, 8, 'baa', 'jeb_', head);
  useFrame(() => {
    // jeb_: the game's own easter egg, a sheep that cycles through every wool color
    wool.color.setHSL((runtime.time * 0.12) % 1, 0.75, 0.6);
    const group = root.current;
    const world = runtime.world;
    const g = graze.current;
    if (!group || !world || control.dead) return;
    const t = runtime.time;
    // every so often an idle sheep on grass stops, drops its head and nibbles, like the game's
    const idle = Math.hypot(control.vel.x, control.vel.z) < 0.2 && t > control.panicUntil;
    if (t > g.next && t > g.until) {
      g.next = t + 20 + Math.random() * 20;
      const below = world.get(Math.round(group.position.x), Math.round(group.position.y - 0.5), Math.round(group.position.z));
      if (idle && below === 'grass') g.until = t + GRAZE_S;
    }
    if (t < control.panicUntil) g.until = 0;
    const left = g.until - t;
    control.stopped = left > 0;
    if (!head.current) return;
    // the head drops to the grass and pitches down, as the game's does
    const into = left > 0 ? Math.min(1, (GRAZE_S - left) / 0.25, left / 0.25) : 0;
    head.current.position.y = (18 - into * 9) * PX;
    head.current.rotation.x = into * (0.9 + Math.sin(t * 18) * 0.12);
  });

  return (
    <group ref={root} position={wander.home}>
      {[
        [-3, -7],
        [3, -7],
        [3, 5],
        [-3, 5],
      ].map(([x, z], index) => (
        <group
          key={index}
          ref={(leg) => {
            legs.current[index] = leg;
          }}
          position={[x * PX, 12 * PX, z * PX]}
        >
          <Box skin={body.skin} name="leg" at={[0, -6, 0]} material={body.material} />
          <Box skin={fleece.skin} name="fleece" at={[0, -3, 0]} material={wool} />
        </group>
      ))}
      <Box skin={fleece.skin} name="body" at={[0, 15, 0]} material={wool} />
      <group ref={head} position={[0, 18 * PX, 8 * PX]}>
        <Box skin={body.skin} name="face" at={[0, 1, 2]} material={body.material} />
        <Box skin={fleece.skin} name="cap" at={[0, 1, 1]} material={wool} />
      </group>
      <NameTag text="jeb_" y={1.75} />
    </group>
  );
}

// the game's pig: pink with a lighter snout, two nostrils and darker trotters
const PIG: SkinArt = {
  palette: {
    p: ['#f0a5a2', '#f0a5a2', '#eb9d9a', '#f4b0ad', '#e8938f'],
    s: ['#f6b9b6', '#f3b0ad'],
    n: '#8e4a47',
    w: '#f4f4f4',
    k: '#141414',
    h: ['#b86f6c', '#a9625f'],
  },
  boxes: {
    head: { size: [8, 8, 8], base: 'p', faces: { front: ['........', '........', '........', 'wk....kw', '........', '........', '........', '........'] } },
    snout: { size: [4, 3, 1], base: 's', faces: { front: ['ssss', 'nssn', 'ssss'] } },
    body: { size: [10, 8, 16], base: 'p' },
    leg: { size: [4, 6, 4], base: 'p', faces: { ...sides(['....', '....', '....', '....', '....', 'hhhh']), bottom: ['hhhh', 'hhhh', 'hhhh', 'hhhh'] } },
  },
};

export function Pig({ wander, name }: { readonly wander: Wander; readonly name: string }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const { skin, material } = useSkin(PIG);
  const materials = useMemo(() => [material], [material]);
  useAnimal(root, wander, legs, materials, 10, 'oink', name, head);

  return (
    <group ref={root} position={wander.home}>
      {[
        [-3, -7],
        [3, -7],
        [3, 5],
        [-3, 5],
      ].map(([x, z], index) => (
        <group
          key={index}
          ref={(leg) => {
            legs.current[index] = leg;
          }}
          position={[x * PX, 6 * PX, z * PX]}
        >
          <Box skin={skin} name="leg" at={[0, -3, 0]} material={material} />
        </group>
      ))}
      <Box skin={skin} name="body" at={[0, 10, 0]} material={material} />
      <group ref={head} position={[0, 12 * PX, 8 * PX]}>
        <Box skin={skin} name="head" at={[0, 0, 2]} material={material} />
        <Box skin={skin} name="snout" at={[0, -1.5, 6.5]} material={material} />
      </group>
      <NameTag text={name} y={1.3} />
    </group>
  );
}

// Toast, the game's own easter-egg rabbit: black fur with white patches, a white blaze down the
// face, amber eyes, one black ear and one white. The game draws rabbits at three fifths of their
// model, hunched: the body tips up toward the head, the big hind feet flat on the ground.
const TOAST: SkinArt = {
  palette: { k: ['#1b1b1b', '#222222', '#161616', '#2a2a2a'], w: ['#f2f2f2', '#e9e9e9', '#fbfbfb'], n: '#e39aa8', x: '#c7922f', p: '#d99aa5' },
  boxes: {
    head: {
      size: [5, 4, 5],
      base: 'k',
      faces: { front: ['kkwkk', 'xkwkx', 'kwwwk', 'wwwww'], top: ['kkkkk', 'kkkkk', 'kkwkk', 'kkwkk', 'kkwkk'], bottom: ['wwwww', 'wwwww', 'kwwwk', 'kkkkk', 'kkkkk'] },
    },
    nose: { size: [1, 1, 1], base: 'n' },
    earBlack: { size: [2, 5, 1], base: 'k', faces: { front: ['kk', 'kp', 'kp', 'kp', 'kk'] } },
    earWhite: { size: [2, 5, 1], base: 'w', faces: { front: ['ww', 'wp', 'wp', 'wp', 'ww'] } },
    body: {
      size: [6, 5, 10],
      base: 'k',
      faces: {
        front: ['kwwwwk', 'wwwwww', 'wwwwww', 'wwwwww', 'wwwwww'],
        left: ['kkkkkkkkkk', 'kkwwwkkkkk', 'kwwwwwkkkk', 'kkwwwkkkkk', 'wwwwwwwwww'],
        right: ['kkkkkkkkkk', 'kkkkkwwkkk', 'kkkkwwwwkk', 'kkkkkwwkkk', 'wwwwwwwwww'],
        top: ['kkkkkk', 'kkkkkk', 'kwkkkk', 'kkkkkk', 'kkkkkk', 'kkkwwk', 'kkwwwk', 'kkkwkk', 'kkkkkk', 'kkkkkk'],
        bottom: Array.from({ length: 10 }, () => 'wwwwww'),
      },
    },
    haunch: { size: [2, 4, 5], base: 'k', faces: { bottom: ['ww', 'ww', 'ww', 'ww', 'ww'] } },
    foot: { size: [2, 1, 7], base: 'w' },
    leg: { size: [2, 7, 2], base: 'w', faces: sides(['kk', 'kk', 'ww', 'ww', 'ww', 'ww', 'ww']) },
    tail: { size: [3, 3, 2], base: 'w' },
  },
};

export function Rabbit({ wander, name }: { readonly wander: Wander; readonly name: string }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const ears = useRef<(THREE.Group | null)[]>([]);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const hop = useRef({ phase: 0, twitchAt: 2, twitch: 0, ear: 0 });
  const { skin, material } = useSkin(TOAST);
  const materials = useMemo(() => [material], [material]);
  const hits = useRef(0);
  const control = useAnimal(root, wander, legs, materials, Infinity, 'squeak', name, head, undefined, {
    // the village's rabbit cannot be killed: hit it three times and it explodes, and you with it
    hit: () => {
      hits.current += 1;
      const at = root.current?.position;
      if (hits.current < 3 || !at) return false;
      hits.current = 0;
      explode(at.clone().setY(at.y + 0.4), 5, 'rabbit', false);
      const game = useEndGame.getState();
      // however far it hopped after the first two, the third one is the end of you
      if (at.distanceTo(runtime.player.pos) < 6) game.hurt(99, 'rabbit');
      if (!game.flags.pelusaBlew) {
        game.setFlag('pelusaBlew');
        window.setTimeout(() => useEndGame.getState().say('pelusaBfuuny', BFUUNY), 1500);
      }
      return false;
    },
  });
  // rabbits move in hops, nose up on the way up; now and then an ear flicks back
  useFrame((_, delta) => {
    const h = hop.current;
    const speed = Math.hypot(control.vel.x, control.vel.z);
    const moving = speed > 0.3 && !control.dead;
    h.phase += Math.min(delta, 0.05) * (moving ? 9 : 0);
    if (body.current) {
      body.current.position.y = moving ? Math.abs(Math.sin(h.phase)) * 0.18 : 0;
      body.current.rotation.x = moving ? -Math.cos(h.phase * 2) * 0.12 : 0;
    }
    if (runtime.time > h.twitchAt) {
      h.twitchAt = runtime.time + 1.5 + Math.random() * 4;
      h.twitch = runtime.time;
      h.ear = Math.random() < 0.5 ? 0 : 1;
    }
    const flick = Math.max(0, 1 - (runtime.time - h.twitch) / 0.25);
    ears.current.forEach((ear, index) => ear?.rotation.set(index === h.ear ? -flick * 0.6 : 0, 0, 0));
  });

  return (
    <group ref={root} position={wander.home}>
      <group ref={body}>
        <group scale={0.6}>
          <group position={[0, 5 * PX, -8 * PX]} rotation={[-0.349, 0, 0]}>
            <Box skin={skin} name="body" at={[0, -0.5, 5]} material={material} />
          </group>
          {[-3, 3].map((x) => (
            <group key={x} position={[x * PX, 6.5 * PX, -3.7 * PX]}>
              <group rotation={[-0.349, 0, 0]}>
                <Box skin={skin} name="haunch" at={[0, -2, -2.5]} material={material} />
              </group>
              <Box skin={skin} name="foot" at={[0, -6, 0.2]} material={material} />
            </group>
          ))}
          {[-3, 3].map((x) => (
            <group key={x} position={[x * PX, 7 * PX, 1 * PX]} rotation={[-0.1745, 0, 0]}>
              <Box skin={skin} name="leg" at={[0, -3.5, 0]} material={material} />
            </group>
          ))}
          <group position={[0, 4 * PX, -7 * PX]} rotation={[-0.349, 0, 0]}>
            <Box skin={skin} name="tail" at={[0, 0, -1]} material={material} />
          </group>
          <group ref={head} position={[0, 8 * PX, 1 * PX]}>
            <Box skin={skin} name="head" at={[0, 2, 2.5]} material={material} />
            <Box skin={skin} name="nose" at={[0, 2, 5]} material={material} />
            {(['earBlack', 'earWhite'] as const).map((ear, index) => (
              <group key={ear} rotation={[0, index ? -0.2618 : 0.2618, 0]}>
                <group
                  ref={(group) => {
                    ears.current[index] = group;
                  }}
                >
                  <Box skin={skin} name={ear} at={[index ? 1.5 : -1.5, 6.5, 0.5]} material={material} />
                </group>
              </group>
            ))}
          </group>
        </group>
      </group>
      <NameTag text={name} y={0.9} />
    </group>
  );
}

const FUSE_S = 1.5;
const BLAST = 3;

// the game's creeper: mottled green with pale flecks, and the face everyone knows
const CREEPER: SkinArt = {
  palette: {
    g: ['#2f9e2a', '#2f9e2a', '#2f9e2a', '#38b032', '#38b032', '#38b032', '#48c043', '#48c043', '#26852a', '#26852a', '#6fd06a', '#1d6e21', '#a8dca2'],
    k: ['#0c0c0c', '#191919', '#0c0c0c'],
  },
  boxes: {
    head: { size: [8, 8, 8], base: 'g', faces: { front: ['........', '........', '.kk..kk.', '.kk..kk.', '...kk...', '..kkkk..', '..kkkk..', '..k..k..'] } },
    body: { size: [8, 12, 4], base: 'g' },
    leg: { size: [4, 6, 4], base: 'g' },
  },
};

// Kevin follows you around. Walk away mid-hiss and he is hurt; stay, and you get the hug.
export function Creeper({ wander, name }: { readonly wander: Wander; readonly name: string }) {
  const root = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const fuse = useRef(-1);
  const { skin, material } = useSkin(CREEPER);
  const materials = useMemo(() => [material], [material]);
  const control = useMob(root, { ...wander, speed: 1.4 }, legs, { half: 0.3, height: 1.7 });
  const damage = useDamage(root, materials, 1.7);
  const health = useRef(20);

  const blow = () => {
    const group = root.current;
    const world = runtime.world;
    if (!group || !world) return;
    const at = group.position.clone().setY(group.position.y + 0.8);
    control.dead = true;
    group.visible = false;
    explode(at, BLAST, 'creeper');
    useEndGame.getState().say('creeperGranted', name);
  };

  useFrame(() => {
    const group = root.current;
    if (!group || control.dead) return;
    const eye = group.position.clone().setY(group.position.y + 1.4);
    const distance = group.position.distanceTo(runtime.player.pos);
    const hunting = distance < 16 && !useEndGame.getState().dead && sees(eye, 16);
    control.chase = hunting ? runtime.player.pos : null;
    control.chaseSpeed = 3.2;
    control.lookAt = hunting ? runtime.player.eye : null;
    if (fuse.current < 0 && hunting && distance < 3) {
      fuse.current = runtime.time;
      cue('hiss');
    }
    control.stopped = fuse.current >= 0;
    if (fuse.current >= 0) {
      const age = runtime.time - fuse.current;
      group.scale.setScalar(1 + Math.min(1, age / FUSE_S) * 0.18 + Math.sin(age * 30) * 0.02);
      material.emissive.set(Math.floor(age * 6) % 2 ? '#6a6a6a' : '#000000');
      if (distance > 7) {
        // you ran: no hug
        fuse.current = -1;
        group.scale.setScalar(1);
        material.emissive.set('#000000');
        useEndGame.getState().say('creeperDenied', name);
      } else if (age > FUSE_S) blow();
    }
  });

  useMobTarget(root, [0.7, 1.7, 0.7], {
    label: () => null,
    solid: true,
    hostile: true,
    hit: (amount) => {
      if (control.dead) return;
      useEndGame.getState().setFlag('kevinHit');
      health.current -= amount;
      damage.hurt();
      control.knock(runtime.player.pos);
      cue('hiss', 0.5);
      if (health.current > 0) return;
      control.dead = true;
      fuse.current = -1;
      root.current?.scale.setScalar(1);
      damage.die();
      useEndGame.getState().obituary(name, 'mobSlain');
    },
  });

  return (
    <group ref={root} position={wander.home}>
      {[
        [-2, -4],
        [2, -4],
        [2, 4],
        [-2, 4],
      ].map(([x, z], index) => (
        <group
          key={index}
          ref={(leg) => {
            legs.current[index] = leg;
          }}
          position={[x * PX, 6 * PX, z * PX]}
        >
          <Box skin={skin} name="leg" at={[0, -3, 0]} material={material} />
        </group>
      ))}
      <Box skin={skin} name="body" at={[0, 12, 0]} material={material} />
      <Box skin={skin} name="head" at={[0, 22, 0]} material={material} />
      <NameTag text={name} y={1.95} />
    </group>
  );
}
