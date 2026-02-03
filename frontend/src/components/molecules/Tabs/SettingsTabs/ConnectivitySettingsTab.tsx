import { FC, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, HelpCircle, Network, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { getProxyStatus } from '@/services/network.service';

interface ConnectivitySettingsTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const ConnectivitySettingsTab: FC<ConnectivitySettingsTabProps> = ({
  config,
  updateConfig,
}) => {
  const { t } = useLanguage();
  const [proxyEnabled, setProxyEnabled] = useState(false);

  useEffect(() => {
    getProxyStatus()
      .then((status) => {
        console.log('Proxy status:', status);
        setProxyEnabled(status.enabled);
      })
      .catch((err) => {
        console.error('Error fetching proxy status:', err);
        setProxyEnabled(false);
      });
  }, []);

  const serverUsesProxy = proxyEnabled && config.useProxy !== false;

  return (
    <>
      <div className="space-y-4 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
        <h3 className="text-lg text-emerald-400 font-minecraft flex items-center gap-2">
          <Image src="/images/ender-pearl.webp" alt="Conectividad" width={20} height={20} />
          {t('connectivitySettings')}
        </h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serverPort" className="text-gray-200 font-minecraft text-sm">
              {t('serverPort')}
            </Label>
            <Input
              id="serverPort"
              type="number"
              value={serverUsesProxy ? 25565 : config.port || 25565}
              onChange={(e) => updateConfig('port', String(e.target.value))}
              placeholder="25565"
              disabled={serverUsesProxy}
              className={`bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30 ${serverUsesProxy ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <p className="text-xs text-gray-400">{t('serverPortDesc')}</p>
            {serverUsesProxy ? (
              <Alert className="bg-cyan-900/30 border-cyan-800 text-cyan-200 mt-2 py-2">
                <Info className="h-4 w-4" />
                <AlertDescription>{t('serverPortProxyInfo')}</AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-amber-900/30 border-amber-800 text-amber-200 mt-2 py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{t('serverPortWarning')}</AlertDescription>
              </Alert>
            )}
          </div>

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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="onlineMode"
                className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
              >
                <Image src="/images/sword.png" alt="Modo Online" width={16} height={16} />
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="preventProxyConnections"
                className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
              >
                <Image src="/images/shield.png" alt="Prevenir Proxy" width={16} height={16} />
                {t('preventProxyConnections')}
              </Label>
              <Switch
                id="preventProxyConnections"
                checked={config.preventProxyConnections === true}
                onCheckedChange={(checked) => updateConfig('preventProxyConnections', checked)}
              />
            </div>
            <p className="text-xs text-gray-400">{t('preventProxyConnectionsDesc')}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 rounded-md bg-gray-800/50 border border-gray-700/50 mt-4">
        <h3 className="text-lg text-emerald-400 font-minecraft flex items-center gap-2">
          <Image src="/images/command-block.webp" alt="Jugadores" width={20} height={20} />
          {t('accessControl')}
        </h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="ops"
              className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
            >
              <Image src="/images/diamond.webp" alt="Operadores" width={16} height={16} />
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
        </div>
      </div>

      <Accordion
        type="single"
        collapsible
        className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md mt-4"
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
                    placeholder="Contraseña segura requerida"
                    className="bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
                  />
                  <p className="text-xs text-red-400 font-medium">{t('rconPasswordImportant')}</p>
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

      <div className="space-y-4 p-4 rounded-md bg-gray-800/50 border border-gray-700/50 mt-4">
        <h3 className="text-lg text-emerald-400 font-minecraft flex items-center gap-2">
          <Image src="/images/nether.webp" alt="Permisos" width={20} height={20} />
          {t('additionalPermissions')}
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="commandBlock"
              className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
            >
              <Image
                src="/images/command-block.webp"
                alt="Bloques de Comandos"
                width={16}
                height={16}
              />
              {t('commandBlock')}
            </Label>
            <Switch
              id="commandBlock"
              checked={config.commandBlock || false}
              onCheckedChange={(checked) => updateConfig('commandBlock', checked)}
            />
          </div>
          <p className="text-xs text-gray-400">{t('commandBlockDesc')}</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="allowFlight"
              className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
            >
              <Image src="/images/elytra.webp" alt="Vuelo" width={16} height={16} />
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
      </div>

      <Accordion
        type="single"
        collapsible
        className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md mt-4"
      >
        <AccordionItem value="proxy" className="border-b-0">
          <AccordionTrigger className="px-4 py-3 text-gray-200 font-minecraft text-sm hover:bg-gray-700/30 rounded-t-md">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-cyan-400" />
              {t('proxySettings')}
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
                    <p>{t('proxySettingsServerDesc')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4 px-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="proxyHostname" className="text-gray-200 font-minecraft text-sm">
                {t('proxyHostname')}
              </Label>
              <Input
                id="proxyHostname"
                value={config.proxyHostname || ''}
                onChange={(e) => updateConfig('proxyHostname', e.target.value)}
                placeholder={`${config.id}.mc.example.com`}
                className="bg-gray-800/70 border-gray-700/50 focus:border-cyan-500/50 focus:ring-cyan-500/30"
              />
              <p className="text-xs text-gray-400">{t('proxyHostnameDesc')}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="useProxy" className="text-gray-200 font-minecraft text-sm">
                  {t('useProxy')}
                </Label>
                <Switch
                  id="useProxy"
                  checked={config.useProxy !== false}
                  onCheckedChange={(checked) => updateConfig('useProxy', checked)}
                />
              </div>
              <p className="text-xs text-gray-400">{t('useProxyDesc')}</p>
            </div>

            <Alert className="bg-cyan-900/30 border-cyan-800 text-cyan-200 mt-2">
              <Network className="h-4 w-4" />
              <AlertDescription>{t('proxyServerInfo')}</AlertDescription>
            </Alert>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  );
};
