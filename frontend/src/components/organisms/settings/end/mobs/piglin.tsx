'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cue } from '../end-audio';
import { spawnDrop } from '../engine/Drops';
import { castBlocks, solidCell } from '../engine/raycast';
import { playerCenter, runtime } from '../engine/runtime';
import type { ItemId } from '../items';
import { useEndGame } from '../store';
import { flat, Part, PX, useDamage, useMob, useMobTarget, type Wander } from './parts';
import { Box, sides, useSkin, type SkinArt } from './skins';

const SIGHT = 10;
const ADMIRE_S = 3;
const STRIKE = 5;
const STRIKE_COOLDOWN = 1.1;
const ANGER_S = 20;
// how far an angry piglin still cares about you
const REACH = 16;
const center = new THREE.Vector3();
const toward = new THREE.Vector3();

// hitting one piglin sets off every piglin around, as in the game; they forget once you have been
// out of their reach for a few seconds, or have left the Nether
const CALM_S = 5;
const alarm = { until: 0, nearAt: 0 };

export function calmPiglins() {
  alarm.until = 0;
}

function sees(from: THREE.Vector3, range: number) {
  const world = runtime.world;
  playerCenter(center);
  const distance = from.distanceTo(center);
  if (!world || distance > range) return false;
  toward.copy(center).sub(from).normalize();
  return !castBlocks(world, from, toward, distance - 0.5, solidCell(world));
}

// Bartering, weighted toward the pearls the eyes need: after two trades without them, the next
// one always has some, so gold always turns into pearls in the end.
const BARTER: readonly { readonly item: ItemId; readonly min: number; readonly max: number; readonly weight: number }[] = [
  { item: 'pearl', min: 2, max: 4, weight: 40 },
  { item: 'arrow', min: 6, max: 12, weight: 22 },
  { item: 'netherrack', min: 2, max: 6, weight: 16 },
  { item: 'obsidian', min: 1, max: 1, weight: 10 },
  { item: 'apple', min: 1, max: 1, weight: 4 },
];
const TOTAL = BARTER.reduce((sum, entry) => sum + entry.weight, 0);
let dry = 0;

function barter() {
  let roll = Math.random() * TOTAL;
  let entry = BARTER.find((candidate) => (roll -= candidate.weight) < 0) ?? BARTER[0];
  if (entry.item !== 'pearl' && dry >= 2) entry = BARTER[0];
  dry = entry.item === 'pearl' ? 0 : dry + 1;
  return { item: entry.item, count: entry.min + Math.floor(Math.random() * (entry.max - entry.min + 1)) };
}

// the game's piglin: a wide pink head with a big snout, tusks and floppy ears, a leather
// loincloth under a gold-buckled belt, and a golden sword
const PIGLIN: SkinArt = {
  palette: {
    p: ['#e8a598', '#dd9a8c', '#f0b3a6', '#e3a092'],
    d: ['#b86d62', '#c07568'],
    n: ['#f7c3b8', '#f2b8ac'],
    k: '#4a2320',
    w: '#f2eadc',
    l: ['#6b4a2b', '#5c3f24', '#735032'],
    g: '#f2c230',
    b: ['#3f2a1a', '#35231a'],
  },
  boxes: {
    head: { size: [10, 8, 8], base: 'p', faces: { front: ['pppppppppp', 'pppppppppp', 'pkkkppkkkp', 'pwkppppkwp', 'pppppppppp', 'pppppppppp', 'pdppppppdp', 'pddddddddp'] } },
    snout: { size: [4, 4, 1], base: 'n', faces: { front: ['nnnn', 'knnk', 'nnnn', 'nnnn'] } },
    ear: { size: [1, 5, 4], base: 'p', faces: sides(['p', 'p', 'd', 'd', 'd']) },
    body: {
      size: [8, 12, 4],
      base: 'p',
      faces: { ...sides(['pppppppp', 'pppppppp', 'pppppppp', 'pppppppp', 'pppppppp', 'pppppppp', 'llllllll', 'lllgglll', 'llllllll', 'llllllll', 'llllllll', 'llllllll']) },
    },
    arm: { size: [4, 12, 4], base: 'p' },
    leg: { size: [4, 12, 4], base: 'l', faces: { ...sides(['llll', 'llll', 'llll', 'llll', 'llll', 'llll', 'llll', 'llll', 'bbbb', 'bbbb', 'bbbb', 'bbbb']), bottom: ['bbbb', 'bbbb', 'bbbb', 'bbbb'] } },
  },
};

