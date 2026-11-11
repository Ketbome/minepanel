'use client';

import dynamic from 'next/dynamic';
import { type ReactNode, useEffect } from 'react';
import { useSeasonStore } from '@/lib/store/season-store';

// The season themes cost nothing the rest of the year: these wrappers are all the app imports,
// and each season's art, styles and sounds load only while it is on.
const HalloweenLayer = dynamic(() => import('../halloween/layer').then((m) => m.Layer), { ssr: false });
const HalloweenToggle = dynamic(() => import('../halloween/toggle').then((m) => m.Toggle), { ssr: false });
const Pumpkin = dynamic(() => import('../halloween/pumpkin').then((m) => m.Pumpkin), { ssr: false });
const HeaderDecor = dynamic(() => import('../halloween/header').then((m) => m.HeaderDecor), { ssr: false });
const Lantern = dynamic(() => import('../halloween/header').then((m) => m.Lantern), { ssr: false });
const Ghost = dynamic(() => import('../halloween/ghost').then((m) => m.Ghost), { ssr: false });
const Bats = dynamic(() => import('../halloween/ghost').then((m) => m.Bats), { ssr: false });

const ChristmasLayer = dynamic(() => import('../christmas/layer').then((m) => m.Layer), { ssr: false });
const ChristmasToggle = dynamic(() => import('../christmas/toggle').then((m) => m.Toggle), { ssr: false });
const Tree = dynamic(() => import('../christmas/tree').then((m) => m.Tree), { ssr: false });
const Garland = dynamic(() => import('../christmas/garland').then((m) => m.Garland), { ssr: false });
const Snowman = dynamic(() => import('../christmas/snowman').then((m) => m.Snowman), { ssr: false });

const useOn = () => useSeasonStore((s) => (s.enabled ? s.season : null));

export function SeasonLayer() {
  const init = useSeasonStore((s) => s.init);
  const on = useOn();
  useEffect(() => init(), [init]);
  if (on === 'halloween') return <HalloweenLayer />;
  if (on === 'christmas') return <ChristmasLayer />;
  return null;
}

export function SeasonToggle() {
  const season = useSeasonStore((s) => s.season);
  if (season === 'halloween') return <HalloweenToggle />;
  if (season === 'christmas') return <ChristmasToggle />;
  return null;
}

export function SeasonSidebar({ collapsed }: { readonly collapsed: boolean }) {
  const on = useOn();
  if (on === 'halloween') return <Pumpkin collapsed={collapsed} />;
  if (on === 'christmas') return <Tree collapsed={collapsed} />;
  return null;
}

export function SeasonHeader() {
  const on = useOn();
  if (on === 'halloween') return <HeaderDecor />;
  if (on === 'christmas') return <Garland />;
  return null;
}

export function SeasonLantern() {
  return useOn() === 'halloween' ? <Lantern /> : null;
}

export function SeasonLogin() {
  const on = useOn();
  if (on === 'halloween') return <Ghost />;
  if (on === 'christmas') return <Snowman />;
  return null;
}

// the login page's drifting blocks, unless the season brings its own
export function SeasonBackdrop({ children }: { readonly children: ReactNode }) {
  return useOn() === 'halloween' ? <Bats /> : children;
}
