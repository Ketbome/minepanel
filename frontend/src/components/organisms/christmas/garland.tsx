'use client';

import { Voxel } from './voxel';

const COLORS = ['bulbRed', 'bulbGold', 'bulbGreen', 'bulbBlue'] as const;
const GAP = 56;
// enough for a 2560px header; the rest is clipped
const BULBS = Array.from({ length: 46 }, (_, i) => i);

// String lights along the bottom of the dashboard header, each bulb on its own slow twinkle
export function Garland() {
  return (
    <div className="xm-garland" aria-hidden="true">
      {BULBS.map((i) => (
        <span
          key={i}
          className="xm-bulb"
          style={{ left: i * GAP + GAP / 2, animationDelay: `${-((i * 7) % 11) * 0.41}s`, animationDuration: `${3.2 + (i % 5) * 0.7}s` }}
        >
          <Voxel name={COLORS[i % COLORS.length]} />
        </span>
      ))}
    </div>
  );
}
