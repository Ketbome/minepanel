'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Home,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Settings,
  Package,
  FolderOpen,
  BookOpen,
  Bug,
  Globe,
  ArrowLeft,
} from 'lucide-react';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useUIStore, useServerNavStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { getCurrentUser, User } from '@/services/users/users.service';
import { SidebarServerNav } from './SidebarServerNav';

const GithubIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export function Sidebar() {
  const isSidebarCollapsed = useUIStore((state) => state.isSidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const isCollapsed = isSidebarCollapsed;
  const { t } = useLanguage();
  const pathname = usePathname();
  const serverMatch = pathname.match(/^\/dashboard\/servers\/([^/]+)$/);
  const inServerView = Boolean(serverMatch);
  const storeServerName = useServerNavStore((state) => state.serverName);
  const serverDisplayName = storeServerName || serverMatch?.[1] || '';
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    getCurrentUser()
      .then(setCurrentUser)
      .catch((error) => {
        console.error('Error loading current user:', error);
      });
  }, [isHydrated]);

  const canViewGlobalFiles = currentUser?.access.permissions.viewGlobalFiles || currentUser?.role === 'ADMIN';

  const navigationItems = [
    {
      label: t('home'),
      icon: Home,
      href: '/dashboard/home',
      isActive: pathname === '/dashboard/home',
    },
    {
      label: t('dashboard'),
      icon: LayoutDashboard,
      href: '/dashboard/servers',
      isActive: pathname === '/dashboard/servers',
    },
    ...(canViewGlobalFiles
      ? [
          {
            label: t('files'),
            icon: FolderOpen,
            href: '/dashboard/files',
            isActive: pathname === '/dashboard/files',
          },
          {
            label: t('worldLibrary'),
            icon: Globe,
            href: '/dashboard/world-library',
            isActive: pathname === '/dashboard/world-library',
          },
        ]
      : []),
    {
      label: t('templates'),
      icon: Package,
      href: '/dashboard/templates',
      isActive: pathname === '/dashboard/templates',
    },
    {
      label: t('settings'),
      icon: Settings,
      href: '/dashboard/settings',
      isActive: pathname === '/dashboard/settings',
    },
  ];

  if (!isHydrated) {
    return (
      <div className="fixed left-0 top-0 h-full w-64 bg-[var(--mc-stone)]/95 backdrop-blur-md z-50" style={{ borderRight: "3px solid var(--mc-frame)" }}>
        <div className="mc-titlebar p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-700 rounded animate-pulse" />
            <div className="w-32 h-4 bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 bg-gray-700 rounded animate-pulse" />
              <div className="w-24 h-4 bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed left-0 top-0 h-full bg-[var(--mc-stone)]/95 backdrop-blur-md z-50 transition-[width] duration-300 ease-in-out overflow-hidden flex flex-col"
      style={{ width: isCollapsed ? 64 : 256, borderRight: "3px solid var(--mc-frame)", boxShadow: "inset -3px 0 0 rgba(0,0,0,0.45), inset 3px 0 0 rgba(255,255,255,0.05)" }}
    >
      <div className="mc-titlebar p-4">
        <div className="flex items-center justify-between">
          {inServerView ? (
            <Link
              href="/dashboard/servers"
              className={cn(
                'flex items-center gap-2 overflow-hidden text-gray-300 hover:text-emerald-400 transition-colors',
                isCollapsed ? 'w-0 opacity-0' : 'opacity-100',
              )}
            >
              <ArrowLeft size={18} className="shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-minecraft">{t('back')}</p>
                <p className="font-minecraft text-sm text-white truncate">{serverDisplayName}</p>
              </div>
            </Link>
          ) : (
            <div
              className={cn(
                'flex items-center gap-3 transition-all duration-200 overflow-hidden',
                isCollapsed ? 'opacity-0 w-0' : 'opacity-100',
              )}
            >
              <Image
                src="/images/minecraft-logo.webp"
                alt="Logo"
                width={32}
                height={32}
                className="object-contain shrink-0"
              />
              <h2 className="font-minecraft text-lg text-white whitespace-nowrap">
                {t('minecraftPanel')}
              </h2>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-800/60 text-gray-400 hover:text-white shrink-0"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>

        {inServerView && isCollapsed && (
          <Link href="/dashboard/servers" title={t('back')} className="mt-3 flex justify-center text-gray-400 hover:text-emerald-400 transition-colors">
            <ArrowLeft size={18} />
          </Link>
        )}
      </div>

      {inServerView ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar py-4">
          <SidebarServerNav collapsed={isCollapsed} />
        </div>
      ) : (
        <>
          <div className="p-4 space-y-2">
            <p
              className={cn(
                'text-xs text-gray-400 uppercase tracking-wider font-minecraft mb-3 transition-opacity duration-200',
                isCollapsed ? 'opacity-0' : 'opacity-100',
              )}
            >
              {t('navigation')}
            </p>

            {navigationItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start gap-3 h-10 px-3 rounded-none hover:bg-black/40 hover:text-white text-gray-200 transition-colors',
                    item.isActive && 'bg-emerald-600/25 text-emerald-300 border-2 border-[var(--mc-frame)] shadow-[inset_2px_2px_0_rgba(255,255,255,0.12),inset_-2px_-2px_0_rgba(0,0,0,0.4)]',
                    isCollapsed && 'justify-center px-0',
                  )}
                >
                  <item.icon size={18} className={cn('shrink-0', item.isActive ? 'text-emerald-300' : 'text-gray-400')} />
                  <span
                    className={cn(
                      'font-minecraft text-sm transition-all duration-200 overflow-hidden whitespace-nowrap',
                      isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 block',
                    )}
                  >
                    {item.label}
                  </span>
                </Button>
              </Link>
            ))}
          </div>

          <div className="flex-1" />

          {/* External Links */}
          <div className="p-4 mt-auto shrink-0" style={{ borderTop: "3px solid var(--mc-frame)" }}>
        <p
          className={cn(
            'text-xs text-gray-400 uppercase tracking-wider font-minecraft mb-3 transition-opacity duration-200',
            isCollapsed ? 'opacity-0' : 'opacity-100',
          )}
        >
          {t('links')}
        </p>
        <div className={cn('flex gap-2', isCollapsed ? 'flex-col items-center' : 'flex-wrap')}>
          <a
            href="https://minepanel.ketbome.com"
            target="_blank"
            rel="noopener noreferrer"
            title={t('documentation')}
          >
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'gap-2 text-gray-400 hover:text-emerald-400 hover:bg-gray-800/60',
                isCollapsed ? 'p-2' : 'px-3',
              )}
            >
              <BookOpen size={16} />
              {!isCollapsed && <span className="text-xs">{t('documentation')}</span>}
            </Button>
          </a>
          <a
            href="https://github.com/Ketbome/minepanel"
            target="_blank"
            rel="noopener noreferrer"
            title={t('github')}
          >
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'gap-2 text-gray-400 hover:text-white hover:bg-gray-800/60',
                isCollapsed ? 'p-2' : 'px-3',
              )}
            >
              <GithubIcon size={16} />
              {!isCollapsed && <span className="text-xs">{t('github')}</span>}
            </Button>
          </a>
          <a
            href="https://github.com/Ketbome/minepanel/issues/new/choose"
            target="_blank"
            rel="noopener noreferrer"
            title={t('reportBug')}
          >
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'gap-2 text-gray-400 hover:text-amber-400 hover:bg-gray-800/60',
                isCollapsed ? 'p-2' : 'px-3',
              )}
            >
              <Bug size={16} />
              {!isCollapsed && <span className="text-xs">{t('reportBug')}</span>}
            </Button>
          </a>
        </div>
          </div>
        </>
      )}
    </div>
  );
}
