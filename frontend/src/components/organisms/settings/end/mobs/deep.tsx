'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cue } from '../end-audio';
import { surface } from '../engine/physics';
import { playerCenter, runtime } from '../engine/runtime';
import { useEndGame } from '../store';
import { Part, PX, useDamage, useMobTarget } from './parts';
import { Box, sides, useSkin, type SkinArt } from './skins';

const EMERGE_S = 3;
const BURROW_S = 2;
const SPEED = 2.6;
const HP = 50;
const STRIKE = 12;
const STRIKE_COOLDOWN = 1.6;
const BOOM = 8;
const BOOM_CHARGE_S = 1.5;
const BOOM_COOLDOWN_S = 5;
const BOOM_RINGS = 7;
const toward = new THREE.Vector3();
const chest = new THREE.Vector3();
const target = new THREE.Vector3();
const SOUL = new THREE.Color('#29dfeb');
const BRIGHT = new THREE.Color('#d9fdff');

// The game's warden: dark teal hide with the ribcage showing through, a wide toothy mouth and no
// eyes at all. Its heart, spots and the tendrils on its head glow and pulse on their own.
const WARDEN: SkinArt = {
  palette: {
    b: ['#0b2c35', '#0e3440', '#092630', '#12404c', '#0b2c35', '#0d313b'],
    d: ['#061a20', '#081f27', '#051419'],
    l: ['#1c5563', '#185060'],
    r: ['#6f9f9c', '#5f8d8a', '#7aa9a5'],
    m: ['#020a0c', '#03100f'],
    t: ['#8fb8b2', '#a3c7c1'],
  },
  boxes: {
    head: {
      size: [16, 16, 10],
      base: 'b',
      faces: {
        front: [
          '................',
          '.d............d.',
          '..dd........dd..',
          '..ddd......ddd..',
          '...dd......dd...',
          '................',
          '......llll......',
          '......llll......',
          '.......ll.......',
          '.dddddddddddddd.',
          '.dmtmtmtmtmtmmd.',
          '.dmmmmmmmmmmmmd.',
          '.dmtmtmtmtmtmmd.',
          '.dddddddddddddd.',
          '................',
          '....d......d....',
        ],
      },
    },
    body: {
      size: [18, 21, 11],
      base: 'b',
      faces: {
        front: [
          '..................',
          '..d............d..',
          '...rrrrr..rrrrr...',
          '..r.....rr.....r..',
          '..rrrrr.rr.rrrrr..',
          '..r.....rr.....r..',
          '..rrrrr.rr.rrrrr..',
          '...r....rr....r...',
          '...rrrr.rr.rrrr...',
          '........rr........',
          '........rr........',
          '.d..............d.',
          '..................',
          '....dd......dd....',
          '..................',
          '..................',
          '.d......dd......d.',
          '..................',
          '..................',
          'dddddddddddddddddd',
          'dddddddddddddddddd',
        ],
        back: [
          '..................',
          '........rr........',
          '...d....rr....d...',
          '........rr........',
          '....dd..rr..dd....',
          '........rr........',
          '........rr........',
          '...d....rr....d...',
          '........rr........',
          '..................',
        ],
      },
    },
    arm: { size: [8, 28, 8], base: 'b', faces: { ...sides(['........', '..d.....', '........', '.....d..', ...Array.from({ length: 18 }, () => '........'), 'dddddddd', 'dddddddd', 'dddddddd', 'dddddddd', 'dddddddd', 'dddddddd']), bottom: Array.from({ length: 8 }, () => 'dddddddd') } },
    leg: { size: [6, 13, 6], base: 'b', faces: { ...sides(['......', '.d....', '......', '....d.', '......', '......', '......', '......', '......', '......', 'dddddd', 'dddddd', 'dddddd']), bottom: Array.from({ length: 6 }, () => 'dddddd') } },
  },
};

// a tendril: a horn-shaped fin of three glowing boxes that curls up and out from the head
function Tendril({ side, glow, pivot }: { readonly side: 1 | -1; readonly glow: THREE.Material; readonly pivot: (group: THREE.Group | null) => void }) {
  return (
    <group ref={pivot} position={[side * 8 * PX, 45 * PX, -1 * PX]}>
      <Part size={[5, 3, 1]} at={[side * 2.5, 0, 0]} material={glow} />
      <Part size={[3, 4, 1]} at={[side * 5.5, 2.5, 0]} material={glow} />
      <Part size={[2, 4, 1]} at={[side * 7, 6, 0]} material={glow} />
      <Part size={[1, 3, 1]} at={[side * 7.5, 9, 0]} material={glow} />
    </group>
  );
}

