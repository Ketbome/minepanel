'use client';

import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cue } from '../end-audio';
import { spawnEffect } from '../engine/Effects';
import { spawnProjectile } from '../engine/Projectiles';
import { castBlocks, solidCell } from '../engine/raycast';
import { playerCenter, runtime, type Target } from '../engine/runtime';
import { useEndGame } from '../store';
import { PX, useDamage, useMobTarget } from './parts';
import { Box, sides, skinOf, useSkin, type SkinArt } from './skins';

const center = new THREE.Vector3();
const toward = new THREE.Vector3();
const glowColor = new THREE.Color();
const IDLE_GLOW = new THREE.Color('#3a2006');
const CHARGED_GLOW = new THREE.Color('#ff9a30');
// a ghast stays pale in the Nether's red light, as it does in the game
const GHAST_GLOW = new THREE.Color('#5a5a5a');

// whether the mob at `from` can see the player: nothing solid in between
function sees(from: THREE.Vector3, range: number) {
  const world = runtime.world;
  playerCenter(center);
  const distance = from.distanceTo(center);
  if (!world || distance > range) return false;
  toward.copy(center).sub(from).normalize();
  return !castBlocks(world, from, toward, distance - 0.5, solidCell(world));
}

const turnToward = (current: number, goal: number, rate: number) => current + Math.atan2(Math.sin(goal - current), Math.cos(goal - current)) * Math.min(1, rate);

// the game's blaze: a yellow head with a grumpy face and twelve glowing rods
const BLAZE: SkinArt = {
  palette: {
    y: ['#fcd734', '#f5c42a', '#ffe25c', '#f0b528', '#fcd734', '#ffd23f'],
    Y: ['#fff3a6', '#ffeb85'],
    o: ['#e8871e', '#d9741a', '#f09a2a'],
    b: ['#8a4d10', '#7a420c'],
    k: ['#1e1003', '#2a1604'],
    m: ['#6b3a0c', '#5c3009'],
  },
  boxes: {
    head: {
      size: [8, 8, 8],
      base: 'y',
      faces: {
        ...sides(['yYyyyyYy', '........', '........', '........', '........', '........', 'oyyoyyoy', 'oooooooo']),
        front: ['yYyyyyYy', '........', 'bb....bb', '.bb..bb.', '.kk..kk.', '........', '..mmmm..', 'oyyyyyyo'],
        top: ['YyyYyyYy', 'yyyyyyyy', 'yYyyyyYy', '........', '........', 'yYyyyyYy', '........', 'yyYyyYyy'],
        bottom: ['oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo'],
      },
    },
    rod: { size: [2, 8, 2], base: 'y', faces: { ...sides(['YY', 'Yy', 'yy', 'oy', 'yy', 'yo', 'oo', 'oo']), top: ['YY', 'YY'], bottom: ['oo', 'oo'] } },
  },
};

// three rings of four rods, each spinning its own way at its own height, like the game's
const RINGS = [
  { radius: 9, y: 20, spin: -Math.PI * 2, phase: 0, bob: 5 },
  { radius: 7, y: 13, spin: Math.PI * 0.6, phase: Math.PI / 4, bob: 5 },
  { radius: 5, y: 6, spin: -Math.PI, phase: 0.47, bob: 10 },
] as const;
const CHARGE_S = 1;

