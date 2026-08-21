'use client';

import { FC, useEffect, useState } from 'react';
import { AlertTriangle, ArrowUpCircle, ExternalLink, GitPullRequest, Loader2, RefreshCcw, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { mcToast } from '@/lib/utils/minecraft-toast';
import { getUpdateStatus, getVersionInfo, startUpdate, ReleaseNote, VersionInfo } from '@/services/version/version.service';

const POLL_INTERVAL_MS = 4000;
// The updater waits up to five minutes for the new panel before rolling back,
// so anything past this is not an update still deciding: it is one nobody is
// going to hear the end of.
const POLL_TIMEOUT_MS = 8 * 60 * 1000;
// A run recorded this long ago never wrote its outcome; waiting on it again
// after a reload would leave the panel saying "updating" forever.
const STALE_RUN_MS = 15 * 60 * 1000;

const MANUAL_COMMANDS = ['docker compose pull', 'docker compose up -d'];

type UpdateOutcome = 'succeeded' | 'rolled-back' | 'failed' | 'timeout';

interface VersionBadgeProps {
  readonly isCollapsed?: boolean;
}

export const VersionBadge: FC<VersionBadgeProps> = ({ isCollapsed }) => {
  const { t } = useLanguage();
  const [info, setInfo] = useState<VersionInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  // The update being waited on: when it was started here, the startedAt the
  // panel recorded for it, and the version it started from. Null when none is
  // in flight.
  const [update, setUpdate] = useState<{ startedAt: number; id: string | null; from: string | null } | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    getVersionInfo()
      .then((data) => {
        setInfo(data);
        // Picks the wait back up after a reload, since the update outlives the tab.
        const running = data.lastUpdate?.status === 'running' ? Date.parse(data.lastUpdate.startedAt) : Number.NaN;
        if (!Number.isNaN(running) && Date.now() - running < STALE_RUN_MS) {
          setUpdate({ startedAt: running, id: data.lastUpdate?.startedAt ?? null, from: data.current });
        }
      })
      .catch(() => setInfo(null));
  }, []);

  /**
   * Watches the update through to the end.
   *
   * The panel is recreated halfway, so the requests in between simply fail and
   * are ignored. It is over when the updater records an outcome, or when the
   * version the API reports is no longer the one that started the update.
   */
  useEffect(() => {
    if (!update) return;

    let timer: ReturnType<typeof setInterval>;

    const finish = (outcome: UpdateOutcome) => {
      clearInterval(timer);
      setUpdate(null);

      if (outcome === 'succeeded') {
        mcToast.success(t('updateSucceeded'));
        // The frontend container was recreated too, so this tab is running the
        // previous build until it reloads.
        setTimeout(() => window.location.reload(), 2000);
        return;
      }

      mcToast.error(t(outcome === 'rolled-back' ? 'updateRolledBack' : outcome === 'failed' ? 'updateRunFailed' : 'updateTimeout'));
    };

    const tick = async () => {
      try {
        const status = await getUpdateStatus();
        const restarted = !!status.current && !!update.from && status.current !== update.from;
        if (restarted) return finish('succeeded');

        // The result file keeps the last update's outcome forever, so only the
        // one carrying this update's startedAt says anything about this update.
        const result = status.lastUpdate && (!update.id || status.lastUpdate.startedAt === update.id) ? status.lastUpdate : null;
        if (result && result.status !== 'running') return finish(result.status);
      } catch {
        // The panel is restarting; keep asking until it answers again.
      }

      if (Date.now() - update.startedAt > POLL_TIMEOUT_MS) finish('timeout');
    };

    timer = setInterval(tick, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [update, t]);

  /** The panel holds GitHub's answer for an hour, so a release published since
   *  the last look is invisible until this asks again. */
  const handleCheck = async () => {
    setIsChecking(true);
    try {
      const data = await getVersionInfo(true);
      setInfo(data);
      if (data.updateAvailable) {
        mcToast.success(`${t('updateAvailable')}: v${data.latest}`);
      } else {
        mcToast.success(t('changelogUpToDate'));
      }
    } catch {
      mcToast.error(t('checkForUpdatesFailed'));
    } finally {
      setIsChecking(false);
    }
  };

  const handleUpdate = async () => {
    setIsStarting(true);
    try {
      const started = await startUpdate();
      mcToast.success(t('updateStarted'));
      // Only now: until the panel answers, the recorded outcome is still the
      // previous update's, and reading it would call this one finished before
      // it had begun.
      setUpdate({ startedAt: Date.now(), id: started.startedAt, from: info?.current ?? null });
    } catch {
      mcToast.error(t('updateFailed'));
    } finally {
      setIsStarting(false);
    }
  };

  // A local run has no version baked into the image, so there is nothing to show.
  if (!info?.current) return null;

  const isUpdating = update !== null || isStarting;
  const canUpdate = info.updateAvailable && info.canSelfUpdate;
  // Steps rather than news: a compose file to edit, a variable to add. They are
  // shown above the changelog so they are read before the update button.
  const actionRequired = info.changelog.flatMap((release) =>
    release.sections.filter((section) => section.important).flatMap((section) => section.changes.map((change) => ({ release, change }))),
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title={info.updateAvailable ? `${t('updateAvailable')}: v${info.latest}` : `Minepanel v${info.current}`}
        className={cn(
          'flex h-9 w-full items-center gap-2 transition-colors',
          isCollapsed ? 'justify-center px-0' : 'px-3',
          info.updateAvailable ? 'text-amber-300 hover:bg-amber-500/10 hover:text-amber-200' : 'text-gray-600 hover:bg-gray-700/30 hover:text-gray-400',
        )}
      >
        {isUpdating ? <Loader2 size={16} className="shrink-0 animate-spin" /> : info.updateAvailable ? <ArrowUpCircle size={16} className="shrink-0" /> : null}
        <span className={cn('font-minecraft text-[11px] whitespace-nowrap', isCollapsed ? 'hidden' : 'block')}>
          {isUpdating ? t('updating') : info.updateAvailable ? `${t('updateAvailable')} · v${info.latest}` : `v${info.current}`}
        </span>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[80vh] w-[min(96vw,52rem)] overflow-hidden border-2 border-gray-700 bg-gray-900 text-gray-200 sm:max-w-none">
          <DialogHeader>
            <DialogTitle className="font-minecraft text-emerald-400">
              {info.updateAvailable ? `${t('updateAvailable')} · v${info.latest}` : `Minepanel v${info.current}`}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {info.updateAvailable ? t('changelogSince').replace('{version}', `v${info.current}`) : t('changelogUpToDate')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-3 border-b border-gray-700/60 pb-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCheck}
              disabled={isChecking}
              className="border-gray-700 bg-gray-800 text-gray-300 hover:border-emerald-500 hover:bg-gray-700 hover:text-emerald-300"
            >
              <RefreshCcw className={cn('mr-2 h-3.5 w-3.5', isChecking && 'animate-spin')} />
              {t('checkForUpdates')}
            </Button>
            {info.checkedAt ? (
              <span className="text-[11px] text-gray-500">
                {t('versionLastChecked').replace('{time}', new Date(info.checkedAt).toLocaleTimeString())}
              </span>
            ) : null}
          </div>

          {actionRequired.length > 0 || info.hasBreakingChanges ? (
            <div className="rounded-lg border border-amber-600/40 bg-amber-900/20 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div className="min-w-0">
                  <p className="font-minecraft text-[11px] tracking-wide text-amber-300">{t('changelogActionRequired')}</p>
                  <p className="mt-1 text-xs text-amber-200/80">{t('changelogBreakingWarning')}</p>
                </div>
              </div>

              {actionRequired.length > 0 ? (
                <ul className="mt-2 space-y-1 pl-6">
                  {actionRequired.map(({ release, change }) => (
                    <li key={`${release.version}-${change.text}`} className="flex items-start gap-2 text-xs text-amber-100">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                      <span className="min-w-0 flex-1 break-words">{change.text}</span>
                      <a
                        href={release.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 font-mono text-[10px] text-amber-300/70 transition-colors hover:text-amber-200"
                      >
                        v{release.version}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="max-h-[45vh] space-y-4 overflow-y-auto pr-1">
            {info.changelog.map((release) => (
              <ReleaseCard key={release.version} release={release} />
            ))}
            {info.updateAvailable && info.changelog.length === 0 ? (
              <p className="text-xs text-gray-500">{t('changelogUnavailable')}</p>
            ) : null}
          </div>

          {info.updateAvailable ? (
            <div className="space-y-3 border-t border-gray-700/60 pt-3">
              <p className="font-minecraft text-[11px] tracking-wide text-emerald-300">{t('updateHowTo')}</p>

              {canUpdate ? (
                <>
                  <Button
                    type="button"
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    className="w-full bg-amber-600 font-minecraft text-white hover:bg-amber-700"
                  >
                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    {isUpdating ? t('updating') : t('updateNow')}
                  </Button>
                  <p className="text-[11px] text-gray-500">{isUpdating ? t('updateInProgress') : t('updateNowDesc')}</p>
                </>
              ) : (
                <p className="text-xs text-gray-400">{t('updateManually')}</p>
              )}

              <div className="space-y-1">
                {canUpdate ? <p className="text-[11px] text-gray-500">{t('updateOrManually')}</p> : null}
                {MANUAL_COMMANDS.map((command) => (
                  <code key={command} className="block rounded bg-gray-800 px-2 py-1.5 font-mono text-[11px] text-gray-300">
                    {command}
                  </code>
                ))}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};

const ReleaseCard: FC<{ readonly release: ReleaseNote }> = ({ release }) => {
  const { t } = useLanguage();
  const isEmpty = release.sections.length === 0 && !release.notes;

  return (
    <div className="rounded-lg border border-gray-700/60 bg-gray-800/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="font-minecraft text-sm text-emerald-300">v{release.version}</span>
        {release.breaking ? (
          <span className="rounded bg-amber-900/40 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">{t('changelogBreaking')}</span>
        ) : null}
        <span className="text-[11px] text-gray-500">{new Date(release.publishedAt).toLocaleDateString()}</span>
        <a
          href={release.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-gray-500 transition-colors hover:text-gray-300"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="space-y-3">
        {release.sections.map((section) => (
          <div key={section.title || 'changes'}>
            {section.title ? <p className="mb-1 text-[11px] font-semibold tracking-wide text-gray-300">{section.title}</p> : null}
            <ul className="space-y-1">
              {section.changes.map((change) => (
                <li key={`${change.prUrl ?? ''}${change.text}`} className="flex items-start gap-2 text-xs leading-relaxed text-gray-400">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500/70" />
                  <span className="min-w-0 flex-1 break-words">{change.text}</span>
                  {change.prUrl ? (
                    <a
                      href={change.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={change.author ? `@${change.author}` : undefined}
                      className="mt-0.5 flex shrink-0 items-center gap-1 rounded bg-gray-700/50 px-1.5 py-0.5 font-mono text-[10px] text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200"
                    >
                      <GitPullRequest className="h-3 w-3" />
                      {change.pr ?? ''}
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Hand-written notes, which have no categories to group by. */}
        {release.notes ? <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-gray-400">{release.notes}</p> : null}
        {isEmpty ? <p className="text-xs text-gray-500">{t('changelogNoNotes')}</p> : null}
      </div>

      {release.compareUrl ? (
        <a
          href={release.compareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-[11px] text-gray-500 transition-colors hover:text-emerald-300"
        >
          {t('changelogCompare')}
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}
    </div>
  );
};
