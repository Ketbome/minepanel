'use client';

import { AnimatePresence, m } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { useLore, useLoreDictionary } from '../lore';
import { useEndGame, type ChatLine as Line } from '../store';

const SHADOW = { textShadow: '2px 2px 0 rgba(0,0,0,0.8)' };
const YELLOW = '#ffff55';
// long enough to read a line you only glance at a moment later
const LINE_MS = 20000;

function ChatLine({ line }: { readonly line: Line }) {
  const lore = useLore();
  const player = useEndGame((state) => state.player);
  const ghost = useEndGame((state) => state.ghost);
  const drop = useEndGame((state) => state.dropChat);
  const dict = useLoreDictionary((state) => state.dict);

  useEffect(() => {
    let timer = 0;
    let covered = false;
    const expire = () => {
      const game = useEndGame.getState();
      // a window or the pause menu covers the chat: keep the line until you are back, then give
      // it a few more seconds to be read
      if (game.panel || game.paused) {
        covered = true;
        timer = window.setTimeout(expire, 1000);
      } else if (covered) {
        covered = false;
        timer = window.setTimeout(expire, 6000);
      } else drop(line.id);
    };
    timer = window.setTimeout(expire, LINE_MS);
    return () => window.clearTimeout(timer);
  }, [line.id, drop]);

  let body: ReactNode;
  if (line.kind === 'task' || line.kind === 'goal') {
    body = (
      <>
        {lore(line.kind === 'goal' ? 'chatGoal' : 'chatAdvancement').replace('{player}', player)} <span className="text-[#55ff55]">[{lore(line.title)}]</span>
      </>
    );
  } else if (line.kind === 'say') {
    body = `<${line.author ?? ghost.name}> ${lore(line.key)}`;
  } else if (line.kind === 'system') {
    body = <span className="text-gray-300">{lore(line.key)}</span>;
  } else if (line.kind === 'named') {
    body = `${line.name} ${lore(line.key)}`;
  } else {
    const key = line.kind === 'join' ? 'chatJoined' : 'chatLeft';
    // someone other than the ghost can drop in: the line takes their name instead
    const name = line.kind === 'join' || line.kind === 'leave' ? line.name : undefined;
    body = <span style={{ color: YELLOW }}>{name ? (dict?.[key] ?? '').replace('{ghost}', name) : lore(key)}</span>;
  }

  return (
    // a new line slides in with a brief yellow flash so it catches the eye
    <m.p
      className="px-2.5 py-1 text-[13px] leading-snug text-white md:text-sm"
      style={SHADOW}
      initial={{ opacity: 0, x: -14, backgroundColor: 'rgba(255, 255, 85, 0.35)' }}
      animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', transition: { duration: 0.25, backgroundColor: { duration: 1.6 } } }}
      exit={{ opacity: 0, transition: { duration: 0.6 } }}
    >
      {body}
    </m.p>
  );
}

export function Chat() {
  const chat = useEndGame((state) => state.chat);
  return (
    <div className="pointer-events-none absolute bottom-[10rem] left-2 z-20 flex w-[min(70vw,440px)] flex-col items-start gap-0.5 md:bottom-24 md:left-5 md:w-[min(40vw,520px)]">
      <AnimatePresence initial={false}>
        {chat.map((line) => (
          <ChatLine key={line.id} line={line} />
        ))}
      </AnimatePresence>
    </div>
  );
}
