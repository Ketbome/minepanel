'use client';

import { FC, useEffect, useState } from 'react';
import { ArrowUpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { getVersionInfo, VersionInfo } from '@/services/version/version.service';

interface VersionBadgeProps {
  readonly isCollapsed?: boolean;
}

export const VersionBadge: FC<VersionBadgeProps> = ({ isCollapsed }) => {
  const { t } = useLanguage();
  const [info, setInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    getVersionInfo()
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  // A local run has no version baked into the image, so there is nothing to show.
  if (!info?.current) return null;

  if (info.updateAvailable && info.releaseUrl) {
    return (
      <a
        href={info.releaseUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={`${t('updateAvailable')}: v${info.latest}`}
        className={cn(
          'flex h-9 items-center gap-2 text-amber-300 transition-colors hover:bg-amber-500/10 hover:text-amber-200',
          isCollapsed ? 'justify-center px-0' : 'px-3',
        )}
      >
        <ArrowUpCircle size={16} className="shrink-0" />
        <span className={cn('font-minecraft text-[11px] whitespace-nowrap', isCollapsed ? 'hidden' : 'block')}>
          {t('updateAvailable')} · v{info.latest}
        </span>
      </a>
    );
  }

  return (
    <p
      className={cn(
        'flex h-9 items-center font-minecraft text-[11px] text-gray-600',
        isCollapsed ? 'justify-center px-0' : 'px-3',
      )}
      title={`Minepanel v${info.current}`}
    >
      v{info.current}
    </p>
  );
};
