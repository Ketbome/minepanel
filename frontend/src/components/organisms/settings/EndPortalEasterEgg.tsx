'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/hooks/useLanguage';

type Phase = 'idle' | 'warp' | 'end';

const WARP_DURATION_MS = 1800;
const STAR_COUNT = 80;
const PARTICLE_COUNT = 12;

const PEARL_OFFSETS = [
  { x: -180, y: -120 },
  { x: 200, y: -60 },
  { x: -120, y: 160 },
];

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

function DragonWing({ front }: { readonly front: boolean }) {
  return (
    <div
      className="animate-wing-flap motion-reduce:[animation-play-state:paused] absolute"
      style={
        {
          width: 52,
          height: 88,
          left: 78,
          top: 30,
          '--wing-z': front ? '14px' : '-14px',
          '--flap-dir': front ? '1' : '-1',
          clipPath: 'polygon(0 0, 100% 0, 92% 55%, 55% 100%, 0 70%)',
          background: 'linear-gradient(160deg, rgba(88,28,135,0.85), rgba(30,27,75,0.9) 60%, rgba(16,16,21,0.95))',
          borderTop: '3px solid #26262e',
        } as React.CSSProperties
      }
    />
  );
}

function VoxelEnderDragon() {
  return (
    <div aria-hidden className="relative h-[110px] w-[200px] [perspective:900px]">
      <div className="absolute left-1/2 top-1/2 h-24 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/25 blur-2xl" />
      <div className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform: 'rotateY(-32deg) rotateX(12deg)' }}>
        {/* tail, thinning toward the back */}
        <Cuboid w={22} h={10} d={10} palette={DRAGON_DARK} style={{ left: 0, top: 46 }} />
        <Cuboid w={26} h={13} d={13} palette={DRAGON_DARK} style={{ left: 18, top: 42 }} />
        <Cuboid w={30} h={16} d={16} palette={DRAGON_SCALES} style={{ left: 40, top: 38 }} />
        {/* body */}
        <Cuboid w={64} h={30} d={30} palette={DRAGON_SCALES} style={{ left: 66, top: 30 }} />
        {/* neck + head + snout */}
        <Cuboid w={24} h={14} d={14} palette={DRAGON_SCALES} style={{ left: 124, top: 30 }} />
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
        <Cuboid w={12} h={8} d={12} palette={DRAGON_DARK} style={{ left: 172, top: 32 }} />
        {/* horns */}
        <Cuboid w={9} h={4} d={4} palette={DRAGON_DARK} style={{ left: 148, top: 22, transform: 'translateZ(5px)' }} />
        <Cuboid w={9} h={4} d={4} palette={DRAGON_DARK} style={{ left: 148, top: 22, transform: 'translateZ(-5px)' }} />
        {/* wings */}
        <DragonWing front />
        <DragonWing front={false} />
      </div>
    </div>
  );
}

function WarpOverlay() {
  return (
    <m.div
      aria-hidden
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.3 } }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
    >
      <m.div
        className="absolute inset-0"
        animate={{
          scale: [1, 1.25, 1.1, 1.4],
          filter: ['blur(0px)', 'blur(6px)', 'blur(2px)', 'blur(14px)'],
          rotate: [0, 8, -6, 12],
        }}
        transition={{ duration: WARP_DURATION_MS / 1000, ease: 'easeIn' }}
      >
        {/* portal-spin keyframe owns transform, including the -50% centering translate */}
        <div className="animate-portal-spin absolute left-1/2 top-1/2 h-[150vmax] w-[150vmax] rounded-full bg-[conic-gradient(from_0deg,#2e1065,#7c3aed,#1e1b4b,#c026d3,#4c1d95,#a855f7,#2e1065)] opacity-90 blur-2xl" />
        <div className="animate-portal-spin-reverse absolute left-1/2 top-1/2 h-[150vmax] w-[150vmax] rounded-full bg-[radial-gradient(circle,transparent_25%,rgba(168,85,247,0.5)_45%,transparent_70%)]" />
        <div className="absolute left-1/2 top-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(216,180,254,0.9),rgba(126,34,206,0.4)_40%,transparent_70%)]" />
      </m.div>
      {PEARL_OFFSETS.map((offset, index) => (
        <m.div
          key={index}
          className="absolute left-1/2 top-1/2"
          initial={{ x: offset.x, y: offset.y, scale: 1, opacity: 1 }}
          animate={{ x: 0, y: 0, scale: 0, rotate: 360, opacity: 0 }}
          transition={{ duration: 1.4, delay: index * 0.15, ease: 'easeIn' }}
        >
          <Image src="/images/ender-pearl.webp" alt="" width={32} height={32} className="pixelated" />
        </m.div>
      ))}
    </m.div>
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

interface EndSceneProps {
  readonly onReturn: () => void;
  readonly reducedMotion: boolean;
}

function EndScene({ onReturn, reducedMotion }: EndSceneProps) {
  const { t } = useLanguage();
  const returnButtonRef = useRef<HTMLButtonElement>(null);

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
  }, []);

  return (
    <m.div
      className="absolute inset-0 bg-gradient-to-b from-[#0a0612] via-black to-[#120a1f]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.6 } }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
    >
      <div aria-hidden className="absolute inset-0">
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
        <m.div
          className="absolute top-[16%] left-0 scale-90 md:scale-110"
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
      <div className="relative flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
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
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          <Button ref={returnButtonRef} variant="minepanel" className="font-minecraft" onClick={onReturn}>
            {t('dangerEggReturn')}
          </Button>
        </m.div>
      </div>
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
