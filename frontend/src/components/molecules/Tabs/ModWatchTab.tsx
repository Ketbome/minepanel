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
import { Eye, FileText, HelpCircle, Loader2, Search, Trash2, Undo2 } from 'lucide-react';
import { ServerConfig } from '@/lib/types/types';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { TranslationKey } from '@/lib/translations';
import { useMinecraftVersions } from '@/lib/hooks/useMinecraftVersions';
import { mcToast } from '@/lib/utils/minecraft-toast';
import { ModEntry, parseModEntries } from '@/lib/utils/mod-entries';
import { ModsBrowserDialog } from '@/components/molecules/mods/ModsBrowserDialog';
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
  PendingModChange,
  cancelQueuedModChange,
  fetchCurseforgeChangelog,
  fetchModMetadata,
  queueModChange,
  updateDesiredVersion,
  updateModNote,
} from '@/services/mod-metadata/mod-metadata.service';

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
  const [metadata, setMetadata] = useState<ModMetadata>({ desiredMcVersion: null, notes: {}, pendingChanges: [] });
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
  const [showModsBrowser, setShowModsBrowser] = useState(false);
  const [modsBrowserProvider, setModsBrowserProvider] = useState<ModProvider>('modrinth');
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

  const pendingByKey = useMemo(() => {
    const map: Record<string, PendingModChange> = {};
    for (const change of metadata.pendingChanges) {
      map[`${change.provider}:${change.ref.toLowerCase()}`] = change;
    }
    return map;
  }, [metadata.pendingChanges]);

  // Live entries plus placeholder rows for queued adds that aren't live yet, so a mod
  // queued for addition is visible right away rather than only appearing after a restart.
  const displayRows = useMemo<Array<ConfiguredMod & { pending?: PendingModChange }>>(() => {
    const rows = configuredMods.map((mod) => ({ ...mod, pending: pendingByKey[`${mod.provider}:${mod.entry.ref.toLowerCase()}`] }));
    const liveKeys = new Set(configuredMods.map((mod) => `${mod.provider}:${mod.entry.ref.toLowerCase()}`));
    const placeholders = metadata.pendingChanges
      .filter((change) => change.action === 'add' && !liveKeys.has(`${change.provider}:${change.ref.toLowerCase()}`))
      .map((change) => ({
        provider: change.provider,
        entry: { raw: change.ref, ref: change.ref, version: change.version, separator: ':' as const, optional: false, opaque: false },
        pending: change,
      }));
    return [...rows, ...placeholders];
  }, [configuredMods, pendingByKey, metadata.pendingChanges]);

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

  // ServerConfigTabs doesn't remount this tab on server switch, and metadata mutations aren't
  // otherwise serialized on the client, so responses can land out of order (an older mutation's
  // response resolving after a newer one) or belong to a server the user has since navigated away
  // from. Both cases mean "this response no longer reflects the latest state we asked for" — a
  // monotonic token, bumped on every new mutation and on server switch, catches both: only the
  // response matching the most recently issued token is applied.
  const metadataRequestRef = useRef(0);
  const changelogRequestRef = useRef(0);
  useEffect(() => {
    metadataRequestRef.current += 1;
    changelogRequestRef.current += 1;
  }, [serverId]);

  const beginMetadataRequest = () => ++metadataRequestRef.current;

  const applyMetadataFor = (requestToken: number, next: ModMetadata) => {
    if (requestToken === metadataRequestRef.current) setMetadata(next);
  };

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
  // version the server is already running, independent of any desired-version
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

  // Minecraft version updates: the newest build compatible with the desired
  // version being watched, which may be well ahead of the live server version.
  useEffect(() => {
    if (!metadata.desiredMcVersion || configuredMods.length === 0) {
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
              minecraftVersion: metadata.desiredMcVersion || undefined,
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
  }, [metadata.desiredMcVersion, configuredMods, resolvedLoader]);

  const handleSaveDesiredVersion = async () => {
    setSavingDesiredVersion(true);
    const requestToken = beginMetadataRequest();
    try {
      const next = await updateDesiredVersion(serverId, desiredVersionInput.trim() || null);
      applyMetadataFor(requestToken, next);
      mcToast.success(t('save'));
    } catch (error) {
      console.error('Error saving desired version:', error);
      mcToast.error(t('error'));
    } finally {
      setSavingDesiredVersion(false);
    }
  };

  const handleNoteChange = (ref: string, value: string) => {
    const key = ref.toLowerCase();
    setNoteDrafts((prev) => ({ ...prev, [key]: value }));

    if (noteTimers.current[key]) clearTimeout(noteTimers.current[key]);
    noteTimers.current[key] = setTimeout(() => {
      const requestToken = beginMetadataRequest();
      updateModNote(serverId, key, value)
        .then((next) => applyMetadataFor(requestToken, next))
        .catch((error) => console.error('Error saving mod note:', error));
    }, 600);
  };

  const openModsBrowser = (provider: ModProvider) => {
    setModsBrowserProvider(provider);
    setShowModsBrowser(true);
  };

  const handleQueueRemoveEntry = (provider: ModProvider, entry: ModEntry, label: string) => {
    const requestToken = beginMetadataRequest();
    queueModChange(serverId, { provider, ref: entry.ref, action: 'remove', label })
      .then((next) => applyMetadataFor(requestToken, next))
      .catch((error) => {
        console.error('Error queueing mod removal:', error);
        mcToast.error(t('error'));
      });
  };

  const handleCancelQueued = (provider: ModProvider, ref: string) => {
    const requestToken = beginMetadataRequest();
    cancelQueuedModChange(serverId, provider, ref)
      .then((next) => applyMetadataFor(requestToken, next))
      .catch((error) => {
        console.error('Error cancelling queued mod change:', error);
        mcToast.error(t('error'));
      });
  };

  const isAddedInBrowser = (mod: ModSearchItem): boolean => {
    const candidates = [mod.slug.toLowerCase(), mod.projectId.toLowerCase()];
    const isLive = configuredMods.some((entry) => entry.provider === modsBrowserProvider && candidates.includes(entry.entry.ref.toLowerCase()));
    const isPendingAdd = metadata.pendingChanges.some(
      (change) => change.provider === modsBrowserProvider && change.action === 'add' && candidates.includes(change.ref.toLowerCase()),
    );
    return isLive || isPendingAdd;
  };

  // Runs the network call in the background and returns the optimistic status the
  // dialog needs immediately for its toast — reconciles `metadata` when the response lands.
  const handleToggleFromBrowser = (mod: ModSearchItem, insertAs: 'slug' | 'id', version?: string): 'added' | 'removed' | 'noop' => {
    const ref = insertAs === 'id' ? mod.projectId : mod.slug;
    const isLive = configuredMods.some((entry) => entry.provider === modsBrowserProvider && entry.entry.ref.toLowerCase() === ref.toLowerCase());
    const pendingAdd = metadata.pendingChanges.find(
      (change) => change.provider === modsBrowserProvider && change.action === 'add' && change.ref.toLowerCase() === ref.toLowerCase(),
    );

    if (isLive) {
      const requestToken = beginMetadataRequest();
      queueModChange(serverId, { provider: modsBrowserProvider, ref, action: 'remove', label: mod.name })
        .then((next) => applyMetadataFor(requestToken, next))
        .catch((error) => console.error('Error queueing mod removal:', error));
      return 'removed';
    }

    if (pendingAdd) {
      const requestToken = beginMetadataRequest();
      cancelQueuedModChange(serverId, modsBrowserProvider, ref)
        .then((next) => applyMetadataFor(requestToken, next))
        .catch((error) => console.error('Error cancelling queued mod add:', error));
      return 'removed';
    }

    const requestToken = beginMetadataRequest();
    queueModChange(serverId, { provider: modsBrowserProvider, ref, action: 'add', version, label: mod.name })
      .then((next) => applyMetadataFor(requestToken, next))
      .catch((error) => console.error('Error queueing mod add:', error));
    return 'added';
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

  const handleViewChangelog = async (provider: ModProvider, entry: ModEntry, label: string) => {
    const ref = entry.ref.toLowerCase();
    // Opening another dialog (or switching servers) before this request resolves must not let
    // this request's result land in what is now a different dialog.
    const requestToken = ++changelogRequestRef.current;
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

      const sameVersionTargetId = sameVersionLatest[`${provider}:${ref}`]?.versionId;
      const sameVersionRange = sliceRange(full, entry, sameVersionTargetId);
      const sameVersion: ChangelogLane =
        sameVersionRange === null
          ? { status: 'no-target', segments: [] }
          : sameVersionRange.length === 0
            ? { status: 'up-to-date', segments: [] }
            : { status: 'has-updates', segments: await buildChangelogSegments(provider, entry.ref, sameVersionRange) };

      let targetVersion: ChangelogLane = { status: 'no-desired-version', segments: [] };
      if (metadata.desiredMcVersion) {
        const targetVersionId = compatibility[`${provider}:${ref}`]?.versionId;
        const targetRange = sliceRange(full, entry, targetVersionId);
        targetVersion =
          targetRange === null
            ? { status: 'no-target', segments: [] }
            : targetRange.length === 0
              ? { status: 'up-to-date', segments: [] }
              : { status: 'has-updates', segments: await buildChangelogSegments(provider, entry.ref, targetRange) };
      }

      if (requestToken !== changelogRequestRef.current) return;
      setChangelogState((prev) => (prev ? { ...prev, loading: false, sameVersion, targetVersion } : prev));
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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openModsBrowser('modrinth')}
              className="h-8 gap-1 border-blue-500/50 bg-blue-600/20 text-xs text-blue-300 hover:bg-blue-500/30 hover:text-blue-200"
            >
              <Search className="h-3.5 w-3.5" />
              {t('searchMods')} · Modrinth
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openModsBrowser('curseforge')}
              className="h-8 gap-1 border-emerald-500/50 bg-emerald-600/20 text-xs text-emerald-300 hover:bg-emerald-500/30 hover:text-emerald-200"
            >
              <Search className="h-3.5 w-3.5" />
              {t('searchMods')} · CurseForge
            </Button>
          </div>

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

          {metadata.pendingChanges.length > 0 && (
            <div className="rounded-md border border-sky-700/50 bg-sky-950/20 px-4 py-2 text-xs text-sky-300">
              {t('modWatchPendingBanner').replace('{count}', String(metadata.pendingChanges.length))}
            </div>
          )}

          {displayRows.length === 0 && manualEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-700/60 bg-gray-900/30 px-4 py-8 text-center">
              <p className="font-minecraft text-sm text-gray-300">{t('modWatchEmpty')}</p>
              <p className="text-xs text-gray-500">{t('modWatchEmptyHint')}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {displayRows.map(({ provider, entry, pending }) => {
                const detail = details[`${provider}:${entry.ref.toLowerCase()}`];
                const compatible = compatibility[`${provider}:${entry.ref.toLowerCase()}`];
                const sameVersionUpdate = sameVersionLatest[`${provider}:${entry.ref.toLowerCase()}`];
                // Unpinned entries always resolve to the newest build at startup, so they're
                // never "behind" — only a pinned entry can meaningfully have an update available.
                const hasSameVersionUpdate = Boolean(entry.version && sameVersionUpdate && sameVersionUpdate.versionId !== entry.version);
                const noteKey = entry.ref.toLowerCase();
                const isPendingRemove = pending?.action === 'remove';
                const isLive = configuredMods.some((mod) => mod.provider === provider && mod.entry.ref.toLowerCase() === entry.ref.toLowerCase());
                const isPlaceholder = pending?.action === 'add' && !isLive;
                const displayName = detail?.name ?? pending?.label ?? entry.ref;

                return (
                  <div
                    key={`${provider}-${entry.ref}`}
                    className={`flex flex-wrap items-start gap-3 border-2 px-3 py-2.5 ${
                      isPlaceholder ? 'border-sky-700/60 bg-sky-950/20' : isPendingRemove ? 'border-amber-700/60 bg-amber-950/10' : 'border-[var(--mc-frame)] bg-gray-900/50'
                    }`}
                  >
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
                        {isPlaceholder && (
                          <Badge variant="outline" className="border-sky-600 text-sky-300">
                            {t('modWatchQueuedAdd')}
                          </Badge>
                        )}
                        {isPendingRemove && (
                          <Badge variant="outline" className="border-amber-600 text-amber-300">
                            {t('modWatchQueuedRemove')}
                          </Badge>
                        )}

                        {!isPlaceholder && provider === 'modrinth' && entry.optional && (
                          <Badge variant="outline" className="border-violet-600 text-violet-300" title={t('modOptionalHelp')}>
                            {t('modOptional')}
                          </Badge>
                        )}

                        {!isPlaceholder &&
                          (checkingSameVersion ? (
                            <Badge variant="outline" className="border-gray-600 text-gray-400">
                              {t('loading')}
                            </Badge>
                          ) : (
                            hasSameVersionUpdate && (
                              <Badge variant="outline" className="border-sky-600 text-sky-300">
                                {t('modUpdateAvailable')}
                              </Badge>
                            )
                          ))}

                        {!isPlaceholder && metadata.desiredMcVersion && (
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
                      {!isPlaceholder && !metadata.desiredMcVersion && (
                        <p className="text-[11px] text-gray-500">{t('modCompatibilityUnknown')}</p>
                      )}
                    </div>

                    <Textarea
                      value={noteDrafts[noteKey] ?? ''}
                      onChange={(event) => handleNoteChange(entry.ref, event.target.value)}
                      placeholder={t('modNotesPlaceholder')}
                      className="min-h-16 min-w-[200px] flex-1 basis-64 bg-gray-800/70 border-gray-700/50 text-gray-200 text-xs"
                    />

                    <div className="flex shrink-0 items-center gap-2">
                      {!isPlaceholder && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewChangelog(provider, entry, displayName)}
                          className="h-8 gap-1 border-gray-700/50 bg-gray-800/70 text-xs text-gray-300 hover:bg-gray-700/50 hover:text-gray-100"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {t('viewChangelog')}
                        </Button>
                      )}

                      {isPlaceholder || isPendingRemove ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelQueued(provider, entry.ref)}
                          className="h-8 gap-1 border-gray-700/50 bg-gray-800/70 text-xs text-gray-300 hover:bg-gray-700/50 hover:text-gray-100"
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                          {t('modWatchUndo')}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title={t('removeMod')}
                          onClick={() => handleQueueRemoveEntry(provider, entry, displayName)}
                          className="h-8 w-8 shrink-0 bg-transparent text-gray-500 hover:bg-rose-900/30 hover:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
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

      <ModsBrowserDialog
        open={showModsBrowser}
        onClose={() => setShowModsBrowser(false)}
        provider={modsBrowserProvider}
        minecraftVersion={effectiveMinecraftVersion}
        loader={resolvedLoader}
        isAdded={isAddedInBrowser}
        onToggle={handleToggleFromBrowser}
      />

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
