'use client';

import { useLanguage } from '@/lib/hooks/useLanguage';
import { useSeasonStore } from '@/lib/store/season-store';
import { Voxel } from './voxel';

export function Toggle() {
  const { t } = useLanguage();
  const enabled = useSeasonStore((s) => s.enabled);
  const toggle = useSeasonStore((s) => s.toggle);
  return (
    <button type="button" className="hw-toggle" onClick={toggle} aria-pressed={enabled} aria-label={t('halloweenTheme')} title={t('halloweenTheme')}>
      <Voxel name="pumpkin" className="h-auto w-7" />
    </button>
  );
}