export function Blaze({ id, home, onDeath }: { readonly id: string; readonly home: THREE.Vector3; readonly onDeath: () => void }) {
  const root = useRef<THREE.Group>(null);
  const rods = useRef<(THREE.Group | null)[]>([]);
  const light = useRef<THREE.PointLight>(null);
  const hp = useRef(20);
  const { skin, material } = useSkin(BLAZE);
  const materials = useMemo(() => [material], [material]);
  const damage = useDamage(root, materials, 1.8);
  const state = useRef({ nextVolley: 0, chargeAt: -1, shots: 0, shotAt: 0, breathAt: Math.random() * 4, dead: false, aggro: false, glow: 0, hurtUntil: 0, y: home.y });
  const seed = useMemo(() => Math.random() * 10, []);

  // blazes glow from within: the skin lights itself, dimly at rest and fully while charging
  useEffect(() => {
    material.emissiveMap = skin.texture;
    material.needsUpdate = true;
  }, [material, skin]);

  // give the player a moment after arriving before the first volley
  useEffect(() => {
    state.current.nextVolley = runtime.time + 4 + Math.random() * 2;
  }, []);

  useMobTarget(root, [0.9, 1.8, 0.9], {
    label: () => null,
    solid: true,
    hit: (amount) => {
      const s = state.current;
      if (s.dead) return;
      hp.current -= amount;
      s.hurtUntil = runtime.time + 0.4;
      damage.hurt();
      cue('hit');
      if (hp.current > 0) return;
      s.dead = true;
      cue('blaze', 0.8);
      // the rod drops once the body is gone, the way the game drops loot
      damage.die(onDeath);
    },
  });

  useFrame((_, delta) => {
    const group = root.current;
    const s = state.current;
    if (!group || s.dead) return;
    const dt = Math.min(delta, 0.1);
    const t = runtime.time + seed;
    const eye = group.position.clone().setY(group.position.y + 1.4);
    const seeing = sees(eye, 20);
    const game = useEndGame.getState();

    // it drifts around its post and rises or sinks toward the player's eye level
    const goal = seeing ? Math.max(home.y - 1.5, Math.min(home.y + 1.5, runtime.player.eye.y + 0.4 - 1.4)) : home.y;
    s.y += (goal - s.y) * Math.min(1, dt * 0.9);
    group.position.set(home.x + Math.sin(t * 0.4) * 1.5, s.y + Math.sin(t * 1.3) * 0.25, home.z + Math.cos(t * 0.35) * 1.5);

    rods.current.forEach((rod, index) => {
      if (!rod) return;
      const ring = RINGS[Math.floor(index / 4)];
      const angle = ring.phase + runtime.time * ring.spin + (index % 4) * (Math.PI / 2);
      rod.position.set(Math.cos(angle) * ring.radius * PX, (ring.y + Math.cos(index * 2 * 0.25 + runtime.time * ring.bob) * 1.5) * PX, Math.sin(angle) * ring.radius * PX);
    });

    if (seeing) {
      group.rotation.y = turnToward(group.rotation.y, Math.atan2(runtime.player.pos.x - group.position.x, runtime.player.pos.z - group.position.z), dt * 6);
      if (!s.aggro) {
        s.aggro = true;
        if (!game.flags.blazeWarned) {
          game.setFlag('blazeWarned');
          game.say('ghostBlaze');
        }
      }
    }
    if (runtime.time > s.breathAt) {
      s.breathAt = runtime.time + 4 + Math.random() * 4;
      if (group.position.distanceTo(runtime.player.pos) < 16) cue('blaze', 0.6);
    }

    // it catches fire for a second, then throws three fireballs, like the game's blazes
    if (s.chargeAt < 0 && seeing && runtime.time > s.nextVolley && !game.dead) {
      s.chargeAt = runtime.time;
      s.shots = 0;
      cue('blaze', 0.9);
    }
    if (s.chargeAt >= 0 && runtime.time - s.chargeAt > CHARGE_S && runtime.time - s.shotAt > 0.3 && !game.dead) {
      s.shotAt = runtime.time;
      s.shots += 1;
      playerCenter(center);
      const dir = center.clone().sub(eye).normalize();
      dir.x += (Math.random() - 0.5) * 0.08;
      dir.y += (Math.random() - 0.5) * 0.08;
      spawnProjectile({ kind: 'fireball', pos: eye.clone().addScaledVector(dir, 0.8), vel: dir.multiplyScalar(11), gravity: 0, fromPlayer: false, damage: 3, cause: 'blaze' });
      cue('fireball', 0.7);
      if (s.shots >= 3) {
        s.chargeAt = -1;
        s.nextVolley = runtime.time + 3.2 + Math.random();
      }
    }
    const charging = s.chargeAt >= 0 ? Math.min(1, (runtime.time - s.chargeAt) / CHARGE_S) : 0;
    s.glow += (charging - s.glow) * Math.min(1, dt * (charging > s.glow ? 6 : 2));
    // the hurt flash from useDamage wins while it lasts
    if (runtime.time > s.hurtUntil) material.emissive.copy(glowColor.copy(IDLE_GLOW).lerp(CHARGED_GLOW, s.glow));
    if (light.current) light.current.intensity = 6 + s.glow * 14 + Math.sin(t * 17) * 0.8;
  });

  return (
    <group ref={root} position={home}>
      <Box skin={skin} name="head" at={[0, 22, 0]} material={material} />
      {Array.from({ length: 12 }, (_, index) => (
        <group
          key={index}
          ref={(rod) => {
            rods.current[index] = rod;
          }}
        >
          <Box skin={skin} name="rod" material={material} />
        </group>
      ))}
      <Sparkles count={14} scale={[1.3, 1.8, 1.3]} position={[0, 1, 0]} size={3.5} speed={0.8} color="#ff8a2a" />
      <pointLight ref={light} color="#ffa040" intensity={6} distance={6} decay={1.8} position={[0, 1.4, 0]} />
    </group>
  );
}

