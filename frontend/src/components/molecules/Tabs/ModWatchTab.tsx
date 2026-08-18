'use client';

import { FC, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Eye, FileText, HelpCircle, Loader2 } from 'lucide-react';
import { ServerConfig } from '@/lib/types/types';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { TranslationKey } from '@/lib/translations';
import { useMinecraftVersions } from '@/lib/hooks/useMinecraftVersions';
import { mcToast } from '@/lib/utils/minecraft-toast';
import { ModEntry, parseModEntries } from '@/lib/utils/mod-entries';
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
import {
  ModMetadata,
  fetchCurseforgeChangelog,
  fetchModMetadata,
  updateDesiredVersion,
  updateModNote,
} from '@/services/mod-metadata/mod-metadata.service';

interface PinnedMod {
  provider: ModProvider;
  entry: ModEntry;
}

interface ChangelogSegment {
  versionId: string;
  name: string;
  versionNumber?: string;
  datePublished?: string;
  changelog: string | null;
}

type ChangelogLaneStatus = 'no-desired-version' | 'no-target' | 'up-to-date' | 'has-updates';

interface ChangelogLane {
  status: ChangelogLaneStatus;
  segments: ChangelogSegment[];
}

interface ChangelogDialogState {
  open: boolean;
  provider: ModProvider;
  entry: ModEntry;
  label: string;
  loading: boolean;
  sameVersion: ChangelogLane;
  targetVersion: ChangelogLane;
}

const sortNewestFirst = (versions: ModVersionItem[]): ModVersionItem[] =>
  [...versions].sort((a, b) => new Date(b.datePublished ?? 0).getTime() - new Date(a.datePublished ?? 0).getTime());

const LANE_STATUS_MESSAGE: Record<Exclude<ChangelogLaneStatus, 'has-updates'>, TranslationKey> = {
  'no-desired-version': 'changelogNoDesiredVersion',
  'no-target': 'changelogNoCompatibleTarget',
  'up-to-date': 'changelogUpToDate',
};

const ChangelogLaneSection: FC<{ title: string; lane: ChangelogLane; t: (key: TranslationKey) => string }> = ({ title, lane, t }) => (
  <div>
    <p className="mb-2 font-minecraft text-xs uppercase tracking-wide text-emerald-400/80">{title}</p>
    {lane.status !== 'has-updates' ? (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <HelpCircle className="h-4 w-4 shrink-0" />
        {t(LANE_STATUS_MESSAGE[lane.status])}
      </div>
    ) : (
      <div className="space-y-4">
        {lane.segments.map((segment) => (
          <div key={segment.versionId} className="border-b border-gray-700/50 pb-3 last:border-b-0">
            <p className="font-minecraft text-sm text-gray-200">
              {segment.name}
              {segment.versionNumber ? ` (${segment.versionNumber})` : ''}
            </p>
            {segment.datePublished && <p className="text-[11px] text-gray-500">{new Date(segment.datePublished).toLocaleDateString()}</p>}
            <p className="mt-1 whitespace-pre-wrap text-xs text-gray-300">{segment.changelog || t('changelogEmpty')}</p>
          </div>
        ))}
      </div>
    )}
  </div>
);

interface ModWatchTabProps {
  serverId: string;
  config: ServerConfig;
}

