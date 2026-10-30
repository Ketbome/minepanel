'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { anchorAt, Cobweb, Voxel } from './voxel';

const CLIMB_MS = 3500;

// Hung from the dashboard header: a lantern that sways and lights what is under it, a web in
// the corner, and a spider that climbs its thread when the pointer gets close.
export function HeaderDecor() {
  const [up, setUp] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const climb = () => {
    if (up) return;
    setUp(true);
    timer.current = window.setTimeout(() => setUp(false), CLIMB_MS);
  };

  return (
    <>
      <Cobweb className="hw-cobweb" />
      <div className={cn('hw-spider right-6 hidden xl:block', up && 'is-up')} style={{ ['--drop' as string]: '72px' }}>
        <div className="hw-spider__thread" />
        <div className="hw-spider__body" onPointerEnter={climb} style={{ width: 40 }}>
          <div className={cn('hw-frames relative', up && 'is-moving')}>
            <Voxel name="spider" />
            <Voxel name="spiderStep" />
          </div>
        </div>
      </div>
    </>
  );
}

export function Lantern() {
  return (
    <div className="hw-lantern pointer-events-none relative hidden h-14 w-7 shrink-0 self-start sm:block" aria-hidden="true">
      <span className="hw-glow" style={{ ...anchorAt('lantern', 'flame'), width: 220, height: 220 }} />
      <Voxel name="lantern" className="hw-lit relative h-full w-full" />
    </div>
  );
}
