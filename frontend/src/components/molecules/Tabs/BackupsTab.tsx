import { FC, useState } from 'react';
import { getBackupSnapshots, ResticSnapshot } from '@/services/docker/fetchs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookOpen, HelpCircle, RefreshCw } from 'lucide-react';
import { ServerConfig } from '@/lib/types/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/lib/hooks/useLanguage';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';
import { LINK_BACKUPS_SETTINGS } from '@/lib/providers/constants';

interface BackupsTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

// Java only: mc-backup drives the world save over RCON, which Bedrock has no
// equivalent for, so the tab is hidden rather than shown empty.
export const BackupsTab: FC<BackupsTabProps> = ({ config, updateConfig }) => {
  const { t } = useLanguage();
  const [snapshots, setSnapshots] = useState<ResticSnapshot[]>([]);
  const [snapshotsError, setSnapshotsError] = useState('');
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotsLoaded, setSnapshotsLoaded] = useState(false);

  const loadSnapshots = async () => {
    setSnapshotsLoading(true);
    setSnapshotsError('');
    try {
      const result = await getBackupSnapshots(config.id);
      setSnapshots(result.snapshots || []);
      if (!result.success) {
        setSnapshotsError(result.error || t('snapshotsUnavailable'));
      }
    } catch {
      setSnapshotsError(t('snapshotsUnavailable'));
    } finally {
      setSnapshotsLoading(false);
      setSnapshotsLoaded(true);
    }
  };

  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
              <Image
                src="/images/ender_chest.webp"
                alt={t('backups')}
                width={24}
                height={24}
                className="opacity-90"
              />
              {t('backups')}
            </CardTitle>
            <CardDescription className="text-gray-300">{t('backupsDesc')}</CardDescription>
          </div>
          <a
            href={LINK_BACKUPS_SETTINGS}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            {t('documentation')}
          </a>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-4 p-5 rounded-md bg-gray-800/70 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <Label htmlFor="enableBackup" className="text-emerald-400 font-minecraft text-md">
              {t('enableBackup')}
            </Label>
            <Switch
              id="enableBackup"
              checked={config.enableBackup || false}
              onCheckedChange={(checked: boolean) => updateConfig('enableBackup', checked)}
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>

          {config.enableBackup && (
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="backupMethod"
                      className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
                    >
                      <Image src="/images/chest.webp" alt="Método" width={16} height={16} />
                      {t('backupMethod')}
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50"
                          >
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                          <p>{t('backupMethodDesc')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select
                    value={config.backupMethod || 'tar'}
                    onValueChange={(value) =>
                      updateConfig('backupMethod', value as 'tar' | 'rsync' | 'restic' | 'rclone')
                    }
                  >
                    <SelectTrigger
                      id="backupMethod"
                      className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:ring-emerald-500/30"
                    >
                      <SelectValue placeholder={t('selectBackupMethod')} />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                      <SelectItem value="tar">{t('tarCompression')}</SelectItem>
                      <SelectItem value="rsync">{t('rsyncIncremental')}</SelectItem>
                      <SelectItem value="restic">{t('resticIncrementalEncrypted')}</SelectItem>
                      <SelectItem value="rclone">{t('rcloneRemote')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="backupName"
                      className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
                    >
                      <Image src="/images/name_tag.webp" alt="Nombre" width={16} height={16} />
                      {t('backupName')}
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50"
                          >
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                          <p>{t('backupNameDesc')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="backupName"
                    value={config.backupName || 'world'}
                    onChange={(e) => updateConfig('backupName', e.target.value)}
                    placeholder="world"
                    className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              {config.backupMethod === 'restic' && (
                <div className="space-y-4 p-4 rounded-md bg-gray-900/50 border border-gray-600/50">
                  <div className="flex items-center gap-2">
                    <Image src="/images/ender_chest.webp" alt="Restic" width={16} height={16} />
                    <h4 className="text-emerald-400 font-minecraft text-sm">{t('resticConfig')}</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="resticRepository" className="text-gray-200 font-minecraft text-sm">
                        {t('resticRepository')}
                      </Label>
                      <Input
                        id="resticRepository"
                        value={config.resticRepository || ''}
                        onChange={(e) => updateConfig('resticRepository', e.target.value)}
                        placeholder="s3:https://s3.amazonaws.com/my-bucket/minecraft"
                        className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
                      />
                      <p className="text-xs text-gray-400">{t('resticRepositoryHelp')}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="resticPassword" className="text-gray-200 font-minecraft text-sm">
                        {t('resticPassword')}
                      </Label>
                      <Input
                        id="resticPassword"
                        type="password"
                        value={config.resticPassword || ''}
                        onChange={(e) => updateConfig('resticPassword', e.target.value)}
                        className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
                      />
                      <p className="text-xs text-gray-400">{t('resticPasswordHelp')}</p>
                    </div>
                  </div>

                  {(config.resticRepository || '').startsWith('s3:') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="resticS3AccessKeyId" className="text-gray-200 font-minecraft text-sm">
                          {t('resticS3AccessKey')}
                        </Label>
                        <Input
                          id="resticS3AccessKeyId"
                          value={config.resticS3AccessKeyId || ''}
                          onChange={(e) => updateConfig('resticS3AccessKeyId', e.target.value)}
                          className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="resticS3SecretAccessKey" className="text-gray-200 font-minecraft text-sm">
                          {t('resticS3SecretKey')}
                        </Label>
                        <Input
                          id="resticS3SecretAccessKey"
                          type="password"
                          value={config.resticS3SecretAccessKey || ''}
                          onChange={(e) => updateConfig('resticS3SecretAccessKey', e.target.value)}
                          className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="resticRetention" className="text-gray-200 font-minecraft text-sm">
                      {t('resticRetention')}
                    </Label>
                    <Input
                      id="resticRetention"
                      value={config.resticRetention || ''}
                      onChange={(e) => updateConfig('resticRetention', e.target.value)}
                      placeholder="--keep-within 7d"
                      className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
                    />
                    <p className="text-xs text-gray-400">{t('resticRetentionHelp')}</p>
                  </div>

                  <div className="p-3 rounded bg-amber-900/30 border border-amber-700/50">
                    <p className="text-amber-300 text-xs">{t('resticCredentialsHint')}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-200 font-minecraft text-sm">{t('backupSnapshots')}</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={loadSnapshots}
                        disabled={snapshotsLoading}
                        className="bg-gray-800/70 text-gray-200 border-gray-700/50 hover:bg-gray-700/50"
                      >
                        <RefreshCw className={`h-4 w-4 mr-1 ${snapshotsLoading ? 'animate-spin' : ''}`} />
                        {t('refreshSnapshots')}
                      </Button>
                    </div>
                    {snapshotsError && <p className="text-xs text-amber-400">{snapshotsError}</p>}
                    {snapshotsLoaded && !snapshotsError && snapshots.length === 0 && (
                      <p className="text-xs text-gray-400">{t('noSnapshotsYet')}</p>
                    )}
                    {snapshots.length > 0 && (
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {snapshots.map((snapshot) => (
                          <div
                            key={snapshot.id}
                            className="flex items-center justify-between text-xs bg-gray-800/70 border border-gray-700/50 rounded px-2 py-1.5"
                          >
                            <span className="text-gray-200 font-mono">{snapshot.shortId}</span>
                            <span className="text-gray-400">{snapshot.time ? new Date(snapshot.time).toLocaleString() : ''}</span>
                            <span className="text-gray-500">{snapshot.tags.join(', ')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="backupInterval"
                      className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
                    >
                      <Image src="/images/clock.webp" alt="Intervalo" width={16} height={16} />
                      {t('backupInterval')}
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50"
                          >
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                          <p>{t('backupIntervalDesc')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="backupInterval"
                    value={config.backupInterval || '24h'}
                    onChange={(e) => updateConfig('backupInterval', e.target.value)}
                    placeholder="24h"
                    className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="backupInitialDelay"
                      className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
                    >
                      <Image src="/images/compass.webp" alt="Retardo" width={16} height={16} />
                      {t('backupInitialDelay')}
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50"
                          >
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                          <p>{t('backupInitialDelayDesc')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="backupInitialDelay"
                    value={config.backupInitialDelay || '2m'}
                    onChange={(e) => updateConfig('backupInitialDelay', e.target.value)}
                    placeholder="2m"
                    className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="backupPruneDays"
                      className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
                    >
                      <Image src="/images/shears.webp" alt="Poda" width={16} height={16} />
                      {t('backupPruneDays')}
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50"
                          >
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                          <p>{t('backupPruneDaysDesc')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="backupPruneDays"
                    type="number"
                    value={config.backupPruneDays || '7'}
                    onChange={(e) => updateConfig('backupPruneDays', e.target.value)}
                    placeholder="7"
                    className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="backupDestDir"
                      className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
                    >
                      <Image src="/images/ender_chest.webp" alt="Destino" width={16} height={16} />
                      {t('backupDestDir')}
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50"
                          >
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                          <p>{t('backupDestDirDesc')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="backupDestDir"
                    value={config.backupDestDir || '/backups'}
                    onChange={(e) => updateConfig('backupDestDir', e.target.value)}
                    placeholder="/backups"
                    className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="backupHostDir"
                      className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
                    >
                      <Image src="/images/ender_chest.webp" alt="Host" width={16} height={16} />
                      {t('backupHostDir')}
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50"
                          >
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                          <p>{t('backupHostDirDesc')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="backupHostDir"
                    value={config.backupHostDir || ''}
                    onChange={(e) => updateConfig('backupHostDir', e.target.value)}
                    placeholder="/network-disk/minepanel"
                    className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="backupExcludes"
                      className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
                    >
                      <Image src="/images/barrier.webp" alt="Excluir" width={16} height={16} />
                      {t('backupExcludes')}
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50"
                          >
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                          <p>{t('backupExcludesDesc')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="backupExcludes"
                    value={config.backupExcludes || '*.jar,cache,logs,*.tmp'}
                    onChange={(e) => updateConfig('backupExcludes', e.target.value)}
                    placeholder="*.jar,cache,logs,*.tmp"
                    className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
                  />
                  <p className="text-xs text-gray-400">{t('backupExcludesHelp')}</p>
                </div>
              </div>

              <div className="flex flex-col space-y-4">
                <div className="flex items-center gap-3">
                  <Switch
                    id="backupOnStartup"
                    checked={config.backupOnStartup !== false}
                    onCheckedChange={(checked) => updateConfig('backupOnStartup', checked)}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                  <Label htmlFor="backupOnStartup" className="text-gray-200 font-minecraft text-sm">
                    {t('backupOnStartup')}
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50"
                        >
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                        <p>{t('backupOnStartupDesc')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    id="pauseIfNoPlayers"
                    checked={config.pauseIfNoPlayers || false}
                    onCheckedChange={(checked) => updateConfig('pauseIfNoPlayers', checked)}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                  <Label
                    htmlFor="pauseIfNoPlayers"
                    className="text-gray-200 font-minecraft text-sm"
                  >
                    {t('pauseIfNoPlayers')}
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50"
                        >
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                        <p>{t('pauseIfNoPlayersDesc')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {config.pauseIfNoPlayers && (
                  <div className="ml-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="playersOnlineCheckInterval"
                        className="text-gray-200 font-minecraft text-sm"
                      >
                        {t('playersOnlineCheckInterval')}
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50"
                            >
                              <HelpCircle className="h-4 w-4 text-gray-400" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                            <p>{t('playersOnlineCheckIntervalDesc')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="playersOnlineCheckInterval"
                      value={config.playersOnlineCheckInterval || '5m'}
                      onChange={(e) => updateConfig('playersOnlineCheckInterval', e.target.value)}
                      placeholder="5m"
                      className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
                    />
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Switch
                    id="enableSaveAll"
                    checked={config.enableSaveAll !== false}
                    onCheckedChange={(checked) => updateConfig('enableSaveAll', checked)}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                  <Label htmlFor="enableSaveAll" className="text-gray-200 font-minecraft text-sm">
                    {t('enableSaveAll')}
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50"
                        >
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200 max-w-xs">
                        <p>{t('enableSaveAllDesc')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {config.enableSaveAll === false && (
                  <div className="ml-6 p-3 rounded bg-amber-900/30 border border-amber-700/50">
                    <p className="text-amber-300 text-xs">{t('enableSaveAllWarning')}</p>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Switch
                    id="enableSync"
                    checked={config.enableSync !== false}
                    onCheckedChange={(checked) => updateConfig('enableSync', checked)}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                  <Label htmlFor="enableSync" className="text-gray-200 font-minecraft text-sm">
                    {t('enableSync')}
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50"
                        >
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200 max-w-xs">
                        <p>{t('enableSyncDesc')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {config.backupMethod === 'tar' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="tarCompressMethod"
                      className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
                    >
                      <Image src="/images/anvil.webp" alt="Compresión" width={16} height={16} />
                      {t('tarCompressMethod')}
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50"
                          >
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                          <p>{t('tarCompressMethodDesc')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select
                    value={config.tarCompressMethod || 'gzip'}
                    onValueChange={(value) =>
                      updateConfig('tarCompressMethod', value as 'gzip' | 'bzip2' | 'zstd')
                    }
                  >
                    <SelectTrigger
                      id="tarCompressMethod"
                      className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:ring-emerald-500/30"
                    >
                      <SelectValue placeholder={t('selectTarCompressMethod') as string} />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                      <SelectItem value="gzip">{t('gzip')}</SelectItem>
                      <SelectItem value="bzip2">{t('bzip2')}</SelectItem>
                      <SelectItem value="zstd">{t('zstd')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
