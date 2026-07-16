'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/hooks/useLanguage';

const EndWorldScene = dynamic(() => import('./EndWorldScene'), { ssr: false });

type Phase = 'idle' | 'warp' | 'end';

const WARP_DURATION_MS = 4600;
const ACTIVATE_S = 1.9;
const DIVE_S = 2.3;
const STAR_COUNT = 90;
const PARTICLE_COUNT = 14;

function playSound(file: string, volume = 0.5, rate = 1) {
  const audio = new Audio(`/sounds/${file}`);
  audio.volume = volume;
  audio.playbackRate = rate;
  audio.play().catch(() => {});
}

const CELL = 52;
const GRID = CELL * 5;
const EYE_SEQ = [4, 9, 1, 7, 0, 11, 3, 6, 10, 2, 8, 5];
const FRAME_CELLS = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 0],
  [1, 4],
  [2, 0],
  [2, 4],
  [3, 0],
  [3, 4],
  [4, 1],
  [4, 2],
  [4, 3],
].map(([row, col], index) => ({ row, col, delay: 0.25 + EYE_SEQ[index] * 0.11 }));

interface CuboidPalette {
  readonly top: string;
  readonly side: string;
  readonly face: string;
}

const DRAGON_SCALES: CuboidPalette = { top: '#34343f', side: '#202028', face: '#15151b' };
const DRAGON_DARK: CuboidPalette = { top: '#26262e', side: '#18181f', face: '#101015' };

interface CuboidProps {
  readonly w: number;
  readonly h: number;
  readonly d: number;
  readonly palette: CuboidPalette;
  readonly style?: React.CSSProperties;
  readonly children?: React.ReactNode;
}

function Cuboid({ w, h, d, palette, style, children }: CuboidProps) {
  // each face is centered on the box center, rotated, then pushed out along its normal
  const faces = [
    { fw: w, fh: h, left: 0, top: 0, transform: `translateZ(${d / 2}px)`, bg: palette.side },
    { fw: w, fh: h, left: 0, top: 0, transform: `rotateY(180deg) translateZ(${d / 2}px)`, bg: palette.side },
    { fw: d, fh: h, left: (w - d) / 2, top: 0, transform: `rotateY(90deg) translateZ(${w / 2}px)`, bg: palette.face },
    { fw: d, fh: h, left: (w - d) / 2, top: 0, transform: `rotateY(-90deg) translateZ(${w / 2}px)`, bg: palette.face },
    { fw: w, fh: d, left: 0, top: (h - d) / 2, transform: `rotateX(90deg) translateZ(${h / 2}px)`, bg: palette.top },
    { fw: w, fh: d, left: 0, top: (h - d) / 2, transform: `rotateX(-90deg) translateZ(${h / 2}px)`, bg: palette.face },
  ];
  return (
    <div className="absolute [transform-style:preserve-3d]" style={{ width: w, height: h, ...style }}>
      {faces.map((face, index) => (
        <div
          key={index}
          className="absolute [backface-visibility:hidden]"
          style={{
            width: face.fw,
            height: face.fh,
            left: face.left,
            top: face.top,
            transform: face.transform,
            background: face.bg,
          }}
        />
      ))}
      {children}
    </div>
  );
}

const STARFIELD_LAYERS = [
  {
    image:
      'radial-gradient(1.5px 1.5px at 18% 32%, #9ffcb0, transparent), radial-gradient(1px 1px at 62% 78%, #5eead4, transparent), radial-gradient(1.5px 1.5px at 84% 22%, #86efac, transparent), radial-gradient(1px 1px at 40% 60%, #a7f3d0, transparent)',
    size: 110,
    durationS: 34,
    driftX: '110px',
    driftY: '-110px',
    opacity: 0.9,
  },
  {
    image:
      'radial-gradient(2px 2px at 28% 68%, #c4b5fd, transparent), radial-gradient(1.5px 1.5px at 72% 30%, #a78bfa, transparent), radial-gradient(1px 1px at 50% 12%, #e9d5ff, transparent), radial-gradient(1.5px 1.5px at 8% 8%, #818cf8, transparent)',
    size: 160,
    durationS: 24,
    driftX: '-160px',
    driftY: '160px',
    opacity: 0.8,
  },
  {
    image:
      'radial-gradient(2.5px 2.5px at 45% 45%, #f0fdf4, transparent), radial-gradient(2px 2px at 80% 85%, #99f6e4, transparent), radial-gradient(2px 2px at 12% 75%, #d8b4fe, transparent)',
    size: 230,
    durationS: 16,
    driftX: '230px',
    driftY: '230px',
    opacity: 0.7,
  },
];

