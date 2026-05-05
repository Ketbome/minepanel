'use client';

import Image from 'next/image';
import { SettingsNav } from '@/components/organisms/settings/SettingsNav';
import { ReactNode } from 'react';
import { useLanguage } from '@/lib/hooks/useLanguage';

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const { t } = useLanguage();

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <div className="mb-2 flex items-center gap-3">
          <Image src="/images/anvil.webp" alt="Settings" width={40} height={40} />
          <h1 className="text-3xl font-bold text-white font-minecraft">{t('settingsTitle')}</h1>
        </div>
        <p className="text-gray-400">{t('settingsDescription')}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
