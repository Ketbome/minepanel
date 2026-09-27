'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cue } from '../end-audio';
import { useEndGame } from '../store';
import { kit, UNIT_BOX } from '../voxels';
import { spawnDrop } from './Drops';
import { castBlocks, castTargets, solidCell } from './raycast';
import { playerCenter, runtime, type Projectile } from './runtime';

const POOL = 48;
const FORWARD = new THREE.Vector3(0, 0, 1);
const center = new THREE.Vector3();
const dir = new THREE.Vector3();
const closest = new THREE.Vector3();
const segment = new THREE.Line3();

export function spawnProjectile(projectile: Omit<Projectile, 'age' | 'done'>) {
  const entry: Projectile = { ...projectile, age: 0, done: false };
  runtime.projectiles.push(entry);
  return entry;
}

// Arrows, fireballs, pearls and shulker bullets. They fly with gravity, stop at the first solid
// block, hit what they were aimed at, and a mob's projectile hurts the player on contact.
export function Projectiles() {
  const { tex } = kit();
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const glows = useRef<(THREE.Sprite | null)[]>([]);
  const materials = useMemo(
    () => ({
      arrow: new THREE.MeshLambertMaterial({ color: '#8a6337' }),
      fireball: new THREE.MeshBasicMaterial({ color: '#ffb347' }),
      ghastball: new THREE.MeshBasicMaterial({ color: '#ff7a1a' }),
      dragonball: new THREE.MeshBasicMaterial({ color: '#c34dff' }),
      pearl: new THREE.MeshLambertMaterial({ color: '#1d6b5a', emissive: '#0b2a24' }),
      bullet: new THREE.MeshBasicMaterial({ color: '#f5f0c8' }),
      glow: new THREE.SpriteMaterial({ map: tex.glow, color: '#ff9a3c', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      glowPurple: new THREE.SpriteMaterial({ map: tex.glow, color: '#c34dff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    }),
    [tex.glow]
  );

  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose());
      runtime.projectiles = [];
    },
    [materials]
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const world = runtime.world;
    const game = useEndGame.getState();
    playerCenter(center);
    for (const shot of runtime.projectiles) {
      if (shot.done) continue;
      shot.age += dt;
      if (shot.age > 10 || game.transition) {
        shot.done = true;
        continue;
      }
      if (shot.kind === 'bullet' && !shot.fromPlayer) {
        // shulker bullets home in, slowly enough to be dodged
        dir.copy(center).sub(shot.pos).normalize().multiplyScalar(7);
        shot.vel.lerp(dir, 1 - Math.exp(-dt * 1.6));
      }
      let homing = false;
      if (shot.kind === 'pearl') {
        // a pearl thrown roughly at the gateway finds it, like a well-judged throw in the game
        runtime.targets.forEach((target) => {
          if (!target.pearl) return;
          target.box.getCenter(dir).sub(shot.pos);
          if (dir.angleTo(shot.vel) > 0.5) return;
          homing = true;
          shot.vel.lerp(dir.normalize().multiplyScalar(22), 1 - Math.exp(-dt * 8));
        });
      }
      if (!homing) shot.vel.y -= shot.gravity * dt;
      const length = shot.vel.length() * dt;
      dir.copy(shot.vel).normalize();
      if (!shot.fromPlayer && !game.dead) {
        segment.set(shot.pos, closest.copy(shot.pos).addScaledVector(dir, length));
        segment.closestPointToPoint(center, true, closest);
        if (closest.distanceTo(center) < (shot.kind === 'ghastball' ? 1 : 0.7)) {
          game.hurt(shot.damage, shot.cause);
          runtime.player.vel.addScaledVector(dir, 5).setY(Math.max(runtime.player.vel.y, 3));
          if (shot.kind === 'bullet') game.levitate(3);
          shot.onLand?.(closest.clone(), null);
          shot.done = true;
          continue;
        }
      }
      if (shot.fromPlayer) {
        const pearl = shot.kind === 'pearl';
        const hit = castTargets(shot.pos, dir, length, (target) => (pearl ? Boolean(target.pearl) : Boolean(target.hit) && target.solid !== false && target !== shot.target));
        if (hit && pearl) {
          hit.target.pearl!();
          shot.done = true;
          continue;
        }
        if (hit) {
          if (shot.kind === 'arrow') cue('arrowHit');
          const at = shot.pos.clone().addScaledVector(dir, hit.distance);
          const bounced = hit.target.hit!(shot.damage, shot.kind === 'arrow' ? 'arrow' : 'fireball') === false;
          if (bounced && shot.kind === 'arrow') spawnDrop('arrow', 1, at, dir.clone().multiplyScalar(-3).setY(4));
          shot.onLand?.(at, hit.target);
          shot.done = true;
          continue;
        }
      }
      const wall = world ? castBlocks(world, shot.pos, dir, length, solidCell(world)) : null;
      if (wall) {
        const at = shot.pos.clone().addScaledVector(dir, Math.max(0, wall.distance - 0.3));
        shot.onLand?.(at, null);
        shot.done = true;
        // an arrow that hits a block makes a vibration, and yours can be picked up again
        if (shot.kind === 'arrow') {
          runtime.hooks.vibration?.(at, 15);
          if (shot.fromPlayer) spawnDrop('arrow', 1, at, dir.clone().multiplyScalar(-0.5));
        }
        continue;
      }
      shot.pos.addScaledVector(shot.vel, dt);
      if (shot.target) shot.target.box.setFromCenterAndSize(shot.pos, closest.set(1.4, 1.4, 1.4));
    }
    runtime.projectiles = runtime.projectiles.filter((shot) => !shot.done);

    meshes.current.forEach((mesh, index) => {
      const shot = runtime.projectiles[index];
      const glow = glows.current[index];
      if (!mesh || !glow) return;
      mesh.visible = Boolean(shot);
      glow.visible = Boolean(shot) && shot.kind !== 'arrow' && shot.kind !== 'pearl';
      if (!shot) return;
      mesh.position.copy(shot.pos);
      glow.position.copy(shot.pos);
      mesh.material = materials[shot.kind];
      if (shot.kind === 'arrow') {
        mesh.quaternion.setFromUnitVectors(FORWARD, dir.copy(shot.vel).normalize());
        mesh.scale.set(0.06, 0.06, 0.8);
        return;
      }
      const size = shot.kind === 'ghastball' ? 0.9 : shot.kind === 'dragonball' ? 0.7 : shot.kind === 'pearl' ? 0.22 : 0.3;
      mesh.scale.setScalar(size);
      mesh.rotation.set(shot.age * 5, shot.age * 7, 0);
      glow.material = shot.kind === 'dragonball' || shot.kind === 'bullet' ? materials.glowPurple : materials.glow;
      glow.scale.setScalar(size * 4);
    });
  });

  return (
    <>
      {Array.from({ length: POOL }, (_, index) => (
        <group key={index}>
          <mesh
            ref={(mesh) => {
              meshes.current[index] = mesh;
            }}
            geometry={UNIT_BOX}
            visible={false}
          />
          <sprite
            ref={(glow) => {
              glows.current[index] = glow;
            }}
            material={materials.glow}
            visible={false}
          />
        </group>
      ))}
    </>
  );
}
