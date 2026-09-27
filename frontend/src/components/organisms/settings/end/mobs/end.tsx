'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cue } from '../end-audio';
import { spawnEffect } from '../engine/Effects';
import { runtime, useTarget, type Target } from '../engine/runtime';
import { ISLAND_RADIUS, PILLAR_TOP_Y, PILLARS, randomIslandSpot, surfaceY } from '../acts/end-world';
import { overworldKit } from '../overworld-voxels';
import { createPortalMaterial, tickPortal } from '../shaders';
import { EGG_HOPS, useEndGame } from '../store';
import { clamp01, easeIn, kit, rng, UNIT_BOX, VoxelMesh } from '../voxels';
import { Part, PX, useDamage, useMobTarget } from './parts';
import { Box, skinOf, useSkin, type SkinArt } from './skins';

// the outer glass cubes stand on a corner and spin about the vertical, like the game's crystal
const CORNER_UP = new THREE.Euler(Math.atan(1 / Math.SQRT2), 0, Math.PI / 4);

// Crystals sit out of sword reach on their pillars: an arrow breaks them, or a sword swung from
// the top of a tower of blocks.
export function EndCrystal({ index, onBreak }: { readonly index: number; readonly onBreak: (index: number) => void }) {
  const { mat } = kit();
  const alive = useEndGame((state) => state.crystals[index]);
  const pillar = PILLARS[index];
  const root = useRef<THREE.Group>(null);
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const target = useMemo<Target | null>(
    () =>
      alive
        ? {
            box: new THREE.Box3().setFromCenterAndSize(pillar.crystal, new THREE.Vector3(2.2, 2.6, 2.2)),
            label: () => null,
            solid: true,
            hit: () => onBreak(index),
          }
        : null,
    [alive, pillar, index, onBreak]
  );
  useTarget(target);

  useFrame((state) => {
    const t = state.clock.elapsedTime + index * 1.7;
    if (root.current) root.current.position.y = pillar.crystal.y + Math.sin(t * 1.4) * 0.22;
    if (outer.current) outer.current.rotation.y = t * 1.3;
    if (inner.current) inner.current.rotation.y = -t * 1.7;
    core.current?.rotation.set(t * 0.9, t * 1.3, 0);
  });

  if (!alive) return null;

  return (
    <group ref={root} position={pillar.crystal}>
      <group ref={outer}>
        <mesh geometry={UNIT_BOX} material={mat.glass} scale={1.25} rotation={CORNER_UP} />
      </group>
      <group ref={inner}>
        <mesh geometry={UNIT_BOX} material={mat.glass} scale={0.92} rotation={CORNER_UP} />
      </group>
      <mesh ref={core} geometry={UNIT_BOX} material={mat.crystalCore} scale={0.52} />
      <sprite material={mat.crystalGlow} scale={4.2} />
    </group>
  );
}

const BEAM = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);

// Only the nearest standing crystal feeds the dragon, as in the game.
export function HealingBeam({ dragon }: { readonly dragon: THREE.Vector3 }) {
  const group = useRef<THREE.Group>(null);
  const materials = useMemo(
    () => ({
      outer: new THREE.MeshBasicMaterial({ color: '#f0abfc', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }),
      inner: new THREE.MeshBasicMaterial({ color: '#fff0ff', transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }),
    }),
    []
  );

  useEffect(
    () => () => {
      materials.outer.dispose();
      materials.inner.dispose();
    },
    [materials]
  );

  useFrame((state) => {
    const beam = group.current;
    if (!beam) return;
    const { stage, crystals } = useEndGame.getState();
    let best = -1;
    let bestDistance = 48;
    if (stage === 'arrival' || stage === 'crystals') {
      PILLARS.forEach((pillar, index) => {
        const distance = pillar.crystal.distanceTo(dragon);
        if (crystals[index] && distance < bestDistance) {
          best = index;
          bestDistance = distance;
        }
      });
    }
    beam.visible = best >= 0;
    if (best < 0) return;
    beam.position.copy(PILLARS[best].crystal);
    beam.lookAt(dragon);
    beam.scale.set(1, 1, bestDistance);
    const t = state.clock.elapsedTime;
    materials.outer.opacity = 0.2 + Math.sin(t * 9) * 0.07;
    materials.inner.opacity = 0.65 + Math.sin(t * 13) * 0.15;
  });

  return (
    <group ref={group} visible={false}>
      <mesh geometry={BEAM} material={materials.outer} scale={[0.34, 0.34, 1]} />
      <mesh geometry={BEAM} material={materials.inner} scale={[0.09, 0.09, 1]} />
    </group>
  );
}


