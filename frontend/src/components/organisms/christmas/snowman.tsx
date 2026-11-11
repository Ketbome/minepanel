'use client';

import { useEffect, useRef, useState } from 'react';
import { Voxel } from './voxel';

type Pose = 'snowman' | 'snowmanPeek' | 'snowmanCover';

// Beside the login form: it watches the pointer, then pulls its hat over its eyes while you
// type a password (over one eye while the field is still empty).
export function Snowman() {
  const ref = useRef<HTMLDivElement>(null);
  const [pose, setPose] = useState<Pose>('snowman');

  useEffect(() => {
    const el = ref.current;
    const password = () => {
      const active = document.activeElement;
      if (!(active instanceof HTMLInputElement) || active.type !== 'password') return setPose('snowman');
      setPose(active.value ? 'snowmanCover' : 'snowmanPeek');
    };
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!el) return;
        const box = el.getBoundingClientRect();
        const dx = e.clientX - (box.left + box.width / 2);
        const dy = e.clientY - (box.top + box.height * 0.3);
        const len = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, len / 260);
        el.style.setProperty('--lx', `${(dx / len) * reach * 0.9}px`);
        el.style.setProperty('--ly', `${(dy / len) * reach * 0.6}px`);
      });
    };
    document.addEventListener('focusin', password);
    document.addEventListener('focusout', password);
    document.addEventListener('input', password);
    window.addEventListener('pointermove', onMove);
    return () => {
      document.removeEventListener('focusin', password);
      document.removeEventListener('focusout', password);
      document.removeEventListener('input', password);
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className="xm-snowman pointer-events-none" aria-hidden="true">
      <Voxel name={pose} className="h-auto w-full" />
    </div>
  );
}
