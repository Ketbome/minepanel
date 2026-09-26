'use client';

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cue } from './end-audio';
import { EGG_HOPS, useEndGame } from './end-game-store';
import { ISLAND_RADIUS, PILLAR_TOP_Y, PILLARS, pointerCursor, randomIslandSpot, surfaceY } from './EndWorld';
import { createPortalMaterial, tickPortal } from './shaders';
import { clamp01, easeIn, easeOut, kit, rng, sizedBox, UNIT_BOX, VoxelMesh } from './voxels';

const PX = 1 / 16;

// the outer glass cubes stand on a corner and spin about the vertical, like the game's crystal
const CORNER_UP = new THREE.Euler(Math.atan(1 / Math.SQRT2), 0, Math.PI / 4);
const HIT_CRYSTAL = new THREE.SphereGeometry(1.7, 10, 8);

export function EndCrystal({ index, onBreak }: { readonly index: number; readonly onBreak: (index: number) => void }) {
  const { mat } = kit();
  const alive = useEndGame((state) => state.crystals[index]);
  const pillar = PILLARS[index];
  const root = useRef<THREE.Group>(null);
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);

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
      <mesh
        geometry={HIT_CRYSTAL}
        material={mat.hitbox}
        onClick={(event) => {
          event.stopPropagation();
          if (event.delta <= 8) onBreak(index);
        }}
        {...pointerCursor}
      />
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

const HIT_ENDERMAN = new THREE.BoxGeometry(1.1, 3.4, 1.1);

function Part({ size, at, material }: { readonly size: readonly [number, number, number]; readonly at: readonly [number, number, number]; readonly material: THREE.Material }) {
  return <mesh geometry={sizedBox(size[0] * PX, size[1] * PX, size[2] * PX)} material={material} position={[at[0] * PX, at[1] * PX, at[2] * PX]} />;
}

interface EndermanProps {
  readonly seed: number;
  readonly onTeleport: (at: THREE.Vector3) => void;
  readonly onNotice: () => void;
}

// Look at one and it stares back, shakes, and blinks away to somewhere else on the island.
export function Enderman({ seed, onTeleport, onNotice }: EndermanProps) {
  const { mat } = kit();
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const arms = useRef<(THREE.Group | null)[]>([]);
  const spawn = useMemo(() => randomIslandSpot(rng(seed)), [seed]);
  const run = useRef({ t: 0, angryAt: -1, hopAt: 12 + (seed % 7) * 3, facing: seed * 1.3 });

  const teleport = (group: THREE.Group) => {
    const r = run.current;
    onTeleport(group.position.clone().setY(group.position.y + 1.6));
    group.position.copy(randomIslandSpot());
    onTeleport(group.position.clone().setY(group.position.y + 1.6));
    cue('enderman', 0.8);
    r.angryAt = -1;
    r.hopAt = r.t + 14 + Math.random() * 18;
    r.facing = Math.random() * Math.PI * 2;
  };

  useFrame((state, delta) => {
    const group = root.current;
    if (!group) return;
    const r = run.current;
    r.t += Math.min(delta, 0.1);
    const angry = r.angryAt >= 0;
    if ((angry && r.t - r.angryAt > 0.75) || (!angry && r.t > r.hopAt)) {
      teleport(group);
      return;
    }
    const camera = state.camera.position;
    const towardCamera = Math.atan2(camera.x - group.position.x, camera.z - group.position.z);
    group.rotation.y = angry ? towardCamera : r.facing + Math.sin(r.t * 0.3 + seed) * 0.4;
    body.current?.position.set(angry ? (Math.random() - 0.5) * 0.08 : 0, 0, angry ? (Math.random() - 0.5) * 0.08 : 0);
    if (head.current) head.current.position.y = (angry ? 47 : 42) * PX;
    arms.current.forEach((arm, index) => arm?.rotation.set(Math.sin(r.t * 1.3 + seed + index * Math.PI) * 0.08 - (angry ? 0.3 : 0), 0, 0));
  });

  const notice = (event: ThreeEvent<PointerEvent | MouseEvent>) => {
    event.stopPropagation();
    const r = run.current;
    if (r.angryAt >= 0) return;
    r.angryAt = r.t;
    onNotice();
  };

  return (
    <group ref={root} position={spawn}>
      <group ref={body}>
        <Part size={[2, 30, 2]} at={[-2, 15, 0]} material={mat.enderman} />
        <Part size={[2, 30, 2]} at={[2, 15, 0]} material={mat.enderman} />
        <Part size={[8, 12, 4]} at={[0, 36, 0]} material={mat.enderman} />
        {[-5, 5].map((x, index) => (
          <group
            key={x}
            ref={(arm) => {
              arms.current[index] = arm;
            }}
            position={[x * PX, 42 * PX, 0]}
          >
            <Part size={[2, 30, 2]} at={[0, -15, 0]} material={mat.enderman} />
          </group>
        ))}
        <Part size={[8, 3, 8]} at={[0, 43.5, 0]} material={mat.enderman} />
        <group ref={head} position={[0, 42 * PX, 0]}>
          <Part size={[8, 8, 8]} at={[0, 4, 0]} material={mat.enderman} />
          <Part size={[3, 1, 0.4]} at={[-2, 3.5, 4.2]} material={mat.endermanEye} />
          <Part size={[3, 1, 0.4]} at={[2, 3.5, 4.2]} material={mat.endermanEye} />
        </group>
      </group>
      <mesh geometry={HIT_ENDERMAN} material={mat.hitbox} position={[0, 1.7, 0]} onPointerOver={notice} onClick={notice} />
    </group>
  );
}