function EndPortalStarfield() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 50%, #10102a 0%, #060612 55%, #02020a 100%)' }}
    >
      {STARFIELD_LAYERS.map((layer, index) => (
        <div
          key={index}
          className="animate-portal-drift motion-reduce:animate-none absolute inset-0"
          style={
            {
              backgroundImage: layer.image,
              backgroundSize: `${layer.size}px ${layer.size}px`,
              animationDuration: `${layer.durationS}s`,
              opacity: layer.opacity,
              '--drift-x': layer.driftX,
              '--drift-y': layer.driftY,
            } as React.CSSProperties
          }
        />
      ))}
      <div
        className="animate-portal-glimmer motion-reduce:animate-none absolute inset-0"
        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(139,92,246,0.18), transparent 70%)' }}
      />
    </div>
  );
}

function PortalFrameBlock({ delay }: { readonly delay: number }) {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #90a077 0%, #6d7c5b 45%, #4f5f46 100%)',
          boxShadow: 'inset 0 0 0 3px #47543f, inset 0 0 0 6px rgba(143,160,116,0.35)',
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: 30, height: 30, background: '#141c15', boxShadow: 'inset 0 3px 8px #000' }}
      />
      <m.div
        className="absolute left-1/2 top-1/2 -ml-[13px] -mt-[13px]"
        style={{
          width: 26,
          height: 26,
          borderRadius: 5,
          background: 'radial-gradient(circle at 50% 42%, #0b3b24 0%, #0b3b24 16%, #86efac 30%, #2f9e57 58%, #0a2d1c 100%)',
          boxShadow: '0 0 14px rgba(94,234,138,0.8)',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.5, 1], opacity: 1 }}
        transition={{ delay, duration: 0.35 }}
      />
      <m.div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(circle, rgba(190,255,220,0.9), transparent 70%)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ delay, duration: 0.45 }}
      />
    </div>
  );
}

function WarpOverlay() {
  useEffect(() => {
    const timers = FRAME_CELLS.map((cell) =>
      setTimeout(() => playSound('eye-place.ogg', 0.35, 0.9 + Math.random() * 0.25), cell.delay * 1000)
    );
    timers.push(setTimeout(() => playSound('portal-activate.ogg', 0.6), ACTIVATE_S * 1000));
    timers.push(setTimeout(() => playSound('portal-travel.ogg', 0.5), DIVE_S * 1000));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <m.div
      aria-hidden
      className="absolute inset-0 bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.3 } }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
    >
      <div className="animate-screen-shake absolute inset-0" style={{ animationDelay: `${DIVE_S}s` }}>
        <div className="absolute inset-0 flex items-center justify-center [perspective:1100px]">
          <m.div
            className="relative [transform-style:preserve-3d]"
            style={{ width: GRID, height: GRID }}
            initial={{ rotateX: 55, scale: 0.85, opacity: 0 }}
            animate={{ opacity: 1, rotateX: [55, 55, 14], scale: [0.85, 1, 15] }}
            transition={{
              opacity: { duration: 0.5 },
              default: {
                duration: WARP_DURATION_MS / 1000,
                times: [0, DIVE_S / (WARP_DURATION_MS / 1000), 1],
                ease: ['linear', 'easeIn'],
              },
            }}
          >
            <div className="absolute" style={{ left: CELL, top: CELL, width: CELL * 3, height: CELL * 3, background: '#05050c' }}>
              <m.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: ACTIVATE_S, duration: 0.4 }}
              >
                <EndPortalStarfield />
              </m.div>
              <m.div
                className="absolute inset-0"
                style={{ background: 'radial-gradient(circle, rgba(190,255,220,0.95), rgba(94,234,138,0.5) 55%, transparent 80%)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ delay: ACTIVATE_S, duration: 0.6 }}
              />
            </div>
            {FRAME_CELLS.map((cell) => (
              <div
                key={`${cell.row}-${cell.col}`}
                className="absolute"
                style={{ left: cell.col * CELL, top: cell.row * CELL, width: CELL, height: CELL }}
              >
                <PortalFrameBlock delay={cell.delay} />
              </div>
            ))}
          </m.div>
        </div>
        {Array.from({ length: 16 }, (_, index) => (
          <m.div
            key={index}
            className="absolute left-1/2 top-1/2 h-[2px] w-[45vmax] origin-left"
            style={{
              rotate: index * 22.5,
              background: 'linear-gradient(90deg, transparent 30%, rgba(167,139,250,0.8), rgba(45,212,191,0.6))',
            }}
            initial={{ opacity: 0, scaleX: 0.2 }}
            animate={{ opacity: [0, 0.9, 0], scaleX: [0.2, 1] }}
            transition={{ delay: DIVE_S + 0.15 + (index % 4) * 0.12, duration: 0.55, repeat: Infinity, repeatDelay: 0.1 }}
          />
        ))}
        <m.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.7, duration: 0.8 }}
        >
          <EndPortalStarfield />
        </m.div>
      </div>
    </m.div>
  );
}

