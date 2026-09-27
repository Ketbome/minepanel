'use client';

import { useEffect, useRef } from 'react';
import { MAP, OVERWORLD_RADIUS } from '../acts/overworld-layout';
import { runtime } from '../engine/runtime';
import type { BlockId } from '../engine/world';
import { useLore } from '../lore';
import { useEndGame } from '../store';
import { PanelWindow } from './PanelWindow';

const SCALE = 2;
const COLORS: Partial<Record<BlockId, string>> = {
  grass: '#6aa33c',
  dirt: '#976d4d',
  path: '#a8894f',
  water: '#3c68d6',
  leaves: '#3f7a26',
  log: '#6b5033',
  planks: '#b8945f',
  cobble: '#7a7a7a',
  stone: '#7f7f7f',
  glass: '#a6d3dc',
  hay: '#d6b43b',
  obsidian: '#1d1528',
  crying: '#5a1f9e',
  netherrack: '#7c3030',
  goldBlock: '#f5d33a',
  sand: '#dbd3a0',
  sandstone: '#d8cf98',
  snowyGrass: '#eef5f8',
  snow: '#f4fafc',
  ice: '#96bfff',
  spruceLog: '#3b2a19',
  spruceLeaves: '#2e5a2e',
  cactus: '#5d8a2a',
  tnt: '#c83c2a',
};

// A top-down map of the Overworld, drawn from the same blocks you walk on, with the places the
// librarian marked for you. Like the game's maps, it only works in the dimension it was made in.
export function MapPanel() {
  const lore = useLore();
  const zone = useEndGame((state) => state.zone);
  const canvas = useRef<HTMLCanvasElement>(null);
  const size = OVERWORLD_RADIUS * 2 + 1;

  useEffect(() => {
    const world = runtime.world;
    const ctx = canvas.current?.getContext('2d');
    if (zone !== 'overworld' || !world || !ctx) return;
    ctx.fillStyle = '#d9c9a0';
    ctx.fillRect(0, 0, size * SCALE, size * SCALE);
    let previous = new Array<number>(size).fill(0);
    for (let z = -OVERWORLD_RADIUS; z <= OVERWORLD_RADIUS; z += 1) {
      const heights = new Array<number>(size).fill(0);
      for (let x = -OVERWORLD_RADIUS; x <= OVERWORLD_RADIUS; x += 1) {
        for (let y = 24; y >= -4; y -= 1) {
          const id = world.get(x, y, z);
          const color = id && COLORS[id];
          if (!color) continue;
          const column = x + OVERWORLD_RADIUS;
          heights[column] = y;
          // relief: a column higher than the one north of it is lit, lower is shaded
          const slope = y - previous[column];
          ctx.fillStyle = color;
          ctx.fillRect(column * SCALE, (z + OVERWORLD_RADIUS) * SCALE, SCALE, SCALE);
          if (slope !== 0) {
            ctx.fillStyle = slope > 0 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.2)';
            ctx.fillRect(column * SCALE, (z + OVERWORLD_RADIUS) * SCALE, SCALE, SCALE);
          }
          break;
        }
      }
      previous = heights;
    }
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    MAP.forEach(({ x, z, mark, color }) => {
      const px = (x + OVERWORLD_RADIUS) * SCALE;
      const py = (z + OVERWORLD_RADIUS) * SCALE;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(px - 7, py - 7, 14, 14);
      ctx.fillStyle = color;
      ctx.fillText(mark, px, py + 1);
    });
    const { pos, yaw } = runtime.player;
    const px = (pos.x + OVERWORLD_RADIUS) * SCALE;
    const py = (pos.z + OVERWORLD_RADIUS) * SCALE;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-yaw);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, [zone, size]);

  return (
    <PanelWindow title={lore('itemMap')} wide>
      {zone === 'overworld' ? (
        <div className="flex flex-col items-center gap-2">
          <canvas
            ref={canvas}
            width={size * SCALE}
            height={size * SCALE}
            className="max-h-[60vh] w-auto max-w-full border-4 border-[#8a6a3f] [image-rendering:pixelated]"
            aria-label={lore('itemMap')}
          />
          <p className="text-[11px] text-gray-400">{lore('mapLegend')}</p>
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-gray-300">{lore('mapNoSignal')}</p>
      )}
    </PanelWindow>
  );
}
