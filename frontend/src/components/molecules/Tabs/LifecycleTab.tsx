import { FC } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, HelpCircle } from 'lucide-react';
import { ServerConfig } from '@/lib/types/types';
import { useLanguage } from '@/lib/hooks/useLanguage';
import Image from 'next/image';

interface LifecycleTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const LifecycleTab: FC<LifecycleTabProps> = ({ config, updateConfig }) => {
  const { t } = useLanguage();
  const isJava = config.edition !== 'BEDROCK';
  const autoStopEnabled = config.enableAutoStop === true;

  const handleAutoStopChange = (checked: boolean) => {
    updateConfig('enableAutoStop', checked);
    if (checked && config.enableAutoPause) {
      updateConfig('enableAutoPause', false);
    }
  };

  const handleAutoPauseChange = (checked: boolean) => {
    updateConfig('enableAutoPause', checked);
    if (checked && config.enableAutoStop) {
      updateConfig('enableAutoStop', false);
    }
  };

  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
          <Clock className="h-6 w-6" />
          {t('lifecycle')}
        </CardTitle>
        <CardDescription className="text-gray-300">{t('lifecycleDesc')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* AutoStop - Java only */}
        {isJava && (
          <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="enableAutoStop"
                  className={`text-gray-200 font-minecraft text-sm flex items-center gap-2 ${config.enableAutoPause ? 'opacity-50' : ''}`}
                >
                  <Image
                    src="/images/redstone.webp"
                    alt={t('enableAutoStop')}
                    width={16}
                    height={16}
                  />
                  {t('enableAutoStop')}
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
                      <p>{t('autoStopTooltip')}</p>
                      {config.enableAutoPause && (
                        <p className="text-red-400 mt-1">{t('cannotUseWithAutoPause')}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="enableAutoStop"
                checked={config.enableAutoStop || false}
                onCheckedChange={handleAutoStopChange}
                disabled={config.enableAutoPause}
              />
            </div>

            {config.enableAutoStop && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="autoStopTimeoutInit" className="text-xs text-gray-300">
                    {t('initialTimeout')}
                  </Label>
                  <Input
                    id="autoStopTimeoutInit"
                    type="text"
                    value={config.autoStopTimeoutInit || '300'}
                    onChange={(e) => updateConfig('autoStopTimeoutInit', e.target.value)}
                    className="bg-gray-800/70 border-gray-700/50 focus:ring-emerald-500/30"
                  />
                  <p className="text-xs text-gray-400">{t('autoStopTimeoutInitDesc')}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="autoStopTimeoutEst" className="text-xs text-gray-300">
                    {t('establishedTimeout')}
                  </Label>
                  <Input
                    id="autoStopTimeoutEst"
                    type="text"
                    value={config.autoStopTimeoutEst || '300'}
                    onChange={(e) => updateConfig('autoStopTimeoutEst', e.target.value)}
                    className="bg-gray-800/70 border-gray-700/50 focus:ring-emerald-500/30"
                  />
                  <p className="text-xs text-gray-400">{t('autoStopTimeoutEstDesc')}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AutoPause - Java only */}
        {isJava && (
          <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="enableAutoPause"
                  className={`text-gray-200 font-minecraft text-sm flex items-center gap-2 ${config.enableAutoStop ? 'opacity-50' : ''}`}
                >
                  <Image src="/images/clock.webp" alt={t('enableAutoPause')} width={16} height={16} />
                  {t('enableAutoPause')}
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
                      <p>{t('autoPauseTooltip')}</p>
                      {config.enableAutoStop && (
                        <p className="text-red-400 mt-1">{t('cannotUseWithAutoStop')}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="enableAutoPause"
                checked={config.enableAutoPause || false}
                onCheckedChange={handleAutoPauseChange}
                disabled={config.enableAutoStop}
              />
            </div>

            {/* Warning about mod compatibility */}
            {config.enableAutoPause && (
              <div className="flex items-start gap-2 p-3 bg-amber-900/30 border border-amber-700/50 rounded">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="text-xs text-amber-200">
                  <p className="font-medium">{t('modCompatibilityWarning')}</p>
                  <p className="mt-1">{t('modCompatibilityDesc')}</p>
                </div>
              </div>
            )}

            {config.enableAutoPause && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="autoPauseTimeoutInit" className="text-xs text-gray-300">
                    {t('initialTimeout')}
                  </Label>
                  <Input
                    id="autoPauseTimeoutInit"
                    type="text"
                    value={config.autoPauseTimeoutInit || '300'}
                    onChange={(e) => updateConfig('autoPauseTimeoutInit', e.target.value)}
                    className="bg-gray-800/70 border-gray-700/50 focus:ring-emerald-500/30"
                  />
                  <p className="text-xs text-gray-400">{t('autoPauseTimeoutInitDesc')}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="autoPauseTimeoutEst" className="text-xs text-gray-300">
                    {t('establishedTimeout')}
                  </Label>
                  <Input
                    id="autoPauseTimeoutEst"
                    type="text"
                    value={config.autoPauseTimeoutEst || '300'}
                    onChange={(e) => updateConfig('autoPauseTimeoutEst', e.target.value)}
                    className="bg-gray-800/70 border-gray-700/50 focus:ring-emerald-500/30"
                  />
                  <p className="text-xs text-gray-400">{t('autoPauseTimeoutEstDesc')}</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="autoPauseKnockInterface" className="text-xs text-gray-300">
                    {t('reconnectInterface')}
                  </Label>
                  <Input
                    id="autoPauseKnockInterface"
                    type="text"
                    value={config.autoPauseKnockInterface || '0.0.0.0'}
                    onChange={(e) => updateConfig('autoPauseKnockInterface', e.target.value)}
                    className="bg-gray-800/70 border-gray-700/50 focus:ring-emerald-500/30"
                  />
                  <p className="text-xs text-gray-400">{t('reconnectInterfaceDesc')}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="stopDelay"
              className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
            >
              <Image src="/images/emerald.webp" alt={t('stopDelay')} width={16} height={16} />
              {t('stopDelay')}
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

        <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="restartPolicy"
              className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
            >
              <Image src="/images/hopper.webp" alt={t('restartPolicy')} width={16} height={16} />
              {t('restartPolicy')}
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
                  <p>{t('restartPolicyDesc')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select
            value={autoStopEnabled ? 'no' : config.restartPolicy}
            onValueChange={(value) => {
              if (autoStopEnabled && value !== 'no') {
                return;
              }

              updateConfig(
                'restartPolicy',
                value as 'no' | 'always' | 'on-failure' | 'unless-stopped',
              );
            }}
          >
            <SelectTrigger
              id="restartPolicy"
              className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:ring-emerald-500/30"
            >
              <SelectValue placeholder={t('restartPolicy')} />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
              <SelectItem value="no">{t('noRestart')}</SelectItem>
              <SelectItem value="always" disabled={autoStopEnabled}>
                {t('alwaysRestart')}
              </SelectItem>
              <SelectItem value="on-failure" disabled={autoStopEnabled}>
                {t('restartOnFailure')}
              </SelectItem>
              <SelectItem value="unless-stopped" disabled={autoStopEnabled}>
                {t('restartUnlessStopped')}
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-400">{t('restartPolicyDesc')}</p>
          {autoStopEnabled && (
            <p className="text-xs text-amber-400">{t('autoStopForcesNoRestart')}</p>
          )}
        </div>

        <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50 space-y-2">
          <Label
            htmlFor="tz"
            className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
          >
            <Image src="/images/clock.webp" alt={t('timezone')} width={16} height={16} />
            {t('timezone')}
          </Label>
          <Select value={config.tz || 'UTC'} onValueChange={(value) => updateConfig('tz', value)}>
            <SelectTrigger
              id="tz"
              className="bg-gray-800/70 border-gray-700/50 focus:ring-emerald-500/30"
            >
              <SelectValue placeholder={t('selectTimezone')} />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="UTC">UTC</SelectItem>
              <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
              <SelectItem value="America/New_York">America/New_York</SelectItem>
              <SelectItem value="Europe/London">Europe/London</SelectItem>
              <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
              <SelectItem value="Europe/Madrid">Europe/Madrid</SelectItem>
              <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
              <SelectItem value="Australia/Sydney">Australia/Sydney</SelectItem>
              <SelectItem value="America/Santiago">America/Santiago</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-400">{t('timezoneDesc')}</p>
        </div>
      </CardContent>
    </Card>
  );
};
