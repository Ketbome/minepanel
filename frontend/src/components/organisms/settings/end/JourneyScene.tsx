'use client';

import { PerformanceMonitor } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useState } from 'react';
import { EndAct } from './EndAct';
import { useEndGame } from './end-game-store';
import { StrongholdAct } from './StrongholdAct';

export default function JourneyScene() {
  const act = useEndGame((state) => state.act);
  const [dpr, setDpr] = useState(1.75);

  return (
    <Canvas
      aria-hidden
      // the canvas wrapper defaults to position: relative inline, which would push the HUD out of view
      style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
      dpr={[1, dpr]}
      flat
      camera={{ fov: 50, near: 0.1, far: 520, position: [1.6, 3.4, 10.8] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} />
      {act === 'stronghold' ? <StrongholdAct /> : <EndAct />}
    </Canvas>
  );
}