// the egg block is a stack of shrinking slabs: [width, height, bottom] in model pixels
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
export function DragonEgg({ onTeleport, onCaught }: DragonEggProps) {
  const { mat } = kit();
  const open = useEndGame((state) => state.portalOpen);
  const caught = useEndGame((state) => state.eggCaught);
  const root = useRef<THREE.Group>(null);
  const run = useRef({ t: 0, landedAt: -1, dropFrom: 14, flyAt: -1, done: false });
  const spot = useMemo(() => new THREE.Vector3(0, PILLAR_TOP_Y, 0), []);
  const flyFrom = useMemo(() => new THREE.Vector3(), []);
  const hand = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const group = root.current;
    if (!group) return;
    const r = run.current;
    r.t += Math.min(delta, 0.1);
    if (r.landedAt < 0) r.landedAt = r.t;
    if (r.flyAt >= 0) {
      const k = clamp01((r.t - r.flyAt) / 0.8);
      state.camera.getWorldDirection(hand).multiplyScalar(3).add(state.camera.position);
      hand.y -= 1.2;
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
  });

  if (!open || caught) return null;

  const touch = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const group = root.current;
    const r = run.current;
    if (event.delta > 8 || !group || r.flyAt >= 0) return;
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
      game.showActionBar('dangerEggHintEgg');
      return;
    }
    r.flyAt = r.t;
    flyFrom.copy(group.position);
    document.body.style.cursor = '';
  };

  return (
    <group ref={root} position={[0, PILLAR_TOP_Y + 14, 0]}>
      {EGG_LAYERS.map(([width, height, bottom]) => (
        <Part key={bottom} size={[width, height, width]} at={[0, bottom + height / 2, 0]} material={mat.egg} />
      ))}
      <sprite material={mat.crystalGlow} scale={2.2} position={[0, 0.5, 0]} />
      <mesh geometry={HIT_EGG} material={mat.hitbox} position={[0, 0.5, 0]} onClick={touch} {...pointerCursor} />
    </group>
  );
}

// Purple pixel particles, the game's portal particle.
export function PortalBurst({ at, onDone }: { readonly at: THREE.Vector3; readonly onDone: () => void }) {
  const burst = useMemo(() => {
    const directions = Array.from({ length: 26 }, () => new THREE.Vector3().randomDirection().multiplyScalar(0.8 + Math.random() * 1.6));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(directions.length * 3), 3));
    const material = new THREE.PointsMaterial({ color: '#c86bff', size: 5, sizeAttenuation: false, transparent: true, depthWrite: false });
    return { directions, geometry, material };
  }, []);
  const age = useRef(0);
  const finished = useRef(false);

  useEffect(
    () => () => {
      burst.geometry.dispose();
      burst.material.dispose();
    },
    [burst]
  );

  useFrame((_, delta) => {
    age.current += Math.min(delta, 0.1);
    const k = age.current / 0.9;
    const spread = easeOut(Math.min(1, k));
    const positions = burst.geometry.getAttribute('position') as THREE.BufferAttribute;
    burst.directions.forEach((direction, index) => {
      positions.setXYZ(index, direction.x * spread, direction.y * spread - k * k * 0.6, direction.z * spread);
    });
    positions.needsUpdate = true;
    burst.material.opacity = Math.max(0, 1 - k);
    if (k >= 1 && !finished.current) {
      finished.current = true;
      onDone();
    }
  });

  return <points geometry={burst.geometry} material={burst.material} position={at} frustumCulled={false} />;
}

