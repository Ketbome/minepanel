'use client';

import Image from 'next/image';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EndPortalEasterEgg } from '@/components/organisms/settings/EndPortalEasterEgg';
import { useLanguage } from '@/lib/hooks/useLanguage';

export default function DangerSettingsPage() {
  const { t } = useLanguage();

  return (
    <Card className="border-2 border-red-600/40 bg-red-900/10 backdrop-blur-md shadow-xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600/20">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <CardTitle className="text-red-400 font-minecraft">{t('dangerZone')}</CardTitle>
            <CardDescription className="text-gray-400">{t('dangerZoneDesc')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="py-4 text-center">
          <Image src="/images/barrier.webp" alt="Danger" width={48} height={48} className="mx-auto mb-3 opacity-60" />
          <p className="text-sm text-gray-400">{t('comingSoon')}</p>
          <div className="mt-6">
            <EndPortalEasterEgg />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
