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
import { Eye, FileText, HelpCircle, Info, Loader2 } from 'lucide-react';
import { ServerConfig } from '@/lib/types/types';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { TranslationKey } from '@/lib/translations';
import { useMinecraftVersions } from '@/lib/hooks/useMinecraftVersions';
import { mcToast } from '@/lib/utils/minecraft-toast';
import { ModEntry, parseModEntries } from '@/lib/utils/mod-entries';
import { updateModWatch } from '@/services/docker/fetchs';
import {
  ModLoader,
  ModProvider,
  ModSearchItem,
  ModVersionItem,
  fetchCurseforgeChangelog,
  fetchLatestModVersions,
  fetchModVersions,
  resolveModVersionsByProvider,
  resolveModsByProvider,
} from '@/services/mods/mods-browser.service';

interface ConfiguredMod {
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

type ChangelogLaneStatus = 'no-target-version' | 'no-target' | 'up-to-date' | 'has-updates';

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
  'no-target-version': 'changelogNoTargetVersion',
  'no-target': 'changelogNoCompatibleTarget',
  // Shared with the panel's own release changelog — same sentence, same meaning.
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
            <p className="mt-1 whitespace-pre-wrap text-xs text-gray-300">{segment.changelog || t('changelogNoNotes')}</p>
          </div>
        ))}
      </div>
    )}
  </div>
);