function DragonWing({ front }: { readonly front: boolean }) {
  return (
    <div
      className="animate-wing-flap motion-reduce:[animation-play-state:paused] absolute"
      style={
        {
          width: 74,
          height: 104,
          left: 64,
          top: 28,
          '--wing-z': front ? '16px' : '-16px',
          '--flap-dir': front ? '1' : '-1',
          clipPath: 'polygon(12% 0, 55% 4%, 100% 34%, 88% 100%, 62% 66%, 38% 96%, 16% 58%, 0 78%, 2% 22%)',
          background: 'linear-gradient(155deg, rgba(129,57,181,0.9), rgba(49,35,102,0.92) 45%, rgba(18,16,26,0.96) 85%)',
          borderTop: '3px solid #26262e',
        } as React.CSSProperties
      }
    >
      <div className="absolute left-[6%] top-[2%] h-[3px] w-[92%] bg-[#26262e]" style={{ transform: 'rotate(20deg)', transformOrigin: 'left center' }} />
      <div className="absolute left-[6%] top-[2%] h-[3px] w-[76%] bg-[#26262e]" style={{ transform: 'rotate(42deg)', transformOrigin: 'left center' }} />
      <div className="absolute left-[6%] top-[2%] h-[3px] w-[62%] bg-[#26262e]" style={{ transform: 'rotate(64deg)', transformOrigin: 'left center' }} />
    </div>
  );
}

function TailSegment({ left, top, size, delay, swayDir }: { readonly left: number; readonly top: number; readonly size: number; readonly delay: number; readonly swayDir: 1 | -1 }) {
  return (
    <div
      className="animate-tail-sway motion-reduce:[animation-play-state:paused] absolute [transform-style:preserve-3d]"
      style={
        {
          left,
          top,
          width: size + 6,
          height: size,
          animationDelay: `${delay}s`,
          '--sway-dir': `${swayDir}`,
        } as React.CSSProperties
      }
    >
      <Cuboid w={size + 6} h={size} d={size} palette={size < 14 ? DRAGON_DARK : DRAGON_SCALES} style={{ left: 0, top: 0 }} />
    </div>
  );
}

function DragonLeg({ left, top, length, z, delay }: { readonly left: number; readonly top: number; readonly length: number; readonly z: number; readonly delay: number }) {
  return (
    <div
      className="animate-limb-sway motion-reduce:[animation-play-state:paused] absolute [transform-style:preserve-3d]"
      style={
        {
          left,
          top,
          width: 8,
          height: length,
          animationDelay: `${delay}s`,
          '--limb-z': `${z}px`,
          '--sway-dir': z > 0 ? '1' : '-1',
        } as React.CSSProperties
      }
    >
      <Cuboid w={8} h={length} d={8} palette={DRAGON_DARK} style={{ left: 0, top: 0 }} />
    </div>
  );
}

