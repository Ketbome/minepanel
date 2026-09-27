'use client';

import { m } from 'framer-motion';
import { countOf } from '../items';
import { useLore, type LoreKey } from '../lore';
import { BLAZES, CRYSTAL_COUNT, EYE_COUNT, useEndGame, type EndGameState } from '../store';

interface Objective {
  readonly key: LoreKey;
  readonly done: boolean;
  readonly count?: string;
  readonly optional?: boolean;
  // a rule to keep, not a task: it is never ticked off
  readonly rule?: boolean;
}

function objectives(game: EndGameState): Objective[] {
  const { zone, flags, inventory } = game;
  if (zone === 'overworld' && !flags.rodsDone) {
    return [
      { key: 'objChest', done: Boolean(flags.camp) },
      { key: 'objSword', done: Boolean(flags.swordCrafted) },
      { key: 'objRuined', done: Boolean(flags.portalLit) },
      { key: 'objMap', done: Boolean(flags.mapBought), optional: true },
      { key: 'objCave', done: Boolean(flags.buttonPressed), optional: true },
    ];
  }
  if (zone === 'overworld') {
    const eyes = Math.min(10, countOf(inventory, 'eye'));
    return [
      { key: 'objEyes', done: Boolean(flags.eyesCrafted), count: `${flags.eyesCrafted ? 10 : eyes}/10` },
      { key: 'objThrow', done: Boolean(flags.eyeLanded) },
      { key: 'objDig', done: Boolean(flags.stronghold) },
    ];
  }
  if (zone === 'ancient') {
    return [
      { key: 'objQuiet', done: false, rule: true },
      { key: 'objButton', done: Boolean(flags.buttonPressed), optional: true },
    ];
  }
  if (zone === 'nether') {
    const rods = game.killed.filter((id) => BLAZES.includes(id)).length;
    const pearls = Math.min(10, countOf(inventory, 'pearl') + countOf(inventory, 'eye'));
    return [
      { key: 'objRods', done: rods >= BLAZES.length, count: `${rods}/${BLAZES.length}` },
      { key: 'objPearls', done: pearls >= 10, count: `${pearls}/10` },
      { key: 'objReturn', done: false },
      { key: 'objGhast', done: Boolean(flags.ghastReturned), optional: true },
    ];
  }
  if (zone === 'stronghold') {
    const placed = game.frames.filter(Boolean).length;
    return [
      { key: 'objFrame', done: placed === EYE_COUNT, count: `${placed}/${EYE_COUNT}` },
      { key: 'objJump', done: false },
      { key: 'objDiary', done: Boolean(flags.diaryRead), optional: true },
    ];
  }
  if (zone === 'end') {
    if (game.stage === 'arrival') return [];
    const broken = CRYSTAL_COUNT - game.crystals.filter(Boolean).length;
    const rows: Objective[] = [
      { key: 'objCrystals', done: broken === CRYSTAL_COUNT, count: `${broken}/${CRYSTAL_COUNT}` },
      { key: 'objDragon', done: game.stage === 'victory' || game.stage === 'exit' },
    ];
    if (game.portalOpen) rows.push({ key: 'objEgg', done: game.eggCaught }, { key: 'objPortal', done: game.exitTo === 'portal' });
    if (flags.gatewayHinted) rows.push({ key: 'objGatewayPearl', done: game.exitTo === 'gateway', optional: true });
    return rows;
  }
  if (zone === 'endcity') {
    return [
      { key: 'objElytra', done: Boolean(flags.elytra) },
      { key: 'objIslet', done: Boolean(flags.keeperMet) },
    ];
  }
  return [];
}

export function Objectives() {
  const lore = useLore();
  const rows = useEndGame(objectivesSelector);
  if (rows.length === 0) return null;

  return (
    <m.div
      className="mc-panel pointer-events-none absolute left-2 top-[9.5rem] z-20 w-[min(62vw,260px)] px-3 py-2 md:left-5 md:top-5"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <p className="font-minecraft text-[11px] text-fuchsia-300">{lore('objectives')}</p>
      <ul className="mt-1.5 space-y-1.5">
        {rows.map((row) => (
          <li
            key={row.key}
            className={`flex items-start gap-2 text-xs ${row.rule ? 'text-amber-200' : row.done ? 'text-gray-500 line-through' : row.optional ? 'italic text-gray-300' : 'text-gray-100'}`}
          >
            {row.rule ? (
              <span aria-hidden className="mt-px w-2.5 shrink-0 text-center font-mono text-[11px] font-bold leading-none text-amber-400">
                !
              </span>
            ) : (
              <span className={`mt-[3px] h-2.5 w-2.5 shrink-0 border-2 ${row.done ? 'border-emerald-400 bg-emerald-400' : row.optional ? 'border-dashed border-gray-500' : 'border-gray-400'}`} />
            )}
            <span className="flex-1">{lore(row.key)}</span>
            {row.count && <span className="font-mono text-[11px] tabular-nums text-fuchsia-300">{row.count}</span>}
          </li>
        ))}
      </ul>
    </m.div>
  );
}

// rows are rebuilt on every store change, so compare them by content to skip needless renders
let last: Objective[] = [];
function objectivesSelector(game: EndGameState) {
  const next = objectives(game);
  if (next.length === last.length && next.every((row, index) => row.key === last[index].key && row.done === last[index].done && row.count === last[index].count)) return last;
  last = next;
  return next;
}