interface EndermanProps {
  readonly seed: number;
  readonly onTeleport: (at: THREE.Vector3) => void;
  readonly onNotice: () => void;
  readonly onDeath?: () => void;
  // the one still carrying a grass block from home: it never runs from your gaze
  readonly carrying?: { readonly home: THREE.Vector3; readonly facing: number; readonly holding: boolean; readonly leave: boolean };
}

// the game's enderman: near-black with faint purple flecks; the jaw sits inside the head and
// shows when the head lifts in anger
const ENDERMAN: SkinArt = {
  palette: {
    b: ['#0b0b0b', '#0b0b0b', '#0e0e0e', '#0e0e0e', '#121212', '#121212', '#161616', '#0c0a0f', '#1a1320', '#221830'],
    m: ['#1d1325', '#24182f'],
  },
  boxes: {
    head: { size: [8, 8, 8], base: 'b' },
    jaw: { size: [7, 4, 7], base: 'b', faces: { front: ['.......', '.mmmmm.', '.......', '.......'] } },
    body: { size: [8, 12, 4], base: 'b' },
    limb: { size: [2, 30, 2], base: 'b' },
  },
};

// the eyes glow in the dark like the game's eye layer: magenta with a pale center
const ENDERMAN_EYES: SkinArt = {
  palette: { x: 'rgba(0,0,0,0)', p: '#d14ff0', l: '#f3c6ff' },
  boxes: { eyes: { size: [8, 1, 0.2], base: 'x', faces: { front: ['plp..plp'] } } },
};

let eyesMaterial: THREE.MeshBasicMaterial | null = null;

function endermanEyes() {
  eyesMaterial ??= new THREE.MeshBasicMaterial({ map: skinOf(ENDERMAN_EYES).texture, alphaTest: 0.5 });
  return eyesMaterial;
}

// a spot on the island some blocks from `around`, clear of the pillars
function spotNear(around: THREE.Vector3, min: number, max: number) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = min + Math.random() * (max - min);
    const x = around.x + Math.cos(angle) * radius;
    const z = around.z + Math.sin(angle) * radius;
    if (Math.hypot(x, z) > ISLAND_RADIUS - 3) continue;
    if (PILLARS.every((pillar) => Math.hypot(pillar.x - x, pillar.z - z) > pillar.radius + 1.5)) return new THREE.Vector3(x, surfaceY(x, z), z);
  }
  return randomIslandSpot();
}

