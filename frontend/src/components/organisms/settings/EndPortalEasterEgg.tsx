'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { getCurrentUser } from '@/services/users/users.service';
import { cue, isMuted, unlockAudio } from './end/end-audio';
import { loadLore, loreText } from './end/lore';
import { daysSince, FIRST_GHOST, hasDragonEgg, useEndGame } from './end/store';
import { DragonEggIcon } from './end/PixelIcons';

// the whole run (HUD, windows, story) loads on the click, not with the settings page
const EndJourney = dynamic(() => import('./end/EndJourney').then((mod) => mod.EndJourney), { ssr: false });

interface Spot {
  readonly x: number;
  readonly y: number;
}

// The trophy for finishing the fight. Like the real egg, it teleports when touched.
function EggTrophy() {
  const { t } = useLanguage();
  const [spot, setSpot] = useState<Spot>({ x: 50, y: 50 });
  const [left, setLeft] = useState<{ id: number; spot: Spot } | null>(null);

  const hop = () => {
    cue('egg');
    setLeft((previous) => ({ id: (previous?.id ?? 0) + 1, spot }));
    setSpot({ x: 12 + Math.random() * 76, y: 22 + Math.random() * 56 });
  };

  return (
    <div className="relative mx-auto h-16 w-full max-w-xs">
      {left && (
        <div key={left.id} aria-hidden className="pointer-events-none absolute" style={{ left: `${left.spot.x}%`, top: `${left.spot.y}%` }}>
          {Array.from({ length: 8 }, (_, index) => {
            const angle = (index / 8) * Math.PI * 2;
            return (
              <m.span
                key={index}
                className="absolute h-1 w-1 bg-fuchsia-400"
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{ x: Math.cos(angle) * 22, y: Math.sin(angle) * 22, opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            );
          })}
        </div>
      )}
      <button
        type="button"
        aria-label={t('dangerEggDragonEgg')}
        title={t('dangerEggDragonEgg')}
        onClick={hop}
        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
        style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
      >
        <DragonEggIcon className="h-8 w-8 drop-shadow-[0_0_8px_rgba(192,132,252,0.55)]" />
      </button>
    </div>
  );
}

export function EndPortalEasterEgg() {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const reducedMotion = useReducedMotion() ?? false;
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [egg, setEgg] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    setMounted(true);
    setEgg(hasDragonEgg());
  }, []);

  useEffect(() => {
    if (wasOpen.current && !open) trigger.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const start = async () => {
    unlockAudio();
    setLoading(true);
    try {
      await loadLore(language);
    } finally {
      setLoading(false);
    }
    const game = useEndGame.getState();
    game.reset(loreText('player'), isMuted());
    // the run opens on the controls screen; Play takes the pointer
    game.setPaused(true);
    getCurrentUser()
      .then((user) => useEndGame.getState().setPlayer(user.username))
      .catch(() => {});
    setOpen(true);
  };

  const close = useCallback(() => {
    setOpen(false);
    setEgg(hasDragonEgg());
  }, []);

  return (
    <>
      {egg && <EggTrophy />}
      <Button ref={trigger} variant="minepanelDanger" size="sm" className="font-minecraft" disabled={open || loading} onClick={() => void start()}>
        {t(egg ? 'dangerEggButtonAgain' : 'dangerEggButton')}
      </Button>
      {mounted && (
        <p className="mt-3 font-mono text-[11px] text-gray-500">
          {t(daysSince(FIRST_GHOST.at) === 0 ? 'dangerEggLastSeenToday' : 'dangerEggLastSeen')
            .replace('{ghost}', FIRST_GHOST.name)
            .replace('{days}', String(daysSince(FIRST_GHOST.at)))}
        </p>
      )}
      {mounted &&
        createPortal(
          <AnimatePresence>{open && <EndJourney key="journey" onClose={close} still={reducedMotion} />}</AnimatePresence>,
          document.body
        )}
    </>
  );
}