// The game's ghast: a pale mottled cube with closed, crying eyes, and a second face with its
// eyes and mouth wide open for the moment it fires. Every palette entry is a list so both
// skins draw the same noise and only the face changes when they swap.
const GHAST_PALETTE = {
  w: ['#f2f2f2', '#e9e9e9', '#f7f7f7', '#dedede', '#e4e4e4', '#efefef'],
  s: ['#cfcfcf', '#c4c4c4'],
  e: ['#8f8f8f', '#9a9a9a'],
  k: ['#2c2c2c', '#353535'],
  r: ['#b52a2a', '#9e2020'],
} as const;
const TENTACLE_SIDES = sides(['ww', 'ww', 'ww', 'ww', 'ww', 'ww', 'ww', 'ww', 'ss', 'ww', 'ss', 'ss', 'ss', 'ss']);
const TENTACLES = { short: 9, mid: 11, long: 13 } as const;

function ghastArt(face: readonly string[]): SkinArt {
  return {
    palette: GHAST_PALETTE,
    boxes: {
      body: { size: [16, 16, 16], base: 'w', faces: { front: face, bottom: Array.from({ length: 16 }, () => 'ssssssssssssssss') } },
      ...Object.fromEntries(Object.entries(TENTACLES).map(([name, length]) => [name, { size: [2, length, 2] as const, base: 'w', faces: { ...TENTACLE_SIDES, bottom: ['ss', 'ss'] } }])),
    },
  };
}

const GHAST = ghastArt([
  '................',
  '................',
  '................',
  '................',
  '..eeee....eeee..',
  '..kkkk....kkkk..',
  '...r........r...',
  '...r........r...',
  '...r........r...',
  '...r........r...',
  '................',
  '.....ssssss.....',
  '.....kkkkkk.....',
  '................',
  '................',
  '................',
]);
const GHAST_FIRING = ghastArt([
  '................',
  '................',
  '................',
  '..kkkk....kkkk..',
  '..kkkk....kkkk..',
  '..kkkk....kkkk..',
  '...r........r...',
  '...r........r...',
  '...r........r...',
  '.....kkkkkk.....',
  '....kkkkkkkk....',
  '....kkkkkkkk....',
  '....kkkkkkkk....',
  '.....kkkkkk.....',
  '................',
  '................',
]);
const TENTACLE_SPOTS = Array.from({ length: 9 }, (_, index) => ({
  x: ((index % 3) - 1) * 5 + (Math.floor(index / 3) % 2 ? 1 : -1),
  z: (Math.floor(index / 3) - 1) * 5,
  name: (['short', 'mid', 'long'] as const)[(index * 7) % 3],
}));
const GHAST_SCALE = 3;
const GHAST_CHARGE_S = 1;

