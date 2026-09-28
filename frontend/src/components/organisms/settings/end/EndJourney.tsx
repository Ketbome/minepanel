'use client';

import dynamic from 'next/dynamic';
import { AnimatePresence, m } from 'framer-motion';
import { Volume2, VolumeX, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { setMuted, stopAmbience } from './end-audio';
import { releaseAll } from './engine/input';
import { exitFullscreen, runtime } from './engine/runtime';
import { EndPoem } from './EndPoem';
import { Hud } from './hud/Hud';
import { useLore } from './lore';
import { useEndGame, type Veil } from './store';
import { Thanks } from './Thanks';

const JourneyScene = dynamic(() => import('./JourneyScene'), { ssr: false });
const Panels = dynamic(() => import('./panels/Panels'), { ssr: false });

const INTRO_S = 2.6;
const VEIL_COLORS: Record<Veil, string> = { black: '#000000', portal: '#2a0848', white: '#f3e8ff', none: 'transparent' };

function supportsWebGL() {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

function Intro() {
  const lore = useLore();
  return (
    <m.div
      className="pointer-events-none absolute inset-0 z-[46] flex items-center justify-center bg-black"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: INTRO_S, duration: 1.2 }}
    >
      <m.p
        className="font-minecraft px-6 text-center text-lg text-gray-300 md:text-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: INTRO_S + 0.3, times: [0, 0.25, 0.8, 1] }}
      >
        {lore('intro')}
      </m.p>
    </m.div>
  );
}

// Between zones the screen goes dark (or purple, through a portal), the zone swaps while it is
// covered, and then the new one fades in.
function TransitionVeil() {
  const transition = useEndGame((state) => state.transition);
  const [color, setColor] = useState(VEIL_COLORS.black);

  useEffect(() => {
    if (transition) setColor(VEIL_COLORS[transition.veil]);
  }, [transition]);

  return (
    <AnimatePresence>
      {transition && (
        <m.div
          key="veil"
          className="pointer-events-none absolute inset-0 z-[43]"
          style={{ backgroundColor: color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.7 } }}
          exit={{ opacity: 0, transition: { duration: 1.1, delay: 0.3 } }}
          onAnimationComplete={() => useEndGame.getState().arrive()}
        />
      )}
    </AnimatePresence>
  );
}

function HudButton({ label, onClick, children, ref }: { readonly label: string; readonly onClick: () => void; readonly children: ReactNode; readonly ref?: Ref<HTMLButtonElement> }) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="mc-slot flex h-9 w-9 items-center justify-center text-gray-200 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-emerald-400 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}

interface EndJourneyProps {
  readonly onClose: () => void;
  readonly still: boolean;
}

export function EndJourney({ onClose, still }: EndJourneyProps) {
  const lore = useLore();
  const zone = useEndGame((state) => state.zone);
  const muted = useEndGame((state) => state.muted);
  const panel = useEndGame((state) => state.panel);
  const stayed = useEndGame((state) => Boolean(state.flags.stayed));
  const [webgl] = useState(supportsWebGL);
  // without WebGL2 there is no game to draw, only the ending; asking for less motion still plays,
  // just with a steady camera
  const calm = !webgl;
  runtime.reducedMotion = still;
  const leave = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    leave.current?.focus({ preventScroll: true });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // E opens the inventory and closes any window, Escape closes a window or the pause menu; with
    // the pointer locked, the browser itself turns Escape into a pause
    let pausedAt = 0;
    const unsubscribe = useEndGame.subscribe((game, previous) => {
      if (game.paused && !previous.paused) pausedAt = performance.now();
    });
    const onKey = (event: KeyboardEvent) => {
      const game = useEndGame.getState();
      if (game.dead || game.zone === 'poem') {
        if (event.key === 'Escape' && game.zone === 'poem') onClose();
        return;
      }
      if (event.code === 'KeyE') {
        if (game.panel) game.closePanel();
        else if (!game.paused) game.openPanel({ kind: 'inventory' });
      } else if (event.key === 'Escape' && game.panel) {
        game.closePanel();
      } else if (event.key === 'Escape' && game.paused) {
        // the same Escape that just paused (by leaving the lock) must not resume at once
        if (game.flags.started && performance.now() - pausedAt > 400) game.setPaused(false);
      } else if (event.key === 'Escape' && !document.pointerLockElement) {
        game.setPaused(true);
      } else if (event.key === 'm' || event.key === 'M') {
        setMuted(!game.muted);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      unsubscribe();
      document.body.style.overflow = overflow;
      document.body.style.cursor = '';
      window.removeEventListener('keydown', onKey);
      stopAmbience();
      releaseAll();
      exitFullscreen();
    };
  }, [onClose]);

  // both endings close on the thanks; the islet one gets there without a poem
  const [thanks, setThanks] = useState(false);
  const finish = useCallback(() => setThanks(true), []);
  useEffect(() => {
    if (!stayed) return;
    const timer = window.setTimeout(finish, 1200);
    return () => window.clearTimeout(timer);
  }, [stayed, finish]);

  return (
    <m.div
      role="dialog"
      aria-modal="true"
      aria-label={lore('endTitle')}
      className="fixed inset-0 z-[100] select-none overflow-hidden bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
    >
      {calm ? (
        <EndPoem still notice={lore('noWebgl')} onDone={finish} />
      ) : (
        <>
          {zone !== 'poem' && <JourneyScene />}
          {zone !== 'poem' && <Hud onClose={onClose} />}
          {panel && zone !== 'poem' && <Panels />}
          {zone === 'poem' && <EndPoem still={still} onDone={finish} />}
          <TransitionVeil />
          <Intro />
        </>
      )}
      {thanks && (
        <Thanks
          onClose={onClose}
          onVisit={() => {
            setThanks(false);
            const game = useEndGame.getState();
            game.setPaused(false);
            game.travel('server48', 'arrive', 'black');
          }}
        />
      )}
      <div className="absolute right-2 top-2 z-[47] flex gap-1.5 md:right-4 md:top-4">
        {!calm && (
          <HudButton label={lore(muted ? 'unmute' : 'mute')} onClick={() => setMuted(!muted)}>
            {muted ? <VolumeX /> : <Volume2 />}
          </HudButton>
        )}
        <HudButton ref={leave} label={lore('leave')} onClick={onClose}>
          <X />
        </HudButton>
      </div>
    </m.div>
  );
}
