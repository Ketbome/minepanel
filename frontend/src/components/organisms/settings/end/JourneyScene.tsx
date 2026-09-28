'use client';

import { PerformanceMonitor } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useState, type ComponentType } from 'react';
import { AncientCity } from './acts/AncientCity';
import { End } from './acts/End';
import { EndCity } from './acts/EndCity';
import { Nether } from './acts/Nether';
import { Overworld } from './acts/Overworld';
import { Server48 } from './acts/Server48';
import { Stronghold } from './acts/Stronghold';
import { resetClock } from './engine/clock';
import { RunClock } from './engine/RunClock';
import { Screenshot } from './engine/Screenshot';
import { Drops } from './engine/Drops';
import { Effects } from './engine/Effects';
import { Hand } from './engine/Hand';
import { Player } from './engine/Player';
import { Projectiles } from './engine/Projectiles';
import { Endermites } from './mobs/endermite';
import { Rake } from './mobs/rake';
import { useEndGame, type Zone } from './store';

// the poem is drawn over the page, so it has no scene
const ZONES: Partial<Record<Zone, ComponentType>> = {
  overworld: Overworld,
  nether: Nether,
  ancient: AncientCity,
  stronghold: Stronghold,
  end: End,
  endcity: EndCity,
  server48: Server48,
};

export default function JourneyScene() {
  const zone = useEndGame((state) => state.zone);
  const [dpr, setDpr] = useState(1.5);
  const Scene = ZONES[zone];
  useEffect(() => resetClock(), []);

  return (
    <Canvas
      aria-hidden
      // the canvas wrapper defaults to position: relative inline, which would push the HUD out of view
      style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
      dpr={[1, dpr]}
      flat
      camera={{ fov: 70, near: 0.05, far: 420, position: [0, 2, 4] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} />
      {Scene && <Scene key={zone} />}
      <Player />
      <Projectiles />
      <Drops />
      <Rake key={`rake:${zone}`} />
      <Endermites key={`endermites:${zone}`} />
      <RunClock />
      <Screenshot />
      <Effects />
      <Hand />
    </Canvas>
  );
}
