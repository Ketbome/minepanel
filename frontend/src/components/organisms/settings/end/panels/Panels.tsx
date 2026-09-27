'use client';

import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Fragment, useState } from 'react';
import { cue } from '../end-audio';
import { countOf, ItemIcon, ITEMS, type ItemId } from '../items';
import { useLore, type LoreKey } from '../lore';
import { useEndGame, type BookId, type ChestId, type Flag, type SignId } from '../store';
import { CraftResult, Crafting } from './Crafting';
import { SIGN_TEXT } from '../signs';
import { MapPanel } from './MapPanel';
import { InventoryGrid, InvSlot, ItemSlot, PanelWindow } from './PanelWindow';

const CHEST_TITLES: Record<ChestId, LoreKey> = { camp: 'chest', backups: 'chestBackups', ruined: 'chest', city1: 'chest', city2: 'chest', city3: 'chest', city4: 'chest', igloo: 'chest', wreck: 'chest', buried: 'chest' };

const BOOKS: Record<BookId, { readonly title: LoreKey; readonly by?: LoreKey; readonly pages: readonly LoreKey[] }> = {
  note: { title: 'itemNote', pages: ['note'] },
  diary: { title: 'diaryTitle', by: 'diaryBy', pages: ['diary1', 'diary2', 'diary3', 'diary5', 'diary4'] },
  register: { title: 'itemRegister', pages: ['register1', 'register2', 'register3'] },
  admin2011: { title: 'bookAdmin2011', by: 'bookAdmin2011By', pages: ['admin2011a', 'admin2011b'] },
  guide3: { title: 'bookAdmin2011', by: 'bookAdmin2011By', pages: ['guide3a', 'guide3b'] },
  stop: { title: 'bookStop', pages: ['stopBook'] },
};


const TRADES: readonly { readonly item: ItemId; readonly cost: number; readonly flag: Flag }[] = [
  { item: 'map', cost: 3, flag: 'mapBought' },
  { item: 'register', cost: 1, flag: 'registerBought' },
];

// `~~name~~` strikes a name through, the way the villagers keep the register
function Written({ text }: { readonly text: string }) {
  return (
    <>
      {text.split(/(~~[^~]+~~)/).map((part, index) =>
        part.startsWith('~~') ? (
          <span key={index} className="line-through decoration-2">
            {part.slice(2, -2)}
          </span>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        )
      )}
    </>
  );
}

function ChestPanel({ id }: { readonly id: ChestId }) {
  const lore = useLore();
  const empty = useEndGame((state) => state.chests[id].every((slot) => !slot));
  return (
    <PanelWindow title={lore(CHEST_TITLES[id])} wide>
      <div className="grid w-fit grid-cols-9 gap-[3px]">
        {Array.from({ length: 27 }, (_, index) => (
          <InvSlot key={index} area="chest" index={index} />
        ))}
      </div>
      <div className="mt-2 flex justify-end">
        <button type="button" disabled={empty} onClick={() => useEndGame.getState().takeAllFromChest(id)} className="mc-btn px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-45">
          {lore('takeAll')}
        </button>
      </div>
      <InventoryGrid />
    </PanelWindow>
  );
}

// a written book: parchment pages, turned one at a time, signed by whoever wrote it
function BookPanel({ id }: { readonly id: BookId }) {
  const lore = useLore();
  const book = BOOKS[id];
  const pages = book.pages;
  const [page, setPage] = useState(0);

  const turn = (by: number) => {
    setPage(page + by);
    cue('page');
  };

  return (
    <PanelWindow title={lore(book.title)}>
      <div className="min-h-52 border-2 border-[#8a6a3f] bg-[#f1e6c8] px-5 py-4 text-[#3b2b1a] shadow-[inset_0_0_24px_rgba(120,80,30,0.25)]">
        {book.by && page === 0 && <p className="mb-3 text-[11px] uppercase tracking-[0.08em] text-[#7a6040]">{lore(book.by)}</p>}
        <div className="space-y-2">
          {lore(pages[page] as LoreKey)
            .split('\n')
            .map((line, index) => (
              <p key={index} className="text-sm leading-relaxed">
                <Written text={line} />
              </p>
            ))}
        </div>
      </div>
      {pages.length > 1 && (
        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            aria-label={lore('prevPage')}
            title={lore('prevPage')}
            disabled={page === 0}
            onClick={() => turn(-1)}
            className="mc-btn h-8 w-8 disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-4"
          >
            <ChevronLeft />
          </button>
          <span className="font-mono text-[11px] text-gray-400">
            {lore('page')
              .replace('{n}', String(page + 1))
              .replace('{total}', String(pages.length))}
          </span>
          <button
            type="button"
            aria-label={lore('nextPage')}
            title={lore('nextPage')}
            disabled={page === pages.length - 1}
            onClick={() => turn(1)}
            className="mc-btn h-8 w-8 disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-4"
          >
            <ChevronRight />
          </button>
        </div>
      )}
    </PanelWindow>
  );
}

