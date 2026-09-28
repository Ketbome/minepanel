'use client';

import { useEffect, useState } from 'react';
import { getLeaderboard, type Leaderboard, type RunMode } from '@/services/end-runs/end-runs.service';
import { BLASTER_MS, formatRun } from '../run';
import { useLore } from '../lore';
import { BLASTER } from '../store';
import { PanelWindow } from './PanelWindow';

// The panel's best times: one row per user, fastest first, with BlasterDaster's run to beat in
// speedrun (he never finished a hardcore one) and your own row picked out.
export function LeaderboardPanel() {
  const lore = useLore();
  const [mode, setMode] = useState<RunMode>('speedrun');
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setBoard(null);
    setFailed(false);
    getLeaderboard(mode)
      .then((result) => live && setBoard(result))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [mode]);

  const rows = (board?.top ?? []).map((row, index) => ({ name: row.username, timeMs: row.timeMs, mine: board?.mine?.rank === index + 1, blaster: false }));
  if (mode === 'speedrun') rows.push({ name: BLASTER, timeMs: BLASTER_MS, mine: false, blaster: true });
  rows.sort((a, b) => a.timeMs - b.timeMs);

  return (
    <PanelWindow title={lore('records')} wide>
      <div className="flex gap-1" role="tablist">
        {(['speedrun', 'hardcore'] as const).map((id) => (
          <button key={id} type="button" role="tab" aria-selected={mode === id} className={`mc-btn px-3 py-1 text-xs ${mode === id ? 'mc-btn-emerald' : ''}`} onClick={() => setMode(id)}>
            {lore(id === 'speedrun' ? 'modeSpeedrun' : 'modeHardcore')}
          </button>
        ))}
      </div>
      <ol className="mt-3 space-y-1 font-mono text-sm">
        {rows.map((row, index) => (
          <li key={`${row.name}:${index}`} className={`flex items-center gap-3 px-2 py-1 ${row.mine ? 'bg-emerald-400/15 text-emerald-200' : row.blaster ? 'text-cyan-200' : 'text-gray-200'}`}>
            <span className="w-6 text-right text-gray-500">{index + 1}</span>
            <span className="flex-1 truncate">{row.name}</span>
            <span className="tabular-nums">{formatRun(row.timeMs)}</span>
          </li>
        ))}
      </ol>
      {board && rows.length === (mode === 'speedrun' ? 1 : 0) && <p className="mt-2 text-xs text-gray-400">{lore('recordsEmpty')}</p>}
      {mode === 'hardcore' && <p className="mt-2 text-xs text-gray-400">{lore('recordsBlasterHardcore')}</p>}
      {board?.mine && board.mine.rank > 10 && (
        <p className="mt-2 text-xs text-emerald-200">
          {lore('recordsYou')} #{board.mine.rank} · {formatRun(board.mine.timeMs)}
        </p>
      )}
      {failed && <p className="mt-2 text-xs text-red-300">{lore('recordsFailed')}</p>}
    </PanelWindow>
  );
}
