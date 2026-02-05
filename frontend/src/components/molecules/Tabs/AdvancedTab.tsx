import { FC, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HelpCircle, Network, Plus, Trash2 } from 'lucide-react';
import { ServerConfig } from '@/lib/types/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/lib/hooks/useLanguage';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';

interface AdvancedTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const AdvancedTab: FC<AdvancedTabProps> = ({ config, updateConfig }) => {
  const { t } = useLanguage();
  const [newPort, setNewPort] = useState('');

  const isJava = config.edition !== 'BEDROCK';
  const isCurseForge =
    config.serverType === 'AUTO_CURSEFORGE' || config.serverType === 'CURSEFORGE';

  const addExtraPort = () => {
    if (newPort.trim() && !config.extraPorts?.includes(newPort.trim())) {
      const currentPorts = config.extraPorts || [];
      let port = newPort.trim();
      if (!newPort.includes(':')) {
        port = `${newPort}:${newPort}`;
      }
      updateConfig('extraPorts', [...currentPorts, port]);
      setNewPort('');
    }
  };

  const removeExtraPort = (index: number) => {
    const currentPorts = config.extraPorts || [];
    const updatedPorts = currentPorts.filter((_, i) => i !== index);
    updateConfig('extraPorts', updatedPorts);
  };

  const updateExtraPort = (index: number, value: string) => {
    const currentPorts = config.extraPorts || [];
    const updatedPorts = [...currentPorts];
    updatedPorts[index] = value;
    updateConfig('extraPorts', updatedPorts);
  };

  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
          <Image
            src="/images/command-block.webp"
            alt="Avanzado"
            width={24}
            height={24}
            className="opacity-90"
          />
          {t('advancedConfig')}
        </CardTitle>
        <CardDescription className="text-gray-300">{t('advancedConfigDesc')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Backup section - Java only (mc-backup requires RCON) */}
        {isJava && (
        <div className="space-y-4 p-5 rounded-md bg-gray-800/70 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image src="/images/ender_chest.webp" alt="Backup" width={20} height={20} />
              <h3 className="text-emerald-400 font-minecraft text-md">{t('backupConfig')}</h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-300 text-sm">{t('enableBackup')}</span>
              <Switch
                checked={config.enableBackup || false}
                onCheckedChange={(checked: boolean) => updateConfig('enableBackup', checked)}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
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
        )}

