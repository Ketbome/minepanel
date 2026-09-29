import { create } from 'zustand';

// How much of the shader-pack look the machine can afford. The performance monitor moves down a
// tier when the frame rate sags and back up when it recovers, never above where the run started.
export type Quality = 'low' | 'medium' | 'high';

const TIERS: readonly Quality[] = ['low', 'medium', 'high'];

export const QUALITY: Record<Quality, { readonly dpr: number; readonly shadows: number; readonly post: boolean }> = {
  high: { dpr: 1.5, shadows: 2048, post: true },
  medium: { dpr: 1.25, shadows: 1024, post: false },
  low: { dpr: 1, shadows: 0, post: false },
};

// phones and tablets start without post-processing
const start = (): Quality => (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches ? 'medium' : 'high');

export const useQuality = create<{ quality: Quality; ceiling: Quality }>(() => {
  const quality = start();
  return { quality, ceiling: quality };
});

export function shiftQuality(step: 1 | -1) {
  useQuality.setState(({ quality, ceiling }) => {
    const index = Math.min(TIERS.indexOf(ceiling), Math.max(0, TIERS.indexOf(quality) + step));
    return { quality: TIERS[index] };
  });
}
