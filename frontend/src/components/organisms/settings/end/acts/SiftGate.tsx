'use client';

import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { cue, playNote, playSong, playWrongNote, startAmbience, stopAmbience, stopSong } from '../end-audio';
import { spawnEffect } from '../engine/Effects';
import { cellBox, runtime, useTarget, type Target } from '../engine/runtime';
import type { World } from '../engine/world';
import { createSiftPortalMaterial } from '../shaders';
import { siftKit } from '../sift-voxels';
import { BLASTER, useEndGame } from '../store';
import { clamp01, UNIT_BOX } from '../voxels';
import { Sign } from './props';
import { SiftSpirit } from './SiftSpirit';

// The ancient city's frame was a way to The Sift. Four note blocks at its foot play the old tune
// the sign by the frame spells out; played right, a spirit of the Sift rises in the frame, its song
// plays, and when it ends the frame fills and stays open. A wrong note is noise the Warden hears.

type Cell = readonly [number, number, number];

export interface Frame {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
  readonly z: number;
}

// left to right as you face the frame: D, F, A and C
const PITCHES = [62, 65, 69, 72];
const COLORS = ['#6cf05a', '#f0d25a', '#f05a9e', '#5ab8f0'];
// the sign's "1 3 2 4 3"
const TUNE = [0, 2, 1, 3, 2];
const WRONG_NOISE = 25;

export function SiftPortalSheet({ center, width, height, opacity = 1 }: { readonly center: Cell; readonly width: number; readonly height: number; readonly opacity?: number }) {
  const material = useMemo(() => createSiftPortalMaterial(width, height), [width, height]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uOpacity.value = 0.85 * opacity;
  });

  return (
    <group position={[...center]}>
      <mesh material={material}>
        <planeGeometry args={[width, height]} />
      </mesh>
      <pointLight color="#5ff0dc" intensity={10 * opacity} distance={14} decay={1.6} />
      {opacity > 0.5 && <Sparkles count={40} scale={[width + 1, height, 1.2]} size={3} speed={0.5} color="#b8fff4" />}
    </group>
  );
}

function NoteBlock({ world, index, at, onPlay }: { readonly world: World; readonly index: number; readonly at: Cell; readonly onPlay: (index: number) => void }) {
  const [x, y, z] = at;
  const target = useMemo<Target>(() => ({ box: cellBox(x, y, z), label: () => 'noteBlock', use: () => onPlay(index) }), [x, y, z, index, onPlay]);
  useTarget(target);
  useEffect(() => {
    world.set(x, y, z, 'prop');
  }, [world, x, y, z]);

  return <mesh geometry={UNIT_BOX} material={siftKit().mat.noteBlock} position={[x, y, z]} />;
}

interface Ritual {
  readonly start: number;
  readonly final: number;
  readonly length: number;
  readonly notes: readonly number[];
  readonly kicks: readonly number[];
  opened: boolean;
}

export function SiftGate({ world, frame, ritual }: { readonly world: World; readonly frame: Frame; readonly ritual: React.RefObject<boolean> }) {
  const open = useEndGame((state) => Boolean(state.flags.siftOpen));
  const played = useRef(0);
  const run = useRef<Ritual | null>(null);
  const [active, setActive] = useState(false);
  const [sheet, setSheet] = useState(open ? 1 : 0);
  const center = useMemo<Cell>(() => [(frame.x0 + frame.x1) / 2, (frame.y0 + frame.y1) / 2, frame.z], [frame]);
  const notes = useMemo(() => PITCHES.map((_, index): Cell => [-3 + index * 2, frame.y0 + 1, frame.z + 1]), [frame]);

  // leaving mid-song cuts it; the frame only opens once the song is over
  useEffect(
    () => () => {
      if (!ritual.current) return;
      ritual.current = false;
      stopSong();
    },
    [ritual]
  );

  const play = useCallback(
    (index: number) => {
      const [x, y, z] = notes[index];
      const at = new THREE.Vector3(x, y + 0.7, z);
      playNote(PITCHES[index]);
      spawnEffect('burst', at, COLORS[index]);
      const game = useEndGame.getState();
      if (game.flags.siftOpen || ritual.current) return;
      if (TUNE[played.current] !== index) {
        played.current = TUNE[0] === index ? 1 : 0;
        playWrongNote();
        runtime.hooks.vibration?.(at, WRONG_NOISE);
        return;
      }
      runtime.hooks.vibration?.(at, 4);
      played.current += 1;
      if (played.current < TUNE.length) return;
      played.current = 0;
      ritual.current = true;
      stopAmbience();
      const song = playSong();
      run.current = { start: performance.now() / 1000, ...song, opened: false };
      setActive(true);
      window.setTimeout(() => useEndGame.getState().say('ghostSong'), 2500);
    },
    [notes, ritual]
  );

  useFrame(() => {
    const r = run.current;
    if (!r) return;
    const t = performance.now() / 1000 - r.start;
    if (t > r.final && sheet < 1) setSheet(clamp01((t - r.final) / 1.5));
    if (t > r.final && !r.opened) {
      r.opened = true;
      useEndGame.getState().setFlag('siftOpen');
      cue('siftPortal');
    }
    if (t > r.length) {
      ritual.current = false;
      run.current = null;
      setActive(false);
      setSheet(1);
      startAmbience('ancient');
      useEndGame.getState().say('blasterSong', BLASTER);
    }
  });

  return (
    <>
      {notes.map((at, index) => (
        <NoteBlock key={index} world={world} index={index} at={at} onPlay={play} />
      ))}
      <Sign id="siftSong" at={[-9, frame.y0 + 1, frame.z + 2]} facing={0.3} />
      {active && <SiftSpirit show={run} at={[center[0], frame.y0 + 0.5, center[2] + 1.2]} floor={frame.y0 + 0.5} />}
      {sheet > 0 && <SiftPortalSheet center={center} width={frame.x1 - frame.x0 - 1} height={frame.y1 - frame.y0 - 1} opacity={sheet} />}
    </>
  );
}