function VoxelEnderDragon() {
  return (
    <div aria-hidden className="relative h-[120px] w-[210px] [perspective:900px]">
      <div className="absolute left-1/2 top-1/2 h-24 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/25 blur-2xl" />
      <div className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform: 'rotateY(-32deg) rotateX(12deg)' }}>
        {/* tail, thinning toward the back, wagging in a staggered wave */}
        <TailSegment left={0} top={47} size={9} delay={0.6} swayDir={1} />
        <TailSegment left={14} top={44} size={12} delay={0.4} swayDir={-1} />
        <TailSegment left={36} top={40} size={15} delay={0.2} swayDir={1} />
        {/* body */}
        <Cuboid w={64} h={30} d={30} palette={DRAGON_SCALES} style={{ left: 64, top: 30 }} />
        {/* dorsal spikes */}
        <Cuboid w={6} h={7} d={4} palette={DRAGON_DARK} style={{ left: 74, top: 23 }} />
        <Cuboid w={6} h={7} d={4} palette={DRAGON_DARK} style={{ left: 90, top: 23 }} />
        <Cuboid w={6} h={7} d={4} palette={DRAGON_DARK} style={{ left: 106, top: 23 }} />
        {/* legs */}
        <DragonLeg left={80} top={58} length={20} z={10} delay={0.2} />
        <DragonLeg left={80} top={58} length={20} z={-10} delay={0.7} />
        <DragonLeg left={114} top={56} length={16} z={9} delay={0.5} />
        <DragonLeg left={114} top={56} length={16} z={-9} delay={1} />
        {/* neck + head + snout */}
        <Cuboid w={24} h={14} d={14} palette={DRAGON_SCALES} style={{ left: 124, top: 30 }} />
        <Cuboid w={5} h={6} d={4} palette={DRAGON_DARK} style={{ left: 130, top: 24 }} />
        <Cuboid w={28} h={16} d={18} palette={DRAGON_SCALES} style={{ left: 146, top: 26 }}>
          {/* glowing eyes on both sides of the head */}
          <div
            className="absolute"
            style={{ width: 5, height: 3, left: 19, top: 5, transform: 'translateZ(10px)', background: '#e879f9', boxShadow: '0 0 8px #d946ef' }}
          />
          <div
            className="absolute"
            style={{ width: 5, height: 3, left: 19, top: 5, transform: 'rotateY(180deg) translateZ(10px)', background: '#e879f9', boxShadow: '0 0 8px #d946ef' }}
          />
        </Cuboid>
        <Cuboid w={12} h={7} d={12} palette={DRAGON_DARK} style={{ left: 172, top: 31 }} />
        <Cuboid w={10} h={4} d={10} palette={DRAGON_DARK} style={{ left: 172, top: 40 }} />
        {/* horns */}
        <Cuboid w={9} h={4} d={4} palette={DRAGON_DARK} style={{ left: 148, top: 22, transform: 'translateZ(5px)' }} />
        <Cuboid w={9} h={4} d={4} palette={DRAGON_DARK} style={{ left: 148, top: 22, transform: 'translateZ(-5px)' }} />
        {/* wings */}
        <DragonWing front />
        <DragonWing front={false} />
        {/* dragon breath particles streaming from the snout */}
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="animate-dragon-breath motion-reduce:animate-none absolute h-[4px] w-[4px] rounded-[1px] bg-fuchsia-400"
            style={
              {
                left: 186,
                top: 32 + index * 2,
                animationDelay: `${index * 0.4}s`,
                boxShadow: '0 0 6px #d946ef',
                '--breath-y': `${(index - 1.5) * 9}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}

const ENDERMAN_BODY: CuboidPalette = { top: '#26262c', side: '#141417', face: '#0c0c0f' };
const GRASS_BLOCK: CuboidPalette = { top: '#5ec93e', side: '#7a5230', face: '#69462a' };

interface EndermanLimbProps {
  readonly left: number;
  readonly top: number;
  readonly length: number;
  readonly z?: number;
  readonly swayDir: 1 | -1;
  readonly delay?: number;
  readonly children?: React.ReactNode;
}

function EndermanLimb({ left, top, length, z = 0, swayDir, delay = 0, children }: EndermanLimbProps) {
  return (
    <div
      className="animate-limb-sway motion-reduce:[animation-play-state:paused] absolute [transform-style:preserve-3d]"
      style={
        {
          left,
          top,
          width: 6,
          height: length,
          '--limb-z': `${z}px`,
          '--sway-dir': `${swayDir}`,
          animationDelay: `${delay}s`,
        } as React.CSSProperties
      }
    >
      <Cuboid w={6} h={length} d={6} palette={ENDERMAN_BODY} style={{ left: 0, top: 0 }} />
      {children}
    </div>
  );
}

function VoxelEnderman() {
  return (
    <div aria-hidden className="relative h-[130px] w-[70px] [perspective:700px]">
      <div className="absolute left-1/2 top-1/2 h-28 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-600/20 blur-2xl" />
      <div className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform: 'rotateY(24deg) rotateX(-6deg)' }}>
        {/* head with the iconic purple eye strip */}
        <Cuboid w={26} h={26} d={26} palette={ENDERMAN_BODY} style={{ left: 22, top: 0 }}>
          <div
            className="absolute"
            style={{ width: 8, height: 4, left: 3, top: 12, transform: 'translateZ(14px)', background: '#d946ef', boxShadow: '0 0 8px #d946ef' }}
          />
          <div
            className="absolute"
            style={{ width: 8, height: 4, left: 15, top: 12, transform: 'translateZ(14px)', background: '#d946ef', boxShadow: '0 0 8px #d946ef' }}
          />
        </Cuboid>
        {/* slim torso */}
        <Cuboid w={24} h={34} d={10} palette={ENDERMAN_BODY} style={{ left: 23, top: 26 }} />
        {/* long arms; the left one clutches a stolen grass block with nowhere to put it */}
        <EndermanLimb left={15} top={27} length={50} z={0} swayDir={1} delay={0.3}>
          <Cuboid w={14} h={14} d={14} palette={GRASS_BLOCK} style={{ left: -6, top: 44, transform: 'translateZ(6px)' }} />
        </EndermanLimb>
        <EndermanLimb left={49} top={27} length={50} z={0} swayDir={-1} />
        {/* long legs */}
        <EndermanLimb left={27} top={60} length={56} z={2} swayDir={-1} delay={0.6} />
        <EndermanLimb left={37} top={60} length={56} z={-2} swayDir={1} delay={0.9} />
      </div>
    </div>
  );
}

const END_STONE: CuboidPalette = { top: '#dfdca0', side: '#c4c07f', face: '#a6a366' };
const END_STONE_DEEP: CuboidPalette = { top: '#b3b075', side: '#94915c', face: '#787547' };
const PURPUR: CuboidPalette = { top: '#c39ac3', side: '#a97ea9', face: '#8e628e' };
const CHORUS: CuboidPalette = { top: '#9d6cb4', side: '#7d4f93', face: '#5f3a72' };
const CHORUS_FLOWER: CuboidPalette = { top: '#e3b7ef', side: '#c893d8', face: '#a86fbd' };
const SHULKER: CuboidPalette = { top: '#b48ab4', side: '#9a719a', face: '#7f597f' };

function ChorusPlant({ left, segments, baseTop }: { readonly left: number; readonly segments: number; readonly baseTop: number }) {
  return (
    <>
      {Array.from({ length: segments }, (_, index) => (
        <Cuboid key={index} w={9} h={10} d={9} palette={CHORUS} style={{ left, top: baseTop - 10 * (index + 1), transform: 'translateZ(8px)' }} />
      ))}
      <Cuboid w={11} h={8} d={11} palette={CHORUS_FLOWER} style={{ left: left - 1, top: baseTop - 10 * segments - 8, transform: 'translateZ(8px)' }} />
    </>
  );
}

function ChorusIsland() {
  return (
    <div aria-hidden className="relative h-[130px] w-[140px] [perspective:800px]">
      <div className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform: 'rotateY(-26deg) rotateX(14deg)' }}>
        <Cuboid w={92} h={14} d={62} palette={END_STONE} style={{ left: 24, top: 72 }} />
        <Cuboid w={56} h={12} d={40} palette={END_STONE_DEEP} style={{ left: 42, top: 86 }} />
        <Cuboid w={26} h={10} d={20} palette={END_STONE_DEEP} style={{ left: 56, top: 98 }} />
        <ChorusPlant left={40} segments={3} baseTop={72} />
        <ChorusPlant left={64} segments={4} baseTop={72} />
        <ChorusPlant left={88} segments={2} baseTop={72} />
      </div>
    </div>
  );
}

function ShulkerIsland() {
  return (
    <div aria-hidden className="relative h-[110px] w-[130px] [perspective:800px]">
      <div className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform: 'rotateY(-26deg) rotateX(14deg)' }}>
        <Cuboid w={84} h={14} d={58} palette={END_STONE} style={{ left: 22, top: 52 }} />
        <Cuboid w={52} h={12} d={36} palette={END_STONE_DEEP} style={{ left: 38, top: 66 }} />
        <Cuboid w={24} h={10} d={18} palette={END_STONE_DEEP} style={{ left: 52, top: 78 }} />
        <div className="absolute [transform-style:preserve-3d]" style={{ left: 42, top: 30, width: 18, height: 22 }}>
          <Cuboid w={12} h={10} d={12} palette={ENDERMAN_BODY} style={{ left: 3, top: 5 }} />
          <div className="animate-shulker-peek motion-reduce:animate-none absolute [transform-style:preserve-3d]" style={{ left: 0, top: 0, width: 18, height: 12 }}>
            <Cuboid w={18} h={12} d={18} palette={SHULKER} style={{ left: 0, top: 0 }}>
              <div className="absolute" style={{ width: 3, height: 3, left: 4, top: 6, transform: 'translateZ(10px)', background: '#f5f0f5' }} />
              <div className="absolute" style={{ width: 3, height: 3, left: 11, top: 6, transform: 'translateZ(10px)', background: '#f5f0f5' }} />
            </Cuboid>
          </div>
          <Cuboid w={18} h={10} d={18} palette={SHULKER} style={{ left: 0, top: 12 }} />
        </div>
        <ChorusPlant left={78} segments={2} baseTop={52} />
      </div>
    </div>
  );
}

function TinyIsland() {
  return (
    <div aria-hidden className="relative h-[70px] w-[90px] [perspective:800px]">
      <div className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform: 'rotateY(-26deg) rotateX(14deg)' }}>
        <Cuboid w={48} h={12} d={32} palette={END_STONE} style={{ left: 20, top: 30 }} />
        <Cuboid w={26} h={10} d={18} palette={END_STONE_DEEP} style={{ left: 31, top: 42 }} />
        <ChorusPlant left={38} segments={1} baseTop={30} />
      </div>
    </div>
  );
}

function EndCityTower() {
  return (
    <div aria-hidden className="relative h-[130px] w-[70px] opacity-50 blur-[1px] [perspective:600px]">
      <div className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform: 'rotateY(-20deg) rotateX(6deg)' }}>
        <Cuboid w={26} h={40} d={26} palette={PURPUR} style={{ left: 22, top: 80 }} />
        <Cuboid w={34} h={12} d={34} palette={PURPUR} style={{ left: 18, top: 68 }} />
        <Cuboid w={20} h={30} d={20} palette={PURPUR} style={{ left: 25, top: 38 }} />
        <Cuboid w={28} h={10} d={28} palette={PURPUR} style={{ left: 21, top: 28 }} />
        <div
          className="animate-portal-glimmer motion-reduce:animate-none absolute"
          style={{ width: 4, height: 16, left: 33, top: 10, background: '#fdf6e3', boxShadow: '0 0 12px #fef9c3' }}
        />
      </div>
    </div>
  );
}

const WHISPERS = [
  { key: 'dangerEggWhisper1', top: '8%', left: '32%', delay: 4 },
  { key: 'dangerEggWhisper2', top: '72%', left: '58%', delay: 13 },
  { key: 'dangerEggWhisper3', top: '86%', left: '28%', delay: 22 },
] as const;

function EndWhispers({ reducedMotion }: { readonly reducedMotion: boolean }) {
  const { t } = useLanguage();
  return (
    <div aria-hidden className="absolute inset-0">
      {WHISPERS.map((whisper) => (
        <m.p
          key={whisper.key}
          className="font-minecraft absolute max-w-[280px] text-xs tracking-wider text-purple-100 md:text-sm"
          style={{
            top: whisper.top,
            left: whisper.left,
            textShadow: '0 2px 6px rgba(0,0,0,0.95), 0 0 14px rgba(168,85,247,0.7)',
          }}
          initial={{ opacity: 0 }}
          animate={reducedMotion ? { opacity: 0.6 } : { opacity: [0, 0.9, 0], y: [8, -16] }}
          transition={{ delay: whisper.delay, duration: 8, repeat: Infinity, repeatDelay: 19 }}
        >
          {t(whisper.key)}
        </m.p>
      ))}
    </div>
  );
}

const CRYSTAL_OUTER: CuboidPalette = {
  top: 'rgba(233,213,255,0.5)',
  side: 'rgba(192,132,252,0.35)',
  face: 'rgba(147,51,234,0.3)',
};
const CRYSTAL_INNER: CuboidPalette = { top: '#f5d0fe', side: '#e879f9', face: '#c026d3' };

function EndCrystal() {
  return (
    <div className="animate-float-bob motion-reduce:animate-none relative h-14 w-14 [perspective:400px]">
      <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/30 blur-xl" />
      <div
        className="animate-crystal-spin motion-reduce:[animation-play-state:paused] absolute left-1/2 top-1/2 -ml-[14px] -mt-[14px] [transform-style:preserve-3d]"
        style={{ width: 28, height: 28 }}
      >
        <Cuboid w={28} h={28} d={28} palette={CRYSTAL_OUTER} style={{ left: 0, top: 0 }} />
      </div>
      <div
        className="animate-crystal-spin-reverse motion-reduce:[animation-play-state:paused] absolute left-1/2 top-1/2 -ml-[7px] -mt-[7px] [transform-style:preserve-3d]"
        style={{ width: 14, height: 14 }}
      >
        <Cuboid w={14} h={14} d={14} palette={CRYSTAL_INNER} style={{ left: 0, top: 0 }} />
      </div>
    </div>
  );
}

const OBSIDIAN_BG = 'linear-gradient(90deg, #0a0614, #241338 20%, #140b22 45%, #2c1747 75%, #0a0614)';

function ObsidianPillar({ height, crystal, className }: { readonly height: number; readonly crystal?: boolean; readonly className?: string }) {
  return (
    <div className={`absolute bottom-0 w-9 ${className ?? ''}`} style={{ height }}>
      <div className="absolute inset-0" style={{ background: OBSIDIAN_BG, boxShadow: 'inset 0 0 12px #000' }} />
      <div className="absolute -top-1 left-0 right-0 h-2 bg-[#31204f]" />
      {crystal && (
        <div className="absolute -top-[64px] left-1/2 -translate-x-1/2">
          <EndCrystal />
        </div>
      )}
    </div>
  );
}

const EGG_ROWS = [
  { w: 8, c: '#1b1226' },
  { w: 14, c: '#0d0a14' },
  { w: 18, c: '#2a1d3f' },
  { w: 22, c: '#0d0a14' },
  { w: 24, c: '#231733' },
  { w: 24, c: '#0d0a14' },
  { w: 22, c: '#2a1d3f' },
  { w: 16, c: '#0d0a14' },
  { w: 10, c: '#1b1226' },
];

function DragonEggSprite() {
  return (
    <div
      aria-hidden
      className="animate-float-bob motion-reduce:animate-none relative"
      style={{ width: 26, filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.5))' }}
    >
      {EGG_ROWS.map((row, index) => (
        <div key={index} className="mx-auto" style={{ width: row.w, height: 4, background: row.c }} />
      ))}
    </div>
  );
}

function TeleportBurst({ x, y }: { readonly x: number; readonly y: number }) {
  const sparks = useMemo(
    () => Array.from({ length: 10 }, () => ({ dx: (Math.random() - 0.5) * 90, dy: (Math.random() - 0.5) * 90 })),
    []
  );
  return (
    <div aria-hidden className="pointer-events-none absolute z-20" style={{ left: `${x}%`, top: `${y}%` }}>
      {sparks.map((spark, index) => (
        <m.span
          key={index}
          className="absolute h-[4px] w-[4px] bg-fuchsia-400"
          style={{ boxShadow: '0 0 6px #d946ef' }}
          initial={{ x: 12, y: 16, opacity: 1, scale: 1 }}
          animate={{ x: 12 + spark.dx, y: 16 + spark.dy, opacity: 0, scale: 0.4 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

interface Burst {
  id: number;
  x: number;
  y: number;
}

function TeleportingEgg({ reducedMotion }: { readonly reducedMotion: boolean }) {
  const { t } = useLanguage();
  const [pos, setPos] = useState({ x: 82, y: 66 });
  const [bursts, setBursts] = useState<Burst[]>([]);

  const teleport = () => {
    playSound('teleport.ogg', 0.5, 0.9 + Math.random() * 0.25);
    setBursts((prev) => [...prev.slice(-2), { id: Date.now(), x: pos.x, y: pos.y }]);
    const x = Math.random() < 0.5 ? 8 + Math.random() * 24 : 68 + Math.random() * 24;
    const y = 12 + Math.random() * 66;
    setPos({ x, y });
  };

  return (
    <>
      {bursts.map((burst) => (
        <TeleportBurst key={burst.id} x={burst.x} y={burst.y} />
      ))}
      <m.button
        key={`${pos.x}-${pos.y}`}
        type="button"
        aria-label={t('dangerEggDragonEgg')}
        className="absolute z-20 cursor-pointer"
        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25 }}
        whileHover={reducedMotion ? undefined : { scale: 1.15, rotate: -4 }}
        onClick={teleport}
      >
        <DragonEggSprite />
      </m.button>
    </>
  );
}

function AdvancementToast() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => {
      setVisible(true);
      playSound('levelup.ogg', 0.45);
    }, 1400);
    const hideTimer = setTimeout(() => setVisible(false), 6800);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-30 flex justify-center md:justify-end md:pr-6">
      <AnimatePresence>
        {visible && (
          <m.div
            className="flex items-center gap-3 rounded-sm border-2 border-[#7c3aed] bg-[#17131f]/95 px-4 py-2 shadow-[0_0_20px_rgba(124,58,237,0.4)]"
            initial={{ y: -90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -90, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <Image src="/images/ender-pearl.webp" alt="" width={28} height={28} className="pixelated" />
            <div className="text-left">
              <p className="font-minecraft text-[11px] text-purple-300">{t('dangerEggAdvancement')}</p>
              <p className="font-minecraft text-sm text-white">{t('dangerEggAdvancementName')}</p>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface EndSceneProps {
  readonly onReturn: () => void;
  readonly reducedMotion: boolean;
}

function EndScene({ onReturn, reducedMotion }: EndSceneProps) {
  const { t } = useLanguage();
  const returnButtonRef = useRef<HTMLButtonElement>(null);
  const lookRef = useRef<HTMLDivElement>(null);
  const starLayerRef = useRef<HTMLDivElement>(null);
  const midLayerRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px) and (pointer: fine)');
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const stars = useMemo(
    () =>
      Array.from({ length: STAR_COUNT }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: 1 + Math.round(Math.random() * 2),
        delay: Math.random() * 3,
        duration: 2 + Math.random() * 3,
      })),
    []
  );

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        bottom: Math.random() * 35,
        delay: Math.random() * 4,
      })),
    []
  );

  useEffect(() => {
    returnButtonRef.current?.focus();
    const growlTimer = setTimeout(() => playSound('dragon-growl.ogg', 0.4), 2500);
    return () => clearTimeout(growlTimer);
  }, []);

  const onMouseMove = (event: React.MouseEvent) => {
    if (reducedMotion) return;
    const dx = event.clientX / window.innerWidth - 0.5;
    const dy = event.clientY / window.innerHeight - 0.5;
    if (lookRef.current) lookRef.current.style.transform = `rotateX(${dy * -4}deg) rotateY(${dx * 6}deg)`;
    if (starLayerRef.current) starLayerRef.current.style.transform = `translate(${dx * -12}px, ${dy * -8}px)`;
    if (midLayerRef.current) midLayerRef.current.style.transform = `translate(${dx * -30}px, ${dy * -20}px)`;
  };

  return (
    <m.div
      className="absolute inset-0 bg-gradient-to-b from-[#0a0612] via-black to-[#120a1f]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.6 } }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      onMouseMove={onMouseMove}
    >
      {!reducedMotion && isDesktop && <EndWorldScene onReturn={onReturn} />}
      <div className="pointer-events-none absolute inset-0 [perspective:1400px]">
      <div ref={lookRef} className="absolute inset-0 transition-transform duration-300 ease-out will-change-transform">
      <div ref={starLayerRef} aria-hidden className="absolute -inset-8 transition-transform duration-300 ease-out">
        {stars.map((star) => (
          <div
            key={star.id}
            className="animate-twinkle motion-reduce:animate-none absolute rounded-[1px] bg-purple-100/90"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
            }}
          />
        ))}
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="animate-ender-drift motion-reduce:animate-none absolute h-[3px] w-[3px] bg-fuchsia-400"
            style={{
              left: `${particle.left}%`,
              bottom: `${particle.bottom}%`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}
      </div>
      <div aria-hidden className="absolute inset-0">
        <m.div
          className="absolute top-[14%] left-0 scale-90 md:scale-110"
          animate={reducedMotion ? undefined : { x: ['-30vw', '110vw'], y: [0, -70, 40, -30, 0], rotate: [0, -6, 5, -4, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          <VoxelEnderDragon />
        </m.div>
        {/* enderman tumbling helplessly through the void, opposite direction to the dragon */}
        <m.div
          className="absolute top-[48%] left-0 scale-75 md:scale-90"
          animate={
            reducedMotion
              ? undefined
              : { x: ['105vw', '-15vw'], y: [0, 50, -40, 20, 0], rotate: [0, -720] }
          }
          transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
        >
          <VoxelEnderman />
        </m.div>
      </div>
      <div ref={midLayerRef} aria-hidden className="absolute inset-0 transition-transform duration-300 ease-out">
        <div className="absolute right-[24%] top-[5%] hidden md:block">
          <EndCityTower />
        </div>
        <m.div
          className="absolute left-[10%] top-[16%] scale-75 md:scale-100"
          animate={reducedMotion ? undefined : { x: [0, 18, 0], y: [0, -12, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChorusIsland />
        </m.div>
        <m.div
          className="absolute right-[10%] top-[52%] scale-75 md:scale-100"
          animate={reducedMotion ? undefined : { x: [0, -14, 0], y: [0, 10, 0] }}
          transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ShulkerIsland />
        </m.div>
        <m.div
          className="absolute left-[6%] top-[64%] hidden md:block"
          animate={reducedMotion ? undefined : { x: [0, 10, 0], y: [0, -14, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        >
          <TinyIsland />
        </m.div>
        <m.div
          className="absolute right-[20%] top-[38%]"
          animate={reducedMotion ? undefined : { y: [0, -14, 0], rotate: [-7, 7, -7] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Image src="/images/elytra.webp" alt="" width={34} height={34} className="pixelated opacity-90" />
        </m.div>
        <m.div
          className="absolute left-[22%] top-[44%] hidden md:block"
          animate={reducedMotion ? undefined : { y: [0, 10, 0], rotate: [5, -5, 5] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Image src="/images/ender_chest.webp" alt="" width={30} height={30} className="pixelated opacity-80" />
        </m.div>
        <ObsidianPillar height={150} crystal className="left-[6%]" />
        <ObsidianPillar height={84} className="left-[16%] hidden md:block" />
        <ObsidianPillar height={180} crystal className="right-[7%]" />
        <ObsidianPillar height={100} className="right-[17%] hidden md:block" />
      </div>
      <EndWhispers reducedMotion={reducedMotion} />
      </div>
      </div>
      <div className="pointer-events-none absolute left-5 top-5 z-30 border-2 border-fuchsia-400/70 bg-[#11091d]/85 px-4 py-3 text-left shadow-[4px_4px_0_rgba(0,0,0,0.35)]">
        <p className="font-minecraft text-[10px] tracking-[0.18em] text-fuchsia-300">{t('dangerEggMission')}</p>
        <p className="mt-1 font-minecraft text-sm text-purple-100">{t('dangerEggMissionObjective')}</p>
      </div>
      <div className="pointer-events-none relative flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <m.h2
          className="font-minecraft drop-shadow-glow text-4xl text-purple-200 md:text-5xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {t('dangerEggEndTitle')}
        </m.h2>
        <m.p
          className="max-w-md text-sm text-gray-400"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {t('dangerEggEndSubtitle')}
        </m.p>
        <m.div className="pointer-events-auto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          <Button ref={returnButtonRef} variant="minepanel" className="font-minecraft" onClick={onReturn}>
            {t('dangerEggReturn')}
          </Button>
        </m.div>
      </div>
      {/* the dragon egg teleports away when clicked, just like in the game */}
      <TeleportingEgg reducedMotion={reducedMotion} />
      <AdvancementToast />
    </m.div>
  );
}

export function EndPortalEasterEgg() {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion() ?? false;
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (phase !== 'warp') return;
    const timer = setTimeout(() => setPhase('end'), WARP_DURATION_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === 'idle') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPhase('idle');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [phase]);

  return (
    <>
      <m.div
        className="inline-block"
        animate={reducedMotion ? undefined : { scale: [1, 1.04, 1] }}
        transition={{ repeat: Infinity, duration: 2.5 }}
      >
        <Button
          variant="minepanelDanger"
          size="sm"
          className="font-minecraft"
          disabled={phase !== 'idle'}
          onClick={() => setPhase(reducedMotion ? 'end' : 'warp')}
        >
          {t('dangerEggButton')}
        </Button>
      </m.div>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {phase !== 'idle' && (
              <m.div
                key="end-portal-overlay"
                role="dialog"
                aria-modal="true"
                aria-label={t('dangerEggEndTitle')}
                className="fixed inset-0 z-[100] overflow-hidden bg-black"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.8 } }}
              >
                <AnimatePresence>
                  {phase === 'warp' ? (
                    <WarpOverlay key="warp" />
                  ) : (
                    <EndScene key="end" onReturn={() => setPhase('idle')} reducedMotion={reducedMotion} />
                  )}
                </AnimatePresence>
              </m.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
