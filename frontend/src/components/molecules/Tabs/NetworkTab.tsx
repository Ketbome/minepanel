import { FC, useEffect, useState } from 'react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, BookOpen, HelpCircle, Info, Network, Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { getProxyStatus } from '@/services/network.service';
import { LINK_CONNECTIVITY_SETTINGS } from '@/lib/providers/constants';

interface NetworkTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const NetworkTab: FC<NetworkTabProps> = ({ config, updateConfig }) => {
  const { t } = useLanguage();
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [autoScaleAvailable, setAutoScaleAvailable] = useState(false);
  const [newPort, setNewPort] = useState('');

  useEffect(() => {
    getProxyStatus()
      .then((status) => {
        setProxyEnabled(status.enabled);
        setAutoScaleAvailable(!!status.autoScaleAvailable);
      })
      .catch(() => {
        setProxyEnabled(false);
        setAutoScaleAvailable(false);
      });
  }, []);

  const isJava = config.edition !== 'BEDROCK';
  const isBedrock = config.edition === 'BEDROCK';
  // Proxy only works with Java edition
  const serverUsesProxy = isJava && proxyEnabled && config.useProxy !== false;
  const defaultPort = isBedrock ? '19132' : '25565';

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
    updateConfig(
      'extraPorts',
      currentPorts.filter((_, i) => i !== index),
    );
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
              <Image
                src="/images/ender-pearl.webp"
                alt={t('network')}
                width={24}
                height={24}
                className="opacity-90"
              />
              {t('network')}
            </CardTitle>
            <CardDescription className="text-gray-300">{t('networkDesc')}</CardDescription>
          </div>
          <a
            href={LINK_CONNECTIVITY_SETTINGS}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            {t('documentation')}
          </a>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-4 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
          <div className="space-y-2">
            <Label htmlFor="serverPort" className="text-gray-200 font-minecraft text-sm">
              {t('serverPort')} {isBedrock && '(UDP)'}
            </Label>
            <Input
              id="serverPort"
              type="number"
              value={serverUsesProxy ? defaultPort : config.port || defaultPort}
              onChange={(e) => updateConfig('port', String(e.target.value))}
              placeholder={defaultPort}
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

          {isBedrock && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="serverPortV6" className="text-gray-200 font-minecraft text-sm">
                  {t('serverPortV6')}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 p-0">
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                      <p>{t('serverPortV6Desc')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="serverPortV6"
                type="number"
                value={config.serverPortV6 ?? ''}
                onChange={(e) => updateConfig('serverPortV6', e.target.value)}
                placeholder="19133"
                className="bg-gray-800/70 border-gray-700/50 text-white"
              />
              <p className="text-xs text-gray-400">{t('serverPortV6Help')}</p>
            </div>
          )}

          {isJava && (
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
          )}
        </div>

        {/* Proxy settings - Java only (mc-router doesn't support Bedrock UDP) */}
        {isJava && (
          <Accordion
            type="single"
            collapsible
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md"
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
                          type="button"
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

                {autoScaleAvailable && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="useAutoScale" className="text-gray-200 font-minecraft text-sm">
                        {t('useAutoScale')}
                      </Label>
                      <Switch
                        id="useAutoScale"
                        checked={config.useAutoScale !== false}
                        onCheckedChange={(checked) => updateConfig('useAutoScale', checked)}
                      />
                    </div>
                    <p className="text-xs text-gray-400">{t('useAutoScaleDesc')}</p>
                  </div>
                )}

                <Alert className="bg-cyan-900/30 border-cyan-800 text-cyan-200 mt-2">
                  <Network className="h-4 w-4" />
                  <AlertDescription>{t('proxyServerInfo')}</AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        <div className="space-y-4 p-5 rounded-md bg-gray-800/70 border border-gray-700/50">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-emerald-400" />
            <h3 className="text-emerald-400 font-minecraft text-md">{t('extraPorts')}</h3>
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
                  <p>{t('extraPortsDesc')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                value={newPort}
                onChange={(e) => setNewPort(e.target.value)}
                placeholder={t('portFormat')}
                className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addExtraPort();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              onClick={addExtraPort}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300 font-minecraft text-xs">{t('configuredPorts')}</Label>
            {config.extraPorts && config.extraPorts.length > 0 ? (
              <div className="space-y-2">
                {config.extraPorts.map((port, index) => (
                  <div key={`${port}-${index}`} className="flex gap-2">
                    <Input
                      value={port}
                      onChange={(e) => updateExtraPort(index, e.target.value)}
                      className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExtraPort(index)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">{t('noExtraPorts')}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">{t('extraPortsUseful')}</p>
          </div>

          <div className="pt-2 border-t border-gray-700/50">
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
      </CardContent>
    </Card>
  );
};