// Stare at one and it stares back, then comes for you, jaw open, and blinks next to you. Arrows
// never land: it teleports away from them. Hit it and now and then it blinks off and comes back.
// It drops an ender pearl when it dies, like the game's.
export function Enderman({ seed, onTeleport, onNotice, onDeath, carrying }: EndermanProps) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const arms = useRef<(THREE.Group | null)[]>([]);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const home = carrying?.home;
  const spawn = useMemo(() => home ?? randomIslandSpot(rng(seed)), [home, seed]);
  const { skin, material } = useSkin(ENDERMAN);
  const materials = useMemo(() => [material], [material]);
  const damage = useDamage(root, materials, 2.9);
  const run = useRef({ t: 0, stare: 0, angry: false, hp: 20, attackAt: 0, hopAt: carrying ? Infinity : 12 + (seed % 7) * 3, facing: carrying?.facing ?? seed * 1.3, watchedAt: -99, gone: false, walk: 0, lift: 0, struck: -9 });

  const blink = (group: THREE.Group, to: THREE.Vector3) => {
    onTeleport(group.position.clone().setY(group.position.y + 1.6));
    group.position.copy(to);
    onTeleport(group.position.clone().setY(group.position.y + 1.6));
    cue('enderman', 0.8);
  };

  useMobTarget(root, [0.7, 2.9, 0.7], {
    label: () => null,
    solid: true,
    watch: (dt) => {
      const r = run.current;
      if (carrying) {
        if (r.gone || r.t - r.watchedAt < 3) return;
        r.watchedAt = r.t;
        cue('whisper');
        onNotice();
        return;
      }
      if (r.angry || r.gone) return;
      r.stare += dt;
      if (r.stare < 0.4) return;
      r.angry = true;
      onNotice();
      const group = root.current;
      if (!group) return;
      const p = runtime.player;
      const behind = new THREE.Vector3(p.pos.x + Math.sin(p.yaw) * 2.5, 0, p.pos.z + Math.cos(p.yaw) * 2.5);
      blink(group, behind.setY(surfaceY(behind.x, behind.z)));
    },
    hit: (amount, source) => {
      const r = run.current;
      const group = root.current;
      if (carrying || !group || r.gone) return;
      // like the game's, it is gone before an arrow lands
      if (source !== 'melee') {
        blink(group, spotNear(runtime.player.pos, 6, 10));
        r.angry = true;
        return;
      }
      r.hp -= amount;
      r.angry = true;
      damage.hurt();
      cue('hit');
      if (r.hp <= 0) {
        r.gone = true;
        damage.die(onDeath);
        useEndGame.getState().give('pearl');
        cue('enderman');
        return;
      }
      if (Math.random() < 0.4) blink(group, spotNear(runtime.player.pos, 4, 7));
    },
  });

  useFrame((state, delta) => {
    const group = root.current;
    if (!group) return;
    const r = run.current;
    const dt = Math.min(delta, 0.1);
    r.t += dt;
    if (carrying) {
      if (!r.gone && carrying.leave) {
        r.gone = true;
        onTeleport(group.position.clone().setY(group.position.y + 1.6));
        cue('enderman', 0.8);
        group.visible = false;
      }
      const watched = r.t - r.watchedAt < 3;
      const towardCamera = Math.atan2(state.camera.position.x - group.position.x, state.camera.position.z - group.position.z);
      const turn = (watched ? towardCamera : r.facing) - group.rotation.y;
      group.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * (1 - Math.exp(-dt * 3));
      if (head.current) head.current.rotation.x = watched ? 0.25 : 0.05;
      return;
    }
    if (r.gone) return;
    r.stare = Math.max(0, r.stare - dt * 0.5);
    const p = runtime.player.pos;
    const towardPlayer = Math.atan2(p.x - group.position.x, p.z - group.position.z);
    let moving = false;
    if (r.angry) {
      group.rotation.y = towardPlayer;
      const distance = Math.hypot(p.x - group.position.x, p.z - group.position.z);
      if (distance > 1.3) {
        const step = Math.min(distance - 1.2, 3.4 * dt);
        group.position.x += Math.sin(towardPlayer) * step;
        group.position.z += Math.cos(towardPlayer) * step;
        group.position.y = surfaceY(group.position.x, group.position.z);
        moving = step > 0.01;
      }
      if (distance < 2 && r.t > r.attackAt && !useEndGame.getState().dead) {
        r.attackAt = r.t + 1;
        useEndGame.getState().hurt(4, 'enderman');
        r.struck = r.t;
      }
      if (distance > 20) blink(group, spotNear(p, 2.5, 4));
    } else {
      group.rotation.y = r.facing + Math.sin(r.t * 0.3 + seed) * 0.4;
      if (r.t > r.hopAt) {
        r.hopAt = r.t + 14 + Math.random() * 18;
        r.facing = Math.random() * Math.PI * 2;
        blink(group, randomIslandSpot());
      }
    }
    // long strides on long legs; angry, it trembles and its head lifts off the jaw
    if (moving) r.walk += dt * 7;
    const swing = moving ? Math.sin(r.walk) * 0.55 : 0;
    legs.current.forEach((leg, index) => leg?.rotation.set(index ? -swing : swing, 0, 0));
    // a hit brings both arms down on you
    const strike = Math.max(0, 1 - (r.t - r.struck) / 0.35);
    arms.current.forEach((arm, index) => arm?.rotation.set((index ? swing : -swing) * 0.6 - (r.angry ? 0.15 : 0) - strike * 1.3, 0, 0));
    body.current?.position.set(r.angry ? (Math.random() - 0.5) * 0.06 : 0, 0, r.angry ? (Math.random() - 0.5) * 0.06 : 0);
    r.lift += ((r.angry ? 5 : 0) - r.lift) * Math.min(1, dt * 10);
    if (head.current) head.current.position.y = (42 + r.lift) * PX;
  });

  return (
    <group ref={root} position={spawn}>
      <group ref={body}>
        {[-2, 2].map((x, index) => (
          <group
            key={x}
            ref={(leg) => {
              legs.current[index] = leg;
            }}
            position={[x * PX, 30 * PX, 0]}
          >
            <Box skin={skin} name="limb" at={[0, -15, 0]} material={material} />
          </group>
        ))}
        <Box skin={skin} name="body" at={[0, 36, 0]} material={material} />
        {[-5, 5].map((x, index) => (
          <group
            key={x}
            ref={(arm) => {
              arms.current[index] = arm;
            }}
            position={[x * PX, 42 * PX, 0]}
            rotation={[carrying?.holding ? -1.15 : 0, 0, 0]}
          >
            <Box skin={skin} name="limb" at={[0, -15, 0]} material={material} />
          </group>
        ))}
        {carrying?.holding && <mesh geometry={UNIT_BOX} material={overworldKit().mat.grass} scale={0.55} position={[0, 31 * PX, 22 * PX]} />}
        <Box skin={skin} name="jaw" at={[0, 44, 0]} material={material} />
        <group ref={head} position={[0, 42 * PX, 0]}>
          <Box skin={skin} name="head" at={[0, 4, 0]} material={material} />
          <mesh geometry={skinOf(ENDERMAN_EYES).boxes.eyes} material={endermanEyes()} position={[0, 3.5 * PX, 4.12 * PX]} />
        </group>
      </group>
    </group>
  );
}

