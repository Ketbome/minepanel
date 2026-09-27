'use client';

import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useEndGame } from '../store';

const SHOW_MS = 900;

// The Rake's face, 16x16, filling the screen for the moment you look at it
const FACE = [
  '................',
  '...pppppppppp...',
  '..pppppppppppp..',
  '.pprrppppppprrp.',
  '.pkkkppppppkkkp.',
  '.pkkkkppppkkkkp.',
  '.pkwkkppppkkwkp.',
  '.pkkkkppppkkkkp.',
  '.prkkrppppkkrrp.',
  '.pprkppkkppkrpp.',
  '.pmmmmmmmmmmmmp.',
  '.mtmtmtmtmtmtmm.',
  '.mmmmmmmmmmmmmm.',
  '.mtmmtmmtmmtmtm.',
  '..mmmmmmmmmmmm..',
  '...pppppppppp...',
];
const COLORS: Record<string, string> = { p: '#cfcfc6', r: '#9d9d94', k: '#050505', w: '#ffffff', m: '#1a0303', t: '#e9e4d2' };

export function Screamer() {
  const scaredAt = useEndGame((state) => state.scaredAt);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!scaredAt) return;
    setShown(scaredAt);
    const timer = window.setTimeout(() => setShown(0), SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [scaredAt]);

  return (
    <AnimatePresence>
      {shown > 0 && (
        <m.div key={shown} className="pointer-events-none absolute inset-0 z-[44] flex items-center justify-center bg-[radial-gradient(circle,#2a0000_0%,#000_70%)]" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}>
          <m.svg
            viewBox="0 0 16 16"
            className="h-[95vmin] w-[95vmin]"
            shapeRendering="crispEdges"
            aria-hidden
            initial={{ scale: 0.6 }}
            animate={{ scale: [0.6, 1.15, 1.05, 1.12], x: [0, -14, 12, -10, 8, 0], y: [0, 10, -12, 8, -6, 0] }}
            transition={{ duration: SHOW_MS / 1000, ease: 'easeOut' }}
          >
            {FACE.flatMap((row, y) => [...row].map((cell, x) => (cell === '.' ? null : <rect key={`${x}:${y}`} x={x} y={y} width={1} height={1} fill={COLORS[cell]} />)))}
          </m.svg>
        </m.div>
      )}
    </AnimatePresence>
  );
}