const FLASH = new THREE.SphereGeometry(1, 14, 10);

export function Explosion({ at, onDone }: { readonly at: THREE.Vector3; readonly onDone: () => void }) {
  const { tex } = kit();
  const parts = useMemo(
    () => ({
      flash: new THREE.MeshBasicMaterial({ color: '#fff3ff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
      smoke: new THREE.SpriteMaterial({ map: tex.glow, color: '#e7def0', transparent: true, depthWrite: false }),
      shard: new THREE.MeshBasicMaterial({ color: '#f3c4ff', transparent: true }),
      puffs: Array.from({ length: 10 }, () => ({
        offset: new THREE.Vector3().randomDirection().multiplyScalar(0.6 + Math.random() * 1.8),
        size: 2 + Math.random() * 2.2,
      })),
      shards: Array.from({ length: 14 }, () => ({
        velocity: new THREE.Vector3().randomDirection().multiplyScalar(4 + Math.random() * 6).add(new THREE.Vector3(0, 4, 0)),
        spin: Math.random() * 10,
      })),
    }),
    [tex.glow]
  );
  const flash = useRef<THREE.Mesh>(null);
  const puffs = useRef<(THREE.Sprite | null)[]>([]);
  const shards = useRef<(THREE.Mesh | null)[]>([]);
  const age = useRef(0);
  const finished = useRef(false);

  useEffect(
    () => () => {
      parts.flash.dispose();
      parts.smoke.dispose();
      parts.shard.dispose();
    },
    [parts]
  );

  useFrame((_, delta) => {
    const t = (age.current += Math.min(delta, 0.1));
    flash.current?.scale.setScalar(0.5 + easeOut(clamp01(t / 0.2)) * 2.4);
    parts.flash.opacity = Math.max(0, 1 - t / 0.22);
    parts.smoke.opacity = Math.max(0, 0.9 * (1 - t / 1.3));
    puffs.current.forEach((puff, index) => {
      if (!puff) return;
      const { offset, size } = parts.puffs[index];
      const k = easeOut(clamp01(t / 0.9));
      puff.position.copy(offset).multiplyScalar(0.4 + k);
      puff.scale.setScalar(size * k);
    });
    parts.shard.opacity = Math.max(0, 1 - t / 1.4);
    shards.current.forEach((shard, index) => {
      if (!shard) return;
      const { velocity, spin } = parts.shards[index];
      shard.position.copy(velocity).multiplyScalar(t);
      shard.position.y -= 9 * t * t;
      shard.rotation.set(t * spin, t * spin * 0.7, 0);
    });
    if (t > 1.5 && !finished.current) {
      finished.current = true;
      onDone();
    }
  });

  return (
    <group position={at}>
      <mesh ref={flash} geometry={FLASH} material={parts.flash} />
      {parts.puffs.map((_, index) => (
        <sprite
          key={index}
          ref={(puff) => {
            puffs.current[index] = puff;
          }}
          material={parts.smoke}
        />
      ))}
      {parts.shards.map((_, index) => (
        <mesh
          key={index}
          ref={(shard) => {
            shards.current[index] = shard;
          }}
          geometry={UNIT_BOX}
          material={parts.shard}
          scale={0.22}
        />
      ))}
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

const GATEWAY_AT = new THREE.Vector3(-40, 13, -46);
const GATEWAY_BEDROCK = [
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
];
const COLUMN = new THREE.CylinderGeometry(1, 1, 90, 12, 1, true);

// After the fight a gateway to the outer islands flares up at the edge of the sky.
export function EndGateway() {
  const { tex, mat } = kit();
  const portal = useMemo(() => createPortalMaterial(tex.specks), [tex.specks]);
  const beam = useMemo(() => new THREE.MeshBasicMaterial({ color: '#c77dff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), []);
  const column = useRef<THREE.Mesh>(null);
  const age = useRef(0);

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