const EGG_LAYERS = [
  [10, 1, 0],
  [12, 2, 1],
  [14, 5, 3],
  [12, 3, 8],
  [10, 2, 11],
  [8, 1, 13],
  [6, 1, 14],
  [4, 1, 15],
] as const;
const HIT_EGG = new THREE.SphereGeometry(1.3, 10, 8);

function bounce(t: number) {
  if (t < 1 / 2.75) return 7.5625 * t * t;
  if (t < 2 / 2.75) return 7.5625 * (t - 1.5 / 2.75) ** 2 + 0.75;
  if (t < 2.5 / 2.75) return 7.5625 * (t - 2.25 / 2.75) ** 2 + 0.9375;
  return 7.5625 * (t - 2.625 / 2.75) ** 2 + 0.984375;
}

interface DragonEggProps {
  readonly onTeleport: (at: THREE.Vector3) => void;
  readonly onCaught: () => void;
}

// Drops onto the fountain when the dragon dies. Touch it and it teleports away; the third touch catches it.

interface DragonEggProps {
  readonly onTeleport: (at: THREE.Vector3) => void;
  readonly onCaught: () => void;
}

// Drops onto the fountain when the dragon dies. Touch it and it teleports away; the third touch catches it.
export function DragonEgg({ onTeleport, onCaught }: DragonEggProps) {
  const { mat } = kit();
  const open = useEndGame((state) => state.portalOpen);
  const caught = useEndGame((state) => state.eggCaught);
  const root = useRef<THREE.Group>(null);
  const run = useRef({ t: 0, landedAt: -1, dropFrom: 14, flyAt: -1, done: false });
  const spot = useMemo(() => new THREE.Vector3(0, PILLAR_TOP_Y, 0), []);
  const flyFrom = useMemo(() => new THREE.Vector3(), []);
  const hand = useMemo(() => new THREE.Vector3(), []);
  const box = useMemo(() => new THREE.Box3(), []);
  const target = useMemo<Target | null>(
    () =>
      open && !caught
        ? {
            box,
            label: () => 'itemEgg',
            reach: 6,
            use: () => {
              const group = root.current;
              const r = run.current;
              if (!group || r.flyAt >= 0) return;
              const game = useEndGame.getState();
              if (game.eggHops < EGG_HOPS) {
                onTeleport(group.position.clone().setY(group.position.y + 0.5));
                spot.copy(randomIslandSpot());
                r.landedAt = r.t;
                r.dropFrom = 0;
                group.position.copy(spot);
                onTeleport(spot.clone().setY(spot.y + 0.5));
                cue('egg');
                game.hopEgg();
                game.showActionBar('hintEgg');
                return;
              }
              r.flyAt = r.t;
              flyFrom.copy(group.position);
            },
          }
        : null,
    [open, caught, box, spot, flyFrom, onTeleport]
  );
  useTarget(target);

  useFrame((state, delta) => {
    const group = root.current;
    if (!group) return;
    const r = run.current;
    r.t += Math.min(delta, 0.1);
    if (r.landedAt < 0) r.landedAt = r.t;
    if (r.flyAt >= 0) {
      const k = clamp01((r.t - r.flyAt) / 0.8);
      state.camera.getWorldDirection(hand).multiplyScalar(2).add(state.camera.position);
      hand.y -= 0.8;
      group.position.lerpVectors(flyFrom, hand, easeIn(k));
      group.scale.setScalar(1 - k * 0.85);
      if (k >= 1 && !r.done) {
        r.done = true;
        onCaught();
      }
      return;
    }
    const age = r.t - r.landedAt;
    const drop = age < 1.1 ? (1 - bounce(age / 1.1)) * r.dropFrom : 0;
    group.position.set(spot.x, spot.y + drop, spot.z);
    box.setFromCenterAndSize(group.position.clone().setY(group.position.y + 0.5), new THREE.Vector3(1.4, 1.4, 1.4));
  });

  if (!open || caught) return null;

  return (
    <group ref={root} position={[0, PILLAR_TOP_Y + 14, 0]}>
      {EGG_LAYERS.map(([width, height, bottom]) => (
        <Part key={bottom} size={[width, height, width]} at={[0, bottom + height / 2, 0]} material={mat.egg} />
      ))}
      <sprite material={mat.crystalGlow} scale={2.2} position={[0, 0.5, 0]} />
    </group>
  );
}

