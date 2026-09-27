'use client';

import { m } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { create } from 'zustand';
import { ItemIcon, ITEMS, type Slot } from '../items';
import { useLore } from '../lore';
import { useEndGame, type Area, type Button } from '../store';

// The in-game windows share one frame: a stone panel over a dimmed scene. While one is open
// the pointer lock is released and the player stands still.
export function PanelWindow({ title, children, wide = false }: { readonly title: string; readonly children: ReactNode; readonly wide?: boolean }) {
  const lore = useLore();
  const close = useEndGame((state) => state.closePanel);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    box.current?.focus({ preventScroll: true });
  }, []);

  return (
    <m.div
      className="absolute inset-0 z-[38] flex items-center justify-center overflow-y-auto bg-black/55 p-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <m.div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`mc-panel w-full outline-none ${wide ? 'max-w-lg' : 'max-w-md'}`}
        initial={{ scale: 0.96, y: 8 }}
        animate={{ scale: 1, y: 0 }}
      >
        <div className="mc-titlebar flex items-center justify-between gap-3 px-3 py-2">
          <h2 className="font-minecraft text-sm text-gray-100">{title}</h2>
          <button
            type="button"
            aria-label={lore('close')}
            title={lore('close')}
            onClick={close}
            className="flex h-7 w-7 items-center justify-center text-gray-300 hover:text-white focus-visible:outline-2 focus-visible:outline-emerald-400 [&_svg]:size-4"
          >
            <X />
          </button>
        </div>
        <div className="p-3">{children}</div>
      </m.div>
      <HeldStack />
    </m.div>
  );
}

// the stack you are carrying rides under the mouse pointer, as in the game
function HeldStack() {
  const cursor = useEndGame((state) => state.cursor);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const move = (event: PointerEvent) => setAt({ x: event.clientX, y: event.clientY });
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerdown', move);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', move);
    };
  }, []);
  if (!cursor || !at) return null;
  return (
    <div className="pointer-events-none fixed z-[60] h-9 w-9 -translate-x-1/2 -translate-y-1/2 sm:h-10 sm:w-10" style={{ left: at.x, top: at.y }}>
      <ItemIcon item={cursor.item} className="h-full w-full drop-shadow-[2px_2px_0_rgba(0,0,0,0.6)]" />
      {cursor.count > 1 && <span className="mc-count absolute -bottom-1 right-0 text-[11px]">{cursor.count}</span>}
    </div>
  );
}

// A held stack dragged across slots of one area is shared out when the button comes up.
const useDrag = create<{ active: boolean; button: Button; area: Area; indices: number[] }>(() => ({ active: false, button: 'left', area: 'inv', indices: [] }));

function endDrag() {
  const drag = useDrag.getState();
  if (!drag.active) return;
  const game = useEndGame.getState();
  if (drag.indices.length === 1) game.clickSlot(drag.area, drag.indices[0], drag.button, false);
  else game.spread(drag.area, drag.indices, drag.button);
  useDrag.setState({ active: false, indices: [] });
}

if (typeof window !== 'undefined') window.addEventListener('pointerup', endDrag);

const LONG_PRESS_MS = 420;

