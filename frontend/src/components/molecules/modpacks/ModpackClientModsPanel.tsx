'use client';

import { FC, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Scissors, SearchCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { mcToast } from '@/lib/utils/minecraft-toast';
import { TranslationKey } from '@/lib/translations';
import { ModJarInfo, ModSide, modpacksService } from '@/services/modpacks/modpacks.service';

const SIDE_LABEL: Record<ModSide, TranslationKey> = {
  client: 'modsSideClient',
  'known-client': 'modsSideKnownClient',
  server: 'modsSideServer',
  both: 'modsSideBoth',
  unknown: 'modsSideUnknown',
};

const SIDE_STYLE: Record<ModSide, string> = {
  client: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  'known-client': 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  server: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  both: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  unknown: 'border-gray-600/60 bg-gray-800/70 text-gray-400',
};

const isClientSide = (mod: ModJarInfo) => mod.side === 'client' || mod.side === 'known-client';

interface ModpackClientModsPanelProps {
  readonly serverId: string;
  /** Container path of the archive currently selected, e.g. /modpacks/pack.zip */
  readonly containerPath: string;
  /** Called with the container path of the filtered copy once it is written. */
  readonly onStripped: (containerPath: string) => void;
}

export const ModpackClientModsPanel: FC<ModpackClientModsPanelProps> = ({ serverId, containerPath, onStripped }) => {
  const { t } = useLanguage();
  const [mods, setMods] = useState<ModJarInfo[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [isStripping, setIsStripping] = useState(false);

  const fileName = containerPath.split('/').pop() ?? '';

  const scan = async () => {
    setIsScanning(true);
    try {
      const result = await modpacksService.scanMods(serverId, fileName);
      setMods(result.mods);
      setTruncated(result.truncated);
      // What the jar itself declares, plus what the known list flags, is the
      // starting selection; everything else stays untouched by default.
      setSelected(new Set(result.mods.filter(isClientSide).map((mod) => mod.entry)));
    } catch {
      mcToast.error(t('modsScanError'));
    } finally {
      setIsScanning(false);
    }
  };

  const strip = async () => {
    setIsStripping(true);
    try {
      const stripped = await modpacksService.stripMods(serverId, fileName, [...selected]);
      onStripped(stripped.containerPath);
      mcToast.success(t('modsStripped').replace('{name}', stripped.name));
      setMods(null);
    } catch {
      mcToast.error(t('modsStripError'));
    } finally {
      setIsStripping(false);
    }
  };

  const counts = useMemo(() => {
    const all = mods ?? [];
    return { total: all.length, client: all.filter(isClientSide).length, unknown: all.filter((mod) => mod.side === 'unknown').length };
  }, [mods]);

  if (!mods) {
    return (
      <div className="space-y-2 border-2 border-[var(--mc-frame)] bg-gray-900/50 p-3">
        <p className="font-minecraft text-xs text-gray-200">{t('modsReviewTitle')}</p>
        <p className="text-[11px] leading-relaxed text-gray-400">{t('modsReviewIntro')}</p>
        <Button type="button" variant="minepanelOutline" onClick={scan} disabled={isScanning} className="h-9 font-minecraft text-xs">
          {isScanning ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <SearchCheck className="mr-1.5 h-3.5 w-3.5" />}
          {isScanning ? t('modsReviewScanning') : t('modsReviewAction')}
        </Button>
      </div>
    );
  }

  if (counts.total === 0) {
    return (
      <p className="border-2 border-[var(--mc-frame)] bg-gray-900/50 px-3 py-2 text-[11px] text-gray-400">{t('modsReviewNone')}</p>
    );
  }

  const toggle = (entry: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(entry)) next.delete(entry);
      else next.add(entry);
      return next;
    });
  };

  return (
    <div className="space-y-3 border-2 border-[var(--mc-frame)] bg-gray-900/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-minecraft text-xs text-gray-200">{t('modsReviewTitle')}</p>
        <p className="font-minecraft text-[11px] uppercase tracking-wide text-gray-500">
          {t('modsReviewCount').replace('{count}', String(counts.total)).replace('{client}', String(counts.client))}
        </p>
      </div>

      {counts.unknown > 0 && (
        <p className="flex items-start gap-2 border-2 border-amber-500/40 bg-amber-900/15 p-2 text-[11px] leading-relaxed text-amber-100/80">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          {t('modsReviewUndeclared').replace('{count}', String(counts.unknown))}
        </p>
      )}

      {truncated && <p className="text-[11px] text-gray-500">{t('modsReviewTruncated')}</p>}

      <div className="max-h-72 space-y-1 overflow-y-auto">
        {mods.map((mod) => (
          <label
            key={mod.entry}
            className={`flex cursor-pointer items-center gap-2 border px-2 py-1.5 transition-colors ${selected.has(mod.entry) ? 'border-rose-500/40 bg-rose-500/5' : 'border-gray-700/50 bg-gray-900/40'}`}
          >
            <input type="checkbox" checked={selected.has(mod.entry)} onChange={() => toggle(mod.entry)} className="accent-rose-500" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-gray-200">{mod.name ?? mod.modId ?? mod.fileName}</span>
              <span className="block truncate text-[10px] text-gray-500">{mod.fileName}</span>
            </span>
            <span className={`shrink-0 border px-1.5 py-0.5 font-minecraft text-[10px] uppercase ${SIDE_STYLE[mod.side]}`}>{t(SIDE_LABEL[mod.side])}</span>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={strip} disabled={selected.size === 0 || isStripping} className="h-9 font-minecraft text-xs">
          {isStripping ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Scissors className="mr-1.5 h-3.5 w-3.5" />}
          {t('modsStripAction').replace('{count}', String(selected.size))}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setMods(null)} className="h-9 px-2 font-minecraft text-xs text-gray-400 hover:text-gray-200">
          {t('cancel')}
        </Button>
      </div>

      <p className="text-[11px] text-gray-500">{t('modsStripHint')}</p>
    </div>
  );
};