const ORB_COUNT = 64;

// The dragon's experience bursts out, settles on the island, then streams to the player.
export function XpOrbs({ from, onCollect }: { readonly from: THREE.Vector3; readonly onCollect: (share: number) => void }) {
  const { tex } = kit();
  const swarm = useMemo(() => {
    const orbs = Array.from({ length: ORB_COUNT }, () => ({
      position: from.clone(),
      velocity: new THREE.Vector3()
        .randomDirection()
        .multiplyScalar(5 + Math.random() * 9)
        .setY(4 + Math.random() * 10),
      delay: 1 + Math.random() * 0.9,
      done: false,
    }));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ORB_COUNT * 3), 3));
    const material = new THREE.PointsMaterial({ map: tex.orb, size: 11, sizeAttenuation: false, transparent: true, alphaTest: 0.4, depthWrite: false });
    return { orbs, geometry, material };
  }, [from, tex.orb]);
  const run = useRef({ t: 0, collected: 0, tinkleAt: 0 });
  const toward = useMemo(() => new THREE.Vector3(), []);

  useEffect(
    () => () => {
      swarm.geometry.dispose();
      swarm.material.dispose();
    },
    [swarm]
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const r = run.current;
    r.t += dt;
    const positions = swarm.geometry.getAttribute('position') as THREE.BufferAttribute;
    swarm.orbs.forEach((orb, index) => {
      if (orb.done) return;
      if (r.t < orb.delay) {
        orb.velocity.y -= 16 * dt;
        orb.position.addScaledVector(orb.velocity, dt);
        const ground = surfaceY(orb.position.x, orb.position.z) + 0.2;
        if (Math.hypot(orb.position.x, orb.position.z) < ISLAND_RADIUS && orb.position.y < ground) {
          orb.position.y = ground;
          orb.velocity.set(orb.velocity.x * 0.7, -orb.velocity.y * 0.35, orb.velocity.z * 0.7);
        }
      } else {
        toward.copy(state.camera.position).sub(orb.position);
        const distance = toward.length();
        const speed = Math.min(60, 8 + (r.t - orb.delay) * 40);
        orb.position.addScaledVector(toward.normalize(), Math.min(distance, speed * dt));
        if (distance < 2.5) {
          orb.done = true;
          orb.position.set(0, -999, 0);
          r.collected += 1;
          onCollect(r.collected / ORB_COUNT);
          if (r.t - r.tinkleAt > 0.07) {
            r.tinkleAt = r.t;
            cue('xp');
          }
        }
      }
      positions.setXYZ(index, orb.position.x, orb.position.y, orb.position.z);
    });
    positions.needsUpdate = true;
    swarm.material.color.setHSL(0.2 + Math.sin(r.t * 12) * 0.04, 1, 0.66);
  });

  return <points geometry={swarm.geometry} material={swarm.material} frustumCulled={false} />;
}