        <div className="space-y-4 p-5 rounded-md bg-gray-800/70 border border-gray-700/50">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-emerald-400" />
            <h3 className="text-emerald-400 font-minecraft text-md">{t('extraPorts')}</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50"
                  >
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                  <p>{t('extraPortsDesc')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="8080:8080 o 9000:9000/tcp"
                value={newPort}
                onChange={(e) => setNewPort(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addExtraPort()}
                className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
              />
              <p className="text-xs text-gray-400 mt-1">{t('portFormat')}</p>
            </div>
            <Button
              type="button"
              onClick={addExtraPort}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!newPort.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {config.extraPorts && config.extraPorts.length > 0 && (
            <div className="space-y-2">
              <Label className="text-gray-200 font-minecraft text-sm">{t('configuredPorts')}</Label>
              {config.extraPorts.map((port, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Input
                      value={port}
                      onChange={(e) => updateExtraPort(index, e.target.value)}
                      className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
                      placeholder="puerto_host:puerto_contenedor"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => removeExtraPort(index)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {(!config.extraPorts || config.extraPorts.length === 0) && (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm">{t('noExtraPorts')}</p>
              <p className="text-gray-500 text-xs mt-1">{t('extraPortsUseful')}</p>
            </div>
          )}

          <div className="bg-gray-900/50 p-3 rounded border border-gray-600/50">
            <Label className="text-gray-300 font-minecraft text-xs">{t('configExamples')}</Label>
            <div className="text-xs text-gray-400 mt-2 space-y-1">
              <div>
                <code className="bg-gray-800 px-1 rounded">24454:24454/udp</code> -{' '}
                {t('portVoiceChat')}
              </div>
              <div>
                <code className="bg-gray-800 px-1 rounded">9000:9000/tcp</code> -{' '}
                {t('portTcpSpecific')}
              </div>
              <div>
                <code className="bg-gray-800 px-1 rounded">25566:25566/udp</code> -{' '}
                {t('portUdpPlugins')}
              </div>
              <div>
                <code className="bg-gray-800 px-1 rounded">8123:8123</code> - {t('portDynmap')}
              </div>
            </div>
          </div>
        </div>

        {isCurseForge && (
          <div className="space-y-2 p-4 rounded-md bg-blue-900/30 border border-blue-700/30">
            <div className="flex items-center gap-2">
              <Image
                src="/images/enchanted-book.webp"
                alt="Info"
                width={20}
                height={20}
                className="opacity-90"
              />
              <div>
                <p className="text-sm font-medium text-blue-300 font-minecraft">
                  {t('minecraftVersion')}
                </p>
                <p className="text-xs text-blue-200/80 mt-1">{t('curseforgeVersionAuto')}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="idleTimeout"
                className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
              >
                <Image src="/images/clock.webp" alt="Tiempo" width={16} height={16} />
                {t('idleTimeout')}
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50"
                    >
                      <HelpCircle className="h-4 w-4 text-gray-400" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                    <p>{t('idleTimeoutDesc')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="playerIdleTimeout"
              type="number"
              value={config.playerIdleTimeout}
              onChange={(e) => updateConfig('playerIdleTimeout', String(e.target.value))}
              placeholder="60"
              className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
            />
            <p className="text-xs text-gray-400">{t('idleTimeoutHelp')}</p>
          </div>

          <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="stopDelay"
                className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
              >
                <Image src="/images/emerald.webp" alt="Retardo" width={16} height={16} />
                {t('stopDelay')}
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50"
                    >
                      <HelpCircle className="h-4 w-4 text-gray-400" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                    <p>{t('stopDelayDesc')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="stopDelay"
              type="number"
              value={config.stopDelay}
              onChange={(e) => updateConfig('stopDelay', e.target.value)}
              placeholder="60"
              className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
            />
            <p className="text-xs text-gray-400">{t('stopDelayHelp')}</p>
          </div>
        </div>

        <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="restartPolicy"
              className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
            >
              <Image src="/images/hopper.webp" alt="Reinicio" width={16} height={16} />
              {t('restartPolicy')}
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50"
                  >
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                  <p>{t('restartPolicyDesc')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select
            value={config.restartPolicy}
            onValueChange={(value) =>
              updateConfig(
                'restartPolicy',
                value as 'no' | 'always' | 'on-failure' | 'unless-stopped',
              )
            }
          >
            <SelectTrigger
              id="restartPolicy"
              className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:ring-emerald-500/30"
            >
              <SelectValue placeholder="Selecciona la política de reinicio" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
              <SelectItem value="no">{t('noRestart')}</SelectItem>
              <SelectItem value="always">{t('alwaysRestart')}</SelectItem>
              <SelectItem value="on-failure">{t('restartOnFailure')}</SelectItem>
              <SelectItem value="unless-stopped">{t('restartUnlessStopped')}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-400">{t('restartPolicyDesc')}</p>
        </div>

        <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="dockerVolumes"
              className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
            >
              <Image src="/images/chest.webp" alt="Volúmenes" width={16} height={16} />
              {t('dockerVolumes')}
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50"
                  >
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                  <p>{t('dockerVolumesDesc')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Textarea
            id="dockerVolumes"
            value={config.dockerVolumes}
            onChange={(e) => updateConfig('dockerVolumes', e.target.value)}
            placeholder="./mc-data:/data
./modpacks:/modpacks:ro"
            className="min-h-20 bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
          />
          <p className="text-xs text-gray-400">{t('dockerVolumesHelp')}</p>
        </div>

        <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="envVars"
              className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
            >
              <Image src="/images/enchanted-book.webp" alt="Variables" width={16} height={16} />
              {t('environmentVars')}
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50"
                  >
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                  <p>{t('environmentVarsDesc')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Textarea
            id="envVars"
            value={config.envVars}
            onChange={(e) => updateConfig('envVars', e.target.value)}
            placeholder="ENABLE_AUTOPAUSE=TRUE
MAX_TICK_TIME=60000"
            className="min-h-20 bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
          />
          <p className="text-xs text-gray-400">{t('environmentVarsHelp')}</p>
        </div>

        <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="dockerLabels"
              className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
            >
              <Image src="/images/name_tag.webp" alt="Labels" width={16} height={16} />
              {t('dockerLabels')}
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50"
                  >
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                  <p>{t('dockerLabelsDesc')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Textarea
            id="dockerLabels"
            value={config.dockerLabels || ''}
            onChange={(e) => updateConfig('dockerLabels', e.target.value)}
            placeholder="traefik.enable=true
traefik.tcp.routers.mc.rule=HostSNI(`*`)
traefik.tcp.routers.mc.entrypoints=minecraft"
            className="min-h-20 bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30 font-mono text-sm"
          />
          <p className="text-xs text-gray-400">{t('dockerLabelsHelp')}</p>
        </div>
      </CardContent>
    </Card>
  );
};
