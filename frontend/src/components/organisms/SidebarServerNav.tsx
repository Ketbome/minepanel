'use client';

import { FC } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useServerNavStore, type ServerNavGroup, type ServerNavItem } from '@/lib/store/server-nav-store';
import { TabSearch } from './TabSearch';
import type { TranslationKey } from '@/lib/translations';

const groupOrder: ServerNavGroup[] = ['config', 'operation', 'monitoring'];
const groupLabelKey: Record<ServerNavGroup, TranslationKey> = {
  config: 'tabGroupConfig',
  operation: 'tabGroupOperation',
  monitoring: 'tabGroupMonitoring',
};

const goToTab = (value: string) => {
  if (typeof window !== 'undefined') {
    window.location.hash = value;
  }
};

interface SidebarServerNavProps {
  collapsed: boolean;
}

export const SidebarServerNav: FC<SidebarServerNavProps> = ({ collapsed }) => {
  const { t } = useLanguage();
  const items = useServerNavStore((state) => state.items);
  const active = useServerNavStore((state) => state.active);
  const paletteItems = useServerNavStore((state) => state.paletteItems);

  const renderButton = (item: ServerNavItem) => {
    const Icon = item.icon;
    const isActive = active === item.value;
    return (
      <button
        key={item.value}
        type="button"
        disabled={item.disabled}
        onClick={() => goToTab(item.value)}
        title={collapsed ? item.label : undefined}
        className={cn(
          'flex w-full items-center gap-3 border-2 px-3 py-2.5 text-left font-minecraft transition-colors',
          isActive ? 'border-[var(--mc-frame)] bg-emerald-600/25 text-emerald-300 shadow-[inset_2px_2px_0_rgba(255,255,255,0.12),inset_-2px_-2px_0_rgba(0,0,0,0.4)]' : 'border-transparent text-gray-300 hover:bg-black/40 hover:text-white',
          item.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-gray-300',
          collapsed && 'justify-center px-0',
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="font-minecraft text-sm whitespace-nowrap">{item.label}</span>}
      </button>
    );
  };

  if (collapsed) {
    return (
      <nav className="flex flex-col gap-1 px-2">
        <TabSearch items={paletteItems} onSelect={goToTab} collapsed />
        {items.map((item) => renderButton(item))}
      </nav>
    );
  }

  return (
    <div className="px-2">
      <div className="mb-3">
        <TabSearch items={paletteItems} onSelect={goToTab} />
      </div>

      <nav className="space-y-4">
        {groupOrder.map((group) => {
          const groupItems = items.filter((item) => item.group === group);
          if (groupItems.length === 0) return null;
          return (
            <div key={group} className="space-y-1">
              <p className="px-3 font-minecraft text-[10px] uppercase tracking-[0.25em] text-emerald-300/70">{t(groupLabelKey[group])}</p>
              {groupItems.map((item) => renderButton(item))}
            </div>
          );
        })}
      </nav>
    </div>
  );
};