// a huge sad jellyfish that cries fireballs; hit one back at it and it dies of embarrassment
export function Ghast({ home, onReturned }: { readonly home: THREE.Vector3; readonly onReturned: () => void }) {
  const root = useRef<THREE.Group>(null);
  const tentacles = useRef<(THREE.Group | null)[]>([]);
  const { skin, material } = useSkin(GHAST);
  const firing = useMemo(() => skinOf(GHAST_FIRING).texture, []);
  const materials = useMemo(() => [material], [material]);
  const damage = useDamage(root, materials, 3);
  const state = useRef({ next: 6, cryAt: 3, chargeAt: -1, dead: false, hp: 10, goal: home.clone(), goalAt: 0, hurtUntil: 0 });

  useEffect(() => {
    state.current.next = runtime.time + 12;
    state.current.cryAt = runtime.time + 4;
  }, []);

  useEffect(() => {
    material.emissiveMap = skin.texture;
    material.needsUpdate = true;
  }, [material, skin]);

  const die = (then?: () => void) => {
    const s = state.current;
    if (s.dead) return;
    s.dead = true;
    material.map = skin.texture;
    material.emissiveMap = skin.texture;
    cue('ghast', 1.2);
    damage.die(then);
  };

  useMobTarget(root, [3, 3, 3], {
    label: () => null,
    solid: true,
    hit: (amount, source) => {
      const s = state.current;
      if (s.dead) return;
      damage.hurt();
      s.hurtUntil = runtime.time + 0.4;
      if (source === 'fireball') {
        die(onReturned);
        return;
      }
      s.hp -= amount;
      if (s.hp <= 0) die();
    },
  });

  useFrame((_, delta) => {
    const group = root.current;
    const s = state.current;
    if (!group || s.dead) return;
    const dt = Math.min(delta, 0.1);
    const t = runtime.time;
    if (t > s.hurtUntil) material.emissive.copy(GHAST_GLOW);

    // it floats toward a new spot in its patch of sky every few seconds
    if (t > s.goalAt || group.position.distanceTo(s.goal) < 0.5) {
      s.goalAt = t + 4 + Math.random() * 3;
      const angle = Math.random() * Math.PI * 2;
      const reach = 2 + Math.random() * 5;
      s.goal.set(home.x + Math.cos(angle) * reach, home.y + (Math.random() - 0.5) * 3, home.z + Math.sin(angle) * reach);
    }
    toward.copy(s.goal).sub(group.position);
    const step = Math.min(toward.length(), 1.1 * dt);
    if (step > 1e-4) group.position.addScaledVector(toward.normalize(), step);
    group.position.y += Math.sin(t * 0.8) * 0.004;
    const facing = Math.atan2(runtime.player.pos.x - group.position.x, runtime.player.pos.z - group.position.z);
    group.rotation.y = turnToward(group.rotation.y, facing, dt * 2);
    tentacles.current.forEach((tentacle, index) => tentacle?.rotation.set(0.2 * Math.sin(t * 6 + index) + 0.15, 0, Math.cos(t * 1.7 + index) * 0.12));
    if (t > s.cryAt && s.chargeAt < 0) {
      s.cryAt = t + 6 + Math.random() * 6;
      cue('ghast', 0.7);
    }

    const mouth = group.position.clone().setY(group.position.y + 1.2);
    // it opens its eyes and cries out a second before it fires, like the game's warning
    if (s.chargeAt < 0 && t > s.next && sees(mouth, 48) && !useEndGame.getState().dead) {
      s.chargeAt = t;
      material.map = firing;
      material.emissiveMap = firing;
      cue('ghast', 1);
    }
    if (s.chargeAt >= 0 && t - s.chargeAt > GHAST_CHARGE_S + 0.4) {
      s.chargeAt = -1;
      material.map = skin.texture;
      material.emissiveMap = skin.texture;
    }
    if (s.chargeAt >= 0 && t - s.chargeAt > GHAST_CHARGE_S && s.next <= t) {
      s.next = t + 6 + Math.random() * 3;
      playerCenter(center);
      const dir = center.clone().sub(mouth).normalize();
      const shot = spawnProjectile({
        kind: 'ghastball',
        pos: mouth.clone().addScaledVector(dir, 2),
        vel: dir.multiplyScalar(10),
        gravity: 0,
        fromPlayer: false,
        damage: 6,
        cause: 'ghast',
        onLand: (at) => {
          spawnEffect('explosion', at);
          cue('boom', 0.8);
          playerCenter(center);
          if (center.distanceTo(at) < 3) useEndGame.getState().hurt(6, 'ghast');
        },
      });
      // a ghast fireball can be punched back, which turns it into the player's shot
      const deflect: Target = {
        box: new THREE.Box3(),
        solid: false,
        label: () => null,
        hit: () => {
          if (shot.fromPlayer) return;
          shot.fromPlayer = true;
          shot.vel.copy(runtime.player.look).multiplyScalar(18);
          cue('hit');
        },
      };
      shot.target = deflect;
      runtime.targets.add(deflect);
      const cleanup = () => {
        if (!shot.done) return;
        runtime.targets.delete(deflect);
        clearInterval(timer);
      };
      const timer = window.setInterval(cleanup, 250);
      cue('fireball');
    }
  });

  return (
    <group ref={root} position={home}>
      <group scale={GHAST_SCALE}>
        <Box skin={skin} name="body" at={[0, 8, 0]} material={material} />
        {TENTACLE_SPOTS.map(({ x, z, name }, index) => (
          <group
            key={index}
            ref={(tentacle) => {
              tentacles.current[index] = tentacle;
            }}
            position={[x * PX, 0, z * PX]}
          >
            <Box skin={skin} name={name} at={[0, -TENTACLES[name] / 2, 0]} material={material} />
          </group>
        ))}
      </group>
    </group>
  );
}