interface ModWatchTabProps {
  serverId: string;
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const ModWatchTab: FC<ModWatchTabProps> = ({ serverId, config, updateConfig }) => {
  const { t } = useLanguage();
  const { latestRelease } = useMinecraftVersions({ filterType: 'release' });
  const [targetVersionInput, setTargetVersionInput] = useState(config.modWatchTargetVersion ?? '');
  const [savingTargetVersion, setSavingTargetVersion] = useState(false);
  const [details, setDetails] = useState<Record<string, ModSearchItem>>({});
  const [versionNames, setVersionNames] = useState<Record<string, string>>({});
  const [compatibility, setCompatibility] = useState<Record<string, ModVersionItem | null>>({});
  const [checkingCompatibility, setCheckingCompatibility] = useState(false);
  const [sameVersionLatest, setSameVersionLatest] = useState<Record<string, ModVersionItem | null>>({});
  const [checkingSameVersion, setCheckingSameVersion] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>(config.modNotes ?? {});
  const [changelogState, setChangelogState] = useState<ChangelogDialogState | null>(null);
  const noteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Mirrors the serverId prop for async callbacks: a debounced note or target-version save
  // that resolves after the user switches servers must not overwrite the config now on screen.
  const serverIdRef = useRef(serverId);
  serverIdRef.current = serverId;

  const targetVersion = config.modWatchTargetVersion ?? '';

  // Switching servers reuses this component, so the inputs have to be re-seeded from
  // the config that belongs to the server now on screen.
  useEffect(() => {
    setTargetVersionInput(config.modWatchTargetVersion ?? '');
    setNoteDrafts(config.modNotes ?? {});
    // Only on server switch: re-seeding on every config change would fight the note drafts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  // A debounced note save that is still pending when the tab unmounts would fire against
  // a server the user has left, so drop the timers on the way out.
  useEffect(() => {
    const timers = noteTimers.current;
    return () => {
      for (const timer of Object.values(timers)) clearTimeout(timer);
    };
  }, []);

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

  // Every entry currently configured, pinned or not — Mod Watch is the only place that
  // shows this while the server is running, so it should reflect everything, not just pins.
  const configuredMods = useMemo<ConfiguredMod[]>(() => {
    const curseforge = parseModEntries(config.cfFiles || '', 'curseforge')
      .filter((entry) => !entry.opaque)
      .map((entry) => ({ provider: 'curseforge' as const, entry }));
    const modrinth = parseModEntries(config.modrinthProjects || '', 'modrinth')
      .filter((entry) => !entry.opaque)
      .map((entry) => ({ provider: 'modrinth' as const, entry }));
    return [...curseforge, ...modrinth];
  }, [config.cfFiles, config.modrinthProjects]);

  // URLs and @file references carry no ref an API can resolve — listed read-only.
  const manualEntries = useMemo<ConfiguredMod[]>(() => {
    const curseforge = parseModEntries(config.cfFiles || '', 'curseforge')
      .filter((entry) => entry.opaque)
      .map((entry) => ({ provider: 'curseforge' as const, entry }));
    const modrinth = parseModEntries(config.modrinthProjects || '', 'modrinth')
      .filter((entry) => entry.opaque)
      .map((entry) => ({ provider: 'modrinth' as const, entry }));
    return [...curseforge, ...modrinth];
  }, [config.cfFiles, config.modrinthProjects]);

  useEffect(() => {
    const byProvider: Record<ModProvider, string[]> = { curseforge: [], modrinth: [] };
    for (const { provider, entry } of configuredMods) {
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
              next[`${item.provider}:${item.slug.toLowerCase()}`] = item;
              next[`${item.provider}:${item.projectId.toLowerCase()}`] = item;
            }
            return next;
          });
        })
        .catch((error) => console.error('Error resolving mods:', error));

      const versionIds = configuredMods
        .filter((mod) => mod.provider === provider && mod.entry.version)
        .map((mod) => mod.entry.version as string);
      resolveModVersionsByProvider(provider, versionIds)
        .then((items) => {
          if (cancelled) return;
          setVersionNames((prev) => {
            const next = { ...prev };
            for (const item of items) next[`${item.provider}:${item.versionId}`] = item.name;
            return next;
          });
        })
        .catch((error) => console.error('Error resolving mod versions:', error));
    });

    return () => {
      cancelled = true;
    };
  }, [configuredMods]);

  // Same-version release improvements: is there a newer build for the MC
  // version the server is already running, independent of any target-version
  // watch. Mirrors the "update available" check ModsListEditor does for pins.
  useEffect(() => {
    if (configuredMods.length === 0) {
      setSameVersionLatest({});
      return;
    }

    let cancelled = false;
    setCheckingSameVersion(true);
    const timeout = setTimeout(() => {
      const byProvider: Record<ModProvider, string[]> = { curseforge: [], modrinth: [] };
      for (const { provider, entry } of configuredMods) byProvider[provider].push(entry.ref);

      Promise.all(
        (Object.keys(byProvider) as ModProvider[])
          .filter((provider) => byProvider[provider].length > 0)
          .map((provider) =>
            fetchLatestModVersions(provider, byProvider[provider], {
              minecraftVersion: effectiveMinecraftVersion && effectiveMinecraftVersion !== 'latest' ? effectiveMinecraftVersion : undefined,
              loader: resolvedLoader,
            }).then((list) => ({ provider, list })),
          ),
      )
        .then((results) => {
          if (cancelled) return;
          // Namespaced by provider — CurseForge and Modrinth can share the same ref.
          const next: Record<string, ModVersionItem | null> = {};
          for (const { provider, list } of results) {
            for (const item of list) next[`${provider}:${item.ref.toLowerCase()}`] = item.version;
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
  }, [configuredMods, effectiveMinecraftVersion, resolvedLoader]);

  // Minecraft version updates: the newest build compatible with the version
  // being evaluated, which may be well ahead of the live server version.
  useEffect(() => {
    if (!targetVersion || configuredMods.length === 0) {
      setCompatibility({});
      return;
    }

    let cancelled = false;
    setCheckingCompatibility(true);
    const timeout = setTimeout(() => {
      const byProvider: Record<ModProvider, string[]> = { curseforge: [], modrinth: [] };
      for (const { provider, entry } of configuredMods) byProvider[provider].push(entry.ref);

      Promise.all(
        (Object.keys(byProvider) as ModProvider[])
          .filter((provider) => byProvider[provider].length > 0)
          .map((provider) =>
            fetchLatestModVersions(provider, byProvider[provider], {
              minecraftVersion: targetVersion,
              loader: resolvedLoader,
            }).then((list) => ({ provider, list })),
          ),
      )
        .then((results) => {
          if (cancelled) return;
          // Namespaced by provider — CurseForge and Modrinth can share the same ref.
          const next: Record<string, ModVersionItem | null> = {};
          for (const { provider, list } of results) {
            for (const item of list) next[`${provider}:${item.ref.toLowerCase()}`] = item.version;
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
  }, [targetVersion, configuredMods, resolvedLoader]);

  // Notes are stored as a whole map, so the save is also what prunes: a note whose mod is
  // no longer configured is simply not in what gets sent. Blank drafts drop out too.
  const collectNotes = (drafts: Record<string, string>): Record<string, string> => {
    const live = new Set(configuredMods.map((mod) => `${mod.provider}:${mod.entry.ref.toLowerCase()}`));
    return Object.fromEntries(Object.entries(drafts).filter(([key, note]) => live.has(key) && note.trim().length > 0));
  };

  // Two note saves, or a note save and a target-version save, for the same server can
  // resolve out of order; only the response to the most recently issued request may apply.
  const modWatchRequestSeq = useRef(0);

  const applySaved = (requestServerId: string, requestSeq: number, saved: ServerConfig) => {
    // A save issued for a server the user has since switched away from must not clobber
    // the config of whichever server is now on screen.
    if (requestServerId !== serverIdRef.current) return;
    // An older request that resolves after a newer one must not revert it.
    if (requestSeq !== modWatchRequestSeq.current) return;
    // Keep the page's copy of the config in step, or the next whole-form save from
    // another tab would PUT the stale notes back over these.
    updateConfig('modNotes', saved.modNotes);
    updateConfig('modWatchTargetVersion', saved.modWatchTargetVersion);
  };

  const handleSaveTargetVersion = async () => {
    const requestServerId = serverId;
    const requestSeq = ++modWatchRequestSeq.current;
    setSavingTargetVersion(true);
    try {
      applySaved(requestServerId, requestSeq, await updateModWatch(requestServerId, { targetVersion: targetVersionInput.trim() || null }));
      mcToast.success(t('save'));
    } catch (error) {
      console.error('Error saving the target version:', error);
      mcToast.error(t('error'));
    } finally {
      setSavingTargetVersion(false);
    }
  };

  const handleNoteChange = (provider: ModProvider, ref: string, value: string) => {
    const key = `${provider}:${ref.toLowerCase()}`;
    const drafts = { ...noteDrafts, [key]: value };
    setNoteDrafts(drafts);

    if (noteTimers.current[key]) clearTimeout(noteTimers.current[key]);
    const requestServerId = serverId;
    noteTimers.current[key] = setTimeout(() => {
      const requestSeq = ++modWatchRequestSeq.current;
      updateModWatch(requestServerId, { notes: collectNotes(drafts) })
        .then((saved) => applySaved(requestServerId, requestSeq, saved))
        .catch((error) => {
          console.error('Error saving mod note:', error);
          mcToast.error(t('error'));
        });
    }, 600);
  };

  // CurseForge has no batch changelog endpoint, so each version needs its own request; capping
  // how many run per dialog open keeps a single open from bursting past the API key's rate limit.
  const MAX_CHANGELOG_SEGMENTS = 10;

  const buildChangelogSegments = async (provider: ModProvider, ref: string, versions: ModVersionItem[]): Promise<ChangelogSegment[]> =>
    Promise.all(
      versions.slice(0, MAX_CHANGELOG_SEGMENTS).map(async (version) => ({
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

    // Unpinned entries are re-resolved to the newest matching build on every start, so there is
    // no fixed "current" version to diff from — just surface the target release's own changelog.
    if (!entry.version) {
      const targetIndex = full.findIndex((version) => version.versionId === targetVersionId);
      return targetIndex === -1 ? null : full.slice(targetIndex, targetIndex + 1);
    }

    const currentIndex = full.findIndex((version) => version.versionId === entry.version);
    const targetIndex = full.findIndex((version) => version.versionId === targetVersionId);
    if (currentIndex === -1 || targetIndex === -1) return null;
    return targetIndex < currentIndex ? full.slice(targetIndex, currentIndex) : [];
  };

  // Opening another dialog (or switching servers) before a request resolves must not let
  // that request's result land in what is now a different dialog.
  const changelogRequestRef = useRef(0);
  useEffect(() => {
    changelogRequestRef.current += 1;
    setChangelogState(null);
  }, [serverId]);

  const handleViewChangelog = async (provider: ModProvider, entry: ModEntry, label: string) => {
    const ref = entry.ref.toLowerCase();
    const requestToken = ++changelogRequestRef.current;
    setChangelogState({
      open: true,
      provider,
      entry,
      label,
      loading: true,
      sameVersion: { status: 'no-target', segments: [] },
      targetVersion: { status: 'no-target-version', segments: [] },
    });

    try {
      const full = sortNewestFirst(await fetchModVersions(provider, entry.ref, {}));

      const sameVersionTargetId = sameVersionLatest[`${provider}:${ref}`]?.versionId;
      const sameVersionRange = sliceRange(full, entry, sameVersionTargetId);
      const sameVersion: ChangelogLane =
        sameVersionRange === null
          ? { status: 'no-target', segments: [] }
          : sameVersionRange.length === 0
            ? { status: 'up-to-date', segments: [] }
            : { status: 'has-updates', segments: await buildChangelogSegments(provider, entry.ref, sameVersionRange) };

      let targetVersionLane: ChangelogLane = { status: 'no-target-version', segments: [] };
      if (targetVersion) {
        const targetVersionId = compatibility[`${provider}:${ref}`]?.versionId;
        const targetRange = sliceRange(full, entry, targetVersionId);
        targetVersionLane =
          targetRange === null
            ? { status: 'no-target', segments: [] }
            : targetRange.length === 0
              ? { status: 'up-to-date', segments: [] }
              : { status: 'has-updates', segments: await buildChangelogSegments(provider, entry.ref, targetRange) };
      }

      if (requestToken !== changelogRequestRef.current) return;
      setChangelogState((prev) => (prev ? { ...prev, loading: false, sameVersion, targetVersion: targetVersionLane } : prev));
    } catch (error) {
      console.error('Error loading changelog history:', error);
      if (requestToken !== changelogRequestRef.current) return;
      mcToast.error(t('error'));
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
          <div className="space-y-2 rounded-md border border-gray-700/50 bg-gray-800/50 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1 space-y-1">
                <Label htmlFor="mod-watch-target-version" className="font-minecraft text-sm text-gray-200">
                  {t('modWatchTargetVersion')}
                </Label>
                <Input
                  id="mod-watch-target-version"
                  value={targetVersionInput}
                  onChange={(event) => setTargetVersionInput(event.target.value)}
                  placeholder="1.21.4"
                  className="bg-gray-900/70 border-gray-700/50 text-gray-200 focus:border-emerald-500/50 focus:ring-emerald-500/30"
                />
                <p className="text-xs text-gray-400">{t('modWatchTargetVersionDesc')}</p>
              </div>
              <Button
                type="button"
                onClick={handleSaveTargetVersion}
                disabled={savingTargetVersion}
                className="h-9 border border-emerald-500/40 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-500/30 hover:text-emerald-200"
              >
                {savingTargetVersion ? t('saving') : t('save')}
              </Button>
            </div>

            {/* itzg resolves the version from the Modrinth list at startup when this is on, so
                say so rather than let the box look like it is doing the same job. */}
            {config.versionFromModrinthProjects && (
              <div className="flex items-start gap-2 border-t border-gray-700/50 pt-2 text-xs text-gray-400">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
                <span>{t('modWatchVersionFromModsHint')}</span>
              </div>
            )}
          </div>

          {configuredMods.length === 0 && manualEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-700/60 bg-gray-900/30 px-4 py-8 text-center">
              <p className="font-minecraft text-sm text-gray-300">{t('modWatchEmpty')}</p>
              <p className="text-xs text-gray-500">{t('modWatchEmptyHint')}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {configuredMods.map(({ provider, entry }) => {
                const detail = details[`${provider}:${entry.ref.toLowerCase()}`];
                const compatible = compatibility[`${provider}:${entry.ref.toLowerCase()}`];
                const sameVersionUpdate = sameVersionLatest[`${provider}:${entry.ref.toLowerCase()}`];
                // Unpinned entries always resolve to the newest build at startup, so they're
                // never "behind" — only a pinned entry can meaningfully have an update available.
                const hasSameVersionUpdate = Boolean(entry.version && sameVersionUpdate && sameVersionUpdate.versionId !== entry.version);
                const noteKey = `${provider}:${entry.ref.toLowerCase()}`;
                const displayName = detail?.name ?? entry.ref;

                return (
                  <div key={`${provider}-${entry.ref}`} className="flex flex-wrap items-start gap-3 border-2 border-[var(--mc-frame)] bg-gray-900/50 px-3 py-2.5">
                    {detail?.iconUrl ? (
                      <Image src={detail.iconUrl} alt={displayName} width={32} height={32} className="h-8 w-8 shrink-0 object-cover" />
                    ) : (
                      <div className="h-8 w-8 shrink-0 bg-gray-800/80" />
                    )}

                    <div className="min-w-[160px] flex-1 space-y-1">
                      <p className="truncate font-minecraft text-sm text-gray-100">{displayName}</p>
                      <p className="truncate text-[11px] text-gray-500">
                        {entry.version ? (versionNames[`${provider}:${entry.version}`] ?? entry.version) : t('modVersionLatest')}
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

                        {targetVersion && (
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
                      {!targetVersion && <p className="text-[11px] text-gray-500">{t('modCompatibilityUnknown')}</p>}
                    </div>

                    <Textarea
                      value={noteDrafts[noteKey] ?? ''}
                      onChange={(event) => handleNoteChange(provider, entry.ref, event.target.value)}
                      placeholder={t('modNotesPlaceholder')}
                      className="min-h-16 min-w-[200px] flex-1 basis-64 bg-gray-800/70 border-gray-700/50 text-gray-200 text-xs"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewChangelog(provider, entry, displayName)}
                      className="h-8 shrink-0 gap-1 border-gray-700/50 bg-gray-800/70 text-xs text-gray-300 hover:bg-gray-700/50 hover:text-gray-100"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {t('viewChangelog')}
                    </Button>
                  </div>
                );
              })}

              {manualEntries.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <p className="font-minecraft text-xs uppercase tracking-wide text-gray-500">{t('modWatchManualEntries')}</p>
                  {manualEntries.map(({ provider, entry }) => (
                    <div key={`${provider}-manual-${entry.raw}`} className="border-2 border-gray-700/40 bg-gray-900/30 px-3 py-2 text-xs text-gray-400">
                      {entry.raw}
                    </div>
                  ))}
                </div>
              )}
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
