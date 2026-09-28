'use client';

import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { useEndGame } from '../store';
import { runtime } from './runtime';

const pad = (n: number) => String(n).padStart(2, '0');

// F2, like the game: the world pass alone (no HUD, no hand) saved as a PNG in your downloads
export function Screenshot() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    const take = () => {
      gl.render(scene, camera);
      gl.domElement.toBlob((blob) => {
        if (!blob) return;
        const now = new Date();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `minepanel-end-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.png`;
        link.click();
        URL.revokeObjectURL(link.href);
        useEndGame.getState().announce('screenshotSaved');
      });
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'F2') return;
      event.preventDefault();
      take();
    };
    runtime.hooks.screenshot = take;
    window.addEventListener('keydown', key);
    return () => {
      runtime.hooks.screenshot = null;
      window.removeEventListener('keydown', key);
    };
  }, [gl, scene, camera]);
  return null;
}
