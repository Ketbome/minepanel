'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useSeasonStore } from '@/lib/store/season-store';

// The season theme costs nothing the rest of the year: these wrappers are all the app imports,
// and the art, styles and sounds load only while the season is on.
export const BLACKOUT_EVENT = 'minepanel:blackout';

const Layer = dynamic(() => import('./layer').then((m) => m.Layer), { ssr: false });
const Pumpkin = dynamic(() => import('./pumpkin').then((m) => m.Pumpkin), { ssr: false });
const HeaderDecor = dynamic(() => import('./header').then((m) => m.HeaderDecor), { ssr: false });
const Lantern = dynamic(() => import('./header').then((m) => m.Lantern), { ssr: false });
const Ghost = dynamic(() => import('./ghost').then((m) => m.Ghost), { ssr: false });
const Bats = dynamic(() => import('./ghost').then((m) => m.Bats), { ssr: false });
const Toggle = dynamic(() => import('./toggle').then((m) => m.Toggle), { ssr: false });

const useOn = () => useSeasonStore((s) => s.enabled);

export function SeasonLayer() {
  const init = useSeasonStore((s) => s.init);
  const on = useOn();
  useEffect(() => init(), [init]);
  return on ? <Layer /> : null;
}

export function HalloweenToggle() {
  return useSeasonStore((s) => s.inSeason) ? <Toggle /> : null;
}

export function HalloweenPumpkin({ collapsed }: { readonly collapsed: boolean }) {
  return useOn() ? <Pumpkin collapsed={collapsed} /> : null;
}

export function HalloweenHeader() {
  return useOn() ? <HeaderDecor /> : null;
}

export function HalloweenLantern() {
  return useOn() ? <Lantern /> : null;
}

export function HalloweenGhost() {
  return useOn() ? <Ghost /> : null;
}

export function HalloweenBats() {
  return <Bats />;
}

export const useHalloween = useOn;