// The watchdog. It rises out of the floor when the noise meter fills and follows the player's
// noise. Go quiet and it burrows back; hit it and it hunts you anyway, and if you keep your
// distance it charges a sonic boom that goes through walls. It takes a lot of hitting, and once it
// has had you it goes back down, so a respawn never lands next to it.
export function Warden({ from, onGone }: { readonly from: THREE.Vector3; readonly onGone: () => void }) {
  const root = useRef<THREE.Group>(null);
  const arms = useRef<(THREE.Group | null)[]>([]);
  const tendrils = useRef<(THREE.Group | null)[]>([]);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: '#29dfeb' }), []);
  const heart = useMemo(() => new THREE.MeshBasicMaterial({ color: '#29dfeb' }), []);
  const ring = useMemo(() => new THREE.MeshBasicMaterial({ color: '#8ff4ff', transparent: true, opacity: 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }), []);
  const ringShape = useMemo(() => new THREE.RingGeometry(0.35, 0.5, 20), []);
  const { skin, material } = useSkin(WARDEN);
  const materials = useMemo(() => [material], [material]);
  const damage = useDamage(root, materials, 2.9);
  const state = useRef({
    born: -1,
    beatAt: 0,
    pulseAt: -9,
    lostAt: -1,
    gone: false,
    walk: 0,
    burrow: -1,
    angryUntil: 0,
    strikeAt: 0,
    hp: HP,
    boomAt: -1,
    boomReadyAt: 0,
    firedAt: -9,
    from: new THREE.Vector3(),
    to: new THREE.Vector3(),
  });

  useEffect(() => {
    state.current.born = runtime.time;
    cue('roar');
    return () => [glow, heart, ring, ringShape].forEach((resource) => resource.dispose());
  }, [glow, heart, ring, ringShape]);

  useMobTarget(root, [1.2, 2.9, 1.2], {
    label: () => null,
    solid: true,
    hit: (amount) => {
      const s = state.current;
      if (!root.current || s.gone || s.burrow >= 0 || runtime.time - s.born < EMERGE_S) return;
      const game = useEndGame.getState();
      s.hp -= amount;
      s.angryUntil = runtime.time + 12;
      damage.hurt();
      cue('roar', 0.5);
      if (!game.flags.wardenHit) {
        game.setFlag('wardenHit');
        game.say('ghostWardenHit');
      }
      if (s.hp > 0) return;
      s.gone = true;
      s.boomAt = -1;
      game.obituary('Warden', 'mobSlain');
      game.say('ghostWarden');
      damage.die(onGone);
    },
  });

  useFrame((_, delta) => {
    const group = root.current;
    const world = runtime.world;
    const s = state.current;
    if (!group || !world) return;
    const dt = Math.min(delta, 0.1);
    const game = useEndGame.getState();

    // the sonic boom's rings run from its chest to where you stood, and fade
    const shown = runtime.time - s.firedAt;
    rings.current.forEach((mesh, index) => {
      if (!mesh) return;
      // they stop short of your face, where they would only fill the screen
      const k = (index / (BOOM_RINGS - 1)) * 0.8;
      const visible = shown < 0.6 && shown * 3 > k;
      mesh.visible = visible;
      if (!visible) return;
      mesh.position.lerpVectors(s.from, s.to, k);
      mesh.lookAt(s.to);
      mesh.scale.setScalar(0.6 + k * 1.2 + shown * 1.5);
    });
    ring.opacity = Math.max(0, 0.85 * (1 - shown / 0.6));
    if (s.gone) return;

    const age = runtime.time - s.born;
    const ground = surface(world, group.position.x, group.position.z, from.y);
    if (runtime.time > s.beatAt) {
      s.beatAt = runtime.time + (game.noise > 50 || runtime.time < s.angryUntil ? 0.8 : 1.4);
      s.pulseAt = runtime.time;
      cue('heartbeat', 0.9);
    }
    // the heart and the tendrils flare on every beat, and the chest burns white while a boom charges
    const beat = Math.max(0, 1 - (runtime.time - s.pulseAt) / 0.35);
    const charge = s.boomAt >= 0 ? Math.min(1, (runtime.time - s.boomAt) / BOOM_CHARGE_S) : 0;
    const shimmer = 0.5 + Math.sin(runtime.time * 6) * 0.5;
    glow.color.copy(SOUL).multiplyScalar(0.55 + shimmer * 0.2 + beat * 0.35);
    heart.color.copy(SOUL).lerp(BRIGHT, Math.max(beat * 0.6, charge)).multiplyScalar(0.6 + beat * 0.5 + charge * 0.6);
    tendrils.current.forEach((tendril, index) => {
      if (!tendril) return;
      const side = index === 0 ? -1 : 1;
      tendril.rotation.set(0, 0, side * (0.1 + beat * 0.35 + Math.sin(runtime.time * 23 + index) * 0.04 * (1 + charge * 3)));
    });

    if (age < EMERGE_S) {
      group.position.y = ground - 3 + (age / EMERGE_S) * 3;
      return;
    }
    // it digs back down once it has had you, or once it has lost you
    if (s.burrow < 0 && game.dead) {
      s.burrow = runtime.time;
      s.boomAt = -1;
    }
    if (s.burrow >= 0) {
      const sunk = (runtime.time - s.burrow) / BURROW_S;
      group.position.y = ground - sunk * 3;
      if (sunk >= 1) {
        s.gone = true;
        group.visible = false;
        onGone();
      }
      return;
    }
    group.position.y = ground;
    const p = runtime.player.pos;
    const dx = p.x - group.position.x;
    const dz = p.z - group.position.z;
    const distance = Math.hypot(dx, dz);
    const angry = runtime.time < s.angryUntil;
    // it hears you while you are loud; once you go quiet it loses you
    const tracking = game.noise > 20 || angry;
    if (tracking) s.lostAt = -1;
    else if (s.lostAt < 0) s.lostAt = runtime.time;
    if (s.lostAt >= 0 && runtime.time - s.lostAt > 8) {
      s.burrow = runtime.time;
      return;
    }

    // out of reach and angry: it stops, draws in a breath and fires a boom through anything
    if (s.boomAt < 0 && angry && distance > 4 && distance < 16 && runtime.time > s.boomReadyAt) {
      s.boomAt = runtime.time;
      cue('shriek', 0.9);
    }
    if (s.boomAt >= 0) {
      group.rotation.y = Math.atan2(dx, dz);
      if (runtime.time - s.boomAt >= BOOM_CHARGE_S) {
        s.boomAt = -1;
        s.boomReadyAt = runtime.time + BOOM_COOLDOWN_S;
        s.firedAt = runtime.time;
        chest.copy(group.position).setY(group.position.y + 1.7);
        playerCenter(target);
        s.from.copy(chest);
        s.to.copy(target);
        cue('boom', 0.7);
        if (chest.distanceTo(target) < 20 && !game.dead) {
          game.hurt(BOOM, 'warden');
          toward.copy(target).sub(chest).setY(0).normalize();
          runtime.player.vel.addScaledVector(toward, 6).setY(4);
        }
      }
    } else if (tracking && distance > 1.2) {
      const step = Math.min(distance, SPEED * dt);
      group.position.x += (dx / distance) * step;
      group.position.z += (dz / distance) * step;
      group.rotation.y = Math.atan2(dx, dz);
      s.walk += dt * 5;
    }

    // a strike throws both arms forward; a boom pulls them back and opens the chest
    const striking = Math.max(0, 1 - (runtime.time - (s.strikeAt - STRIKE_COOLDOWN)) / 0.4);
    arms.current.forEach((arm, index) => arm?.rotation.set(Math.sin(s.walk + index * Math.PI) * 0.4 * (1 - striking) * (1 - charge) - striking * 1.6 + charge * 0.7, 0, (index === 0 ? -1 : 1) * charge * 0.35));
    if (s.boomAt < 0 && distance < 1.6 && Math.abs(p.y - group.position.y) < 2 && runtime.time > s.strikeAt) {
      s.strikeAt = runtime.time + STRIKE_COOLDOWN;
      cue('roar');
      game.hurt(STRIKE, 'warden');
      toward.set(dx, 0, dz).normalize();
      runtime.player.vel.addScaledVector(toward, 8).setY(6);
    }
  });

  return (
    <>
      <group ref={root} position={[from.x, from.y - 3, from.z]}>
        {[-4, 4].map((x) => (
          <Box key={x} skin={skin} name="leg" at={[x, 6.5, 0]} material={material} />
        ))}
        <Box skin={skin} name="body" at={[0, 23.5, 0]} material={material} />
        <Part size={[4, 5, 0.6]} at={[0, 28, 5.8]} material={heart} />
        <Part size={[2, 2, 0.6]} at={[-6, 19, 5.8]} material={glow} />
        <Part size={[2, 2, 0.6]} at={[6, 17, 5.8]} material={glow} />
        {[-11, 11].map((x, index) => (
          <group
            key={x}
            ref={(arm) => {
              arms.current[index] = arm;
            }}
            position={[x * PX, 33 * PX, 0]}
          >
            <Box skin={skin} name="arm" at={[0, -14, 0]} material={material} />
            <Part size={[3, 3, 0.6]} at={[0, -6, 4.3]} material={glow} />
            <Part size={[2, 2, 0.6]} at={[x > 0 ? 1.5 : -1.5, -21, 4.3]} material={glow} />
          </group>
        ))}
        <Box skin={skin} name="head" at={[0, 42, 0]} material={material} />
        {([-1, 1] as const).map((side, index) => (
          <Tendril
            key={side}
            side={side}
            glow={glow}
            pivot={(tendril) => {
              tendrils.current[index] = tendril;
            }}
          />
        ))}
        <pointLight color="#29dfeb" intensity={4} distance={6} decay={2} position={[0, 2, 0.6]} />
      </group>
      {Array.from({ length: BOOM_RINGS }, (_, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            rings.current[index] = mesh;
          }}
          geometry={ringShape}
          material={ring}
          visible={false}
        />
      ))}
    </>
  );
}
