'use client';

import dynamic from 'next/dynamic';
import { m } from 'framer-motion';
import { SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { setMuted, stopAmbience } from './end-audio';
import { INTRO_S, useEndGame, type Act } from './end-game-store';
import { EndHud } from './EndHud';
import { EndPoem } from './EndPoem';

const JourneyScene = dynamic(() => import('./JourneyScene'), { ssr: false });

function supportsWebGL() {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

function Veil({ act }: { readonly act: Act }) {
  const { t } = useLanguage();
  if (act === 'stronghold') {
    return (
      <m.div
        key="intro"
        className="pointer-events-none absolute inset-0 z-[35] flex items-center justify-center bg-black"
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
          {t('dangerEggIntro')}
        </m.p>
      </m.div>
    );
  }
  if (act === 'end') {
    // picks up where the portal surface left off, then clears onto the End
    return (
      <m.div
        key="arrival"
        className="pointer-events-none absolute inset-0 z-10 bg-[#03110e]"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.8, ease: 'easeOut' }}
      />
    );
  }
  return null;
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
  const { t } = useLanguage();
  const act = useEndGame((state) => state.act);
  const muted = useEndGame((state) => state.muted);
  const [webgl] = useState(supportsWebGL);
  const calm = still || !webgl;
  const leave = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    leave.current?.focus({ preventScroll: true });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'm' || event.key === 'M') setMuted(!useEndGame.getState().muted);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.cursor = '';
      window.removeEventListener('keydown', onKey);
      stopAmbience();
    };
  }, [onClose]);

  const skip = () => {
    const game = useEndGame.getState();
    if (game.act === 'stronghold') game.setAct('end');
    else if (game.act === 'end') game.setAct('poem');
    else onClose();
  };

  return (
    <m.div
      role="dialog"
      aria-modal="true"
      aria-label={t('dangerEggEndTitle')}
      className="fixed inset-0 z-[100] select-none overflow-hidden bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
    >
      {calm ? (
        <EndPoem still onDone={onClose} />
      ) : (
        <>
          {act !== 'poem' && <JourneyScene />}
          {act !== 'poem' && <EndHud />}
          <Veil key={act} act={act} />
          {act === 'poem' && <EndPoem onDone={onClose} />}
        </>
      )}
      <div className="absolute right-2 top-2 z-40 flex gap-1.5 md:right-4 md:top-4">
        {!calm && (
          <HudButton label={t(muted ? 'dangerEggUnmute' : 'dangerEggMute')} onClick={() => setMuted(!muted)}>
            {muted ? <VolumeX /> : <Volume2 />}
          </HudButton>
        )}
        {!calm && (
          <HudButton label={t('dangerEggSkip')} onClick={skip}>
            <SkipForward />
          </HudButton>
        )}
        <HudButton ref={leave} label={t('dangerEggReturn')} onClick={onClose}>
          <X />
        </HudButton>
      </div>
    </m.div>
  );
}
