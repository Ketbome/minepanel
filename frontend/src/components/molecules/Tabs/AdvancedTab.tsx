import { FC } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { HelpCircle } from 'lucide-react';
import { ServerConfig } from '@/lib/types/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/lib/hooks/useLanguage';
import Image from 'next/image';

interface AdvancedTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

// What is left here is the escape hatches: raw values handed straight to Docker
// with no field of their own. Everything with a proper home lives in its own tab.
export const AdvancedTab: FC<AdvancedTabProps> = ({ config, updateConfig }) => {
  const { t } = useLanguage();

  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
          <Image
            src="/images/command-block.webp"
            alt={t('advanced')}
            width={24}
            height={24}
            className="opacity-90"
          />
          {t('advancedConfig')}
        </CardTitle>
        <CardDescription className="text-gray-300">{t('advancedConfigDesc')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="envVars"
              className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
            >
              <Image
                src="/images/enchanted-book.webp"
                alt={t('environmentVars')}
                width={16}
                height={16}
              />
              {t('environmentVars')}
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
              htmlFor="dockerVolumes"
              className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
            >
              <Image src="/images/chest.webp" alt={t('dockerVolumes')} width={16} height={16} />
              {t('dockerVolumes')}
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
              htmlFor="dockerLabels"
              className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
            >
              <Image src="/images/name_tag.webp" alt={t('dockerLabels')} width={16} height={16} />
              {t('dockerLabels')}
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

        <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="enableRollingLogs"
                className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
              >
                <Image
                  src="/images/paper.webp"
                  alt={t('enableRollingLogs')}
                  width={16}
                  height={16}
                />
                {t('enableRollingLogs')}
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
                    <p>{t('rollingLogsTooltip')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              id="enableRollingLogs"
              checked={config.enableRollingLogs || false}
              onCheckedChange={(checked) => updateConfig('enableRollingLogs', checked)}
            />
          </div>
          <p className="text-xs text-gray-400">{t('rollingLogsDesc')}</p>
        </div>

        <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="logTimestamp"
                className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
              >
                <Image
                  src="/images/daylight-detector.webp"
                  alt={t('showTimeInLogs')}
                  width={16}
                  height={16}
                />
                {t('showTimeInLogs')}
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
                    <p>{t('logTimestampTooltip')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              id="logTimestamp"
              checked={config.logTimestamp || false}
              onCheckedChange={(checked) => updateConfig('logTimestamp', checked)}
            />
          </div>
          <p className="text-xs text-gray-400">{t('logTimestampDesc')}</p>
        </div>
      </CardContent>
    </Card>
  );
};
