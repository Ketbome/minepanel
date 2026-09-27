'use client';

import { ArrowDown, Backpack, ChevronsUp, Footprints, Hand, Pause, Sword } from 'lucide-react';
import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { input, pressLeft, pressRight } from '../engine/input';
import { useLore } from '../lore';
import { useEndGame } from '../store';

const LOOK_SPEED = 2.2;
const STICK_RADIUS = 48;

function HoldButton({ label, onDown, onUp, children, className = '' }: { readonly label: string; readonly onDown: () => void; readonly onUp: () => void; readonly children: ReactNode; readonly className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`mc-slot pointer-events-auto flex h-14 w-14 touch-none select-none items-center justify-center text-xs font-bold text-white active:brightness-150 [&_svg]:size-5 ${className}`}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        onDown();
      }}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {children}
    </button>
  );
}

// Left thumb: a joystick that appears where you touch. Right side: drag to look, plus buttons
// for jump, attack, use, sneak, sprint, inventory and pause.
export function TouchControls() {
  const lore = useLore();
  const playing = useEndGame((state) => !state.panel && !state.dead && !state.paused && state.zone !== 'poem');
  const [stick, setStick] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const [sneak, setSneak] = useState(false);
  const [sprint, setSprint] = useState(false);
  const look = useRef<{ id: number; x: number; y: number } | null>(null);

  if (!input.touch || !playing) return null;

  const moveStick = (event: ReactPointerEvent) => {
    if (!stick) return;
    const dx = event.clientX - stick.x;
    const dy = event.clientY - stick.y;
    const distance = Math.hypot(dx, dy);
    const k = distance > STICK_RADIUS ? STICK_RADIUS / distance : 1;
    setStick({ ...stick, dx: dx * k, dy: dy * k });
    input.stickX = (dx * k) / STICK_RADIUS;
    input.stickY = (dy * k) / STICK_RADIUS;
  };
  const endStick = () => {
    setStick(null);
    input.stickX = 0;
    input.stickY = 0;
  };

  return (
    <div className="absolute inset-0 z-[25] touch-none select-none">
      <div
        className="absolute bottom-0 left-0 top-1/3 w-1/2"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setStick({ x: event.clientX, y: event.clientY, dx: 0, dy: 0 });
        }}
        onPointerMove={moveStick}
        onPointerUp={endStick}
        onPointerCancel={endStick}
      >
        {stick && (
          <div className="pointer-events-none absolute h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30 bg-black/20" style={{ left: stick.x, top: stick.y }}>
            <div className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full bg-white/40" style={{ transform: `translate(calc(-50% + ${stick.dx}px), calc(-50% + ${stick.dy}px))` }} />
          </div>
        )}
      </div>
      <div
        className="absolute bottom-0 right-0 top-0 w-1/2"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          look.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        }}
        onPointerMove={(event) => {
          if (look.current?.id !== event.pointerId) return;
          input.dx += (event.clientX - look.current.x) * LOOK_SPEED;
          input.dy += (event.clientY - look.current.y) * LOOK_SPEED;
          look.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        }}
        onPointerUp={() => {
          look.current = null;
        }}
        onPointerCancel={() => {
          look.current = null;
        }}
      />
      <div className="pointer-events-none absolute bottom-28 right-3 grid grid-cols-2 gap-2">
        <HoldButton label={lore('touchAttack')} onDown={() => pressLeft(true)} onUp={() => pressLeft(false)}>
          <Sword />
        </HoldButton>
        <HoldButton label={lore('touchUse')} onDown={() => pressRight(true)} onUp={() => pressRight(false)}>
          <Hand />
        </HoldButton>
        <HoldButton
          label={lore('touchJump')}
          onDown={() => {
            input.touchJump = true;
            input.jumpPressed = true;
          }}
          onUp={() => {
            input.touchJump = false;
          }}
          className="col-span-2 w-full"
        >
          <ChevronsUp />
        </HoldButton>
      </div>
      <div className="pointer-events-none absolute right-3 top-14 flex flex-col gap-2">
        <HoldButton label={lore('touchPause')} onDown={() => useEndGame.getState().setPaused(true)} onUp={() => {}}>
          <Pause />
        </HoldButton>
        <HoldButton label={lore('touchInventory')} onDown={() => useEndGame.getState().openPanel({ kind: 'inventory' })} onUp={() => {}}>
          <Backpack />
        </HoldButton>
        <HoldButton
          label={lore('touchSneak')}
          onDown={() => {
            input.touchSneak = !sneak;
            setSneak(!sneak);
          }}
          onUp={() => {}}
          className={sneak ? 'mc-slot--active' : ''}
        >
          <ArrowDown />
        </HoldButton>
        <HoldButton
          label={lore('touchSprint')}
          onDown={() => {
            input.touchSprint = !sprint;
            setSprint(!sprint);
          }}
          onUp={() => {}}
          className={sprint ? 'mc-slot--active' : ''}
        >
          <Footprints />
        </HoldButton>
      </div>
    </div>
  );
}
