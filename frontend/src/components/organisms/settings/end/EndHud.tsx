'use client';

import Image from 'next/image';
import { AnimatePresence, m } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { useLanguage } from '@/lib/hooks/useLanguage';
import type { TranslationKey } from '@/lib/translations';
import { cue } from './end-audio';
import { CRYSTAL_COUNT, DRAGON_MAX_HP, EYE_COUNT, useEndGame, type Advancement, type AdvancementIcon, type Caption } from './end-game-store';
import { DragonEggIcon, DragonHeadIcon, EyeOfEnderIcon } from './PixelIcons';

// Heads-up display in the game's own grammar: boss bar, hotbar with an XP bar,
// action bar, advancement toasts, chat announcements and sound subtitles.

const SHADOW = { textShadow: '2px 2px 0 rgba(0,0,0,0.8)' };
const OUTLINE = { textShadow: '1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000' };
const MAX_LEVEL = 68;

function AdvancementBadge({ icon }: { readonly icon: AdvancementIcon }) {
  if (icon === 'eye') return <EyeOfEnderIcon className="h-7 w-7" />;
  if (icon === 'egg') return <DragonEggIcon className="h-7 w-7" />;
  if (icon === 'dragon') return <DragonHeadIcon className="h-7 w-7" />;
  return <Image src="/images/ender-pearl.webp" alt="" width={28} height={28} className="pixelated h-7 w-7 object-contain" />;
}

function BossBar() {
  const { t } = useLanguage();
  const act = useEndGame((state) => state.act);
  const stage = useEndGame((state) => state.stage);
  const hp = useEndGame((state) => state.dragonHp);
  const portalOpen = useEndGame((state) => state.portalOpen);
  const visible = act === 'end' && stage !== 'exit' && !portalOpen;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-12 z-20 flex justify-center px-4 md:top-3">
      <AnimatePresence>
        {visible && (
          <m.div className="w-[min(78vw,380px)] text-center" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="font-minecraft text-sm text-white" style={SHADOW}>
              {t('dangerEggBossName')}
            </p>
            <div
              role="progressbar"
              aria-label={t('dangerEggBossName')}
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

function Objectives() {
  const { t } = useLanguage();
  const act = useEndGame((state) => state.act);
  const stage = useEndGame((state) => state.stage);
  const crystals = useEndGame((state) => state.crystals);
  const portalOpen = useEndGame((state) => state.portalOpen);
  const eggCaught = useEndGame((state) => state.eggCaught);
  if (act !== 'end' || stage === 'arrival') return null;

  const broken = CRYSTAL_COUNT - crystals.filter(Boolean).length;
  const slain = stage === 'victory' || stage === 'exit';
  const rows: { key: TranslationKey; done: boolean; count?: string }[] = [
    { key: 'dangerEggObjCrystals', done: broken === CRYSTAL_COUNT, count: `${broken}/${CRYSTAL_COUNT}` },
    { key: 'dangerEggObjDragon', done: slain },
  ];
  if (portalOpen) rows.push({ key: 'dangerEggObjEgg', done: eggCaught }, { key: 'dangerEggObjPortal', done: stage === 'exit' });

  return (
    <m.div
      className="mc-panel pointer-events-none absolute left-2 top-[9.5rem] z-20 w-[min(60vw,250px)] px-3 py-2 md:left-5 md:top-5"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <p className="font-minecraft text-[11px] text-fuchsia-300">{t('dangerEggObjectives')}</p>
      <ul className="mt-1.5 space-y-1.5">
        {rows.map((row) => (
          <li key={row.key} className={`flex items-start gap-2 text-xs ${row.done ? 'text-gray-500 line-through' : 'text-gray-100'}`}>
            <span className={`mt-[3px] h-2.5 w-2.5 shrink-0 border-2 ${row.done ? 'border-emerald-400 bg-emerald-400' : 'border-gray-400'}`} />
            <span className="flex-1">{t(row.key)}</span>
            {row.count && <span className="font-mono text-[11px] tabular-nums text-fuchsia-300">{row.count}</span>}
          </li>
        ))}
      </ul>
    </m.div>
  );
}

function TitleCard() {
  const { t } = useLanguage();
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
            {t(title.key)}
          </h2>
          {title.subtitle && (
            <p className="font-minecraft text-lg text-fuchsia-200 md:text-2xl" style={SHADOW}>
              {t(title.subtitle)}
            </p>
          )}
        </m.div>
      )}
    </AnimatePresence>
  );
}

