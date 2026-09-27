'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { cue } from '../end-audio';
import type { ItemId } from '../items';
import { useEndGame } from '../store';
import { blockMaterial, spriteOf, type Sprite } from './Hand';
import { playerCenter, runtime } from './runtime';

// Items lying in the world, like the game's item entities: loot a mob drops, a piglin's barter,
// the arrows you shot. They fall, settle on a block, spin, and jump into your inventory when you
// walk over them.

interface Drop {
  readonly id: number;
  readonly item: ItemId;
  readonly count: number;
  readonly pos: THREE.Vector3;
  readonly vel: THREE.Vector3;
  age: number;
}

const PICKUP = 1.5;
const DESPAWN_S = 300;
const CUBE = new THREE.BoxGeometry(1, 1, 1);
const center = new THREE.Vector3();

let drops: Drop[] = [];
let nextId = 0;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());

export function spawnDrop(item: ItemId, count: number, at: THREE.Vector3, vel?: THREE.Vector3) {
  drops = [...drops, { id: (nextId += 1), item, count, pos: at.clone(), vel: vel?.clone() ?? new THREE.Vector3((Math.random() - 0.5) * 2, 3, (Math.random() - 0.5) * 2), age: 0 }];
  changed();
}

function DropMesh({ drop }: { readonly drop: Drop }) {
  const group = useRef<THREE.Group>(null);
  const block = blockMaterial(drop.item);
  const [sprite, setSprite] = useState<Sprite | null>(null);
  useEffect(() => {
    if (block) return;
    let live = true;
    void spriteOf(drop.item).then((loaded) => {
      if (live) setSprite(loaded);
    });
    return () => {
      live = false;
    };
  }, [drop.item, block]);

  useFrame(() => {
    const mesh = group.current;
    if (!mesh) return;
    mesh.position.copy(drop.pos).setY(drop.pos.y + 0.15 + Math.sin(runtime.time * 2.5 + drop.id) * 0.06);
    mesh.rotation.y = runtime.time * 1.6 + drop.id;
  });

  return (
    <group ref={group} position={drop.pos}>
      {block && <mesh geometry={CUBE} material={block} scale={0.25} />}
      {sprite && <mesh geometry={sprite.geometry} material={sprite.material} scale={0.4} />}
    </group>
  );
}

export function Drops() {
  const list = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => drops,
    () => drops
  );

  // a zone's drops stay in that zone
  useEffect(
    () =>
      useEndGame.subscribe((state, previous) => {
        if (state.zone === previous.zone) return;
        drops = [];
        changed();
      }),
    []
  );

  useFrame((_, delta) => {
    const world = runtime.world;
    const game = useEndGame.getState();
    if (!world || drops.length === 0 || game.transition) return;
    const dt = Math.min(delta, 0.05);
    playerCenter(center);
    const kept = drops.filter((drop) => {
      drop.age += dt;
      if (drop.age > DESPAWN_S || drop.pos.y < runtime.voidY) return false;
      const { pos, vel } = drop;
      vel.y = Math.max(-30, vel.y - 20 * dt);
      const x = pos.x + vel.x * dt;
      const z = pos.z + vel.z * dt;
      if (world.solid(Math.round(x), Math.round(pos.y), Math.round(z))) vel.set(0, vel.y, 0);
      else pos.set(x, pos.y, z);
      pos.y += vel.y * dt;
      // it rests a little above the block it lands on
      if (vel.y < 0 && world.solid(Math.round(pos.x), Math.round(pos.y - 0.2), Math.round(pos.z))) {
        pos.y = Math.round(pos.y - 0.2) + 0.6;
        vel.set(vel.x * 0.5, 0, vel.z * 0.5);
        if (Math.abs(vel.x) + Math.abs(vel.z) < 0.05) vel.set(0, 0, 0);
      }
      if (drop.age > 0.5 && !game.dead && pos.distanceTo(center) < PICKUP) {
        game.give(drop.item, drop.count);
        cue('pop');
        return false;
      }
      return true;
    });
    if (kept.length !== drops.length) {
      drops = kept;
      changed();
    }
  });

  return (
    <>
      {list.map((drop) => (
        <DropMesh key={drop.id} drop={drop} />
      ))}
    </>
  );
}