export const ModWatchTab: FC<ModWatchTabProps> = ({ serverId, config }) => {
  const { t } = useLanguage();
  const { latestRelease } = useMinecraftVersions({ filterType: 'release' });
  const [metadata, setMetadata] = useState<ModMetadata>({ desiredMcVersion: null, notes: {} });
  const [desiredVersionInput, setDesiredVersionInput] = useState('');
  const [savingDesiredVersion, setSavingDesiredVersion] = useState(false);
  const [details, setDetails] = useState<Record<string, ModSearchItem>>({});
  const [versionNames, setVersionNames] = useState<Record<string, string>>({});
  const [compatibility, setCompatibility] = useState<Record<string, ModVersionItem | null>>({});
  const [checkingCompatibility, setCheckingCompatibility] = useState(false);
  const [sameVersionLatest, setSameVersionLatest] = useState<Record<string, ModVersionItem | null>>({});
  const [checkingSameVersion, setCheckingSameVersion] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [changelogState, setChangelogState] = useState<ChangelogDialogState | null>(null);
  const noteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const effectiveMinecraftVersion = useMemo(() => {
    const current = config.minecraftVersion || '';
    return current.toLowerCase() === 'latest' && latestRelease ? latestRelease : current;
  }, [config.minecraftVersion, latestRelease]);

  const resolvedLoader = useMemo<ModLoader | undefined>(() => {
    if (config.serverType === 'FORGE') return 'forge';
    if (config.serverType === 'NEOFORGE') return 'neoforge';
    if (config.serverType === 'FABRIC') return 'fabric';
    if (config.serverType === 'QUILT') return 'quilt';

    const customLoader = (config.modrinthLoader || '').toLowerCase();
    if (customLoader === 'forge' || customLoader === 'neoforge' || customLoader === 'fabric' || customLoader === 'quilt') {
      return customLoader;
    }
    return undefined;
  }, [config.serverType, config.modrinthLoader]);

  const pinnedMods = useMemo<PinnedMod[]>(() => {
    const curseforge = parseModEntries(config.cfFiles || '', 'curseforge')
      .filter((entry) => !entry.opaque && entry.version)
      .map((entry) => ({ provider: 'curseforge' as const, entry }));
    const modrinth = parseModEntries(config.modrinthProjects || '', 'modrinth')
      .filter((entry) => !entry.opaque && entry.version)
      .map((entry) => ({ provider: 'modrinth' as const, entry }));
    return [...curseforge, ...modrinth];
  }, [config.cfFiles, config.modrinthProjects]);

  useEffect(() => {
    let cancelled = false;
    fetchModMetadata(serverId)
      .then((data) => {
        if (cancelled) return;
        setMetadata(data);
        setDesiredVersionInput(data.desiredMcVersion || '');
        setNoteDrafts(data.notes);
      })
      .catch((error) => {
        console.error('Error loading mod metadata:', error);
      });
    return () => {
      cancelled = true;
    };
  }, [serverId]);

  useEffect(() => {
    const byProvider: Record<ModProvider, string[]> = { curseforge: [], modrinth: [] };
    for (const { provider, entry } of pinnedMods) {
      byProvider[provider].push(entry.ref);
    }

    let cancelled = false;
    (Object.keys(byProvider) as ModProvider[]).forEach((provider) => {
      if (byProvider[provider].length === 0) return;
      resolveModsByProvider(provider, byProvider[provider])
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
        .catch((error) => console.error('Error resolving mods:', error));

      const versionIds = pinnedMods.filter((mod) => mod.provider === provider).map((mod) => mod.entry.version as string);
      resolveModVersionsByProvider(provider, versionIds)
        .then((items) => {
          if (cancelled) return;
          setVersionNames((prev) => {
            const next = { ...prev };
            for (const item of items) next[item.versionId] = item.name;
            return next;
          });
        })
        .catch((error) => console.error('Error resolving mod versions:', error));
    });

    return () => {
      cancelled = true;
    };
  }, [pinnedMods]);

  // Same-version release improvements: is there a newer build for the MC
  // version the server is already running, independent of any desired-version
  // watch. Mirrors the "update available" check ModsListEditor does for pins.
  useEffect(() => {
    if (pinnedMods.length === 0) {
      setSameVersionLatest({});
      return;
    }

    let cancelled = false;
    setCheckingSameVersion(true);
    const timeout = setTimeout(() => {
      const byProvider: Record<ModProvider, string[]> = { curseforge: [], modrinth: [] };
      for (const { provider, entry } of pinnedMods) byProvider[provider].push(entry.ref);

      Promise.all(
        (Object.keys(byProvider) as ModProvider[])
          .filter((provider) => byProvider[provider].length > 0)
          .map((provider) =>
            fetchLatestModVersions(provider, byProvider[provider], {
              minecraftVersion: effectiveMinecraftVersion && effectiveMinecraftVersion !== 'latest' ? effectiveMinecraftVersion : undefined,
              loader: resolvedLoader,
            }),
          ),
      )
        .then((results) => {
          if (cancelled) return;
          const next: Record<string, ModVersionItem | null> = {};
          for (const list of results) {
            for (const item of list) next[item.ref.toLowerCase()] = item.version;
          }
          setSameVersionLatest(next);
        })
        .catch((error) => console.error('Error checking same-version mod updates:', error))
        .finally(() => {
          if (!cancelled) setCheckingSameVersion(false);
        });
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [pinnedMods, effectiveMinecraftVersion, resolvedLoader]);

  // Minecraft version updates: the newest build compatible with the desired
  // version being watched, which may be well ahead of the live server version.
  useEffect(() => {
    if (!metadata.desiredMcVersion || pinnedMods.length === 0) {
      setCompatibility({});
      return;
    }

    let cancelled = false;
    setCheckingCompatibility(true);
    const timeout = setTimeout(() => {
      const byProvider: Record<ModProvider, string[]> = { curseforge: [], modrinth: [] };
      for (const { provider, entry } of pinnedMods) byProvider[provider].push(entry.ref);

      Promise.all(
        (Object.keys(byProvider) as ModProvider[])
          .filter((provider) => byProvider[provider].length > 0)
          .map((provider) =>
            fetchLatestModVersions(provider, byProvider[provider], {
              minecraftVersion: metadata.desiredMcVersion || undefined,
              loader: resolvedLoader,
            }),
          ),
      )
        .then((results) => {
          if (cancelled) return;
          const next: Record<string, ModVersionItem | null> = {};
          for (const list of results) {
            for (const item of list) next[item.ref.toLowerCase()] = item.version;
          }
          setCompatibility(next);
        })
        .catch((error) => console.error('Error checking mod compatibility:', error))
        .finally(() => {
          if (!cancelled) setCheckingCompatibility(false);
        });
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [metadata.desiredMcVersion, pinnedMods, resolvedLoader]);

  const handleSaveDesiredVersion = async () => {
    setSavingDesiredVersion(true);
    try {
      const next = await updateDesiredVersion(serverId, desiredVersionInput.trim() || null);
      setMetadata(next);
      mcToast.success(t('save'));
    } catch (error) {
      console.error('Error saving desired version:', error);
      mcToast.error(t('modWatchDesc'));
    } finally {
      setSavingDesiredVersion(false);
    }
  };

  const handleNoteChange = (ref: string, value: string) => {
    const key = ref.toLowerCase();
    setNoteDrafts((prev) => ({ ...prev, [key]: value }));

    if (noteTimers.current[key]) clearTimeout(noteTimers.current[key]);
    noteTimers.current[key] = setTimeout(() => {
      updateModNote(serverId, key, value)
        .then((next) => setMetadata(next))
        .catch((error) => console.error('Error saving mod note:', error));
    }, 600);
  };

  const buildChangelogSegments = async (provider: ModProvider, ref: string, versions: ModVersionItem[]): Promise<ChangelogSegment[]> =>
    Promise.all(
      versions.map(async (version) => ({
        versionId: version.versionId,
        name: version.name,
        versionNumber: version.versionNumber,
        datePublished: version.datePublished,
        changelog: provider === 'modrinth' ? (version.changelog ?? null) : await fetchCurseforgeChangelog(ref, version.versionId),
      })),
    );

  // Slices the full, newest-first version history down to everything newer
  // than the pinned version and no newer than targetVersionId, inclusive of
  // the target — i.e. every release the server would pick up by moving there.
  const sliceRange = (full: ModVersionItem[], entry: ModEntry, targetVersionId: string | undefined): ModVersionItem[] | null => {
    if (!targetVersionId) return null;
    const currentIndex = full.findIndex((version) => version.versionId === entry.version);
    const targetIndex = full.findIndex((version) => version.versionId === targetVersionId);
    if (currentIndex === -1 || targetIndex === -1) return null;
    return targetIndex < currentIndex ? full.slice(targetIndex, currentIndex) : [];
  };

  const handleViewChangelog = async (provider: ModProvider, entry: ModEntry, label: string) => {
    const ref = entry.ref.toLowerCase();
    setChangelogState({
      open: true,
      provider,
      entry,
      label,
      loading: true,
      sameVersion: { status: 'no-target', segments: [] },
      targetVersion: { status: 'no-desired-version', segments: [] },
    });

    try {
      const full = sortNewestFirst(await fetchModVersions(provider, entry.ref, {}));

      const sameVersionTargetId = sameVersionLatest[ref]?.versionId;
      const sameVersionRange = sliceRange(full, entry, sameVersionTargetId);
      const sameVersion: ChangelogLane =
        sameVersionRange === null
          ? { status: 'no-target', segments: [] }
          : sameVersionRange.length === 0
            ? { status: 'up-to-date', segments: [] }
            : { status: 'has-updates', segments: await buildChangelogSegments(provider, entry.ref, sameVersionRange) };

      let targetVersion: ChangelogLane = { status: 'no-desired-version', segments: [] };
      if (metadata.desiredMcVersion) {
        const targetVersionId = compatibility[ref]?.versionId;
        const targetRange = sliceRange(full, entry, targetVersionId);
        targetVersion =
          targetRange === null
            ? { status: 'no-target', segments: [] }
            : targetRange.length === 0
              ? { status: 'up-to-date', segments: [] }
              : { status: 'has-updates', segments: await buildChangelogSegments(provider, entry.ref, targetRange) };
      }

      setChangelogState((prev) => (prev ? { ...prev, loading: false, sameVersion, targetVersion } : prev));
    } catch (error) {
      console.error('Error loading changelog history:', error);
      mcToast.error(t('changelogEmpty'));
      setChangelogState((prev) =>
        prev ? { ...prev, loading: false, sameVersion: { status: 'no-target', segments: [] }, targetVersion: { status: 'no-target', segments: [] } } : prev,
      );
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gray-900/60 border-gray-700/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-minecraft text-emerald-400">
            <Eye className="h-5 w-5" />
            {t('modWatch')}
          </CardTitle>
          <CardDescription className="text-gray-400">{t('modWatchDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3 rounded-md border border-gray-700/50 bg-gray-800/50 p-4">
            <div className="min-w-[220px] flex-1 space-y-1">
              <Label htmlFor="desired-mc-version" className="font-minecraft text-sm text-gray-200">
                {t('desiredMcVersion')}
              </Label>
              <Input
                id="desired-mc-version"
                value={desiredVersionInput}
                onChange={(event) => setDesiredVersionInput(event.target.value)}
                placeholder="1.21.4"
                className="bg-gray-900/70 border-gray-700/50 text-gray-200 focus:border-emerald-500/50 focus:ring-emerald-500/30"
              />
              <p className="text-xs text-gray-400">{t('desiredMcVersionDesc')}</p>
            </div>
            <Button
              type="button"
              onClick={handleSaveDesiredVersion}
              disabled={savingDesiredVersion}
              className="h-9 border border-emerald-500/40 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-500/30 hover:text-emerald-200"
            >
              {savingDesiredVersion ? t('saving') : t('save')}
            </Button>
          </div>

          {pinnedMods.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-700/60 bg-gray-900/30 px-4 py-8 text-center">
              <p className="font-minecraft text-sm text-gray-300">{t('modWatchEmpty')}</p>
              <p className="text-xs text-gray-500">{t('modWatchEmptyHint')}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {pinnedMods.map(({ provider, entry }) => {
                const detail = details[entry.ref.toLowerCase()];
                const compatible = compatibility[entry.ref.toLowerCase()];
                const sameVersionUpdate = sameVersionLatest[entry.ref.toLowerCase()];
                const hasSameVersionUpdate = Boolean(sameVersionUpdate && sameVersionUpdate.versionId !== entry.version);
                const noteKey = entry.ref.toLowerCase();

                return (
                  <div
                    key={`${provider}-${entry.ref}`}
                    className="flex flex-wrap items-start gap-3 border-2 border-[var(--mc-frame)] bg-gray-900/50 px-3 py-2.5"
                  >
                    {detail?.iconUrl ? (
                      <Image src={detail.iconUrl} alt={detail.name} width={32} height={32} className="h-8 w-8 shrink-0 object-cover" />
                    ) : (
                      <div className="h-8 w-8 shrink-0 bg-gray-800/80" />
                    )}

                    <div className="min-w-[160px] flex-1 space-y-1">
                      <p className="truncate font-minecraft text-sm text-gray-100">{detail?.name ?? entry.ref}</p>
                      <p className="truncate text-[11px] text-gray-500">
                        {entry.version ? (versionNames[entry.version] ?? entry.version) : t('modVersionLatest')}
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        {provider === 'modrinth' && entry.optional && (
                          <Badge variant="outline" className="border-violet-600 text-violet-300" title={t('modOptionalHelp')}>
                            {t('modOptional')}
                          </Badge>
                        )}

                        {checkingSameVersion ? (
                          <Badge variant="outline" className="border-gray-600 text-gray-400">
                            {t('loading')}
                          </Badge>
                        ) : (
                          hasSameVersionUpdate && (
                            <Badge variant="outline" className="border-sky-600 text-sky-300">
                              {t('modUpdateAvailable')}
                            </Badge>
                          )
                        )}

                        {metadata.desiredMcVersion && (
                          <Badge
                            variant="outline"
                            className={
                              checkingCompatibility
                                ? 'border-gray-600 text-gray-400'
                                : compatible
                                  ? 'border-emerald-600 text-emerald-300'
                                  : 'border-amber-600 text-amber-300'
                            }
                          >
                            {checkingCompatibility ? t('loading') : compatible ? t('modCompatible') : t('modIncompatible')}
                          </Badge>
                        )}
                      </div>
                      {!metadata.desiredMcVersion && (
                        <p className="text-[11px] text-gray-500">{t('modCompatibilityUnknown')}</p>
                      )}
                    </div>

                    <Textarea
                      value={noteDrafts[noteKey] ?? ''}
                      onChange={(event) => handleNoteChange(entry.ref, event.target.value)}
                      placeholder={t('modNotesPlaceholder')}
                      className="min-h-16 min-w-[200px] flex-1 basis-64 bg-gray-800/70 border-gray-700/50 text-gray-200 text-xs"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewChangelog(provider, entry, detail?.name ?? entry.ref)}
                      className="h-8 shrink-0 gap-1 border-gray-700/50 bg-gray-800/70 text-xs text-gray-300 hover:bg-gray-700/50 hover:text-gray-100"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {t('viewChangelog')}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={changelogState?.open ?? false} onOpenChange={(open) => !open && setChangelogState(null)}>
        <DialogContent className="max-h-[80vh] w-[min(92vw,42rem)] overflow-y-auto bg-gray-900 border border-gray-700 text-white">
          <DialogTitle className="flex items-center gap-2 font-minecraft text-emerald-400">
            <FileText className="h-5 w-5" />
            {changelogState?.label}
          </DialogTitle>

          {changelogState?.loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('loading')}
            </div>
          ) : (
            changelogState && (
              <div className="space-y-5">
                <ChangelogLaneSection title={t('changelogSameVersionTitle')} lane={changelogState.sameVersion} t={t} />
                <ChangelogLaneSection title={t('changelogMcVersionTitle')} lane={changelogState.targetVersion} t={t} />
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