function Toast({ toast }: { readonly toast: Advancement }) {
  const { t } = useLanguage();
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
        <p className="font-minecraft text-[11px] text-[#ffff55]">{t(toast.kind === 'goal' ? 'dangerEggGoalReached' : 'dangerEggAdvancement')}</p>
        <p className="font-minecraft truncate text-sm text-white">{t(toast.title)}</p>
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
  const { t } = useLanguage();
  const drop = useEndGame((state) => state.dropCaption);

  useEffect(() => {
    const timer = window.setTimeout(() => drop(caption.id), 3000);
    return () => window.clearTimeout(timer);
  }, [caption.id, caption.at, drop]);

  return (
    <m.p className="bg-black/70 px-2 py-0.5 text-[11px] text-gray-100 md:text-xs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {t(caption.key)}
    </m.p>
  );
}

function Captions() {
  const captions = useEndGame((state) => state.captions);
  return (
    <div className="pointer-events-none absolute bottom-[8.5rem] right-2 z-20 flex flex-col items-end gap-0.5 md:bottom-6 md:right-5">
      <AnimatePresence initial={false}>
        {captions.map((caption) => (
          <CaptionLine key={caption.id} caption={caption} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ChatLine({ line }: { readonly line: Advancement }) {
  const { t } = useLanguage();
  const player = useEndGame((state) => state.player);
  const drop = useEndGame((state) => state.dropChat);

  useEffect(() => {
    const timer = window.setTimeout(() => drop(line.id), 9000);
    return () => window.clearTimeout(timer);
  }, [line.id, drop]);

  return (
    <m.p className="bg-black/45 px-2 py-0.5 text-xs text-white" style={SHADOW} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {t(line.kind === 'goal' ? 'dangerEggChatGoal' : 'dangerEggChatAdvancement').replace('{player}', player)}{' '}
      <span className="text-[#55ff55]">[{t(line.title)}]</span>
    </m.p>
  );
}

function Chat() {
  const chat = useEndGame((state) => state.chat);
  return (
    <div className="pointer-events-none absolute bottom-6 left-5 z-20 hidden w-[min(34vw,420px)] flex-col items-start gap-0.5 lg:flex">
      <AnimatePresence initial={false}>
        {chat.map((line) => (
          <ChatLine key={line.id} line={line} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ActionBar() {
  const { t } = useLanguage();
  const notice = useEndGame((state) => state.actionBar);
  const clear = useEndGame((state) => state.clearNotice);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => clear('actionBar', notice.id), 3800);
    return () => window.clearTimeout(timer);
  }, [notice, clear]);

  return (
    <div className="flex min-h-6 items-end justify-center px-4">
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
            {t(notice.key)}
          </m.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function Slot({ selected, count, children }: { readonly selected: boolean; readonly count?: number; readonly children?: ReactNode }) {
  return (
    <div className={`mc-slot relative flex h-8 w-8 items-center justify-center p-1 sm:h-10 sm:w-10 ${selected ? 'mc-slot--active' : ''}`}>
      {children}
      {count !== undefined && count > 1 && (
        <span className="mc-count absolute bottom-0 right-0.5 text-[10px] sm:text-[11px]">{count}</span>
      )}
    </div>
  );
}

function ItemImage({ src }: { readonly src: string }) {
  return <Image src={src} alt="" width={32} height={32} className="pixelated h-full w-full object-contain" />;
}

function Hotbar() {
  const act = useEndGame((state) => state.act);
  const eyes = useEndGame((state) => state.eyes);
  const eggCaught = useEndGame((state) => state.eggCaught);
  const xp = useEndGame((state) => state.xp);
  const eyesLeft = EYE_COUNT - eyes;
  const selected: number = act === 'stronghold' ? 2 : eggCaught ? 8 : 0;
  const levels = xp * MAX_LEVEL;
  const level = Math.floor(levels);
  const progress = xp >= 1 ? 1 : levels - level;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex flex-col items-center gap-1 md:bottom-5">
      <ActionBar />
      <div className="relative mt-3 w-[min(92vw,396px)]">
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
        <Slot selected={selected === 0}>
          <ItemImage src="/images/diamond-sword.webp" />
        </Slot>
        <Slot selected={selected === 1}>
          <ItemImage src="/images/bow.webp" />
        </Slot>
        <Slot selected={selected === 2} count={act === 'stronghold' ? eyesLeft : undefined}>
          {act === 'stronghold' && eyesLeft > 0 && <EyeOfEnderIcon className="h-full w-full" />}
        </Slot>
        <Slot selected={selected === 3} count={16}>
          <ItemImage src="/images/ender-pearl.webp" />
        </Slot>
        <Slot selected={selected === 4} count={8}>
          <ItemImage src="/images/golden-apple.webp" />
        </Slot>
        <Slot selected={selected === 5} />
        <Slot selected={selected === 6} />
        <Slot selected={selected === 7} />
        <Slot selected={selected === 8}>{eggCaught && <DragonEggIcon className="h-full w-full" />}</Slot>
      </div>
    </div>
  );
}

export function EndHud() {
  return (
    <>
      <BossBar />
      <Objectives />
      <TitleCard />
      <Toasts />
      <Captions />
      <Chat />
      <Hotbar />
    </>
  );
}
