'use client';

import { FC, useEffect, useState } from 'react';
import Image from 'next/image';
import { ExternalLink, HelpCircle, Loader2, Pencil, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { ServerConfig } from '@/lib/types/types';
import { ModpackFilePicker } from '@/components/molecules/ModpackFilePicker';
import {
  CurseForgeModpack,
  formatDownloadCount,
  getModpackFiles,
  resolveModpack,
} from '@/services/curseforge/curseforge.service';
import { ModVersionItem } from '@/services/mods/mods-browser.service';

const LATEST_VALUE = '__latest__';
const MODPACK_URL_BASE = 'https://www.curseforge.com/minecraft/modpacks';

type CfMethod = 'url' | 'slug' | 'file';

export const parseModpackUrl = (url: string): { slug?: string; fileId?: string } => {
  const match = /curseforge\.com\/minecraft\/modpacks\/([^/?#]+)(?:\/(?:download|files)\/(\d+))?/i.exec(
    url.trim(),
  );
  if (!match) return {};
  return { slug: match[1], fileId: match[2] };
};

interface CurseForgeModpackSectionProps {
  serverId: string;
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
  onBrowse: () => void;
}

export const CurseForgeModpackSection: FC<CurseForgeModpackSectionProps> = ({
  serverId,
  config,
  updateConfig,
  onBrowse,
}) => {
  const { t } = useLanguage();
  const [isManual, setIsManual] = useState(false);
  const [modpack, setModpack] = useState<CurseForgeModpack | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [files, setFiles] = useState<ModVersionItem[] | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  const method = (config.cfMethod as CfMethod) || 'url';
  const parsedUrl = parseModpackUrl(config.cfUrl || '');
  const ref = method === 'slug' ? (config.cfSlug || '').trim() : (parsedUrl.slug ?? '');
  const fileId = method === 'slug' ? (config.cfFile || '').trim() : (parsedUrl.fileId ?? '');

  useEffect(() => {
    setFiles(null);
  }, [ref]);

  useEffect(() => {
    if (!ref) {
      setModpack(null);
      return;
    }

    let cancelled = false;
    setIsResolving(true);
    const timeout = setTimeout(() => {
      resolveModpack(ref)
        .then((result) => {
          if (!cancelled) setModpack(result);
        })
        .catch((error) => {
          console.error('Error resolving modpack:', error);
          if (!cancelled) setModpack(null);
        })
        .finally(() => {
          if (!cancelled) setIsResolving(false);
        });
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [ref]);

  const loadFiles = async () => {
    if (files || isLoadingFiles || !ref) return;
    setIsLoadingFiles(true);
    try {
      setFiles(await getModpackFiles(ref));
    } catch (error) {
      console.error('Error loading modpack files:', error);
      setFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const setFile = (nextFileId?: string) => {
    if (method === 'slug') {
      updateConfig('cfFile', nextFileId ?? '');
      return;
    }

    const slug = ref || parsedUrl.slug;
    if (!slug) return;
    updateConfig('cfUrl', nextFileId ? `${MODPACK_URL_BASE}/${slug}/download/${nextFileId}` : `${MODPACK_URL_BASE}/${slug}`);
  };

  const clearModpack = () => {
    if (method === 'slug') {
      updateConfig('cfSlug', '');
      updateConfig('cfFile', '');
      return;
    }
    updateConfig('cfUrl', '');
  };

  const selectedFile = files?.find((file) => file.versionId === fileId);
  const fileLabel = fileId ? (selectedFile?.name ?? fileId) : t('modVersionLatest');

  const methodOptions: Array<{ value: CfMethod; label: string; description: string }> = [
    { value: 'url', label: t('methodUrl'), description: t('installFromUrl') },
    { value: 'slug', label: t('methodSlug'), description: t('useIdSlug') },
    { value: 'file', label: t('methodFile'), description: t('useLocalFile') },
  ];

  return (
    <div className="space-y-3 p-4 rounded-md bg-emerald-900/10 border-2 border-emerald-500/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-emerald-400 font-minecraft text-sm flex items-center gap-2">
          <Image src="/images/enchanted-book.webp" alt="Modpack" width={16} height={16} />
          {t('installationMethod')}
        </Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBrowse}
            className="h-8 text-xs px-3 font-minecraft border-emerald-500/50 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-500/30 hover:text-emerald-200"
          >
            <Search className="h-3 w-3 mr-1" />
            {t('browse')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsManual(!isManual)}
            className="h-8 text-xs px-3 font-minecraft bg-gray-800/70 border-gray-700/50 text-gray-300 hover:bg-gray-700/50 hover:text-gray-100"
          >
            <Pencil className="h-3 w-3 mr-1" />
            {isManual ? t('modsListVisual') : t('modsListManual')}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-emerald-700/30">
                  <HelpCircle className="h-4 w-4 text-emerald-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-md bg-gray-800 border-gray-700 text-gray-200">
                <p>{t('installationMethodHelp')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {methodOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => updateConfig('cfMethod', option.value)}
            className={`border-2 px-3 py-2 text-left transition-colors ${
              method === option.value
                ? 'border-[var(--mc-emerald)] bg-[var(--mc-emerald)]/10 text-[var(--mc-emerald)]'
                : 'border-[var(--mc-frame)] bg-gray-900/50 text-gray-300 hover:bg-gray-800/60'
            }`}
          >
            <p className="font-minecraft text-xs">{option.label}</p>
            <p className="mt-0.5 text-[11px] text-gray-500">{option.description}</p>
          </button>
        ))}
      </div>

      {method === 'file' ? (
        <div className="space-y-2 border-2 border-[var(--mc-frame)] bg-gray-900/50 p-3">
          <Label className="text-gray-200 font-minecraft text-xs flex items-center gap-2">
            <Image src="/images/book.webp" alt="Modpack" width={16} height={16} />
            {t('modpackFiles')}
          </Label>
          <ModpackFilePicker
            serverId={serverId}
            value={config.cfModpackZip}
            onChange={(containerPath) => updateConfig('cfModpackZip', containerPath)}
            accept=".zip"
          />
        </div>
      ) : isManual ? (
        <div className="space-y-3">
          {method === 'url' ? (
            <div className="space-y-1">
              <Label htmlFor="cfUrl" className="text-gray-300 font-minecraft text-xs">
                {t('modpackUrl')}
              </Label>
              <Input
                id="cfUrl"
                value={config.cfUrl}
                onChange={(event) => updateConfig('cfUrl', event.target.value)}
                placeholder={`${MODPACK_URL_BASE}/all-the-mods-7/download/3855588`}
                className="bg-gray-800/70 text-gray-200 border-gray-700/50 font-mono text-xs"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cfSlug" className="text-gray-300 font-minecraft text-xs">
                  {t('curseForgeProject')}
                </Label>
                <Input
                  id="cfSlug"
                  value={config.cfSlug}
                  onChange={(event) => updateConfig('cfSlug', event.target.value)}
                  placeholder="all-the-mods-7"
                  className="bg-gray-800/70 text-gray-200 border-gray-700/50 font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cfFile" className="text-gray-300 font-minecraft text-xs">
                  {t('fileId')}
                </Label>
                <Input
                  id="cfFile"
                  value={config.cfFile}
                  onChange={(event) => updateConfig('cfFile', event.target.value)}
                  placeholder="3855588"
                  className="bg-gray-800/70 text-gray-200 border-gray-700/50 font-mono text-xs"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="cfFilenameMatcher" className="text-gray-300 font-minecraft text-xs">
              {t('filePattern')}
            </Label>
            <Input
              id="cfFilenameMatcher"
              value={config.cfFilenameMatcher}
              onChange={(event) => updateConfig('cfFilenameMatcher', event.target.value)}
              placeholder="1.20.1"
              className="bg-gray-800/70 text-gray-200 border-gray-700/50 font-mono text-xs"
            />
            <p className="text-[11px] text-gray-500">{t('filePatternDesc')}</p>
          </div>
        </div>
      ) : !ref ? (
        <div className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-700/60 bg-gray-900/30 px-4 py-8 text-center">
          <p className="font-minecraft text-sm text-gray-300">{t('modpackNotSelected')}</p>
          <p className="text-xs text-gray-500">{t('browseModpacksDesc')}</p>
        </div>
      ) : (
        <div className="border-2 border-[var(--mc-frame)] bg-gray-900/50 p-3 space-y-3">
          <div className="flex items-start gap-3">
            {modpack?.logo?.thumbnailUrl ? (
              <Image
                src={modpack.logo.thumbnailUrl}
                alt={modpack.name}
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 border-2 border-[var(--mc-frame)] object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-[var(--mc-frame)] bg-gray-800/80">
                {isResolving && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate font-minecraft text-sm text-gray-100">{modpack?.name ?? ref}</p>
              <p className="line-clamp-2 text-xs text-gray-400">{modpack?.summary ?? ''}</p>
              <p className="mt-1 truncate text-[11px] text-gray-500">
                {ref}
                {modpack ? ` · ${formatDownloadCount(modpack.downloadCount)}` : ''}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {modpack?.links?.websiteUrl && (
                <a
                  href={modpack.links.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={modpack.name}
                  className="flex h-8 w-8 items-center justify-center text-gray-500 transition-colors hover:text-emerald-400"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title={t('removeModpack')}
                onClick={clearModpack}
                className="h-8 w-8 bg-transparent text-gray-500 hover:bg-rose-900/30 hover:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-minecraft text-[11px] uppercase tracking-wide text-gray-500">
              {t('modpackVersion')}
            </span>
            <Select
              value={fileId || LATEST_VALUE}
              onValueChange={(value) => setFile(value === LATEST_VALUE ? undefined : value)}
              onOpenChange={(open) => {
                if (open) void loadFiles();
              }}
            >
              <SelectTrigger className="h-8 w-full min-w-0 sm:w-80 bg-gray-900/70 border-gray-700/50 text-gray-200 text-xs">
                <SelectValue>
                  <span className="truncate">{fileLabel}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-gray-200 max-h-72">
                <SelectItem value={LATEST_VALUE} className="text-xs">
                  {t('modVersionLatest')}
                </SelectItem>
                {isLoadingFiles && (
                  <div className="flex items-center gap-2 px-2 py-2 text-xs text-gray-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t('loading')}
                  </div>
                )}
                {fileId && !selectedFile && !isLoadingFiles && (
                  <SelectItem value={fileId} className="text-xs">
                    {fileId}
                  </SelectItem>
                )}
                {(files ?? []).map((file) => (
                  <SelectItem key={file.versionId} value={file.versionId} className="text-xs">
                    <span className="truncate">{file.name}</span>
                    <span className="ml-2 text-[10px] uppercase text-gray-500">{file.releaseType}</span>
                  </SelectItem>
                ))}
                {files?.length === 0 && !isLoadingFiles && (
                  <div className="px-2 py-2 text-xs text-gray-500">{t('modVersionsEmpty')}</div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
};
