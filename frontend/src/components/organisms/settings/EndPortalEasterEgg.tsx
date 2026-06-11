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
          className="absolute top-[16%] left-0"
          animate={reducedMotion ? undefined : { x: ['-30vw', '110vw'], y: [0, -60, 30, 0], rotate: [-4, 4, -4] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        >
          <Image
            src="/images/ender-dragon.webp"
            alt=""
            width={220}
            height={220}
            className="h-auto w-40 object-contain drop-shadow-[0_0_24px_rgba(168,85,247,0.6)] md:w-56"
          />
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