export const GATEWAY_AT = new THREE.Vector3(-40, 13, -46);
const GATEWAY_BEDROCK = [
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
];
const COLUMN = new THREE.CylinderGeometry(1, 1, 90, 12, 1, true);

// After the fight a gateway to the outer islands flares up at the edge of the sky. As in the
// game, it is out of reach: you throw an ender pearl into it.
export function EndGateway({ onPearl }: { readonly onPearl: () => void }) {
  const { tex, mat } = kit();
  const portal = useMemo(() => createPortalMaterial(tex.specks), [tex.specks]);
  const beam = useMemo(() => new THREE.MeshBasicMaterial({ color: '#c77dff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), []);
  const column = useRef<THREE.Mesh>(null);
  const age = useRef(0);
  const target = useMemo<Target>(
    () => ({
      box: new THREE.Box3().setFromCenterAndSize(GATEWAY_AT, new THREE.Vector3(4, 4, 4)),
      label: () => 'gateway',
      reach: 80,
      pearl: onPearl,
    }),
    [onPearl]
  );
  useTarget(target);

  useEffect(
    () => () => {
      portal.dispose();
      beam.dispose();
    },
    [portal, beam]
  );

  useFrame((state, delta) => {
    tickPortal(portal, state);
    age.current += Math.min(delta, 0.1);
    const pulse = age.current < 2.5 ? 1 : Math.max(0.12, 1 - (age.current - 2.5) * 0.8);
    beam.opacity = pulse * 0.6;
    column.current?.scale.set(0.25 + pulse * 0.9, 1, 0.25 + pulse * 0.9);
  });

  return (
    <group position={GATEWAY_AT}>
      <mesh geometry={UNIT_BOX} material={portal} />
      <VoxelMesh blocks={GATEWAY_BEDROCK} material={mat.bedrock} />
      <mesh ref={column} geometry={COLUMN} material={beam} position={[0, 45, 0]} />
    </group>
  );
}
