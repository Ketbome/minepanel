'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Globe, Info, Loader2, Network, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { getSettings, ProxySettings, updateSettings } from '@/services/settings/settings.service';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { mcToast } from '@/lib/utils/minecraft-toast';
import { regenerateAllDockerCompose } from '@/services/network.service';
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
  const proxyToggleChanged = proxySettings.enabled !== initialProxyEnabled;

  useEffect(() => {
    Promise.all([getSettings(), getCurrentUser()])
      .then(([settings, user]) => {
        setCanManageSystemSettings(user.role === 'ADMIN' || user.access.permissions.accessAllServers);
        const nextProxy = settings.proxy || { enabled: false, baseDomain: null, available: false };
        setProxySettings(nextProxy);
        setProxyBaseDomain(nextProxy.baseDomain || '');
        setInitialProxyEnabled(nextProxy.enabled);
        setInitialProxyDomain(nextProxy.baseDomain || '');
        setPublicIp(settings.network?.publicIp || '');
        setLanIp(settings.network?.lanIp || '');
      })
      .catch((error) => {
        console.error('Error loading settings:', error);
        mcToast.error(t('errorLoadingServerInfo'));
      })
      .finally(() => setIsLoading(false));
  }, [t]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        proxy: { proxyEnabled: proxySettings.enabled, proxyBaseDomain: proxyBaseDomain || undefined },
        network: { publicIp: publicIp || undefined, lanIp: lanIp || undefined },
      });

      const proxyChanged = proxySettings.enabled !== initialProxyEnabled || proxyBaseDomain !== initialProxyDomain;
      if (proxyChanged) {
        await regenerateAllDockerCompose();
        setInitialProxyEnabled(proxySettings.enabled);
        setInitialProxyDomain(proxyBaseDomain);
      }

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
          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-sm font-medium text-gray-200">{t('enableProxy')}</p>
              <p className="text-xs text-gray-500">{t('enableProxyDesc')}</p>
            </div>
            <Switch checked={proxySettings.enabled} onCheckedChange={(checked) => setProxySettings((current) => ({ ...current, enabled: checked }))} disabled={!proxyBaseDomain} />
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
          <Button type="button" onClick={handleSave} disabled={isSaving} className="bg-cyan-600 hover:bg-cyan-700 text-white font-minecraft">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isSaving ? t('saving') : t('saveChanges')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
