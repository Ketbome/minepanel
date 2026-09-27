'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { create } from 'zustand';
import { clamp01, easeOut, kit, UNIT_BOX } from '../voxels';

// One-shot particle effects any zone or mob can spawn: portal bursts, explosions and the
// chips a broken block or a dying mob leaves behind.

type EffectKind = 'burst' | 'explosion' | 'debris' | 'poof';

interface Effect {
  readonly id: number;
  readonly kind: EffectKind;
  readonly at: THREE.Vector3;
  readonly color: string;
}

let lastEffect = 0;

const useEffects = create<{ list: Effect[] }>(() => ({ list: [] }));

export function spawnEffect(kind: EffectKind, at: THREE.Vector3, color = '#c86bff') {
  useEffects.setState((state) => ({ list: [...state.list, { id: ++lastEffect, kind, at: at.clone(), color }] }));
}

const drop = (id: number) => useEffects.setState((state) => ({ list: state.list.filter((effect) => effect.id !== id) }));

function Burst({ at, color, onDone }: { readonly at: THREE.Vector3; readonly color: string; readonly onDone: () => void }) {
  const burst = useMemo(() => {
    const directions = Array.from({ length: 26 }, () => new THREE.Vector3().randomDirection().multiplyScalar(0.8 + Math.random() * 1.6));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(directions.length * 3), 3));
    const material = new THREE.PointsMaterial({ color, size: 5, sizeAttenuation: false, transparent: true, depthWrite: false });
    return { directions, geometry, material };
  }, [color]);
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
    burst.directions.forEach((direction, index) => positions.setXYZ(index, direction.x * spread, direction.y * spread - k * k * 0.6, direction.z * spread));
    positions.needsUpdate = true;
    burst.material.opacity = Math.max(0, 1 - k);
    if (k >= 1 && !finished.current) {
      finished.current = true;
      onDone();
    }
  });

  return <points geometry={burst.geometry} material={burst.material} position={at} frustumCulled={false} />;
}

const POOF_COLORS = ['#ffffff', '#e4e4e4', '#c8c8c8', '#a9a9a9'];

// the white puff a mob leaves when it dies: chunky smoke that drifts up and thins out
function Poof({ at, onDone }: { readonly at: THREE.Vector3; readonly onDone: () => void }) {
  const poof = useMemo(() => {
    const puffs = Array.from({ length: 18 }, () => ({
      from: new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8),
      drift: new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.5 + Math.random() * 0.7, (Math.random() - 0.5) * 0.6),
    }));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(puffs.length * 3), 3));
    const colors = new Float32Array(puffs.length * 3);
    puffs.forEach((_, index) => new THREE.Color(POOF_COLORS[index % POOF_COLORS.length]).toArray(colors, index * 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size: 0.28, vertexColors: true, transparent: true, depthWrite: false });
    return { puffs, geometry, material };
  }, []);
  const age = useRef(0);
  const finished = useRef(false);

  useEffect(
    () => () => {
      poof.geometry.dispose();
      poof.material.dispose();
    },
    [poof]
  );

  useFrame((_, delta) => {
    const t = (age.current += Math.min(delta, 0.1));
    const positions = poof.geometry.getAttribute('position') as THREE.BufferAttribute;
    poof.puffs.forEach(({ from, drift }, index) => positions.setXYZ(index, from.x + drift.x * t, from.y + drift.y * t, from.z + drift.z * t));
    positions.needsUpdate = true;
    poof.material.opacity = Math.max(0, 1 - t / 0.9);
    poof.material.size = 0.28 * (1 - t * 0.5);
    if (t > 0.9 && !finished.current) {
      finished.current = true;
      onDone();
    }
  });

  return <points geometry={poof.geometry} material={poof.material} position={at} frustumCulled={false} />;
}

const FLASH = new THREE.SphereGeometry(1, 14, 10);

function Explosion({ at, onDone }: { readonly at: THREE.Vector3; readonly onDone: () => void }) {
  const { tex } = kit();
  const parts = useMemo(
    () => ({
      flash: new THREE.MeshBasicMaterial({ color: '#fff3e8', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
      smoke: new THREE.SpriteMaterial({ map: tex.glow, color: '#e7def0', transparent: true, depthWrite: false }),
      puffs: Array.from({ length: 10 }, () => ({
        offset: new THREE.Vector3().randomDirection().multiplyScalar(0.6 + Math.random() * 1.8),
        size: 2 + Math.random() * 2.2,
      })),
    }),
    [tex.glow]
  );
  const flash = useRef<THREE.Mesh>(null);
  const puffs = useRef<(THREE.Sprite | null)[]>([]);
  const age = useRef(0);
  const finished = useRef(false);

  useEffect(
    () => () => {
      parts.flash.dispose();
      parts.smoke.dispose();
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
    if (t > 1.4 && !finished.current) {
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
    </group>
  );
}

function Debris({ at, color, onDone }: { readonly at: THREE.Vector3; readonly color: string; readonly onDone: () => void }) {
  const parts = useMemo(
    () => ({
      material: new THREE.MeshLambertMaterial({ color, transparent: true }),
      chips: Array.from({ length: 12 }, () => ({
        velocity: new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 2.5, (Math.random() - 0.5) * 3),
        spin: Math.random() * 8,
      })),
    }),
    [color]
  );
  const chips = useRef<(THREE.Mesh | null)[]>([]);
  const age = useRef(0);
  const finished = useRef(false);

  useEffect(() => () => parts.material.dispose(), [parts]);

  useFrame((_, delta) => {
    const t = (age.current += Math.min(delta, 0.1));
    parts.material.opacity = Math.max(0, 1 - t / 0.9);
    chips.current.forEach((chip, index) => {
      if (!chip) return;
      const { velocity, spin } = parts.chips[index];
      chip.position.copy(velocity).multiplyScalar(t);
      chip.position.y -= 9 * t * t;
      chip.rotation.set(t * spin, t * spin * 0.6, 0);
    });
    if (t > 0.9 && !finished.current) {
      finished.current = true;
      onDone();
    }
  });

  return (
    <group position={at}>
      {parts.chips.map((_, index) => (
        <mesh
          key={index}
          ref={(chip) => {
            chips.current[index] = chip;
          }}
          geometry={UNIT_BOX}
          material={parts.material}
          scale={0.13}
        />
      ))}
    </group>
  );
}

export function Effects() {
  const list = useEffects((state) => state.list);
  useEffect(() => () => useEffects.setState({ list: [] }), []);
  return (
    <>
      {list.map((effect) => {
        const done = () => drop(effect.id);
        if (effect.kind === 'explosion') return <Explosion key={effect.id} at={effect.at} onDone={done} />;
        if (effect.kind === 'debris') return <Debris key={effect.id} at={effect.at} color={effect.color} onDone={done} />;
        if (effect.kind === 'poof') return <Poof key={effect.id} at={effect.at} onDone={done} />;
        return <Burst key={effect.id} at={effect.at} color={effect.color} onDone={done} />;
      })}
    </>
  );
}
