'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Home, LayoutDashboard } from 'lucide-react';
import { useLanguage } from '@/lib/hooks/useLanguage';

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen mp-blueprint items-center justify-center p-6">
      <div className="mc-panel w-full max-w-lg animate-fade-in-up">
        <div className="mc-titlebar flex items-center gap-3 px-4 py-3">
          <Image
            src="/images/barrier.webp"
            alt=""
            width={24}
            height={24}
            className="pixelated animate-float"
          />
          <span className="mp-tag">Error 404</span>
        </div>

        <div className="px-6 py-10 text-center">
          <p className="font-minecraft text-6xl leading-none text-[var(--mc-emerald)] drop-shadow-glow">
            404
          </p>
          <h1 className="mt-4 font-minecraft text-xl text-white">{t('pageNotFoundTitle')}</h1>
          <p className="mt-2 text-sm text-gray-400">{t('pageNotFoundDesc')}</p>

          <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
            <Link href="/dashboard/home" className="mc-btn mc-btn-emerald px-4 py-2 text-sm">
              <Home className="h-4 w-4" />
              {t('home')}
            </Link>
            <Link href="/dashboard/servers" className="mc-btn px-4 py-2 text-sm">
              <LayoutDashboard className="h-4 w-4" />
              {t('dashboard')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
