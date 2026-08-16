'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, ChevronDown } from 'lucide-react';
import { LanguageSwitcher } from '../ui/language-switcher';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useAuthStore } from '@/lib/store/auth-store';
import { useServerNavStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { getSessionUser, type SessionUser } from '@/services/auth/auth.service';
import { GitHubStarButton } from '@/components/molecules/GitHubStarButton';

type Crumb = { label: string; href?: string };

export function DashboardHeader() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const logout = useAuthStore((state) => state.logout);
  const storeServerName = useServerNavStore((state) => state.serverName);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    getSessionUser()
      .then(setSessionUser)
      .catch((error) => {
        console.error('Error loading session user:', error);
        setSessionUser(null);
      });
  }, []);

  const handleLogout = () => {
    logout();
  };

  const serverMatch = pathname.match(/^\/dashboard\/servers\/([^/]+)$/);
  const crumbs: Crumb[] = (() => {
    if (serverMatch) {
      return [
        { label: t('dashboard'), href: '/dashboard/servers' },
        { label: storeServerName || decodeURIComponent(serverMatch[1]) },
      ];
    }
    switch (pathname) {
      case '/dashboard/home':
        return [{ label: t('home') }];
      case '/dashboard/servers':
        return [{ label: t('dashboard') }];
      case '/dashboard/files':
        return [{ label: t('files') }];
      case '/dashboard/world-library':
        return [{ label: t('worldLibrary') }];
      case '/dashboard/templates':
        return [{ label: t('templates') }];
      case '/dashboard/settings':
        return [{ label: t('settings') }];
      default:
        return [{ label: t('dashboard') }];
    }
  })();

  return (
    <header className="sticky top-0 z-40 w-full mc-titlebar bg-[var(--mc-stone)]/95 backdrop-blur-md animate-fade-in">
      <div className="flex h-14 items-center gap-3 px-6">
        <nav aria-label="Breadcrumb" className="mp-tag flex min-w-0 items-center gap-2 truncate">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return (
              <span key={crumb.label} className="flex min-w-0 items-center gap-2">
                {index > 0 && <span className="text-gray-600">/</span>}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="text-gray-400 transition-colors hover:text-[var(--mc-emerald)]"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      'truncate',
                      isLast ? 'text-[var(--mc-emerald)]' : 'text-gray-400',
                    )}
                  >
                    {crumb.label}
                  </span>
                )}
              </span>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <GitHubStarButton label={t('github')} />

          <div
            className="mc-slot hidden h-11 w-11 items-center justify-center sm:flex"
            title={t('systemActive')}
          >
            <span className="sr-only">{t('systemActive')}</span>
            <span
              className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_var(--mc-emerald)]"
              aria-hidden="true"
            />
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={cn(
                'flex h-11 items-center gap-2 border-2 px-2 transition-colors font-minecraft',
                showUserMenu
                  ? 'border-[var(--mc-frame)] bg-emerald-600/20'
                  : 'border-transparent hover:border-[var(--mc-frame)] hover:bg-black/30',
              )}
            >
              <div className="mc-slot flex h-8 w-8 items-center justify-center overflow-hidden">
                <Image
                  src="/images/player-head.png"
                  alt="User"
                  width={24}
                  height={24}
                  className="pixelated object-cover"
                />
              </div>
              <span className="hidden max-w-32 truncate text-sm text-white md:block">
                {sessionUser?.username || '...'}
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-gray-400 transition-transform duration-200',
                  showUserMenu && 'rotate-180',
                )}
              />
            </button>

            {/* Dropdown menu with CSS transitions */}
            <div
              className={cn(
                'absolute right-0 mt-2 w-56 z-50 bg-[var(--mc-stone)] border-2 border-[var(--mc-frame)]',
                'shadow-[inset_2px_2px_0_rgba(255,255,255,0.1),inset_-2px_-2px_0_rgba(0,0,0,0.5),0_8px_24px_rgba(0,0,0,0.55)]',
                'transition-all duration-200 origin-top-right',
                showUserMenu
                  ? 'opacity-100 scale-100 pointer-events-auto'
                  : 'opacity-0 scale-95 pointer-events-none',
              )}
            >
              <div className="mc-titlebar flex items-center gap-3 p-4">
                <div className="mc-slot flex h-10 w-10 items-center justify-center overflow-hidden">
                  <Image
                    src="/images/player-head.png"
                    alt="User"
                    width={28}
                    height={28}
                    className="pixelated object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium font-minecraft text-white">
                    {sessionUser?.username || '...'}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {sessionUser?.role === 'ADMIN' ? t('administrator') : t('userLabel')}
                  </p>
                </div>
              </div>
              <div className="flex flex-row items-center py-1 text-white px-2">
                <LanguageSwitcher /> <p className="px-2">{t('changeLanguage')}</p>
              </div>
              <div className="py-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-600/20 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  {t('logout')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
