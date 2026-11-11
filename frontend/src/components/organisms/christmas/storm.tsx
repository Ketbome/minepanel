'use client';

import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { cn } from '@/lib/utils';
import { blizzard, chime, jingle } from './sound';
import { Voxel } from './voxel';

const COLORS = ['Red', 'Green', 'Blue'] as const;
const COUNT = 6;
const SPARK_COLORS = ['#ffd34d', '#ff4a5c', '#5dff8a', '#4aa8ff'];
const SPARKS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI - Math.PI;
  const reach = 30 + (i % 3) * 16;
  return {
    '--sx': `${Math.cos(angle) * reach}px`,
    '--sy': `${Math.sin(angle) * reach - 20}px`,
    background: SPARK_COLORS[i % 4],
    animationDelay: `${(i % 4) * 40}ms`,
  } as CSSProperties;
});

const pick = (min: number, max: number) => min + Math.random() * (max - min);

// A snowstorm under the northern lights: gifts drift down and land in the snow. Opening them
// all, Esc or the button clears the sky.
export function Storm({ onDone }: { readonly onDone: () => void }) {
  const { t } = useLanguage();
  const button = useRef<HTMLButtonElement>(null);
  const [opened, setOpened] = useState<number[]>([]);

  const gifts = useMemo(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const size = Math.max(56, Math.min(96, w / 12));
    const lane = (w - size) / COUNT;
    return Array.from({ length: COUNT }, (_, i) => ({
      color: COLORS[i % COLORS.length],
      size,
      x: lane * (i + pick(0.2, 0.8)),
      land: h - size - pick(120, 160),
      delay: `${(i * 0.45 + pick(0, 0.3)).toFixed(2)}s`,
    }));
  }, []);

  useEffect(() => {
    jingle();
    const stop = blizzard();
    button.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      stop();
      window.removeEventListener('keydown', onKey);
    };
  }, [onDone]);

  useEffect(() => {
    if (opened.length < COUNT) return;
    jingle();
    const done = window.setTimeout(onDone, 2600);
    return () => window.clearTimeout(done);
  }, [opened, onDone]);

  const open = (i: number) => {
    if (opened.includes(i)) return;
    chime();
    setOpened((list) => [...list, i]);
  };

  return (
    <div className="xm-storm" role="dialog" aria-modal="true" aria-label={t('christmasStorm')}>
      <div className="xm-aurora" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="xm-snow xm-snow--storm" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="xm-drift" aria-hidden="true" />

      {gifts.map(({ color, size, x, land, delay }, i) => {
        const isOpen = opened.includes(i);
        return (
          <button
            key={i}
            type="button"
            className={cn('xm-gift', isOpen && 'is-open')}
            style={{ left: x, width: size, ['--land' as string]: `${land}px`, animationDelay: delay }}
            onClick={() => open(i)}
            disabled={isOpen}
            aria-label={t('christmasGift')}
          >
            {isOpen ? (
              <>
                <Voxel name={`gift${color}Open`} />
                <Voxel name={`gift${color}Lid`} className="xm-gift__lid" />
                {SPARKS.map((style, k) => (
                  <span key={k} className="xm-spark" style={{ left: '50%', top: '40%', ...style }} />
                ))}
              </>
            ) : (
              <Voxel name={`gift${color}`} />
            )}
          </button>
        );
      })}

      <div className="xm-storm__hud font-minecraft">
        <p className="text-sm">{opened.length === COUNT ? t('christmasAllOpened') : t('christmasStorm')}</p>
        <p className="mp-tag text-xs">{t('christmasOpened').replace('{n}', String(opened.length)).replace('{total}', String(COUNT))}</p>
        <button ref={button} type="button" onClick={onDone} className="mc-btn px-3 py-1.5 text-xs">
          {t('christmasClearSky')}
        </button>
      </div>
    </div>
  );
}