function SignPanel({ id }: { readonly id: SignId }) {
  const lore = useLore();
  return (
    <PanelWindow title={lore('sign')}>
      <div className="mx-auto max-w-xs border-4 border-[#5d452b] bg-[#b8945f] px-4 py-6 text-center text-[#1b1208] shadow-[4px_4px_0_rgba(0,0,0,0.45)]">
        {lore(SIGN_TEXT[id])
          .split('\n')
          .map((line, index) => (
            <p key={index} className="font-minecraft text-base leading-relaxed">
              {line}
            </p>
          ))}
      </div>
    </PanelWindow>
  );
}

// the librarian: three emeralds for the map, one for the register
function TradePanel() {
  const lore = useLore();
  const inventory = useEndGame((state) => state.inventory);
  const flags = useEndGame((state) => state.flags);
  const emeralds = countOf(inventory, 'emerald');

  const buy = (item: ItemId, cost: number, flag: Flag) => {
    const game = useEndGame.getState();
    if (game.flags[flag] || !game.trade(cost, item)) return;
    game.setFlag(flag);
    cue('villager');
  };

  return (
    <PanelWindow title={lore('librarian')}>
      <ul className="space-y-2">
        {TRADES.map(({ item, cost, flag }) => (
          <li key={item}>
            <button
              type="button"
              disabled={Boolean(flags[flag]) || emeralds < cost}
              onClick={() => buy(item, cost, flag)}
              className="mc-btn flex w-full items-center gap-3 px-3 py-2 text-left text-xs disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span className="flex items-center gap-1">
                <ItemIcon item="emerald" className="h-6 w-6" />
                <span className="font-mono">×{cost}</span>
              </span>
              <ChevronRight className="size-4 text-gray-400" />
              <ItemIcon item={item} className="h-6 w-6" />
              <span className="flex-1">{lore(ITEMS[item].name)}</span>
              {flags[flag] && <span className="text-[10px] uppercase text-gray-400">{lore('soldOut')}</span>}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-gray-400">{lore('librarianHmm')}</p>
      <InventoryGrid />
    </PanelWindow>
  );
}

// E: the inventory, with the helmet slot and the 2x2 crafting grid of the game (the top-left
// cells of the grid)
function InventoryPanel() {
  const lore = useLore();
  const helmet = useEndGame((state) => state.helmet);
  return (
    <PanelWindow title={lore('inventory')} wide>
      <div className="flex items-center justify-end gap-2">
        <div className="mr-auto flex items-center gap-2">
          <ItemSlot slot={helmet ? { item: 'helmet', count: 1 } : null} onClick={() => useEndGame.getState().clickHelmet()} />
          <span className="text-[11px] text-gray-400">{lore('armorSlot')}</span>
        </div>
        <div className="grid grid-cols-2 gap-[3px]">
          {[0, 1, 3, 4].map((cell) => (
            <InvSlot key={cell} area="grid" index={cell} />
          ))}
        </div>
        <ArrowRight className="size-5 shrink-0 text-gray-400" />
        <CraftResult />
      </div>
      <p className="mt-2 text-[11px] leading-snug text-gray-400">{lore('inventoryHelp')}</p>
      <InventoryGrid />
    </PanelWindow>
  );
}

export default function Panels() {
  const panel = useEndGame((state) => state.panel);
  if (!panel) return null;
  if (panel.kind === 'chest') return <ChestPanel key={panel.id} id={panel.id} />;
  if (panel.kind === 'craft') return <Crafting />;
  if (panel.kind === 'book') return <BookPanel key={panel.id} id={panel.id} />;
  if (panel.kind === 'sign') return <SignPanel key={panel.id} id={panel.id} />;
  if (panel.kind === 'trade') return <TradePanel />;
  if (panel.kind === 'map') return <MapPanel />;
  return <InventoryPanel />;
}
