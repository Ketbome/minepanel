'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { spawnEffect } from '../engine/Effects';
import { canStepUp, dropAhead, move, overlaps } from '../engine/physics';
import { runtime, useTarget, type Target } from '../engine/runtime';
import { sizedBox } from '../voxels';

// Mob models are built from boxes sized in model pixels (16 per block), like the game's models.
export const PX = 1 / 16;

type Vec3 = readonly [number, number, number];

export function Part({ size, at = [0, 0, 0], material }: { readonly size: Vec3; readonly at?: Vec3; readonly material: THREE.Material | THREE.Material[] }) {
  return <mesh geometry={sizedBox(size[0] * PX, size[1] * PX, size[2] * PX)} material={material} position={[at[0] * PX, at[1] * PX, at[2] * PX]} />;
}

const materials = new Map<string, THREE.MeshLambertMaterial>();

// flat colors are shared across every mob that uses them
export function flat(color: string) {
  let material = materials.get(color);
  if (!material) {
    material = new THREE.MeshLambertMaterial({ color });
    materials.set(color, material);
  }
  return material;
}

// a name tag floating above the head, drawn once into a canvas
export function NameTag({ text, y }: { readonly text: string; readonly y: number }) {
  const material = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 48;
    const ctx = canvas.getContext('2d')!;
    ctx.font = '600 26px Archivo, system-ui, sans-serif';
    const width = Math.min(248, ctx.measureText(text).width + 20);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect((256 - width) / 2, 4, width, 40);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 25);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  }, [text]);

  useEffect(
    () => () => {
      material.map?.dispose();
      material.dispose();
    },
    [material]
  );

  return <sprite material={material} scale={[2, 0.375, 1]} position={[0, y, 0]} />;
}

export interface Wander {
  readonly home: THREE.Vector3;
  readonly radius: number;
  readonly speed: number;
}

export interface MobBody {
  readonly half?: number;
  readonly height?: number;
}

// What a mob's own logic can steer, frame by frame, on top of its wandering.
export interface MobControl {
  readonly vel: THREE.Vector3;
  // walk toward this point instead of wandering (hostiles set it to the player)
  chase: THREE.Vector3 | null;
  chaseSpeed: number;
  // stand still (talking, a creeper's fuse)
  stopped: boolean;
  // the head turns toward this point when it can
  lookAt: THREE.Vector3 | null;
  panicUntil: number;
  dead: boolean;
  knock: (from: THREE.Vector3, strength?: number) => void;
}

const GRAVITY = 28;
const JUMP = 8.2;
const wish = new THREE.Vector3();
const delta = new THREE.Vector3();

