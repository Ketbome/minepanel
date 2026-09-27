'use client';

import { SettingsNav } from '@/components/organisms/settings/SettingsNav';
import { ReactNode } from 'react';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { PageTitle } from '@/components/molecules/PageTitle';

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <PageTitle icon="/images/anvil.webp" title={t('settingsTitle')} description={t('settingsDescription')} />

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
