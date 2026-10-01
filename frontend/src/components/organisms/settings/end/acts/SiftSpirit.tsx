'use client';

import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { spawnEffect } from '../engine/Effects';
import { PX } from '../mobs/parts';
import { Box, paint, sides, skinOf, useSkin, type SkinArt } from '../mobs/skins';
import { clamp01, easeInOut, easeOut, UNIT_BOX } from '../voxels';

// The Sculk Singer, the spirit the frame's tune calls up. It grows out of a bloom of sculk at the
// foot of the frame: a skull crowned with glowing tendrils, bone ribs over a heart of souls, long
// arms and a tattered robe that trails off into nothing. It sings the song (its jaw opens on every
// note, its heart beats with the drum), raises its arms as the song climbs, and on the last chord
// breaks into souls that pour into the frame.

export interface SpiritShow {
  readonly start: number;
  readonly final: number;
  readonly notes: readonly number[];
  readonly kicks: readonly number[];
}

const SCALE = 2.4;
const RISE_AT = 1.2;
const RISE_S = 3;

const SPIRIT: SkinArt = {
  palette: {
    k: ['#0b2530', '#0d2a36', '#092029'],
    t: ['#145c66', '#1a6f78', '#177079'],
    c: '#29dfeb',
    w: ['#e8e0c8', '#ded5bb', '#efe8d4'],
    x: '#03090b',
  },
  boxes: {
    head: {
      size: [10, 9, 10],
      base: 'w',
      faces: {
        front: ['wwkkwwwkkw', 'wwwwwwwwww', 'wxxxwwxxxw', 'wxxxwwxxxw', 'wwxwwwwxww', 'wwwwxxwwww', 'wwwwwwwwww', 'wtwwwwwwtw', 'wwwwwwwwww'],
        top: paint(10, 10, 'w', [[0, 0, 10, 4, 'k'], [2, 4, 2, 2, 't'], [6, 5, 3, 2, 'k'], [4, 1, 1, 1, 'c'], [7, 2, 1, 1, 'c']]),
        back: paint(10, 9, 'w', [[0, 0, 10, 5, 'k'], [3, 2, 1, 1, 'c'], [7, 3, 1, 1, 'c']]),
        left: paint(10, 9, 'w', [[0, 0, 5, 4, 'k'], [1, 1, 1, 1, 'c']]),
        right: paint(10, 9, 'w', [[5, 0, 5, 4, 'k'], [8, 1, 1, 1, 'c']]),
      },
    },
    jaw: { size: [8, 3, 8], base: 'w', faces: { front: ['wxwxwxwx', 'wwwwwwww', 'wwwwwwww'], top: paint(8, 8, 'x') } },
    neck: { size: [4, 3, 4], base: 'w', faces: sides(['wkww', 'wwkw', 'kwww']) },
    torso: {
      size: [14, 12, 7],
      base: 'k',
      faces: {
        front: paint(14, 12, 'k', [[1, 1, 2, 2, 't'], [10, 3, 3, 2, 't'], [5, 9, 2, 1, 'c'], [11, 9, 1, 1, 'c'], [2, 6, 1, 1, 'c']]),
        back: paint(14, 12, 'k', [[6, 0, 2, 12, 'w'], [3, 4, 1, 1, 'c'], [10, 7, 1, 1, 'c']]),
        left: paint(7, 12, 'k', [[2, 2, 2, 1, 't'], [4, 8, 1, 1, 'c']]),
        right: paint(7, 12, 'k', [[3, 5, 2, 1, 't'], [1, 9, 1, 1, 'c']]),
      },
    },
    rib: { size: [15, 1, 1.2], base: 'w' },
    robe1: { size: [12, 6, 6], base: 'k', faces: sides(paint(12, 6, 'k', [[1, 0, 1, 6, 't'], [7, 1, 1, 5, 't'], [4, 3, 1, 1, 'c'], [10, 2, 1, 1, 'c']])) },
    robe2: { size: [9, 6, 5], base: 'k', faces: sides(paint(9, 6, 'k', [[2, 0, 1, 6, 't'], [6, 2, 1, 1, 'c']])) },
    robe3: { size: [6, 6, 4], base: 'k', faces: sides(paint(6, 6, 'k', [[1, 0, 1, 4, 't'], [4, 3, 1, 1, 'c']])) },
    arm: { size: [3, 18, 3], base: 'k', faces: { ...sides(paint(3, 18, 'k', [[0, 0, 3, 4, 'w'], [1, 8, 1, 1, 'c'], [0, 14, 3, 4, 'w']])), bottom: paint(3, 3, 'w') } },
    hand: { size: [5, 4, 3], base: 'w', faces: { front: ['wwwww', 'wkwkw', 'wwwww', 'wwwww'] } },
    finger: { size: [1, 5, 1], base: 'w', faces: sides(['w', 'w', 'w', 'k', 'k']) },
    tendril: { size: [1.5, 10, 1.5], base: 'k', faces: sides(paint(2, 10, 'k', [[0, 2, 2, 1, 't'], [0, 6, 2, 1, 'c']])) },
    strand: { size: [1.5, 8, 1.5], base: 'k', faces: sides(paint(2, 8, 'k', [[0, 1, 2, 1, 't'], [0, 5, 2, 1, 't']])) },
  },
};

