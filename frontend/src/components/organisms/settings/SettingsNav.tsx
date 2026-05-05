'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, User, KeyRound, Palette, Network, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { getCurrentUser, type User as CurrentUser } from '@/services/users/users.service';

const iconClassName = 'h-4 w-4 shrink-0';

export function SettingsNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  }, []);

  const items = [
    { href: '/dashboard/settings/account', label: t('settingsNavAccount'), icon: User },
    ...(currentUser?.role === 'ADMIN'
      ? [{ href: '/dashboard/settings/access', label: t('settingsNavAccess'), icon: Shield }]
      : []),
    ...((currentUser?.role === 'ADMIN' || currentUser?.access.permissions.accessAllServers)
      ? [{ href: '/dashboard/settings/integrations', label: t('settingsNavIntegrations'), icon: KeyRound }]
      : []),
    { href: '/dashboard/settings/preferences', label: t('settingsNavPreferences'), icon: Palette },
    ...((currentUser?.role === 'ADMIN' || currentUser?.access.permissions.accessAllServers)
      ? [
          { href: '/dashboard/settings/network', label: t('settingsNavNetwork'), icon: Network },
          { href: '/dashboard/settings/defaults', label: t('settingsNavDefaults'), icon: SlidersHorizontal },
        ]
      : []),
    { href: '/dashboard/settings/danger', label: t('settingsNavDanger'), icon: AlertTriangle },
  ];

  return (
    <aside className="h-fit rounded-2xl border border-gray-700/60 bg-gray-900/80 p-3 backdrop-blur-md">
      <div className="mb-3 px-3 pt-2">
        <p className="font-minecraft text-xs uppercase tracking-[0.25em] text-emerald-300/80">{t('settingsTitle')}</p>
        <p className="mt-2 text-sm text-gray-400">{t('settingsNavDescription')}</p>
      </div>
      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-3 text-sm transition-colors',
                isActive
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-transparent text-gray-300 hover:border-gray-700 hover:bg-gray-800/60 hover:text-white',
              )}
            >
              <Icon className={iconClassName} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
