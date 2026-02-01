'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  Plus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  LayoutDashboard,
  Settings,
  Package,
  FolderOpen,
  BookOpen,
  Bug,
} from 'lucide-react';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useUIStore, useServersStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { getStatusColor, getStatusBadgeClassCompact } from '@/lib/utils/server-status';

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
  const [isHydrated, setIsHydrated] = useState(false);

  // Use global servers store
  const servers = useServersStore((state) => state.servers);
  const isLoading = useServersStore((state) => state.isLoading);
  const fetchServers = useServersStore((state) => state.fetchServers);
  const updateStatuses = useServersStore((state) => state.updateStatuses);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return t('online');
      case 'stopped':
        return t('stopped');
      case 'loading':
        return t('loading');
      case 'starting':
        return t('starting');
      default:
        return t('error');
    }
  };

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    // Initial fetch only if servers are empty
    if (servers.length === 0) {
      fetchServers();
    }

    // Update statuses every 10 seconds
    const interval = setInterval(updateStatuses, 10000);
    return () => clearInterval(interval);
  }, [isHydrated, servers.length, fetchServers, updateStatuses]);

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
    {
      label: t('files'),
      icon: FolderOpen,
      href: '/dashboard/files',
      isActive: pathname === '/dashboard/files',
    },
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
      <div className="fixed left-0 top-0 h-full w-64 bg-gray-900/95 backdrop-blur-md border-r border-gray-700/60 shadow-2xl z-50">
        <div className="p-4 border-b border-gray-700/60">
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
      className="fixed left-0 top-0 h-full bg-gray-900/95 backdrop-blur-md border-r border-gray-700/60 shadow-2xl z-50 transition-[width] duration-300 ease-in-out overflow-hidden flex flex-col"
      style={{ width: isCollapsed ? 64 : 256 }}
    >
      <div className="p-4 border-b border-gray-700/60">
        <div className="flex items-center justify-between">
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

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-800/60 text-gray-400 hover:text-white shrink-0"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>
      </div>

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
                'w-full justify-start gap-3 h-10 px-3 hover:bg-gray-800/60 hover:text-white text-white transition-colors',
                item.isActive && 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30',
                isCollapsed && 'justify-center px-0',
              )}
            >
              <item.icon size={18} className="text-gray-400 hover:text-white shrink-0" />
              <span
                className={cn(
                  'font-minecraft text-sm transition-all duration-200 overflow-hidden whitespace-nowrap',
                  isCollapsed ? 'opacity-0 w-0' : 'opacity-100',
                )}
              >
                {item.label}
              </span>
            </Button>
          </Link>
        ))}
      </div>

      <div className="px-4 pb-4 flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <p
            className={cn(
              'text-xs text-gray-400 uppercase tracking-wider font-minecraft transition-opacity duration-200',
              isCollapsed ? 'opacity-0' : 'opacity-100',
            )}
          >
            {t('servers')}
          </p>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchServers()}
              disabled={isLoading}
              className="p-1.5 hover:bg-gray-800/60 text-gray-400 hover:text-white"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            </Button>

            {!isCollapsed && (
              <Link href="/dashboard/servers">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1.5 hover:bg-gray-800/60 text-emerald-400 hover:text-emerald-300"
                >
                  <Plus size={14} />
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="space-y-2 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {servers.map((server) => (
            <Link key={server.id} href={`/dashboard/servers/${server.id}`}>
              <div
                className={cn(
                  'p-3 rounded-lg border transition-colors duration-200',
                  'bg-gray-800/40 border-gray-700/40 hover:bg-gray-700/60',
                  pathname === `/dashboard/servers/${server.id}` &&
                    'bg-emerald-600/20 border-emerald-600/40 text-emerald-400 shadow-lg shadow-emerald-600/10',
                  isCollapsed && 'p-2',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <Image
                      src="/images/grass.webp"
                      alt="Server"
                      width={isCollapsed ? 24 : 32}
                      height={isCollapsed ? 24 : 32}
                      className="object-contain"
                    />
                    <div
                      className={cn(
                        'absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900',
                        getStatusColor(server.status),
                      )}
                    />
                  </div>

                  <div
                    className={cn(
                      'flex-1 min-w-0 transition-all duration-200 overflow-hidden',
                      isCollapsed ? 'opacity-0 w-0' : 'opacity-100',
                    )}
                  >
                    <p className="font-minecraft text-sm font-medium text-white truncate">
                      {server.serverName || server.id}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs px-2 py-0',
                          getStatusBadgeClassCompact(server.status),
                        )}
                      >
                        {getStatusText(server.status)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {servers.length === 0 && !isLoading && (
            <div className={cn('text-center py-4 text-gray-500 text-sm', isCollapsed && 'hidden')}>
              {t('noServers')}
            </div>
          )}
        </div>
      </div>

      {/* External Links */}
      <div className="p-4 border-t border-gray-700/60 mt-auto shrink-0">
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
    </div>
  );
}
