import { FC } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, SlidersHorizontal } from 'lucide-react';
import type { ConfigMode } from '@/lib/store/config-mode-store';

interface ConfigModeToggleProps {
  mode: ConfigMode;
  onChange: (mode: ConfigMode) => void;
  hiddenCount: number;
}

export const ConfigModeToggle: FC<ConfigModeToggleProps> = ({ mode, onChange, hiddenCount }) => {
  const { t } = useLanguage();

  const option = (value: ConfigMode, label: string, Icon: typeof Eye) => (
    <button
      key={value}
      type="button"
      onClick={() => onChange(value)}
      aria-pressed={mode === value}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 font-minecraft text-xs transition-colors',
        mode === value
          ? 'bg-[var(--mc-emerald)]/15 text-[var(--mc-emerald)]'
          : 'text-gray-400 hover:text-gray-200',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center border-2 border-gray-700/60 bg-black/25">
              {option('simple', t('simpleMode'), Eye)}
              {option('advanced', t('advancedMode'), SlidersHorizontal)}
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200 max-w-xs">
            <p>{t('configModeHint')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {mode === 'simple' && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => onChange('advanced')}
          className="text-xs text-gray-400 hover:text-[var(--mc-emerald)] transition-colors underline underline-offset-2"
        >
          {t('showHiddenTabs').replace('{count}', String(hiddenCount))}
        </button>
      )}
    </div>
  );
};
