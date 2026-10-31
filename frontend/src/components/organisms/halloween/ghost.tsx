'use client';

import { useEffect, useRef, useState } from 'react';
import { Voxel } from './voxel';

type Pose = 'ghost' | 'ghostPeek' | 'ghostCover';

// Beside the login form: it watches the pointer, then covers its eyes while you type a
// password (and only peeks while the field is still empty).
export function Ghost() {
  const ref = useRef<HTMLDivElement>(null);
  const [pose, setPose] = useState<Pose>('ghost');

  useEffect(() => {
    const el = ref.current;
    const password = () => {
      const active = document.activeElement;
      if (!(active instanceof HTMLInputElement) || active.type !== 'password') return setPose('ghost');
      setPose(active.value ? 'ghostCover' : 'ghostPeek');
    };
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!el) return;
        const box = el.getBoundingClientRect();
        const dx = e.clientX - (box.left + box.width / 2);
        const dy = e.clientY - (box.top + box.height * 0.4);
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
    <div ref={ref} className="hw-ghost pointer-events-none" aria-hidden="true">
      <Voxel name={pose} className="h-auto w-full" />
    </div>
  );
}

const BATS = [
  { left: '8%', top: '16%', width: 120, delay: '0s' },
  { left: '80%', top: '24%', width: 96, delay: '-2.4s' },
  { left: '18%', top: '70%', width: 84, delay: '-4.1s' },
  { left: '74%', top: '74%', width: 108, delay: '-1.2s' },
];

// the login page's drifting blocks become bats for the season
export function Bats() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {BATS.map(({ delay, width, ...at }) => (
        <div key={at.left} className="hw-bat opacity-80" style={{ ...at, width, animationDelay: delay }}>
          <div className="hw-frames is-moving relative" style={{ ['--flap' as string]: delay }}>
            <Voxel name="bat" />
            <Voxel name="batFlap" />
          </div>
        </div>
      ))}
    </div>
  );
}
