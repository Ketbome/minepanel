'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Search, Loader2, Plus, Filter, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { mcToast } from '@/lib/utils/minecraft-toast';
import {
  ModLoader,
  ModProvider,
  ModSearchItem,
  ModVersionItem,
  fetchModVersions,
  searchModsByProvider,
} from '@/services/mods/mods-browser.service';

interface ModsBrowserDialogProps {
  open: boolean;
  onClose: () => void;
  provider: ModProvider;
  minecraftVersion: string;
  loader?: ModLoader;
  isAdded: (mod: ModSearchItem) => boolean;
  onToggle: (
    mod: ModSearchItem,
    insertAs: 'slug' | 'id',
    version?: string,
  ) => 'added' | 'removed' | 'noop';
}

const PAGE_SIZE_BY_PROVIDER: Record<ModProvider, number> = {
  curseforge: 9,
  modrinth: 9,
};

// Newest release first, so pinning picks the version a player would pick.
const pickLatestVersion = (versions: ModVersionItem[]): ModVersionItem | undefined => {
  const byDate = [...versions].sort(
    (a, b) => new Date(b.datePublished ?? 0).getTime() - new Date(a.datePublished ?? 0).getTime(),
  );
  return byDate.find((version) => version.releaseType === 'release') ?? byDate[0];
};

const formatDownloads = (count?: number): string => {
  if (!count) return '0';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return `${count}`;
};

