import { FC } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { ServerConfig } from '@/lib/types/types';
import { useLanguage } from '@/lib/hooks/useLanguage';
import Image from 'next/image';
import { BasicSettingsTab } from './SettingsTabs/BasicSettingsTab';
import { WorldSettingsTab } from './SettingsTabs/WorldSettingsTab';
import { PerformanceSettingsTab } from './SettingsTabs/PerformanceSettingsTab';

interface GameTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const GameTab: FC<GameTabProps> = ({ config, updateConfig }) => {
  const { t } = useLanguage();
  const isBedrock = config.edition === 'BEDROCK';

  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
          <Image
            src="/images/grass.webp"
            alt={t('game')}
            width={24}
            height={24}
            className="opacity-90"
          />
          {t('game')}
        </CardTitle>
        <CardDescription className="text-gray-300">{t('gameDesc')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 text-gray-200">
        <BasicSettingsTab config={config} updateConfig={updateConfig} />

        {isBedrock && (
          <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="texturepackRequired" className="text-gray-200 font-minecraft text-sm">
                  {t('texturepackRequired')}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 p-0">
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                      <p>{t('texturepackRequiredDesc')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="texturepackRequired"
                checked={config.texturepackRequired ?? false}
                onCheckedChange={(checked) => updateConfig('texturepackRequired', checked)}
              />
            </div>
          </div>
        )}

        <WorldSettingsTab config={config} updateConfig={updateConfig} />

        <PerformanceSettingsTab config={config} updateConfig={updateConfig} />
      </CardContent>
    </Card>
  );
};
