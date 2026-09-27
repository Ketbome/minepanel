'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAchievementsStore } from '@/lib/store';
import { ACHIEVEMENTS } from './achievements';
import { DragonEggIcon } from './PixelIcons';

// the header's only door into this folder: the list, its icons and the story text load on open
const AchievementsList = dynamic(() => import('./hud/AchievementsList').then((mod) => mod.AchievementsList), { ssr: false });

interface AchievementsTrophyProps {
  readonly label: string;
  readonly lockedLabel: string;
}

export function AchievementsTrophy({ label, lockedLabel }: AchievementsTrophyProps) {
  const earned = useAchievementsStore((state) => state.earned);
  const load = useAchievementsStore((state) => state.load);

  useEffect(() => {
    load();
  }, [load]);

  if (!earned?.length) return null;
  const count = `${earned.length}/${ACHIEVEMENTS.length}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${label}: ${count}`}
        title={label}
        className="mc-slot group relative flex h-11 w-11 shrink-0 items-center justify-center transition-[outline,filter] hover:outline-3 hover:outline-offset-[-1px] hover:outline-[var(--mc-emerald)] hover:brightness-110 focus-visible:outline-3 focus-visible:outline-[var(--mc-emerald)] data-[state=open]:outline-3 data-[state=open]:outline-offset-[-1px] data-[state=open]:outline-[var(--mc-emerald)]"
      >
        {/* the egg is near-black like the game's, so an End glow keeps it readable on the dark slot */}
        <span className="absolute inset-1.5 bg-[radial-gradient(circle,rgba(190,110,255,0.4)_0%,transparent_70%)]" aria-hidden />
        <DragonEggIcon className="relative h-7 w-7 drop-shadow-[0_0_4px_rgba(214,140,255,0.9)] transition-transform group-hover:-translate-y-0.5" />
        <span className="mc-count absolute bottom-0.5 right-1 text-[10px] tabular-nums">{earned.length}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72 rounded-none border-2 border-[var(--mc-frame)] bg-[var(--mc-stone)] p-0 shadow-[inset_2px_2px_0_rgba(255,255,255,0.1),inset_-2px_-2px_0_rgba(0,0,0,0.5),0_8px_24px_rgba(0,0,0,0.55)]"
      >
        <div className="mc-titlebar flex items-center justify-between px-4 py-3">
          <p className="font-minecraft text-sm text-white">{label}</p>
          <span className="font-mono text-xs tabular-nums text-[var(--mc-emerald)]">{count}</span>
        </div>
        <AchievementsList earned={earned} lockedLabel={lockedLabel} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
