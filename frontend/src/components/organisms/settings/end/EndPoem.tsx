'use client';

import Image from 'next/image';
import { m } from 'framer-motion';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useEndGame } from './end-game-store';

// The two voices of the End Poem keep the game's colors: dark aqua and dark green.
const VOICES = ['#00AAAA', '#00AA00'];
const SPEED = 38;
const FAST_SPEED = 200;

const STAR_LAYERS = [
  {
    image:
      'radial-gradient(1px 1px at 13% 27%, #9ffcb0, transparent), radial-gradient(1.5px 1.5px at 61% 71%, #5eead4, transparent), radial-gradient(1px 1px at 83% 19%, #86efac, transparent), radial-gradient(1px 1px at 37% 88%, #a7f3d0, transparent), radial-gradient(1.5px 1.5px at 72% 44%, #e9d5ff, transparent)',
    size: 97,
    duration: 70,
    drift: ['97px', '-97px'],
  },
  {
    image:
      'radial-gradient(2px 2px at 28% 64%, #c4b5fd, transparent), radial-gradient(1.5px 1.5px at 77% 33%, #a78bfa, transparent), radial-gradient(1px 1px at 52% 9%, #e9d5ff, transparent), radial-gradient(1px 1px at 8% 41%, #5eead4, transparent)',
    size: 151,
    duration: 55,
    drift: ['-151px', '151px'],
  },
  {
    image: 'radial-gradient(2px 2px at 44% 52%, #f0fdf4, transparent), radial-gradient(1.5px 1.5px at 86% 81%, #99f6e4, transparent)',
    size: 233,
    duration: 40,
    drift: ['233px', '233px'],
  },
];

function PoemSky({ still }: { readonly still: boolean }) {
  return (
    <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, #0d0a1c 0%, #05040b 60%, #020205 100%)' }}>
      {STAR_LAYERS.map((layer) => (
        <div
          key={layer.size}
          className={`absolute inset-0 opacity-70 ${still ? '' : 'animate-portal-drift motion-reduce:animate-none'}`}
          style={
            {
              backgroundImage: layer.image,
              backgroundSize: `${layer.size}px ${layer.size}px`,
              animationDuration: `${layer.duration}s`,
              '--drift-x': layer.drift[0],
              '--drift-y': layer.drift[1],
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function PoemLines({ lines, player }: { readonly lines: readonly string[]; readonly player: string }) {
  return (
    <>
      {lines.map((line, index) => {
        const last = index === lines.length - 1;
        return (
          <p
            key={index}
            className={last ? 'font-minecraft mt-14 text-3xl md:text-4xl' : 'text-sm leading-relaxed md:text-base'}
            style={{ color: VOICES[index % 2] }}
          >
            {line.split('{player}').map((part, piece) => (
              <Fragment key={piece}>
                {piece > 0 && <span className="font-semibold text-white">{player}</span>}
                {part}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

interface EndPoemProps {
  readonly onDone: () => void;
  // reduced motion or no WebGL: the whole poem at once, nothing scrolls
  readonly still?: boolean;
}

export function EndPoem({ onDone, still = false }: EndPoemProps) {
  const { t } = useLanguage();
  const stored = useEndGame((state) => state.player);
  const player = stored || t('dangerEggPlayer');
  const lines = t('dangerEggPoem').split('\n');
  const column = useRef<HTMLDivElement>(null);
  const fast = useRef(false);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    if (still) return;
    let frame = 0;
    let last = performance.now();
    let offset = window.innerHeight * 0.9;
    let finished = false;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      offset -= dt * (fast.current ? FAST_SPEED : SPEED);
      const content = column.current;
      if (content) {
        content.style.transform = `translate3d(0, ${offset}px, 0)`;
        if (!finished && offset < window.innerHeight * 0.4 - content.offsetHeight) {
          finished = true;
          setEnding(true);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // holding Space speeds the credits up, as it does in the game
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      event.preventDefault();
      fast.current = event.type === 'keydown';
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, [still]);

  useEffect(() => {
    if (!ending) return;
    const timer = window.setTimeout(onDone, 1700);
    return () => window.clearTimeout(timer);
  }, [ending, onDone]);

  if (still) {
    return (
      <div className="absolute inset-0 overflow-y-auto">
        <PoemSky still />
        <div className="relative mx-auto flex max-w-xl flex-col items-center gap-5 px-6 py-16 text-center">
          <h2 className="font-minecraft text-4xl text-purple-100">{t('dangerEggEndTitle')}</h2>
          <p className="text-sm text-gray-400">{t('dangerEggEndSubtitle')}</p>
          <PoemLines lines={lines} player={player} />
          <p className="mt-6 text-[11px] text-gray-500">{t('dangerEggPoemCredit')}</p>
          <Button variant="minepanel" className="mt-4" onClick={onDone}>
            {t('dangerEggReturn')}
          </Button>
        </div>
      </div>
    );
  }

  const hold = (on: boolean) => () => {
    fast.current = on;
  };

  return (
    <m.div
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 1.4 } }}
      onPointerDown={hold(true)}
      onPointerUp={hold(false)}
      onPointerLeave={hold(false)}
      onPointerCancel={hold(false)}
    >
      <PoemSky still={false} />
      <div
        ref={column}
        className="relative mx-auto flex max-w-xl flex-col items-center gap-6 px-6 pb-16 text-center will-change-transform"
        style={{ transform: 'translate3d(0, 90vh, 0)' }}
      >
        <Image src="/images/minepanel-logo.svg" alt="Minepanel" width={76} height={76} className="mb-10" />
        <PoemLines lines={lines} player={player} />
        <p className="mt-16 text-[11px] text-gray-500">{t('dangerEggPoemCredit')}</p>
      </div>
      <m.p
        className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-[11px] text-gray-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 7, times: [0, 0.1, 0.85, 1], delay: 2 }}
      >
        {t('dangerEggPoemHint')}
      </m.p>
      {ending && <m.div className="absolute inset-0 bg-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5 }} />}
    </m.div>
  );
}