// One slot of a live container: left and right clicks, shift-clicks, drags, and on touch a tap
// for the left button and a long press for the right one.
export function InvSlot({ area, index }: { readonly area: Area; readonly index: number }) {
  const slot = useEndGame((state) => (area === 'grid' ? state.grid : area === 'chest' && state.panel?.kind === 'chest' ? state.chests[state.panel.id] : state.inventory)[index]);
  const dragged = useDrag((state) => state.active && state.area === area && state.indices.includes(index));
  const lore = useLore();
  const press = useRef(0);

  const down = (event: ReactPointerEvent, button: Button) => {
    const game = useEndGame.getState();
    if (event.shiftKey) {
      game.clickSlot(area, index, button, true);
      return;
    }
    if (game.cursor) useDrag.setState({ active: true, button, area, indices: [index] });
    else game.clickSlot(area, index, button, false);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={slot ? `${lore(ITEMS[slot.item].name)} ×${slot.count}` : lore('emptySlot')}
      title={slot ? lore(ITEMS[slot.item].name) : undefined}
      className={`mc-slot relative flex h-8 w-8 shrink-0 cursor-pointer touch-none items-center justify-center p-1 hover:brightness-125 sm:h-10 sm:w-10 ${dragged ? 'mc-slot--active' : ''}`}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (event.pointerType === 'touch') {
          // on touch the button is decided by how long you hold
          window.clearTimeout(press.current);
          press.current = window.setTimeout(() => {
            press.current = -1;
            down(event, 'right');
            endDrag();
          }, LONG_PRESS_MS);
          return;
        }
        down(event, event.button === 2 ? 'right' : 'left');
      }}
      onPointerUp={(event) => {
        if (event.pointerType !== 'touch' || press.current < 0) return;
        window.clearTimeout(press.current);
        down(event, 'left');
        endDrag();
      }}
      onPointerEnter={() => {
        const drag = useDrag.getState();
        if (drag.active && drag.area === area && !drag.indices.includes(index)) useDrag.setState({ indices: [...drag.indices, index] });
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') useEndGame.getState().clickSlot(area, index, 'left', event.shiftKey);
      }}
    >
      {slot && <ItemIcon item={slot.item} className="pointer-events-none h-full w-full" />}
      {slot && slot.count > 1 && <span className="mc-count pointer-events-none absolute bottom-0 right-0.5 text-[10px] sm:text-[11px]">{slot.count}</span>}
    </div>
  );
}

interface ItemSlotProps {
  readonly slot: Slot;
  readonly active?: boolean;
  readonly large?: boolean;
  readonly disabled?: boolean;
  readonly onClick?: () => void;
}

export function ItemSlot({ slot, active = false, large = false, disabled = false, onClick }: ItemSlotProps) {
  const lore = useLore();
  const name = slot ? `${lore(ITEMS[slot.item].name)}${slot.count > 1 ? ` ×${slot.count}` : ''}` : lore('emptySlot');
  const size = large ? 'h-12 w-12 sm:h-14 sm:w-14' : 'h-8 w-8 sm:h-10 sm:w-10';
  const className = `mc-slot relative flex shrink-0 items-center justify-center p-1 ${size} ${active ? 'mc-slot--active' : ''}`;
  const content = slot && (
    <>
      <ItemIcon item={slot.item} className="h-full w-full" />
      {slot.count > 1 && <span className="mc-count absolute bottom-0 right-0.5 text-[10px] sm:text-[11px]">{slot.count}</span>}
    </>
  );
  if (!onClick) {
    return (
      <div className={className} title={slot ? name : undefined}>
        {content}
      </div>
    );
  }
  return (
    <button
      type="button"
      aria-label={name}
      title={name}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`${className} cursor-pointer hover:brightness-125 focus-visible:outline-2 focus-visible:outline-emerald-400 disabled:cursor-default disabled:hover:brightness-100`}
    >
      {content}
    </button>
  );
}

// the player's 27 backpack slots above the 9 hotbar slots, like the game's inventory
export function InventoryGrid() {
  const lore = useLore();
  return (
    <div className="mt-3">
      <p className="mb-1 text-[11px] uppercase tracking-[0.08em] text-gray-500">{lore('inventory')}</p>
      <div className="grid w-fit grid-cols-9 gap-[3px]">
        {Array.from({ length: 27 }, (_, index) => (
          <InvSlot key={index} area="inv" index={index + 9} />
        ))}
      </div>
      <div className="mt-2 grid w-fit grid-cols-9 gap-[3px]">
        {Array.from({ length: 9 }, (_, index) => (
          <InvSlot key={index} area="inv" index={index} />
        ))}
      </div>
    </div>
  );
}