// Piglins attack anyone who comes without gold on their head. Wear the golden helmet and they
// let you be; hold a gold ingot, right click one, and it takes the ingot, admires it for a few
// seconds and tosses you something back. Hit one and the whole group turns on you.
export function Piglin({ wander, onDeath }: { readonly wander: Wander; readonly onDeath: () => void }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const arms = useRef<(THREE.Group | null)[]>([]);
  const ingot = useRef<THREE.Group>(null);
  const { skin, material } = useSkin(PIGLIN);
  const materials = useMemo(() => [material], [material]);
  const control = useMob(root, wander, legs, { half: 0.3, height: 1.95 }, head);
  const damage = useDamage(root, materials, 1.95);
  const state = useRef({ hp: 16, strikeAt: 0, swingAt: -9, admireUntil: -1, hostile: false, gruntAt: 2 + Math.random() * 5 });
  const gold = flat('#f2c230');
  const guard = flat('#b8860b');
  const handle = flat('#5c3f24');
  const tusk = flat('#f2eadc');

  useMobTarget(root, [0.7, 1.95, 0.7], {
    label: () => (state.current.hostile ? null : 'piglin'),
    reach: 4,
    solid: true,
    use: () => {
      const s = state.current;
      const game = useEndGame.getState();
      if (control.dead || s.hostile || runtime.time < s.admireUntil) return;
      cue('piglin');
      if (game.inventory[game.selected]?.item !== 'gold') {
        game.showActionBar('hintPiglin');
        return;
      }
      game.consumeHeld();
      s.admireUntil = runtime.time + ADMIRE_S;
    },
    hit: (amount) => {
      const s = state.current;
      const group = root.current;
      if (control.dead || !group) return;
      s.hp -= amount;
      s.admireUntil = -1;
      alarm.until = runtime.time + ANGER_S;
      damage.hurt();
      control.knock(runtime.player.pos);
      cue('piglin', 1.2);
      if (s.hp > 0) return;
      control.dead = true;
      spawnDrop('gold', 1 + Math.floor(Math.random() * 2), group.position.clone().setY(group.position.y + 0.8));
      damage.die(onDeath);
    },
  });

  useFrame(() => {
    const group = root.current;
    const s = state.current;
    if (!group || control.dead) return;
    const game = useEndGame.getState();
    const eye = group.position.clone().setY(group.position.y + 1.6);
    const distance = group.position.distanceTo(runtime.player.pos);
    if (distance < REACH) alarm.nearAt = runtime.time;
    else if (runtime.time - alarm.nearAt > CALM_S) alarm.until = 0;
    const provoked = runtime.time < alarm.until;
    s.hostile = !game.dead && ((provoked && distance < REACH) || (!game.helmet && sees(eye, SIGHT)));
    if (s.hostile) s.admireUntil = -1;

    // the trade: done admiring, it tosses the loot toward you
    if (s.admireUntil > 0 && runtime.time > s.admireUntil) {
      s.admireUntil = -1;
      const loot = barter();
      const from = group.position.clone().setY(group.position.y + 1.2);
      const throwTo = runtime.player.pos.clone().sub(group.position).setY(0).normalize().multiplyScalar(2.5).setY(3.5);
      spawnDrop(loot.item, loot.count, from, throwTo);
      cue('piglin', 0.8);
    }
    const admiring = runtime.time < s.admireUntil;
    const holdingGold = game.inventory[game.selected]?.item === 'gold';
    control.stopped = admiring;
    control.chase = s.hostile ? runtime.player.pos : null;
    control.chaseSpeed = 3.6;
    control.lookAt = s.hostile || admiring || (holdingGold && distance < 8) ? runtime.player.eye : null;
    if (ingot.current) ingot.current.visible = admiring;

    if (s.hostile && distance < 1.7 && Math.abs(runtime.player.pos.y - group.position.y) < 1.5 && runtime.time > s.strikeAt) {
      s.strikeAt = runtime.time + STRIKE_COOLDOWN;
      s.swingAt = runtime.time;
      game.hurt(STRIKE, 'piglin');
      toward.copy(runtime.player.pos).sub(group.position).setY(0).normalize();
      runtime.player.vel.addScaledVector(toward, 5).setY(4);
      cue('hit');
    }
    if (runtime.time > s.gruntAt) {
      s.gruntAt = runtime.time + 4 + Math.random() * 5;
      if (distance < 14) cue('piglin', 0.5);
    }
    // the sword arm chops, the other lifts the gold to its face while it admires
    const chop = Math.max(0, 1 - (runtime.time - s.swingAt) / 0.35);
    const [right, left] = arms.current;
    if (right) right.rotation.x = -(s.hostile ? 0.5 : 0) - Math.sin(chop * Math.PI) * 1.4;
    if (left) left.rotation.x += ((admiring ? -1.3 : 0) - left.rotation.x) * 0.15;
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
      <Box skin={skin} name="body" at={[0, 18, 0]} material={material} />
      {[-6, 6].map((x, index) => (
        <group
          key={x}
          ref={(arm) => {
            arms.current[index] = arm;
          }}
          position={[x * PX, 22 * PX, 0]}
        >
          <Box skin={skin} name="arm" at={[0, -4, 0]} material={material} />
          {x < 0 ? (
            <group position={[0, -9 * PX, 2 * PX]} rotation={[Math.PI / 2, 0, 0]}>
              <Part size={[1, 3, 1]} at={[0, -1, 0]} material={handle} />
              <Part size={[4, 1, 1]} at={[0, 1, 0]} material={guard} />
              <Part size={[1, 9, 2]} at={[0, 6, 0]} material={gold} />
            </group>
          ) : (
            <group ref={ingot} position={[0, -10 * PX, 2 * PX]} visible={false}>
              <Part size={[4, 2, 3]} material={gold} />
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
