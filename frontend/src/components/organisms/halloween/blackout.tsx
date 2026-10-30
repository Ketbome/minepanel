'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { cn } from '@/lib/utils';
import { chime, click, screech, wind } from './sound';
import { Voxel } from './voxel';

type Creature = 'spider' | 'eyes' | 'rake';

const ALL: Creature[] = ['spider', 'eyes', 'rake'];
const LAMP = 170;

const pick = (min: number, max: number) => min + Math.random() * (max - min);

// Lights out: the pointer carries a lantern and three things hide in the dark. Esc, the button,
// or finding all three brings the lights back.
export function Blackout({ onDone }: { readonly onDone: () => void }) {
  const { t } = useLanguage();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [found, setFound] = useState<Creature[]>([]);
  const foundRef = useRef<Creature[]>([]);

  const spots = useMemo(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const left = Math.random() < 0.5;
    const rakeHeight = Math.min(h * 0.62, 520);
    return {
      spider: { x: pick(0.2, 0.8) * w, y: pick(0.25, 0.45) * h },
      eyes: { x: pick(0.12, 0.88) * w, y: pick(0.55, 0.75) * h },
      rake: { x: left ? w * 0.06 : w * 0.94, y: h - rakeHeight * 0.82, left, height: rakeHeight },
    };
  }, []);

  useEffect(() => {
    click();
    const stop = wind();
    button.current?.focus();
    const el = root.current;
    const flicker = window.setInterval(() => el?.style.setProperty('--r', `${LAMP + pick(-14, 10)}px`), 140);

    const onMove = (e: PointerEvent) => {
      el?.style.setProperty('--x', `${e.clientX}px`);
      el?.style.setProperty('--y', `${e.clientY}px`);
      for (const name of ALL) {
        if (foundRef.current.includes(name)) continue;
        // the Rake is caught by the face, not the feet
        const spot = name === 'rake' ? { x: spots.rake.x, y: spots.rake.y + spots.rake.height * 0.1 } : spots[name];
        if (Math.hypot(e.clientX - spot.x, e.clientY - spot.y) > LAMP * 0.6) continue;
        foundRef.current = [...foundRef.current, name];
        setFound(foundRef.current);
        if (name === 'rake') screech();
        else chime();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('keydown', onKey);
    return () => {
      stop();
      click();
      window.clearInterval(flicker);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('keydown', onKey);
    };
  }, [onDone, spots]);

  useEffect(() => {
    if (found.length < ALL.length) return;
    const done = window.setTimeout(onDone, 2600);
    return () => window.clearTimeout(done);
  }, [found, onDone]);

  const seen = (name: Creature) => found.includes(name);
  const { spider, eyes, rake } = spots;

  return (
    <div ref={root} className="hw-blackout" role="dialog" aria-modal="true" aria-label={t('halloweenBlackout')}>
      <div
        className={cn('hw-creature', seen('spider') && 'is-found')}
        style={{ left: spider.x, top: 0, translate: seen('spider') ? `0 -${spider.y + 60}px` : undefined }}
      >
        <div className="absolute left-0 top-0 w-px bg-[rgba(220,210,240,0.45)]" style={{ height: spider.y - 14 }} />
        <div className={cn('hw-frames absolute', seen('spider') && 'is-moving')} style={{ left: -24, top: spider.y - 22, width: 48 }}>
          <Voxel name="spider" />
          <Voxel name="spiderStep" />
        </div>
      </div>

      <div
        className={cn('hw-creature hw-rake', seen('rake') && 'is-found')}
        style={{
          left: rake.x,
          top: rake.y,
          height: rake.height,
          translate: seen('rake') ? `-50% ${rake.height}px` : '-50% 0',
          scale: rake.left ? '1 1' : '-1 1',
        }}
      >
        <Voxel name={seen('rake') ? 'rakeCover' : 'rake'} style={{ height: '100%', width: 'auto' }} />
      </div>

      <div className="hw-blackout__dark" />

      <div className={cn('hw-dark-eyes', seen('eyes') && 'is-found')} style={{ left: eyes.x - 19, top: eyes.y - 3 }}>
        <i />
        <i />
      </div>

      <div className="hw-blackout__lamp">
        <Voxel name="lantern" className="hw-lit" />
      </div>

      <div className="hw-blackout__hud font-minecraft">
        <p className="text-sm">
          {found.length === ALL.length ? t('halloweenAllFound') : t('halloweenBlackout')}
        </p>
        <p className="mp-tag text-xs">{t('halloweenFound').replace('{n}', String(found.length)).replace('{total}', String(ALL.length))}</p>
        <button ref={button} type="button" onClick={onDone} className="mc-btn px-3 py-1.5 text-xs">
          {t('halloweenLightsOn')}
        </button>
      </div>
    </div>
  );
}
