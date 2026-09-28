'use client';

import { m } from 'framer-motion';
import { useEffect, useState } from 'react';
import { GitHubStarButton } from '@/components/molecules/GitHubStarButton';
import { Button } from '@/components/ui/button';
import { getLeaderboard } from '@/services/end-runs/end-runs.service';
import { formatRun } from './run';
import { useLore, type LoreKey } from './lore';
import { useEndGame, type SplitZone } from './store';

const SPLIT_LABELS: readonly { readonly zone: SplitZone; readonly label: LoreKey }[] = [
  { zone: 'nether', label: 'splitNether' },
  { zone: 'stronghold', label: 'splitStronghold' },
  { zone: 'end', label: 'splitEnd' },
  { zone: 'endcity', label: 'splitEndcity' },
];

// The last screen of either ending: the admins' thanks for supporting Minepanel, with the star
// button and a word on sharing it.
export function Thanks({ onClose, onVisit }: { readonly onClose: () => void; readonly onVisit: () => void }) {
  const lore = useLore();
  const mode = useEndGame((state) => state.mode);
  const finishedAt = useEndGame((state) => state.finishedAt);
  const splits = useEndGame((state) => state.splits);
  const timed = (mode === 'speedrun' || mode === 'hardcore') && finishedAt !== null;
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock();
  }, []);

  // where this run landed on the panel's leaderboard (the run was sent at the finish)
  useEffect(() => {
    if (!timed) return;
    const timer = window.setTimeout(() => {
      getLeaderboard(mode)
        .then((board) => setRank(board.mine?.rank ?? null))
        .catch(() => {});
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [timed, mode]);

  return (
    <m.div
      role="dialog"
      aria-modal="true"
      aria-label={lore('thanksTitle')}
      className="absolute inset-0 z-[48] flex items-center justify-center bg-black/80 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 1 } }}
    >
      <div className="mc-panel w-full max-w-md">
        <div className="mc-titlebar px-4 py-2">
          <h2 className="font-minecraft text-base text-gray-100">{lore('thanksTitle')}</h2>
        </div>
        <div className="space-y-3 p-4 text-sm leading-relaxed text-gray-300">
          {lore('thanksBody')
            .split('\n')
            .map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          <p className="text-[11px] text-gray-500">— Ketbome, BlasterDaster & Bfuuny</p>
          {timed && (
            <div className="mc-slot space-y-1 px-3 py-2 font-mono text-xs text-gray-200">
              <p className="text-sm text-emerald-300">
                {lore('runTime')} {formatRun(finishedAt)}
                {rank !== null && ` · ${lore('runRank')}${rank}`}
              </p>
              <p className="text-gray-400">
                {SPLIT_LABELS.filter(({ zone }) => splits[zone] !== undefined)
                  .map(({ zone, label }) => `${lore(label)} ${formatRun(splits[zone]!)}`)
                  .join(' · ')}
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <GitHubStarButton label={lore('thanksStar')} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={onVisit}>
                {lore('thanksServer48')}
              </Button>
              <Button variant="minepanel" onClick={onClose} autoFocus>
                {lore('thanksClose')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </m.div>
  );
}
