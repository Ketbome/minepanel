'use client';

import { FC, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowUpCircle, HelpCircle, Loader2, Pencil, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { mcToast } from '@/lib/utils/minecraft-toast';
import { ModEntry, parseModEntries, serializeModEntries } from '@/lib/utils/mod-entries';
import {
  ModLoader,
  ModProvider,
  ModSearchItem,
  ModVersionItem,
  fetchLatestModVersions,
  fetchModVersions,
  resolveModVersionsByProvider,
  resolveModsByProvider,
} from '@/services/mods/mods-browser.service';

const LATEST_VALUE = '__latest__';

const ACCENT = {
  emerald: {
    panel: 'bg-emerald-900/10 border-2 border-emerald-500/30',
    label: 'text-emerald-400',
    link: 'text-emerald-400 hover:text-emerald-300',
    action: 'border-emerald-500/50 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-500/30 hover:text-emerald-200',
    icon: 'text-emerald-400',
  },
  blue: {
    panel: 'bg-blue-900/10 border-2 border-blue-500/30',
    label: 'text-blue-400',
    link: 'text-blue-400 hover:text-blue-300',
    action: 'border-blue-500/50 bg-blue-600/20 text-blue-300 hover:bg-blue-500/30 hover:text-blue-200',
    icon: 'text-blue-400',
  },
} as const;

interface ModVersionPickerProps {
  provider: ModProvider;
  entry: ModEntry;
  versionLabel?: string;
  minecraftVersion: string;
  loader?: ModLoader;
  onChange: (version?: string) => void;
}

const ModVersionPicker: FC<ModVersionPickerProps> = ({ provider, entry, versionLabel, minecraftVersion, loader, onChange }) => {
  const { t } = useLanguage();
  const [versions, setVersions] = useState<ModVersionItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadVersions = async () => {
    if (versions || isLoading) return;
    setIsLoading(true);
    try {
      setVersions(
        await fetchModVersions(provider, entry.ref, {
          minecraftVersion: minecraftVersion && minecraftVersion !== 'latest' ? minecraftVersion : undefined,
          loader,
        }),
      );
    } catch (error) {
      console.error('Error loading mod versions:', error);
      mcToast.error(t('errorLoadingVersions'));
      setVersions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const selected = versions?.find((version) => version.versionId === entry.version);
  const label = entry.version
    ? (selected?.name ?? versionLabel ?? entry.version)
    : t('modVersionLatest');

  return (
    <Select
      value={entry.version ?? LATEST_VALUE}
      onValueChange={(value) => onChange(value === LATEST_VALUE ? undefined : value)}
      onOpenChange={(open) => {
        if (open) void loadVersions();
      }}
    >
      <SelectTrigger className="h-8 w-full min-w-0 sm:w-56 bg-gray-900/70 border-gray-700/50 text-gray-200 text-xs">
        <SelectValue>
          <span className="truncate">{label}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-gray-800 border-gray-700 text-gray-200 max-h-72">
        <SelectItem value={LATEST_VALUE} className="text-xs">
          {t('modVersionLatest')}
        </SelectItem>
        {isLoading && (
          <div className="flex items-center gap-2 px-2 py-2 text-xs text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t('loading')}
          </div>
        )}
        {entry.version && !selected && !isLoading && (
          <SelectItem value={entry.version} className="text-xs">
            {versionLabel ?? entry.version}
          </SelectItem>
        )}
        {(versions ?? []).map((version) => (
          <SelectItem key={version.versionId} value={version.versionId} className="text-xs">
            <span className="truncate">{version.name}</span>
            <span className="ml-2 text-[10px] uppercase text-gray-500">{version.releaseType}</span>
          </SelectItem>
        ))}
        {versions?.length === 0 && !isLoading && (
          <div className="px-2 py-2 text-xs text-gray-500">{t('modVersionsEmpty')}</div>
        )}
      </SelectContent>
    </Select>
  );
};

interface ModsListEditorProps {
  id: string;
  provider: ModProvider;
  accent: keyof typeof ACCENT;
  icon: string;
  label: string;
  description: string;
  helpText: string;
  placeholder: string;
  browseUrl: string;
  value: string;
  minecraftVersion: string;
  loader?: ModLoader;
  onChange: (value: string) => void;
  onSearch: () => void;
}

export const ModsListEditor: FC<ModsListEditorProps> = ({
  id,
  provider,
  accent,
  icon,
  label,
  description,
  helpText,
  placeholder,
  browseUrl,
  value,
  minecraftVersion,
  loader,
  onChange,
  onSearch,
}) => {
  const { t } = useLanguage();
  const theme = ACCENT[accent];
  const [isManual, setIsManual] = useState(false);
  const [details, setDetails] = useState<Record<string, ModSearchItem>>({});
  const [versionNames, setVersionNames] = useState<Record<string, string>>({});
  const [latestVersions, setLatestVersions] = useState<Record<string, ModVersionItem>>({});
  const requestedRefs = useRef<Set<string>>(new Set());
  const requestedVersions = useRef<Set<string>>(new Set());

  const entries = useMemo(() => parseModEntries(value, provider), [value, provider]);

  useEffect(() => {
    requestedRefs.current = new Set();
    requestedVersions.current = new Set();
    setDetails({});
    setVersionNames({});
    setLatestVersions({});
  }, [provider]);

  // Only pinned entries can fall behind: unpinned ones always resolve to the
  // newest compatible version when the server starts.
  useEffect(() => {
    const pinned = entries.filter((entry) => !entry.opaque && entry.version).map((entry) => entry.ref);
    if (pinned.length === 0) return;

    let cancelled = false;
    // Debounced because manual edits change the list on every keystroke.
    const timeout = setTimeout(() => {
      fetchLatestModVersions(provider, pinned, {
        minecraftVersion: minecraftVersion && minecraftVersion !== 'latest' ? minecraftVersion : undefined,
        loader,
      })
        .then((items) => {
          if (cancelled) return;
          setLatestVersions(
            Object.fromEntries(
              items
                .filter((item) => item.version)
                .map((item) => [item.ref.toLowerCase(), item.version as ModVersionItem]),
            ),
          );
        })
        .catch((error) => {
          console.error('Error checking mod updates:', error);
        });
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [entries, provider, minecraftVersion, loader]);

  // Pinned entries only store the version id, so resolve their names in one
  // call instead of waiting for each dropdown to be opened.
  useEffect(() => {
    const missing = entries
      .map((entry) => entry.version)
      .filter((version): version is string => Boolean(version))
      .filter((version) => !requestedVersions.current.has(version));

    if (missing.length === 0) return;
    missing.forEach((version) => requestedVersions.current.add(version));

    let cancelled = false;
    resolveModVersionsByProvider(provider, missing)
      .then((items) => {
        if (cancelled) return;
        setVersionNames((prev) => {
          const next = { ...prev };
          for (const item of items) next[item.versionId] = item.name;
          return next;
        });
      })
      .catch((error) => {
        console.error('Error resolving mod versions:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [entries, provider]);

  useEffect(() => {
    const missing = entries
      .filter((entry) => !entry.opaque)
      .map((entry) => entry.ref)
      .filter((ref) => !requestedRefs.current.has(ref.toLowerCase()));

    if (missing.length === 0) return;
    missing.forEach((ref) => requestedRefs.current.add(ref.toLowerCase()));

    let cancelled = false;
    resolveModsByProvider(provider, missing)
      .then((items) => {
        if (cancelled) return;
        setDetails((prev) => {
          const next = { ...prev };
          for (const item of items) {
            next[item.slug.toLowerCase()] = item;
            next[item.projectId.toLowerCase()] = item;
          }
          return next;
        });
      })
      .catch((error) => {
        console.error('Error resolving mods:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [entries, provider]);

  const updateEntries = (next: ModEntry[]) => onChange(serializeModEntries(next));

  const removeEntry = (index: number) => {
    updateEntries(entries.filter((_, entryIndex) => entryIndex !== index));
  };

  const setEntryVersion = (index: number, version?: string) => {
    updateEntries(
      entries.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, version, separator: ':' as const } : entry,
      ),
    );
  };

  const toggleEntryOptional = (index: number) => {
    updateEntries(
      entries.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, optional: !entry.optional } : entry,
      ),
    );
  };

  return (
    <div className={`space-y-3 p-4 rounded-md ${theme.panel}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id} className={`font-minecraft text-sm flex items-center gap-2 ${theme.label}`}>
          <Image src={icon} alt={label} width={16} height={16} />
          {label}
          {entries.length > 0 && (
            <span className="text-[10px] text-gray-400 font-normal">
              {entries.length} {t('modsCount')}
            </span>
          )}
        </Label>
        <div className="flex items-center gap-2">
          <a
            href={browseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-xs underline ${theme.link}`}
          >
            {t('browseMods')}
          </a>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSearch}
            className={`h-8 text-xs px-3 font-minecraft ${theme.action}`}
          >
            <Search className="h-3 w-3 mr-1" />
            {t('searchMods')}
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
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                  <HelpCircle className={`h-4 w-4 ${theme.icon}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm bg-gray-800 border-gray-700 text-gray-200">
                <p>{helpText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {isManual ? (
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-h-24 bg-gray-800/70 border-gray-700/50 text-gray-200 font-mono text-xs"
        />
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-700/60 bg-gray-900/30 px-4 py-8 text-center">
          <p className="font-minecraft text-sm text-gray-300">{t('modsListEmpty')}</p>
          <p className="text-xs text-gray-500">{t('modsListEmptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry, index) => {
            const detail = details[entry.ref.toLowerCase()];
            const latest = latestVersions[entry.ref.toLowerCase()];
            const updateAvailable = Boolean(entry.version && latest && latest.versionId !== entry.version);

            return (
              <div
                key={`${entry.ref}-${index}`}
                className="flex flex-wrap items-center gap-3 border-2 border-[var(--mc-frame)] bg-gray-900/50 px-3 py-2"
              >
                {detail?.iconUrl ? (
                  <Image
                    src={detail.iconUrl}
                    alt={detail.name}
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0 object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 shrink-0 bg-gray-800/80" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-minecraft text-sm text-gray-100">
                    {detail?.name ?? entry.ref}
                  </p>
                  <p className="truncate text-[11px] text-gray-500">
                    {entry.prefix ? `${entry.prefix}: ` : ''}
                    {entry.ref}
                  </p>
                </div>

                {updateAvailable && (
                  <button
                    type="button"
                    onClick={() => setEntryVersion(index, latest.versionId)}
                    title={`${t('modUpdateAvailable')}: ${latest.name}`}
                    className="flex shrink-0 items-center gap-1 border-2 border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] font-minecraft uppercase text-amber-300 transition-colors hover:bg-amber-500/20 hover:text-amber-200"
                  >
                    <ArrowUpCircle className="h-3.5 w-3.5" />
                    {t('modUpdateAvailable')}
                  </button>
                )}

                {provider === 'modrinth' && !entry.opaque && (
                  <button
                    type="button"
                    onClick={() => toggleEntryOptional(index)}
                    title={t('modOptionalHelp')}
                    className={`shrink-0 border-2 px-2 py-1 text-[10px] font-minecraft uppercase transition-colors ${
                      entry.optional
                        ? 'border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20'
                        : 'border-gray-700/60 bg-transparent text-gray-500 hover:border-gray-600 hover:text-gray-300'
                    }`}
                  >
                    {t('modOptional')}
                  </button>
                )}

                {entry.opaque ? (
                  <span className="text-[11px] text-gray-500">URL</span>
                ) : (
                  <ModVersionPicker
                    provider={provider}
                    entry={entry}
                    versionLabel={entry.version ? versionNames[entry.version] : undefined}
                    minecraftVersion={minecraftVersion}
                    loader={loader}
                    onChange={(version) => setEntryVersion(index, version)}
                  />
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title={t('removeMod')}
                  onClick={() => removeEntry(index)}
                  className="h-8 w-8 shrink-0 bg-transparent text-gray-500 hover:bg-rose-900/30 hover:text-rose-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-400">{description}</p>
    </div>
  );
};