export function ModsBrowserDialog({
  open,
  onClose,
  provider,
  minecraftVersion,
  loader,
  isAdded,
  onToggle,
}: Readonly<ModsBrowserDialogProps>) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [insertAs, setInsertAs] = useState<'slug' | 'id'>('slug');
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [results, setResults] = useState<ModSearchItem[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pinningId, setPinningId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const pageSize = PAGE_SIZE_BY_PROVIDER[provider];

  const providerLabel = useMemo(() => {
    return provider === 'curseforge' ? 'CurseForge' : 'Modrinth';
  }, [provider]);

  const fetchPage = useCallback(
    async (nextPageIndex: number, reset: boolean = false) => {
      if (!open || !minecraftVersion) return;

      if (reset) {
        setIsLoadingInitial(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const response = await searchModsByProvider(provider, {
          q: query.trim() || undefined,
          minecraftVersion,
          loader,
          pageSize,
          index: nextPageIndex * pageSize,
          limit: pageSize,
          offset: nextPageIndex * pageSize,
        });

        setResults((prev) => {
          const incoming = response.data;
          if (reset) return incoming;

          const seen = new Set(prev.map((item) => `${item.provider}:${item.projectId}`));
          const merged = [...prev];
          for (const item of incoming) {
            const key = `${item.provider}:${item.projectId}`;
            if (!seen.has(key)) {
              merged.push(item);
              seen.add(key);
            }
          }
          return merged;
        });

        const newCount = response.data.length;
        const fetchedSoFar = (nextPageIndex + 1) * pageSize;
        const more = newCount > 0 && fetchedSoFar < response.pagination.totalCount;
        setHasMore(more);
        setPageIndex(nextPageIndex);
      } catch (error) {
        console.error('Error searching mods:', error);
        mcToast.error(t('errorSearchingMods'));
      } finally {
        setIsLoadingInitial(false);
        setIsLoadingMore(false);
      }
    },
    [open, minecraftVersion, provider, query, loader, pageSize, t],
  );

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => {
      setPageIndex(0);
      setHasMore(true);
      fetchPage(0, true);
    }, 350);

    return () => clearTimeout(timeout);
  }, [open, query, provider, minecraftVersion, loader, fetchPage]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !open || !hasMore || isLoadingInitial || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && hasMore && !isLoadingMore) {
          void fetchPage(pageIndex + 1, false);
        }
      },
      { root: null, rootMargin: '200px', threshold: 0.1 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [open, hasMore, isLoadingInitial, isLoadingMore, pageIndex, fetchPage]);

  const handleToggleMod = async (mod: ModSearchItem) => {
    const ref = insertAs === 'id' ? mod.projectId : mod.slug;

    if (isAdded(mod)) {
      const status = onToggle(mod, insertAs);
      if (status === 'removed') mcToast.success(t('removeMod'));
      return;
    }

    setPinningId(mod.projectId);
    let version: ModVersionItem | undefined;
    try {
      version = pickLatestVersion(
        await fetchModVersions(provider, ref, {
          minecraftVersion:
            minecraftVersion && minecraftVersion !== 'latest' ? minecraftVersion : undefined,
          loader,
        }),
      );
    } catch (error) {
      console.error('Error resolving latest mod version:', error);
    } finally {
      setPinningId(null);
    }

    const status = onToggle(mod, insertAs, version?.versionId);
    if (status === 'added') {
      mcToast.success(`${t('addMod')}: ${ref}${version ? ` (${version.name})` : ''}`);
      return;
    }
    if (status === 'removed') {
      mcToast.success(t('removeMod'));
      return;
    }
    mcToast.error(t('alreadyAdded'));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[min(96vw,80rem)] sm:max-w-none max-h-[88vh] overflow-hidden bg-gray-900 border border-gray-700 text-white p-0 flex flex-col">
        <div className="shrink-0 border-b border-gray-700 bg-gray-900 px-6 py-5 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <DialogTitle className="text-xl font-minecraft text-emerald-400 flex items-center gap-2">
              <Search className="h-5 w-5" />
              {t('searchMods')} - {providerLabel}
            </DialogTitle>
            <p className="text-xs text-gray-400">
              {t('searchModsDesc')} <span className="text-gray-200">{minecraftVersion}</span>
              {loader ? <span className="text-gray-200"> / {loader}</span> : ''}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-3">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchMods')}
                className="h-11 pl-10 bg-gray-800 border-gray-600/80 text-white font-minecraft tracking-wide focus:border-emerald-500/60"
              />
            </div>
            <Select value={insertAs} onValueChange={(value: 'slug' | 'id') => setInsertAs(value)}>
              <SelectTrigger className="h-11 w-full bg-gray-800 border-gray-600/80 text-gray-200 font-minecraft text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                <SelectItem value="slug">{t('insertAsSlug')}</SelectItem>
                <SelectItem value="id">{t('insertAsId')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="flex items-center gap-2 text-blue-300">
              <Filter className="h-3.5 w-3.5" />
              {t('compatibilityFiltered')}
            </span>
            {!loader && <span className="text-amber-300/90">{t('loaderNotDetected')}</span>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoadingInitial ? (
            <div className="flex flex-col items-center justify-center py-14">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
              <p className="text-sm text-gray-400 mt-2">{t('loading')}</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <Image
                src="/images/barrier.webp"
                alt="No results"
                width={50}
                height={50}
                className="opacity-60 mb-4"
              />
              <p className="font-minecraft text-sm">{t('noCompatibleModsFound')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {results.map((mod) => (
                <div
                  key={`${provider}-${mod.projectId}`}
                  className="flex flex-col border-2 border-[var(--mc-frame)] bg-gray-800/60 p-4"
                >
                  <div className="flex gap-3 items-start">
                    {mod.iconUrl ? (
                      <Image
                        src={mod.iconUrl}
                        alt={mod.name}
                        width={48}
                        height={48}
                        className="h-12 w-12 object-cover shrink-0 border-2 border-[var(--mc-frame)]"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-gray-700/60 shrink-0 border-2 border-[var(--mc-frame)]" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-minecraft text-sm text-white leading-snug line-clamp-2">
                        {mod.name}
                      </h4>
                      <p className="mt-1 text-[11px] text-gray-500 truncate">
                        {mod.slug} · {formatDownloads(mod.downloads)}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-gray-300/90 line-clamp-2 leading-relaxed min-h-10">
                    {mod.summary || '-'}
                  </p>

                  <div className="mt-3 flex items-center gap-1.5 flex-wrap min-h-6 content-start">
                    {(mod.supportedLoaders || []).slice(0, 4).map((modLoader) => (
                      <Badge
                        key={`${mod.projectId}-${modLoader}`}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 bg-emerald-900/40 text-emerald-300"
                      >
                        {modLoader}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-auto pt-4">
                    {isAdded(mod) ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleToggleMod(mod)}
                        className="w-full bg-rose-600 hover:bg-rose-500 text-white"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('removeMod')}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        disabled={pinningId === mod.projectId}
                        onClick={() => void handleToggleMod(mod)}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        {pinningId === mod.projectId ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        {t('addMod')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <div
                ref={loadMoreRef}
                className="h-10 col-span-full flex items-center justify-center"
              >
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('loading')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
