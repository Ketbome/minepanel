'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { FileArchive, Loader2, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { mcToast } from '@/lib/utils/minecraft-toast';
import { LibraryWorld, worldDiscoveryService } from '@/services/world-discovery/world-discovery.service';

const ALL_FOLDERS = '__all__';
const ROOT_FOLDER = '__root__';

const formatSize = (bytes: number): string => {
  if (bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
};

interface WorldLibraryGridProps {
  /** Bumped by the page when an import finishes, so the list picks it up. */
  refreshToken: number;
}

export function WorldLibraryGrid({ refreshToken }: WorldLibraryGridProps) {
  const { t, language } = useLanguage();
  const [worlds, setWorlds] = useState<LibraryWorld[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [folder, setFolder] = useState(ALL_FOLDERS);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setWorlds(await worldDiscoveryService.listLibraryWorlds());
    } catch (error) {
      console.error('Error loading world library:', error);
      mcToast.error(t('worldsLoadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const folders = useMemo(() => {
    const names = new Set<string>();
    for (const world of worlds) names.add(world.folder || ROOT_FOLDER);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [worlds]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return worlds.filter((world) => {
      if (folder !== ALL_FOLDERS && (world.folder || ROOT_FOLDER) !== folder) return false;
      if (!needle) return true;
      return world.source.toLowerCase().includes(needle);
    });
  }, [worlds, query, folder]);

  const formatDate = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString(language);
  };

  const folderChip = (value: string, label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => setFolder(value)}
      className={cn(
        'border-2 px-2.5 py-1 font-minecraft text-[11px] transition-colors',
        folder === value
          ? 'border-[var(--mc-emerald)]/60 bg-[var(--mc-emerald)]/15 text-[var(--mc-emerald)]'
          : 'border-gray-700/60 text-gray-400 hover:text-gray-200',
      )}
    >
      {label}
    </button>
  );

  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg text-emerald-400 font-minecraft flex items-center gap-2">
              <Image
                src="/images/grass.webp"
                alt={t('worldLibrary')}
                width={20}
                height={20}
                className="pixelated"
              />
              {t('savedWorlds')}
              <Badge variant="outline" className="border-gray-600 text-gray-300">
                {worlds.length}
              </Badge>
            </CardTitle>
            <CardDescription className="text-gray-300">{t('savedWorldsDesc')}</CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={load}
            disabled={loading}
            className="text-gray-300 hover:text-white"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchWorlds')}
            className="h-11 pl-10 bg-gray-800 border-gray-600/80 text-white font-minecraft tracking-wide focus:border-emerald-500/60"
          />
        </div>

        {folders.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {folderChip(ALL_FOLDERS, t('allFolders'))}
            {folders.map((name) =>
              folderChip(name, name === ROOT_FOLDER ? t('worldFolderRoot') : name),
            )}
          </div>
        )}

        {loading ? (
          <div className="py-10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            {worlds.length === 0 ? t('worldLibraryEmpty') : t('noWorldsMatch')}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((world) => (
              <div
                key={world.source}
                className="flex gap-3 border-2 border-[var(--mc-frame)] bg-gray-800/60 p-3"
              >
                <div className="h-11 w-11 shrink-0 border-2 border-[var(--mc-frame)] bg-gray-900/60 flex items-center justify-center">
                  {world.type === 'archive' ? (
                    <FileArchive className="h-5 w-5 text-amber-300" />
                  ) : (
                    <Image
                      src="/images/grass.webp"
                      alt=""
                      width={24}
                      height={24}
                      className="pixelated"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className="font-minecraft text-sm text-white leading-snug truncate"
                    title={world.source}
                  >
                    {world.name}
                  </p>
                  {world.folder && (
                    <p className="text-[11px] text-gray-500 truncate" title={world.folder}>
                      {world.folder}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-400">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] px-1.5 py-0',
                        world.type === 'archive'
                          ? 'border-amber-500/50 text-amber-200'
                          : 'border-emerald-500/50 text-emerald-300',
                      )}
                    >
                      {world.type === 'archive' ? t('worldTypeArchive') : t('worldTypeFolder')}
                    </Badge>
                    {world.sizeBytes > 0 && <span>{formatSize(world.sizeBytes)}</span>}
                    <span>{formatDate(world.modifiedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && worlds.length > 0 && (
          <p className="text-xs text-gray-500">
            {t('worldsShownCount')
              .replace('{shown}', String(filtered.length))
              .replace('{total}', String(worlds.length))}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
