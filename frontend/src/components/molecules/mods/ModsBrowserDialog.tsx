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
  searchModsByProvider,
} from '@/services/mods/mods-browser.service';

interface ModsBrowserDialogProps {
  open: boolean;
  onClose: () => void;
  provider: ModProvider;
  minecraftVersion: string;
  loader?: ModLoader;
  isAdded: (mod: ModSearchItem) => boolean;
  onToggle: (mod: ModSearchItem, insertAs: 'slug' | 'id') => 'added' | 'removed' | 'noop';
}

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
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const pageSize = 6;

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
    [open, minecraftVersion, provider, query, loader, t],
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

  const handleToggleMod = (mod: ModSearchItem) => {
    const status = onToggle(mod, insertAs);
    if (status === 'added') {
      mcToast.success(`${t('addMod')}: ${insertAs === 'id' ? mod.projectId : mod.slug}`);
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
      <DialogContent className="max-w-5xl max-h-[82vh] overflow-hidden bg-gray-900 border border-gray-700 text-white p-0">
        <div className="sticky top-0 z-10 border-b border-gray-700 bg-gray-900 px-6 py-4 space-y-3">
          <DialogTitle className="text-xl font-minecraft text-emerald-400 flex items-center gap-2">
            <Search className="h-5 w-5" />
            {t('searchMods')} - {providerLabel}
          </DialogTitle>
          <p className="text-xs text-gray-400">
            {t('searchModsDesc')} {minecraftVersion}
            {loader ? ` / ${loader}` : ''}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchMods')}
                className="h-12 text-lg pl-11 bg-gray-800 border-gray-600/80 text-white font-minecraft tracking-wide focus:border-emerald-500/60"
              />
            </div>
            <Select value={insertAs} onValueChange={(value: 'slug' | 'id') => setInsertAs(value)}>
              <SelectTrigger className="h-12 w-full bg-gray-800 border-gray-600/80 text-gray-200 font-minecraft">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                <SelectItem value="slug">{t('insertAsSlug')}</SelectItem>
                <SelectItem value="id">{t('insertAsId')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-xs text-blue-300">
            <Filter className="h-3.5 w-3.5" />
            {t('compatibilityFiltered')}
          </div>
          {!loader && <p className="text-xs text-amber-300/90">{t('loaderNotDetected')}</p>}
        </div>

        <div className="overflow-y-auto max-h-[calc(82vh-165px)] p-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((mod) => (
                <div
                  key={`${provider}-${mod.projectId}`}
                  className="rounded-xl border border-slate-600/60 bg-linear-to-b from-slate-800/60 to-slate-900/60 p-4 min-h-67.5 flex flex-col"
                >
                  <div className="flex gap-3 items-start">
                    {mod.iconUrl ? (
                      <Image
                        src={mod.iconUrl}
                        alt={mod.name}
                        width={52}
                        height={52}
                        className="rounded-lg h-12 w-12 object-cover shrink-0 ring-1 ring-slate-500/60"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-slate-700/60 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-minecraft text-base text-white truncate">{mod.name}</h4>
                      <p className="text-sm text-slate-300/90 line-clamp-3 mt-1 leading-relaxed min-h-18">
                        {mod.summary || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 flex-wrap min-h-18 content-start">
                    <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-100">
                      slug: {mod.slug}
                    </Badge>
                    <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-100">
                      id: {mod.projectId}
                    </Badge>
                    <Badge variant="secondary" className="text-xs bg-blue-900/40 text-blue-300">
                      {formatDownloads(mod.downloads)}
                    </Badge>
                    {(mod.supportedLoaders || []).slice(0, 3).map((modLoader) => (
                      <Badge
                        key={`${mod.projectId}-${modLoader}`}
                        variant="secondary"
                        className="text-xs bg-emerald-900/40 text-emerald-300"
                      >
                        {modLoader}
                      </Badge>
                    ))}
                    {(mod.supportedVersions || []).slice(0, 2).map((version) => (
                      <Badge
                        key={`${mod.projectId}-${version}`}
                        variant="secondary"
                        className="text-xs bg-violet-900/40 text-violet-300"
                      >
                        {version}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-auto pt-4">
                    {isAdded(mod) ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleToggleMod(mod)}
                        className="w-full bg-rose-600 hover:bg-rose-500 text-white"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('removeMod')}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleToggleMod(mod)}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
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
