'use client';

import Image from 'next/image';
import { SettingsNav } from '@/components/organisms/settings/SettingsNav';
import { ReactNode } from 'react';
import { useLanguage } from '@/lib/hooks/useLanguage';

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="mc-panel animate-fade-in-up">
        <div className="mc-titlebar flex items-center gap-3 px-4 py-3">
          <Image src="/images/anvil.webp" alt="Settings" width={32} height={32} className="pixelated animate-float" />
          <div>
            <h1 className="text-xl sm:text-2xl font-minecraft text-white drop-shadow-glow leading-tight">{t('settingsTitle')}</h1>
            <p className="text-gray-300 text-xs">{t('settingsDescription')}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
