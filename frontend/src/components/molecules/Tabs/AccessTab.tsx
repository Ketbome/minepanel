import { FC } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ServerConfig } from '@/lib/types/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, HelpCircle, Shield } from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/lib/hooks/useLanguage';

interface AccessTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const AccessTab: FC<AccessTabProps> = ({ config, updateConfig }) => {
  const { t } = useLanguage();
  const isJava = config.edition !== 'BEDROCK';
  const isBedrock = config.edition === 'BEDROCK';

  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
          <Shield className="h-6 w-6" />
          {t('access')}
        </CardTitle>
        <CardDescription className="text-gray-300">{t('accessDesc')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-4 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
          <h3 className="text-lg text-emerald-400 font-minecraft flex items-center gap-2">
            <Image src="/images/command-block.webp" alt={t('accessControl')} width={20} height={20} />
            {t('accessControl')}
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="onlineMode"
                className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
              >
                <Image src="/images/sword.png" alt={t('onlineMode')} width={16} height={16} />
                {t('onlineMode')}
              </Label>
              <Switch
                id="onlineMode"
                checked={config.onlineMode !== false}
                onCheckedChange={(checked) => updateConfig('onlineMode', checked)}
              />
            </div>
            <p className="text-xs text-gray-400">{t('onlineModeDesc')}</p>
          </div>

          {isBedrock && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="whiteList" className="text-gray-200 font-minecraft text-sm">
                  {t('whiteList')}
                </Label>
                <Switch
                  id="whiteList"
                  checked={config.whiteList ?? false}
                  onCheckedChange={(checked) => updateConfig('whiteList', checked)}
                />
              </div>
              <p className="text-xs text-gray-400">{t('whiteListDesc')}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label
              htmlFor="ops"
              className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
            >
              <Image src="/images/diamond.webp" alt={t('serverOperators')} width={16} height={16} />
              {t('serverOperators')}
            </Label>
            <Input
              id="ops"
              value={config.ops || ''}
              onChange={(e) => updateConfig('ops', e.target.value)}
              placeholder="admin1,admin2"
              className="bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
            />
            <p className="text-xs text-gray-400">{t('serverOperatorsDesc')}</p>
          </div>

          {isJava && (
            <div className="space-y-2">
              <Label htmlFor="opPermissionLevel" className="text-gray-200 font-minecraft text-sm">
                {t('opPermissionLevel')}
              </Label>
              <Select
                value={config.opPermissionLevel?.toString() || '4'}
                onValueChange={(value) => updateConfig('opPermissionLevel', String(value))}
              >
                <SelectTrigger
                  id="opPermissionLevel"
                  className="bg-gray-800/70 border-gray-700/50 focus:ring-emerald-500/30"
                >
                  <SelectValue placeholder={t('selectOpPermissionLevel')} />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                  <SelectItem value="1">{t('opPermissionLevel1')}</SelectItem>
                  <SelectItem value="2">{t('opPermissionLevel2')}</SelectItem>
                  <SelectItem value="3">{t('opPermissionLevel3')}</SelectItem>
                  <SelectItem value="4">{t('opPermissionLevel4')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">{t('opPermissionLevelDesc')}</p>
            </div>
          )}

          {isBedrock && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="defaultPlayerPermissionLevel"
                  className="text-gray-200 font-minecraft text-sm"
                >
                  {t('defaultPermissionLevel')}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 p-0">
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                      <p>{t('defaultPermissionLevelDesc')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                value={config.defaultPlayerPermissionLevel ?? 'member'}
                onValueChange={(value: 'visitor' | 'member' | 'operator') =>
                  updateConfig('defaultPlayerPermissionLevel', value)
                }
              >
                <SelectTrigger className="bg-gray-800/70 border-gray-700/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="visitor">{t('visitor')}</SelectItem>
                  <SelectItem value="member">{t('member')}</SelectItem>
                  <SelectItem value="operator">{t('operator')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-4 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
          <h3 className="text-lg text-emerald-400 font-minecraft flex items-center gap-2">
            <Image
              src="/images/nether.webp"
              alt={t('additionalPermissions')}
              width={20}
              height={20}
            />
            {t('additionalPermissions')}
          </h3>

          {isJava && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="commandBlock"
                    className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
                  >
                    <Image
                      src="/images/command-block.webp"
                      alt={t('enableCommandBlocks')}
                      width={16}
                      height={16}
                    />
                    {t('enableCommandBlocks')}
                  </Label>
                  <Switch
                    id="commandBlock"
                    checked={config.commandBlock || false}
                    onCheckedChange={(checked) => updateConfig('commandBlock', checked)}
                  />
                </div>
                <p className="text-xs text-gray-400">{t('enableCommandBlocksDesc')}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="allowFlight"
                    className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
                  >
                    <Image src="/images/elytra.webp" alt={t('allowFlight')} width={16} height={16} />
                    {t('allowFlight')}
                  </Label>
                  <Switch
                    id="allowFlight"
                    checked={config.allowFlight || false}
                    onCheckedChange={(checked) => updateConfig('allowFlight', checked)}
                  />
                </div>
                <p className="text-xs text-gray-400">{t('allowFlightDesc')}</p>
              </div>
            </>
          )}

          {isBedrock && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="allowCheats" className="text-gray-200 font-minecraft text-sm">
                  {t('allowCheats')}
                </Label>
                <Switch
                  id="allowCheats"
                  checked={config.allowCheats ?? false}
                  onCheckedChange={(checked) => updateConfig('allowCheats', checked)}
                />
              </div>
              <p className="text-xs text-gray-400">{t('allowCheatsDesc')}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="playerIdleTimeout" className="text-gray-200 font-minecraft text-sm">
              {t('playerIdleTimeout')}
            </Label>
            <Input
              id="playerIdleTimeout"
              type="number"
              value={config.playerIdleTimeout || 0}
              onChange={(e) => updateConfig('playerIdleTimeout', String(e.target.value))}
              placeholder="0"
              className="bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
            />
            <p className="text-xs text-gray-400">{t('playerIdleTimeoutDesc')}</p>
          </div>
        </div>

        {/* RCON section - Java only */}
        {isJava && (
          <Accordion
            type="single"
            collapsible
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md"
          >
            <AccordionItem value="rcon" className="border-b-0">
              <AccordionTrigger className="px-4 py-3 text-gray-200 font-minecraft text-sm hover:bg-gray-700/30 rounded-t-md">
                <div className="flex items-center gap-2">
                  <Image src="/images/command-block.webp" alt="RCON" width={16} height={16} />
                  {t('rcon')}
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
                        <p>{t('rconDesc')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4 px-4 pb-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enableRcon" className="text-gray-200 font-minecraft text-sm">
                      {t('enableRcon')}
                    </Label>
                    <Switch
                      id="enableRcon"
                      checked={config.enableRcon !== false}
                      onCheckedChange={(checked) => updateConfig('enableRcon', checked)}
                    />
                  </div>
                  <p className="text-xs text-gray-400">{t('enableRconDesc')}</p>

                  {config.enableBackup && !config.enableRcon && (
                    <Alert
                      variant="destructive"
                      className="bg-red-900/30 border-red-800 text-red-200 mt-2"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{t('backupRequiresRcon')}</AlertDescription>
                    </Alert>
                  )}
                </div>

                {config.enableRcon !== false && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="rconPort" className="text-gray-200 font-minecraft text-sm">
                        {t('rconPort')}
                      </Label>
                      <Input
                        id="rconPort"
                        type="number"
                        value={config.rconPort || 25575}
                        onChange={(e) => updateConfig('rconPort', String(e.target.value))}
                        placeholder="25575"
                        className="bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rconPassword" className="text-gray-200 font-minecraft text-sm">
                        {t('rconPassword')}
                      </Label>
                      <Input
                        id="rconPassword"
                        type="password"
                        value={config.rconPassword || ''}
                        onChange={(e) => updateConfig('rconPassword', e.target.value)}
                        className="bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
                      />
                      <p className="text-xs text-red-400 font-medium">
                        {t('rconPasswordImportant')}
                      </p>
                    </div>

                    {config.enableBackup && (
                      <Alert className="bg-amber-900/30 border-amber-800 text-amber-200 mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{t('backupRconDesc')}</AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="broadcastRconToOps"
                          className="text-gray-200 font-minecraft text-sm"
                        >
                          {t('broadcastRconToOps')}
                        </Label>
                        <Switch
                          id="broadcastRconToOps"
                          checked={config.broadcastRconToOps || false}
                          onCheckedChange={(checked) => updateConfig('broadcastRconToOps', checked)}
                        />
                      </div>
                      <p className="text-xs text-gray-400">{t('broadcastRconToOpsDesc')}</p>
                    </div>
                  </>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};