// eight tendrils fanning out of the crown: [x, z, lean out, lean back]
const CROWN = Array.from({ length: 8 }, (_, index) => {
  const angle = (index / 8) * Math.PI * 2;
  return [Math.cos(angle) * 3.5, Math.sin(angle) * 3.5, 0.35 + (index % 2) * 0.25, angle] as const;
});
const STRANDS = [
  [-2.5, 1.5],
  [2, 1.8],
  [0, -1.8],
  [-1.5, -1],
  [2.5, -0.5],
] as const;
const SOULS = 12;

// how open the jaw is: each note snaps it open, and it closes over a quarter second
function sung(t: number, notes: readonly number[]) {
  let open = 0;
  for (const at of notes) {
    const since = t - at;
    if (since >= 0 && since < 0.3) open = Math.max(open, 1 - since / 0.3);
  }
  return open;
}

function pulse(t: number, kicks: readonly number[]) {
  let beat = 0;
  for (const at of kicks) {
    const since = t - at;
    if (since >= 0 && since < 0.35) beat = Math.max(beat, 1 - since / 0.35);
  }
  return beat;
}

export function SiftSpirit({ show, at, floor }: { readonly show: React.RefObject<SpiritShow | null>; readonly at: readonly [number, number, number]; readonly floor: number }) {
  const { material } = useSkin(SPIRIT, { transparent: true, emissive: '#ffffff', emissiveIntensity: 0.5 });
  const skin = skinOf(SPIRIT);
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: '#5ff6ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  const heartGlow = useMemo(() => new THREE.MeshBasicMaterial({ color: '#b8fff8', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  const bloom = useMemo(() => new THREE.MeshLambertMaterial({ color: '#0d2a36', emissive: '#0a3a44', transparent: true }), []);
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const jaw = useRef<THREE.Group>(null);
  const heart = useRef<THREE.Mesh>(null);
  const arms = useRef<(THREE.Group | null)[]>([]);
  const crown = useRef<(THREE.Group | null)[]>([]);
  const strands = useRef<(THREE.Group | null)[]>([]);
  const souls = useRef<(THREE.Mesh | null)[]>([]);
  const petals = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const burst = useRef(false);

  useEffect(() => {
    material.emissiveMap = material.map;
    material.needsUpdate = true;
  }, [material]);
  useEffect(
    () => () => {
      glow.dispose();
      heartGlow.dispose();
      bloom.dispose();
    },
    [glow, heartGlow, bloom]
  );

  useFrame(() => {
    const s = show.current;
    const group = root.current;
    if (!group) return;
    group.visible = Boolean(s);
    if (!s) {
      burst.current = false;
      return;
    }
    const t = performance.now() / 1000 - s.start;
    const grow = easeOut(clamp01(t / RISE_AT));
    const rise = easeInOut(clamp01((t - RISE_AT) / RISE_S));
    const end = clamp01((t - s.final) / 1.5);
    const alive = rise * (1 - end);

    // the bloom spreads first, then sinks back once the spirit has risen out of it
    if (petals.current) {
      petals.current.scale.setScalar(grow * (1 - end));
      petals.current.rotation.y = t * 0.3;
    }
    bloom.opacity = grow * (1 - end);

    if (body.current) {
      const bob = Math.sin(t * 1.3) * 0.12 * rise;
      // on the last chord it leans back into the frame and comes apart
      body.current.position.set(0, -4 + rise * 5.6 + bob, -end * 1.2);
      body.current.rotation.y = Math.sin(t * 0.5) * 0.18;
      body.current.scale.setScalar(SCALE * (0.4 + 0.6 * rise) * (1 - end * 0.25));
    }
    material.opacity = alive;
    glow.opacity = alive;

    // it sings: head back, jaw open on every note
    const voice = sung(t, s.notes);
    if (head.current) head.current.rotation.x = -0.18 * clamp01((t - RISE_AT - RISE_S) / 2) - voice * 0.1;
    if (jaw.current) jaw.current.rotation.x = voice * 0.55;
    const beat = pulse(t, s.kicks);
    const swell = 1 + beat * 0.45;
    if (heart.current) heart.current.scale.set(4 * PX * swell, 4 * PX * swell, 1.5 * PX * swell);
    heartGlow.opacity = (0.55 + beat * 0.45) * alive;

    // the arms rise with the song, all the way up for the last bars
    const lift = easeInOut(clamp01((t - RISE_AT - RISE_S) / (s.final - RISE_AT - RISE_S)));
    arms.current.forEach((arm, index) => {
      if (!arm) return;
      // the first arm hangs on the model's -x side, so it swings out toward -x
      const side = index === 0 ? -1 : 1;
      arm.rotation.set(-0.3 * lift + Math.sin(t * 1.7 + index) * 0.06, 0, side * (0.25 + lift * 2.3));
    });
    crown.current.forEach((tendril, index) => {
      if (!tendril) return;
      const [, , lean, angle] = CROWN[index];
      const sway = Math.sin(t * 2 + index * 0.9) * 0.12 + voice * 0.15;
      tendril.rotation.set(Math.sin(angle) * (lean + sway), 0, -Math.cos(angle) * (lean + sway));
    });
    strands.current.forEach((strand, index) => {
      if (strand) strand.rotation.set(Math.sin(t * 1.6 + index) * 0.25, 0, Math.cos(t * 1.3 + index * 2) * 0.25);
    });

    // souls circle it in a slow helix; at the end they pour into the frame
    souls.current.forEach((soul, index) => {
      if (!soul) return;
      const angle = t * 1.4 + (index / SOULS) * Math.PI * 2;
      const radius = 2.6 * (1 - end) + 0.3;
      soul.position.set(Math.cos(angle) * radius, 2 + ((index * 0.7 + t * 0.8) % 6) - end * 2, Math.sin(angle) * radius - end * 3);
      soul.scale.setScalar(0.12 + 0.06 * Math.sin(t * 5 + index));
    });
    if (light.current) light.current.intensity = (10 + beat * 12 + voice * 6) * Math.max(alive, grow * 0.3);

    if (t > s.final && !burst.current) {
      burst.current = true;
      const centre = new THREE.Vector3(at[0], floor + 5, at[2]);
      ['#5ff6ff', '#b8fff8', '#f29bb0', '#29dfeb'].forEach((color, index) => spawnEffect('burst', centre.clone().setY(floor + 3 + index * 1.2), color));
    }
  });

  const part = (name: string, position: readonly [number, number, number]) => <Box skin={skin} name={name} at={position} material={material} />;

  return (
    <group ref={root} position={[at[0], floor, at[2]]} visible={false}>
      {/* the sculk bloom it grows out of */}
      <group ref={petals}>
        {Array.from({ length: 12 }, (_, index) => {
          const angle = (index / 12) * Math.PI * 2;
          return <mesh key={index} geometry={UNIT_BOX} material={bloom} scale={[1.6, 0.08, 0.7]} position={[Math.cos(angle) * 1.6, 0.04, Math.sin(angle) * 1.6]} rotation={[0, -angle, 0]} />;
        })}
        {Array.from({ length: 6 }, (_, index) => {
          const angle = (index / 6) * Math.PI * 2 + 0.3;
          return <mesh key={index} geometry={UNIT_BOX} material={glow} scale={[0.12, 0.12, 0.12]} position={[Math.cos(angle) * 2.3, 0.12, Math.sin(angle) * 2.3]} />;
        })}
      </group>
      <group ref={body}>
        {/* the robe trails off into strands; the model stands on y = 0, 42 pixels tall */}
        {part('robe3', [0, 3, 0])}
        {part('robe2', [0, 9, 0])}
        {part('robe1', [0, 15, 0])}
        {STRANDS.map(([x, z], index) => (
          <group
            key={index}
            ref={(strand) => {
              strands.current[index] = strand;
            }}
            position={[x * PX, 6 * PX, z * PX]}
          >
            <Box skin={skin} name="strand" at={[0, -4, 0]} material={material} />
          </group>
        ))}
        {part('torso', [0, 24, 0])}
        {[21, 23.5, 26, 28.5].map((y) => (
          <Box key={y} skin={skin} name="rib" at={[0, y, 3.8]} material={material} />
        ))}
        <mesh ref={heart} geometry={UNIT_BOX} material={heartGlow} scale={[4 * PX, 4 * PX, 1.5 * PX]} position={[0, 25 * PX, 3.2 * PX]} />
        {part('neck', [0, 31.5, 0])}
        <group ref={head} position={[0, 33 * PX, 0]}>
          <Box skin={skin} name="head" at={[0, 5.5, 0]} material={material} />
          <mesh geometry={UNIT_BOX} material={glow} scale={[3 * PX, 1.4 * PX, 0.3 * PX]} position={[-2.5 * PX, 7.5 * PX, 5.1 * PX]} />
          <mesh geometry={UNIT_BOX} material={glow} scale={[3 * PX, 1.4 * PX, 0.3 * PX]} position={[2.5 * PX, 7.5 * PX, 5.1 * PX]} />
          {/* the light inside the mouth, seen when the jaw drops */}
          <mesh geometry={UNIT_BOX} material={glow} scale={[6 * PX, 1 * PX, 5 * PX]} position={[0, 0.6 * PX, 1.5 * PX]} />
          <group ref={jaw} position={[0, 1 * PX, -3.5 * PX]}>
            <Box skin={skin} name="jaw" at={[0, -1.5, 3.5]} material={material} />
          </group>
          {CROWN.map(([x, z], index) => (
            <group
              key={index}
              ref={(tendril) => {
                crown.current[index] = tendril;
              }}
              position={[x * PX, 10 * PX, z * PX]}
            >
              <Box skin={skin} name="tendril" at={[0, 5, 0]} material={material} />
              <mesh geometry={UNIT_BOX} material={glow} scale={[2 * PX, 2 * PX, 2 * PX]} position={[0, 10.5 * PX, 0]} />
            </group>
          ))}
        </group>
        {[-8.5, 8.5].map((x, index) => (
          <group
            key={x}
            ref={(arm) => {
              arms.current[index] = arm;
            }}
            position={[x * PX, 29 * PX, 0]}
          >
            <Box skin={skin} name="arm" at={[0, -9, 0]} material={material} />
            <Box skin={skin} name="hand" at={[0, -20, 0.5]} material={material} />
            {[-1.8, 0, 1.8].map((fx) => (
              <Box key={fx} skin={skin} name="finger" at={[fx, -24.5, 0.5]} material={material} />
            ))}
          </group>
        ))}
      </group>
      {Array.from({ length: SOULS }, (_, index) => (
        <mesh
          key={index}
          ref={(soul) => {
            souls.current[index] = soul;
          }}
          geometry={UNIT_BOX}
          material={glow}
        />
      ))}
      <pointLight ref={light} position={[0, 5, 1.5]} color="#29dfeb" distance={26} decay={1.4} intensity={0} />
      <Sparkles count={50} scale={[6, 8, 3]} position={[0, 4.5, 0]} size={3} speed={0.6} color="#b8fff8" opacity={0.6} />
    </group>
  );
}
