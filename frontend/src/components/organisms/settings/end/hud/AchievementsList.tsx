'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/lib/hooks/useLanguage';
import type { Achievement } from '@/services/achievements/achievements.service';
import { ACHIEVEMENTS } from '../achievements';
import { loadLore, useLoreDictionary } from '../lore';
import { AdvancementBadge } from './AdvancementBadge';

interface AchievementsListProps {
  readonly earned: Achievement[];
  readonly lockedLabel: string;
}

export function AchievementsList({ earned, lockedLabel }: AchievementsListProps) {
  const { language } = useLanguage();
  const dict = useLoreDictionary((state) => state.dict);

  useEffect(() => {
    loadLore(language);
  }, [language]);

  return (
    <ul className="max-h-[60vh] space-y-1 overflow-y-auto p-2">
      {ACHIEVEMENTS.map(({ key, icon }) => {
        const found = earned.find((item) => item.key === key);
        return (
          <li key={key} className="flex items-center gap-3 px-1 py-1">
            <span className="mc-slot flex h-10 w-10 shrink-0 items-center justify-center">
              <span className={found ? undefined : 'opacity-50 brightness-0'}>
                <AdvancementBadge icon={icon} />
              </span>
            </span>
            {found ? (
              <div className="min-w-0">
                <p className="truncate text-sm text-white">{dict?.[key] ?? '…'}</p>
                <p className="font-mono text-[11px] text-gray-500">{new Date(found.unlockedAt).toLocaleDateString(language)}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                ???<span className="sr-only">{lockedLabel}</span>
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
