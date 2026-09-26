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
          'relative flex h-10 w-full items-center gap-3 px-3 text-left transition-colors',
          isActive
            ? 'bg-[var(--mc-emerald)]/12 text-[var(--mc-emerald)] shadow-[inset_2px_2px_0_rgba(0,0,0,0.45),inset_-2px_-2px_0_rgba(255,255,255,0.05)]'
            : 'text-gray-300 hover:bg-black/35 hover:text-white',
          item.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-gray-300',
          collapsed && 'justify-center px-0',
        )}
      >
        {isActive && <span className="absolute left-0 top-0 h-full w-[3px] bg-[var(--mc-emerald)]" />}
        <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-[var(--mc-emerald)]' : 'text-gray-500')} />
        {!collapsed && <span className="font-minecraft font-medium text-sm whitespace-nowrap">{item.label}</span>}
      </button>
    );
  };

  if (collapsed) {
    return (
      <nav className="flex flex-col gap-0.5 px-2">
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
            <div key={group} className="space-y-0.5">
              <p className="mb-2 px-3 font-minecraft text-xs uppercase tracking-[0.08em] text-gray-500">{t(groupLabelKey[group])}</p>
              {groupItems.map((item) => renderButton(item))}
            </div>
          );
        })}
      </nav>
    </div>
  );
};