// Minecraft-like movement: gravity and block collisions, a hop up one-block steps, never off a
// ledge deeper than three, a new direction when stuck, and a scramble away when hit.
export function useMob(
  root: React.RefObject<THREE.Group | null>,
  wander: Wander,
  legs: React.RefObject<(THREE.Group | null)[]>,
  { half = 0.3, height = 1.8 }: MobBody = {},
  head?: React.RefObject<THREE.Group | null>
): MobControl {
  const control = useMemo<MobControl>(
    () => ({
      vel: new THREE.Vector3(),
      chase: null,
      chaseSpeed: wander.speed,
      stopped: false,
      lookAt: null,
      panicUntil: 0,
      dead: false,
      knock: (from, strength = 6) => {
        const group = root.current;
        if (!group) return;
        const away = group.position.clone().sub(from).setY(0);
        if (away.lengthSq() < 1e-4) away.set(Math.random() - 0.5, 0, Math.random() - 0.5);
        away.normalize().multiplyScalar(strength);
        control.vel.set(away.x, 4.5, away.z);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const state = useRef({ goal: null as THREE.Vector3 | null, idleUntil: Math.random() * 3, onGround: false, blocked: false, walk: 0, check: 0, from: new THREE.Vector3(), glance: 0, headYaw: 0 });

  useFrame(({ camera, scene }, frame) => {
    const group = root.current;
    const world = runtime.world;
    if (!group || !world || control.dead) return;
    // past the fog there is nothing to see; it keeps walking, undrawn, like a chunk out there
    if (scene.fog instanceof THREE.Fog) group.visible = camera.position.distanceTo(group.position) < scene.fog.far + 2;
    const dt = Math.min(frame, 0.05);
    const s = state.current;
    const pos = group.position;
    // buried (a home set below a hill, or a block placed on it): climb out onto the surface
    for (let step = 0; step < 8 && overlaps(world, pos.x, pos.y, pos.z, height, half); step += 1) {
      pos.y = Math.floor(pos.y + 0.5) + 0.5;
      control.vel.y = 0;
    }
    const panicking = runtime.time < control.panicUntil;
    let speed = panicking ? wander.speed * 2.2 : wander.speed;
    wish.set(0, 0, 0);

    if (control.chase && !control.stopped) {
      wish.set(control.chase.x - pos.x, 0, control.chase.z - pos.z);
      speed = control.chaseSpeed;
      if (wish.lengthSq() < 1.2) wish.set(0, 0, 0);
      s.goal = null;
    } else if (!control.stopped) {
      if (!s.goal && runtime.time > s.idleUntil) {
        // pick somewhere to stroll; panicking mobs bolt anywhere nearby
        const angle = Math.random() * Math.PI * 2;
        const reach = panicking ? 4 + Math.random() * 4 : 1.5 + Math.random() * wander.radius;
        const origin = panicking ? pos : wander.home;
        s.goal = new THREE.Vector3(origin.x + Math.cos(angle) * reach, 0, origin.z + Math.sin(angle) * reach);
        s.check = runtime.time + 1.5;
        s.from.copy(pos);
      }
      if (s.goal) {
        wish.set(s.goal.x - pos.x, 0, s.goal.z - pos.z);
        if (wish.lengthSq() < 0.3) {
          s.goal = null;
          s.idleUntil = runtime.time + (panicking ? 0 : 2 + Math.random() * 5);
          wish.set(0, 0, 0);
        } else if (runtime.time > s.check) {
          // no real progress in a second and a half: give up on this spot
          if (Math.hypot(pos.x - s.from.x, pos.z - s.from.z) < 0.4) {
            s.goal = null;
            s.idleUntil = runtime.time + 0.5 + Math.random();
          }
          s.check = runtime.time + 1.5;
          s.from.copy(pos);
        }
      }
    }
    if (wish.lengthSq() > 0) wish.normalize();
    if (s.onGround && wish.lengthSq() > 0 && dropAhead(world, pos, wish.x, wish.z, half) > 3) {
      wish.set(0, 0, 0);
      s.goal = null;
      s.idleUntil = runtime.time + 0.5;
    }

    const accel = s.onGround ? 10 : 2;
    control.vel.x += (wish.x * speed - control.vel.x) * (1 - Math.exp(-accel * dt));
    control.vel.z += (wish.z * speed - control.vel.z) * (1 - Math.exp(-accel * dt));
    control.vel.y = Math.max(-40, control.vel.y - GRAVITY * dt);
    const moved = move(world, pos, delta.copy(control.vel).multiplyScalar(dt), height, half);
    if (moved.hitX) control.vel.x = 0;
    if (moved.hitZ) control.vel.z = 0;
    if (moved.onGround && control.vel.y < 0) control.vel.y = 0;
    if (moved.hitCeiling && control.vel.y > 0) control.vel.y = 0;
    s.onGround = moved.onGround;
    if (s.onGround && (moved.hitX || moved.hitZ) && wish.lengthSq() > 0 && canStepUp(world, pos, wish.x, wish.z, height, half)) control.vel.y = JUMP;
    if (pos.y < runtime.voidY) {
      control.dead = true;
      group.visible = false;
      return;
    }

    // the body turns to where it walks; the head is free to look around or at you
    const horizontal = Math.hypot(control.vel.x, control.vel.z);
    if (horizontal > 0.3) {
      const turn = Math.atan2(control.vel.x, control.vel.z) - group.rotation.y;
      group.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * Math.min(1, dt * 8);
    } else if (control.lookAt && !control.chase) {
      const turn = Math.atan2(control.lookAt.x - pos.x, control.lookAt.z - pos.z) - group.rotation.y;
      group.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * Math.min(1, dt * 2);
    }
    if (head?.current) {
      let goal = 0;
      if (control.lookAt) {
        const toward = Math.atan2(control.lookAt.x - pos.x, control.lookAt.z - pos.z) - group.rotation.y;
        goal = Math.max(-1, Math.min(1, Math.atan2(Math.sin(toward), Math.cos(toward))));
      } else if (horizontal < 0.3) {
        if (runtime.time > s.glance) {
          s.glance = runtime.time + 2 + Math.random() * 3;
          s.headYaw = (Math.random() - 0.5) * 1.6;
        }
        goal = s.headYaw;
      }
      head.current.rotation.y += (goal - head.current.rotation.y) * Math.min(1, dt * 5);
    }
    s.walk += dt * horizontal * 2.2;
    const swing = Math.min(1, horizontal / 2) * 0.7;
    legs.current?.forEach((leg, index) => leg?.rotation.set(Math.sin(s.walk + (index % 2) * Math.PI) * swing, 0, 0));
  });

  return control;
}

// keeps a target's box glued to a moving mob; the callbacks always see the latest props
export function useMobTarget(root: React.RefObject<THREE.Group | null>, size: Vec3, target: Omit<Target, 'box'>) {
  const latest = useRef(target);
  latest.current = target;
  const entry = useMemo<Target>(
    () => ({
      box: new THREE.Box3(),
      label: () => latest.current.label?.() ?? null,
      use: target.use && (() => latest.current.use?.()),
      hit: target.hit && ((damage, source) => latest.current.hit?.(damage, source)),
      watch: target.watch && ((dt) => latest.current.watch?.(dt)),
      reach: target.reach,
      solid: target.solid,
      hostile: target.hostile,
    }),
    // the shape of a mob's target never changes, only what its callbacks do
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  useTarget(entry);
  useFrame(() => {
    const group = root.current;
    if (!group) return;
    entry.box.min.set(group.position.x - size[0] / 2, group.position.y, group.position.z - size[2] / 2);
    entry.box.max.set(group.position.x + size[0] / 2, group.position.y + size[1], group.position.z + size[2] / 2);
    if (!group.visible) entry.box.makeEmpty();
  });
  return entry;
}

const DEATH_S = 1;
const RED = new THREE.Color('#8a0000');
const NONE = new THREE.Color('#000000');

// The game's hit feedback: a red flash when hurt; on death the mob stays red, topples onto its
// side for a second and puffs away.
export function useDamage(root: React.RefObject<THREE.Group | null>, materials: readonly THREE.MeshLambertMaterial[], height = 1) {
  const state = useRef({ hurtUntil: 0, diedAt: -1, gone: false, onGone: null as (() => void) | null });
  useFrame(() => {
    const s = state.current;
    const red = s.diedAt >= 0 || runtime.time < s.hurtUntil;
    materials.forEach((material) => material.emissive.copy(red ? RED : NONE));
    const group = root.current;
    if (s.diedAt < 0 || s.gone || !group) return;
    const k = (runtime.time - s.diedAt) / DEATH_S;
    group.rotation.order = 'YXZ';
    group.rotation.z = -Math.min(1, Math.sqrt(k * 1.6)) * (Math.PI / 2);
    if (k < 1) return;
    s.gone = true;
    group.visible = false;
    spawnEffect('poof', group.position.clone().setY(group.position.y + height / 2));
    s.onGone?.();
  });
  return useMemo(
    () => ({
      hurt: () => {
        state.current.hurtUntil = runtime.time + 0.4;
      },
      die: (onGone?: () => void) => {
        if (state.current.diedAt >= 0) return;
        state.current.diedAt = runtime.time;
        state.current.onGone = onGone ?? null;
      },
      dying: () => state.current.diedAt >= 0,
    }),
    []
  );
}

// Mobs that die come back after a while, the way the game keeps spawning them: the zone keys each
// one by its life, so a new life mounts a fresh mob.
export function useRespawns(seconds: number) {
  const [lives, setLives] = useState<Readonly<Record<string, number>>>({});
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);
  return useMemo(
    () => ({
      life: (id: string) => lives[id] ?? 0,
      died: (id: string) => {
        timers.current.push(window.setTimeout(() => setLives((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 })), seconds * 1000));
      },
    }),
    [lives, seconds]
  );
}
