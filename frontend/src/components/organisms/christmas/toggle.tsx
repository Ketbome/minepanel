'use client';

import { useLanguage } from '@/lib/hooks/useLanguage';
import { useSeasonStore } from '@/lib/store/season-store';
import { Voxel } from './voxel';

export function Toggle() {
  const { t } = useLanguage();
  const enabled = useSeasonStore((s) => s.enabled);
  const toggle = useSeasonStore((s) => s.toggle);
  return (
    <button type="button" className="xm-toggle" onClick={toggle} aria-pressed={enabled} aria-label={t('christmasTheme')} title={t('christmasTheme')}>
      <Voxel name="giftRed" className="h-auto w-6" />
    </button>
  );
}
