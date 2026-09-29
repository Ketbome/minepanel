'use client';

import { PerformanceMonitor } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, N8AO, SMAA, Vignette } from '@react-three/postprocessing';
import { useEffect } from 'react';
import { QUALITY, shiftQuality, useQuality } from './quality';
import { setBloom, shaderTime } from './shading';

// The shader-pack pass over the world: ambient occlusion in the corners, bloom on whatever glows
// past white, a touch of saturation and contrast, and a soft vignette. The hand's HUD draws on
// top of it (see Hand.tsx), so it stays sharp.
export function Graphics() {
  const post = useQuality((state) => QUALITY[state.quality].post);

  useEffect(() => {
    setBloom(post);
    return () => setBloom(false);
  }, [post]);

  useFrame(({ clock }) => {
    shaderTime.value = clock.elapsedTime;
  });

  return (
    <>
      <PerformanceMonitor onIncline={() => shiftQuality(1)} onDecline={() => shiftQuality(-1)} flipflops={3} onFallback={() => shiftQuality(-1)} />
      {post && (
        // SMAA instead of multisampling: MSAA on the float buffers cost more than the AO itself
        <EffectComposer multisampling={0}>
          <N8AO halfRes quality="performance" aoRadius={1.4} distanceFalloff={0.5} intensity={2.2} />
          <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.3} intensity={0.9} />
          <HueSaturation saturation={0.1} />
          <BrightnessContrast contrast={0.06} />
          <Vignette offset={0.32} darkness={0.42} />
          <SMAA />
        </EffectComposer>
      )}
    </>
  );
}
