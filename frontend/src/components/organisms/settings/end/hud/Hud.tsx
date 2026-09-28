'use client';

import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { cue } from '../end-audio';
import { formatRun } from '../run';
import { runtime } from '../engine/runtime';
import { useLore } from '../lore';
import { DRAGON_MAX_HP, useEndGame, type Advancement, type Caption } from '../store';
import { AdvancementBadge } from './AdvancementBadge';
import { Chat } from './Chat';
import { Hotbar } from './Hotbar';
import { Objectives } from './Objectives';
import { DeathScreen, PauseMenu, ResumePrompt } from './Screens';
import { Screamer } from './Screamer';
import { TouchControls } from './TouchControls';

// Heads-up display in the game's own grammar: boss bar, hearts and hotbar, crosshair,
// action bar, advancement toasts, chat and sound subtitles.

export const SHADOW = { textShadow: '2px 2px 0 rgba(0,0,0,0.8)' };

function BossBar() {
  const lore = useLore();
  const visible = useEndGame((state) => state.zone === 'end' && state.stage !== 'exit' && state.stage !== 'arrival' && !state.portalOpen);
  const hp = useEndGame((state) => state.dragonHp);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-12 z-20 flex justify-center px-4 md:top-3">
      <AnimatePresence>
        {visible && (
          <m.div className="w-[min(78vw,380px)] text-center" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="font-minecraft text-sm text-white" style={SHADOW}>
              {lore('bossName')}
            </p>
            <div
              role="progressbar"
              aria-label={lore('bossName')}
              aria-valuemin={0}
              aria-valuemax={DRAGON_MAX_HP}
              aria-valuenow={hp}
              className="mt-1 h-[10px] border-2 border-black/80 bg-[#2a0a26] shadow-[0_2px_0_rgba(0,0,0,0.5)]"
            >
              <div
                className="h-full bg-[linear-gradient(180deg,#ff9bf3_0%,#ea4fd8_45%,#b1269f_100%)] transition-[width] duration-500 ease-out"
                style={{ width: `${(hp / DRAGON_MAX_HP) * 100}%` }}
              />
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TitleCard() {
  const lore = useLore();
  const title = useEndGame((state) => state.title);
  const clear = useEndGame((state) => state.clearNotice);

  useEffect(() => {
    if (!title) return;
    const timer = window.setTimeout(() => clear('title', title.id), 4500);
    return () => window.clearTimeout(timer);
  }, [title, clear]);

  return (
    <AnimatePresence>
      {title && (
        <m.div
          key={title.id}
          className="pointer-events-none absolute inset-x-0 top-[26%] z-20 flex flex-col items-center gap-2 px-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.8 } }}
          exit={{ opacity: 0, transition: { duration: 1.2 } }}
        >
          <h2 className="font-minecraft text-5xl text-white md:text-7xl" style={{ textShadow: '4px 4px 0 rgba(0,0,0,0.6)' }}>
            {lore(title.key)}
          </h2>
          {title.subtitle && (
            <p className="font-minecraft text-lg text-fuchsia-200 md:text-2xl" style={SHADOW}>
              {lore(title.subtitle)}
            </p>
          )}
        </m.div>
      )}
    </AnimatePresence>
  );
}

function Toast({ toast }: { readonly toast: Advancement }) {
  const lore = useLore();
  const drop = useEndGame((state) => state.dropToast);

  useEffect(() => {
    cue('toast');
    const timer = window.setTimeout(() => drop(toast.id), 5000);
    return () => window.clearTimeout(timer);
  }, [toast.id, drop]);

  return (
    <m.div
      className="flex w-[240px] items-center gap-3 border-2 border-[#4b3f5c] bg-[#15111c]/95 px-3 py-2 shadow-[4px_4px_0_rgba(0,0,0,0.45)]"
      initial={{ x: 300 }}
      animate={{ x: 0 }}
      exit={{ x: 300 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
    >
      <AdvancementBadge icon={toast.icon} />
      <div className="min-w-0 text-left">
        <p className="font-minecraft text-[11px] text-[#ffff55]">{lore(toast.kind === 'goal' ? 'goalReached' : 'advancement')}</p>
        <p className="font-minecraft truncate text-sm text-white">{lore(toast.title)}</p>
      </div>
    </m.div>
  );
}

function Toasts() {
  const toasts = useEndGame((state) => state.toasts);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[5.25rem] z-30 flex flex-col items-center gap-2 overflow-hidden md:inset-x-auto md:right-5 md:top-16 md:items-end">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function CaptionLine({ caption }: { readonly caption: Caption }) {
  const lore = useLore();
  const drop = useEndGame((state) => state.dropCaption);

  useEffect(() => {
    const timer = window.setTimeout(() => drop(caption.id), 3000);
    return () => window.clearTimeout(timer);
  }, [caption.id, caption.at, drop]);

  return (
    <m.p className="bg-black/70 px-2 py-0.5 text-[11px] text-gray-100 md:text-xs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {lore(caption.key)}
    </m.p>
  );
}

function Captions() {
  const captions = useEndGame((state) => state.captions);
  return (
    <div className="pointer-events-none absolute bottom-[10rem] right-2 z-20 flex flex-col items-end gap-0.5 md:bottom-6 md:right-5">
      <AnimatePresence initial={false}>
        {captions.map((caption) => (
          <CaptionLine key={caption.id} caption={caption} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Crosshair() {
  const lore = useLore();
  const aim = useEndGame((state) => state.aim);
  const hidden = useEndGame((state) => Boolean(state.panel || state.dead || state.paused || state.zone === 'poem'));
  if (hidden) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div className="relative h-5 w-5 mix-blend-difference">
        <span className="absolute left-1/2 top-0 h-5 w-[2px] -translate-x-1/2 bg-white" />
        <span className="absolute left-0 top-1/2 h-[2px] w-5 -translate-y-1/2 bg-white" />
      </div>
      {aim && (
        <p className="absolute top-[calc(50%+18px)] font-minecraft text-xs text-white" style={SHADOW}>
          {lore(aim)}
        </p>
      )}
    </div>
  );
}

function DamageFlash() {
  const hurtAt = useEndGame((state) => state.hurtAt);
  const [flash, setFlash] = useState(0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setFlash((value) => value + 1);
  }, [hurtAt]);

  return (
    <AnimatePresence>
      {flash > 0 && (
        <m.div
          key={flash}
          className="pointer-events-none absolute inset-0 z-10"
          style={{ boxShadow: 'inset 0 0 160px 40px rgba(200,0,0,0.55)' }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      )}
    </AnimatePresence>
  );
}

function NoiseMeter() {
  const lore = useLore();
  const noise = useEndGame((state) => state.noise);
  const visible = useEndGame((state) => state.zone === 'ancient');
  if (!visible) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-12 z-20 w-[min(60vw,220px)] -translate-x-1/2 text-center md:top-4">
      <p className="font-minecraft text-[11px] text-cyan-200" style={SHADOW}>
        {lore('noise')}
      </p>
      <div className="mt-1 h-2 border border-black/80 bg-black/60">
        <div className="h-full bg-[linear-gradient(90deg,#0f5c6b,#29dfeb)] transition-[width] duration-300" style={{ width: `${Math.min(100, noise)}%` }} />
      </div>
    </div>
  );
}

function ActionBar() {
  const lore = useLore();
  const notice = useEndGame((state) => state.actionBar);
  const clear = useEndGame((state) => state.clearNotice);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => clear('actionBar', notice.id), 4200);
    return () => window.clearTimeout(timer);
  }, [notice, clear]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[5.5rem] z-20 flex min-h-6 items-end justify-center px-4 md:bottom-[6.5rem]">
      <AnimatePresence mode="wait">
        {notice && (
          <m.p
            key={notice.id}
            className="font-minecraft text-center text-sm text-white"
            style={SHADOW}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {lore(notice.key)}
          </m.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// the speedrun and hardcore clock, drawn straight from the game loop's play time
function RunTimer() {
  const timed = useEndGame((state) => state.mode === 'speedrun' || state.mode === 'hardcore');
  const finishedAt = useEndGame((state) => state.finishedAt);
  const text = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!timed) return;
    let frame = 0;
    const tick = () => {
      if (text.current) text.current.textContent = formatRun(finishedAt ?? runtime.playTime * 1000);
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [timed, finishedAt]);
  if (!timed) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-12 z-[41] -translate-x-1/2 font-mono text-lg tabular-nums text-white" style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.8)' }}>
      <span ref={text} className={finishedAt === null ? undefined : 'text-emerald-300'} />
    </div>
  );
}

export function Hud({ onClose }: { readonly onClose: () => void }) {
  return (
    <>
      <DamageFlash />
      <Screamer />
      <BossBar />
      <RunTimer />
      <NoiseMeter />
      <Objectives />
      <TitleCard />
      <Toasts />
      <Captions />
      <Chat />
      <Crosshair />
      <ActionBar />
      <Hotbar />
      <TouchControls />
      <DeathScreen onClose={onClose} />
      <PauseMenu onClose={onClose} />
      <ResumePrompt />
    </>
  );
}
