'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { cn } from '@/lib/utils';
import { STORM_EVENT } from './layer';
import { note } from './sound';
import { anchorAt, Voxel } from './voxel';

// each poke lights the next bauble from the bottom up; with all eight lit the star flares
// and the storm rolls in
const BAUBLES = 8;
const STORM_DELAY_MS = 900;

export function Tree({ collapsed }: { readonly collapsed: boolean }) {
  const { t } = useLanguage();
  const [lit, setLit] = useState(0);
  const [poked, setPoked] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const poke = () => {
    setPoked(true);
    later(() => setPoked(false), 120);
    if (lit >= BAUBLES) return;
    note(lit);
    setLit(lit + 1);
    if (lit + 1 < BAUBLES) return;
    later(() => {
      window.dispatchEvent(new Event(STORM_EVENT));
      setLit(0);
    }, STORM_DELAY_MS);
  };

  return (
    <button
      type="button"
      onClick={poke}
      aria-label={t('christmasTree')}
      className={cn('xm-tree', poked && 'is-poked', lit >= BAUBLES && 'is-full')}
      style={{ width: collapsed ? 40 : 76, ...Object.fromEntries(Array.from({ length: lit }, (_, i) => [`--o${i}`, 1])) }}
    >
      <span className="xm-glow" style={{ ...anchorAt('tree', 'star'), width: '120%', aspectRatio: '1' }} />
      <Voxel name="tree" className="xm-lit" />
    </button>
  );
}
