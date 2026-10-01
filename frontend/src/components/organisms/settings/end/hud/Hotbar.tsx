'use client';

import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useState } from 'react';
import { armorPoints, ItemIcon, ITEMS } from '../items';
import { useLore } from '../lore';
import { MAX_HP, useEndGame } from '../store';

const OUTLINE = { textShadow: '1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000' };
const SHADOW = { textShadow: '2px 2px 0 rgba(0,0,0,0.8)' };
const MAX_LEVEL = 68;

// a 9x9 pixel heart; `fill` is 0 (empty), 0.5 or 1
const HEART_ROWS = ['.XX...XX.', 'XRRX.XRRX', 'XRWRXRRRX', 'XRRRRRRRX', 'XRRRRRRRX', '.XRRRRRX.', '..XRRRX..', '...XRX...', '....X....'];
// hardcore hearts, like the game's: the same heart with a pair of dark eyes
const HARDCORE_ROWS = ['.XX...XX.', 'XRRX.XRRX', 'XRWRXRRRX', 'XRERRRERX', 'XRRRRRRRX', '.XRRRRRX.', '..XRRRX..', '...XRX...', '....X....'];

function Heart({ fill, flash, hardcore }: { readonly fill: number; readonly flash: boolean; readonly hardcore: boolean }) {
  return (
    <svg viewBox="0 0 9 9" className="h-3.5 w-3.5 sm:h-4 sm:w-4" shapeRendering="crispEdges" aria-hidden>
      {(hardcore ? HARDCORE_ROWS : HEART_ROWS).flatMap((row, y) =>
        [...row].map((cell, x) => {
          if (cell === '.') return null;
          const inside = cell !== 'X';
          const lit = inside && (fill >= 1 || (fill >= 0.5 && x < 5));
          const color = cell === 'X' ? (flash ? '#ffffff' : '#1a0000') : lit ? (cell === 'W' ? '#ffb3b3' : cell === 'E' ? '#4a0000' : '#e01818') : '#3a0d0d';
          return <rect key={`${x}:${y}`} x={x} y={y} width={1} height={1} fill={color} />;
        })
      )}
    </svg>
  );
}

function Hearts() {
  const hp = useEndGame((state) => state.hp);
  const hurtAt = useEndGame((state) => state.hurtAt);
  const hardcore = useEndGame((state) => state.mode === 'hardcore');
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    setFlash(true);
    const timer = window.setTimeout(() => setFlash(false), 300);
    return () => window.clearTimeout(timer);
  }, [hurtAt]);

  return (
    <div className="flex gap-[1px]" role="meter" aria-valuemin={0} aria-valuemax={MAX_HP} aria-valuenow={hp}>
      {Array.from({ length: MAX_HP / 2 }, (_, index) => (
        <m.div key={index} animate={hp <= 4 ? { y: [0, -1.5, 0] } : { y: 0 }} transition={{ repeat: hp <= 4 ? Infinity : 0, duration: 0.3, delay: index * 0.03 }}>
          <Heart fill={Math.max(0, Math.min(1, (hp - index * 2) / 2))} flash={flash} hardcore={hardcore} />
        </m.div>
      ))}
    </div>
  );
}

// the game's chestplate icons: each is two armor points, an odd point shows half of one
const ARMOR_ROWS = ['.XXX.XXX.', 'XWWXXXWWX', 'XWGGGGGWX', 'XXGGGGGXX', '.XGGGGGX.', '.XGGGGGX.', '.XGGGGGX.', '.XGGGGGX.', '.XXXXXXX.'];

function Armor() {
  const lore = useLore();
  const points = useEndGame((state) => armorPoints(state.armor));
  if (!points) return null;
  return (
    <div className="flex" role="img" aria-label={lore('armor')}>
      {Array.from({ length: Math.ceil(points / 2) }, (_, index) => {
        const half = points - index * 2 === 1;
        return (
          <svg key={index} viewBox="0 0 9 9" className="h-3.5 w-3.5 sm:h-4 sm:w-4" shapeRendering="crispEdges" aria-hidden>
            {ARMOR_ROWS.flatMap((row, y) =>
              [...row].map((cell, x) =>
                cell === '.' ? null : <rect key={`${x}:${y}`} x={x} y={y} width={1} height={1} fill={cell === 'X' ? '#1a1a1a' : half && x >= 5 ? '#4a4a4a' : cell === 'W' ? '#ffffff' : '#c6c6c6'} />
              )
            )}
          </svg>
        );
      })}
    </div>
  );
}

// the name of the item you just switched to floats above the hotbar for a moment
function HeldName() {
  const lore = useLore();
  const selected = useEndGame((state) => state.selected);
  const item = useEndGame((state) => state.inventory[state.selected]?.item);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    setShown((value) => value + 1);
  }, [selected, item]);

  return (
    <div className="h-4">
      <AnimatePresence>
        {item && (
          <m.p
            key={shown}
            className="font-minecraft text-center text-xs text-white"
            style={SHADOW}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ delay: 1.6, duration: 0.6 }}
          >
            {lore(ITEMS[item].name)}
          </m.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Hotbar() {
  const inventory = useEndGame((state) => state.inventory);
  const selected = useEndGame((state) => state.selected);
  const xp = useEndGame((state) => state.xp);
  const levels = xp * MAX_LEVEL;
  const level = Math.floor(levels);
  const progress = xp >= 1 ? 1 : levels - level;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex flex-col items-center gap-1 md:bottom-5">
      <HeldName />
      <div className="flex w-[min(92vw,396px)] flex-col items-start gap-0.5">
        <Armor />
        <Hearts />
      </div>
      <div className="relative w-[min(92vw,396px)]">
        {level > 0 && (
          <span className="mc-count absolute -top-4 left-1/2 -translate-x-1/2 text-sm text-[#80ff20]" style={OUTLINE}>
            {level}
          </span>
        )}
        <div className="h-[6px] border border-black/80 bg-black/60">
          <div className="h-full bg-[#80ff20] transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
      <div className="flex gap-[3px]">
        {inventory.slice(0, 9).map((slot, index) => (
          <div key={index} className={`mc-slot relative flex h-8 w-8 items-center justify-center p-1 sm:h-10 sm:w-10 ${index === selected ? 'mc-slot--active' : ''}`}>
            {slot && <ItemIcon item={slot.item} className="h-full w-full" />}
            {slot && slot.count > 1 && <span className="mc-count absolute bottom-0 right-0.5 text-[10px] sm:text-[11px]">{slot.count}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
