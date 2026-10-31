'use client';

import { type CSSProperties, useEffect, useId, useRef, useState } from 'react';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { cn } from '@/lib/utils';
import { BLACKOUT_EVENT } from './index';
import { hiss } from './sound';
import { anchorAt, model, Voxel } from './voxel';

// five quick pokes make it angry; thirteen in all and the lights go out
const RAGE_CLICKS = 5;
const RAGE_WINDOW_MS = 1600;
const RAGE_MS = 5000;
const BLACKOUT_CLICKS = 13;
const SPARKS = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI - Math.PI;
  const reach = 26 + (i % 3) * 12;
  return { '--sx': `${Math.cos(angle) * reach}px`, '--sy': `${Math.sin(angle) * reach - 10}px`, animationDelay: `${(i % 4) * 40}ms` } as CSSProperties;
});

export function Pumpkin({ collapsed }: { readonly collapsed: boolean }) {
  const { t } = useLanguage();
  const ref = useRef<HTMLButtonElement>(null);
  const pokes = useRef<number[]>([]);
  const total = useRef(0);
  const timers = useRef<number[]>([]);
  const [angry, setAngry] = useState(false);
  const [poked, setPoked] = useState(false);
  const [burst, setBurst] = useState(0);
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const name = angry ? 'pumpkinAngry' : 'pumpkin';
  const { runs, anchors } = model(name);
  const eyes = runs.filter(([part]) => part === 'eyes').map(([, , d]) => d).join('');
  const [ex, ey] = anchors.eyes;

  // the bright heart of the flame leans toward the pointer, so the eyes follow it
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = el.getBoundingClientRect();
        const dx = e.clientX - (box.left + box.width / 2);
        const dy = e.clientY - (box.top + box.height / 2);
        const len = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, len / 240) * 2.6;
        el.style.setProperty('--lx', `${(dx / len) * reach}px`);
        el.style.setProperty('--ly', `${(dy / len) * reach * 0.6}px`);
      });
    };
    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const poke = () => {
    const now = performance.now();
    pokes.current = [...pokes.current.filter((at) => now - at < RAGE_WINDOW_MS), now];
    total.current += 1;
    setPoked(true);
    later(() => setPoked(false), 120);
    if (total.current >= BLACKOUT_CLICKS) {
      total.current = 0;
      pokes.current = [];
      window.dispatchEvent(new Event(BLACKOUT_EVENT));
      return;
    }
    if (!angry && pokes.current.length >= RAGE_CLICKS) {
      setAngry(true);
      setBurst((n) => n + 1);
      hiss();
      later(() => setAngry(false), RAGE_MS);
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={poke}
      aria-label={t('halloweenPumpkin')}
      className={cn('hw-pumpkin', poked && 'is-poked', angry && 'is-angry')}
      style={{ width: collapsed ? 40 : 76 }}
    >
      <span className={cn('hw-glow', angry && 'hw-glow--soul')} style={{ ...anchorAt(name, 'flame'), width: '320%', aspectRatio: '1' }} />
      <Voxel name={name} className="hw-lit">
        <defs>
          <radialGradient id={`${id}-core`}>
            <stop offset="0" stopColor="#fffbe6" />
            <stop offset="1" stopColor="#fffbe6" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${id}-eyes`}>
            <path d={eyes} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${id}-eyes)`}>
          <g style={{ transform: 'translate(var(--lx, 0), var(--ly, 0))', transition: 'transform 0.2s' }}>
            <circle cx={ex - 8} cy={ey} r={3.6} fill={`url(#${id}-core)`} />
            <circle cx={ex + 8} cy={ey} r={3.6} fill={`url(#${id}-core)`} />
          </g>
        </g>
      </Voxel>
      {angry &&
        SPARKS.map((style, i) => (
          <span key={`${burst}-${i}`} className="hw-spark" style={{ left: '50%', top: '30%', ...style }} />
        ))}
    </button>
  );
}
