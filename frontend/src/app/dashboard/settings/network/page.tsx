'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Globe, Info, Loader2, Network, Power, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { getSettings, ProxyRouterSettings, ProxySettings, setProxyPower, updateSettings } from '@/services/settings/settings.service';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { mcToast } from '@/lib/utils/minecraft-toast';
import { getProxyStatus, regenerateAllDockerCompose } from '@/services/network.service';
import { getCurrentUser } from '@/services/users/users.service';

export default function NetworkSettingsPage() {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [proxySettings, setProxySettings] = useState<ProxySettings>({ enabled: false, baseDomain: null, available: false });
  const [proxyBaseDomain, setProxyBaseDomain] = useState('');
  const [initialProxyEnabled, setInitialProxyEnabled] = useState(false);
  const [initialProxyDomain, setInitialProxyDomain] = useState('');
  const [publicIp, setPublicIp] = useState('');
  const [lanIp, setLanIp] = useState('');
  const [canManageSystemSettings, setCanManageSystemSettings] = useState(false);
  const [router, setRouter] = useState<ProxyRouterSettings>({});
  // null means the state could not be read; the button must not guess.
  const [isRunning, setIsRunning] = useState<boolean | null>(null);
  const [isPowering, setIsPowering] = useState(false);
  const proxyToggleChanged = proxySettings.enabled !== initialProxyEnabled;

  useEffect(() => {
    Promise.all([getSettings(), getCurrentUser(), getProxyStatus()])
      .then(([settings, user, status]) => {
        setIsRunning(status.running ?? null);
        setCanManageSystemSettings(user.role === 'ADMIN' || user.access.permissions.accessAllServers);
        const nextProxy = settings.proxy || { enabled: false, baseDomain: null, available: false };
        setProxySettings(nextProxy);
        setProxyBaseDomain(nextProxy.baseDomain || '');
        setInitialProxyEnabled(nextProxy.enabled);
        setInitialProxyDomain(nextProxy.baseDomain || '');
        setRouter(nextProxy.router || {});
        setPublicIp(settings.network?.publicIp || '');
        setLanIp(settings.network?.lanIp || '');
      })
      .catch((error) => {
        console.error('Error loading settings:', error);
        mcToast.error(t('errorLoadingServerInfo'));
      })
      .finally(() => setIsLoading(false));
  }, [t]);

  const handlePower = async (next: boolean) => {
    setIsPowering(true);
    try {
      const result = await setProxyPower(next);
      setIsRunning(result.running);
      setProxySettings((current) => ({ ...current, enabled: result.enabled }));
      setInitialProxyEnabled(result.enabled);
      mcToast.success(result.running ? t('proxyStarted') : t('proxyStopped'));
    } catch {
      mcToast.error(t('proxyPowerFailed'));
    } finally {
      setIsPowering(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        proxy: { proxyEnabled: proxySettings.enabled, proxyBaseDomain, router },
        network: { publicIp, lanIp },
      });

      const proxyChanged = proxySettings.enabled !== initialProxyEnabled || proxyBaseDomain !== initialProxyDomain;
      if (proxyChanged) {
        await regenerateAllDockerCompose();
        setInitialProxyEnabled(proxySettings.enabled);
        setInitialProxyDomain(proxyBaseDomain);
      }

      // Saving can start or stop the router, so the indicator has to catch up.
      setIsRunning((await getProxyStatus()).running ?? null);
      mcToast.success(t('settingsSaved'));
    } catch (error) {
      console.error('Error saving settings:', error);
      mcToast.error(t('settingsSaveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-300">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t('loading')}
      </div>
    );
  }

  if (!canManageSystemSettings) {
    return (
      <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-white font-minecraft">{t('networkSettings')}</CardTitle>
          <CardDescription className="text-gray-400">{t('settingsRestrictedDesc')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-600/20">
              <Network className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <CardTitle className="text-white font-minecraft">{t('proxySettings')}</CardTitle>
              <CardDescription className="text-gray-400">{t('proxySettingsDesc')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="proxyBaseDomain" className="text-gray-200">{t('proxyBaseDomain')}</Label>
            <Input id="proxyBaseDomain" value={proxyBaseDomain} onChange={(event) => setProxyBaseDomain(event.target.value)} placeholder="mc.example.com" className="bg-gray-800 border-gray-700 text-white" />
            <p className="text-xs text-gray-500">{t('proxyBaseDomainDesc')}</p>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-700/60 bg-gray-800/40 p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', isRunning === null ? 'bg-amber-500' : isRunning ? 'bg-emerald-400' : 'bg-gray-600')} />
                <p className="text-sm font-medium text-gray-200">
                  {isRunning === null ? t('proxyStateUnknown') : isRunning ? t('proxyRunning') : t('proxyStoppedState')}
                </p>
              </div>
              <p className="mt-1 text-xs text-gray-500">{t('enableProxyDesc')}</p>
            </div>
            <Button
              type="button"
              onClick={() => handlePower(!isRunning)}
              disabled={isPowering || !proxyBaseDomain || isRunning === null}
              className={cn('font-minecraft text-white', isRunning ? 'bg-red-700 hover:bg-red-800' : 'bg-emerald-600 hover:bg-emerald-700')}
            >
              {isPowering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Power className="mr-2 h-4 w-4" />}
              {isRunning ? t('stopProxy') : t('startProxy')}
            </Button>
          </div>
          {proxyToggleChanged ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-600/30 bg-amber-900/20 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-xs text-amber-300">{t('proxyToggleWarning')}</p>
            </div>
          ) : null}
          {!proxyBaseDomain ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-600/30 bg-amber-900/20 p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-xs text-amber-300">{t('proxyRequiresDomain')}</p>
            </div>
          ) : null}
          {proxyBaseDomain && proxySettings.enabled ? (
            <div className="flex items-start gap-2 rounded-lg border border-cyan-600/30 bg-cyan-900/20 p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
              <div className="text-xs text-cyan-300">
                <p className="mb-1 font-medium">{t('proxyDnsInfo')}</p>
                <code className="rounded bg-gray-800 px-1 py-0.5">*.{proxyBaseDomain}</code>
              </div>
            </div>
          ) : null}

          <div className="space-y-4 border-t border-gray-700/60 pt-4">
            <div className="space-y-2">
              <Label htmlFor="proxyPort" className="text-gray-200">{t('proxyPort')}</Label>
              <Input
                id="proxyPort"
                value={router.proxyPort ?? ''}
                onChange={(event) => setRouter((current) => ({ ...current, proxyPort: event.target.value }))}
                placeholder="25565"
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500">{t('proxyPortDesc')}</p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-200">{t('autoScale')}</p>
                <p className="text-xs text-gray-500">{t('autoScaleDesc')}</p>
              </div>
              <Switch
                checked={router.autoScaleEnabled ?? false}
                onCheckedChange={(checked) => setRouter((current) => ({ ...current, autoScaleEnabled: checked }))}
                disabled={!proxySettings.enabled}
              />
            </div>

            {router.autoScaleEnabled ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="autoScaleDownAfter" className="text-gray-200">{t('autoScaleDownAfter')}</Label>
                  <Input
                    id="autoScaleDownAfter"
                    value={router.autoScaleDownAfter ?? ''}
                    onChange={(event) => setRouter((current) => ({ ...current, autoScaleDownAfter: event.target.value }))}
                    placeholder="10m"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                  <p className="text-xs text-gray-500">{t('autoScaleDownAfterDesc')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="autoScaleAsleepMotd" className="text-gray-200">{t('autoScaleAsleepMotd')}</Label>
                  <Input
                    id="autoScaleAsleepMotd"
                    value={router.autoScaleAsleepMotd ?? ''}
                    onChange={(event) => setRouter((current) => ({ ...current, autoScaleAsleepMotd: event.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                  <p className="text-xs text-gray-500">{t('autoScaleAsleepMotdDesc')}</p>
                </div>
                <div className="flex items-start gap-2 rounded-lg border border-amber-600/30 bg-amber-900/20 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <p className="text-xs text-amber-300">{t('autoScaleWarning')}</p>
                </div>
              </>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="proxyExtraNetworks" className="text-gray-200">{t('proxyExtraNetworks')}</Label>
              <Input
                id="proxyExtraNetworks"
                value={router.extraNetworks ?? ''}
                onChange={(event) => setRouter((current) => ({ ...current, extraNetworks: event.target.value }))}
                placeholder="shared_proxy_net"
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500">{t('proxyExtraNetworksDesc')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20">
              <Globe className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-white font-minecraft">{t('networkSettings')}</CardTitle>
              <CardDescription className="text-gray-400">{t('networkSettingsDesc')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="publicIp" className="text-gray-200">{t('publicIp')}</Label>
            <Input id="publicIp" value={publicIp} onChange={(event) => setPublicIp(event.target.value)} placeholder="123.45.67.89 or play.example.com" className="bg-gray-800 border-gray-700 text-white" />
            <p className="text-xs text-gray-500">{t('publicIpDesc')}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lanIp" className="text-gray-200">{t('lanIp')}</Label>
            <Input id="lanIp" value={lanIp} onChange={(event) => setLanIp(event.target.value)} placeholder="192.168.1.100" className="bg-gray-800 border-gray-700 text-white" />
            <p className="text-xs text-gray-500">{t('lanIpDesc')}</p>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-1 border-t-2 border-gray-700/60 bg-gray-900/95 px-1 py-3 backdrop-blur-md">
        <Button type="button" onClick={handleSave} disabled={isSaving} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-minecraft sm:w-auto">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isSaving ? t('saving') : t('saveChanges')}
        </Button>
      </div>
    </div>
  );
}
