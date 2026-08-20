'use client';

import { FC, useEffect, useState } from 'react';
import { AlertTriangle, ArrowUpCircle, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { mcToast } from '@/lib/utils/minecraft-toast';
import { getVersionInfo, startUpdate, VersionInfo } from '@/services/version/version.service';

interface VersionBadgeProps {
  readonly isCollapsed?: boolean;
}

export const VersionBadge: FC<VersionBadgeProps> = ({ isCollapsed }) => {
  const { t } = useLanguage();
  const [info, setInfo] = useState<VersionInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    getVersionInfo()
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await startUpdate();
      mcToast.success(t('updateStarted'));
    } catch {
      setIsUpdating(false);
      mcToast.error(t('updateFailed'));
    }
  };

  // A local run has no version baked into the image, so there is nothing to show.
  if (!info?.current) return null;

  const canUpdate = info.updateAvailable && info.canSelfUpdate;

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
        {info.updateAvailable ? <ArrowUpCircle size={16} className="shrink-0" /> : null}
        <span className={cn('font-minecraft text-[11px] whitespace-nowrap', isCollapsed ? 'hidden' : 'block')}>
          {info.updateAvailable ? `${t('updateAvailable')} · v${info.latest}` : `v${info.current}`}
        </span>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden border-2 border-gray-700 bg-gray-900 text-gray-200">
          <DialogHeader>
            <DialogTitle className="font-minecraft text-emerald-400">
              {info.updateAvailable ? `${t('updateAvailable')} · v${info.latest}` : `Minepanel v${info.current}`}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {info.updateAvailable ? t('changelogSince').replace('{version}', `v${info.current}`) : t('changelogUpToDate')}
            </DialogDescription>
          </DialogHeader>

          {info.hasBreakingChanges ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-600/40 bg-amber-900/20 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-xs text-amber-300">{t('changelogBreakingWarning')}</p>
            </div>
          ) : null}

          <div className="max-h-[45vh] space-y-4 overflow-y-auto pr-1">
            {info.changelog.map((release) => (
              <div key={release.version} className="rounded-lg border border-gray-700/60 bg-gray-800/40 p-3">
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
                <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-gray-400">
                  {release.notes || t('changelogNoNotes')}
                </pre>
              </div>
            ))}
            {info.updateAvailable && info.changelog.length === 0 ? (
              <p className="text-xs text-gray-500">{t('changelogUnavailable')}</p>
            ) : null}
          </div>

          {info.updateAvailable ? (
            <div className="space-y-2 border-t border-gray-700/60 pt-3">
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
                  <p className="text-[11px] text-gray-500">{t('updateNowDesc')}</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-400">{t('updateManually')}</p>
                  <code className="block rounded bg-gray-800 px-2 py-1.5 text-[11px] text-gray-300">docker compose pull &amp;&amp; docker compose up -d</code>
                </>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};
