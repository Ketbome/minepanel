'use client';

import { useEffect, useState } from 'react';
import { Key, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  getSettings,
  updateSettings,
  testDiscordWebhook,
  getIntegrationSettings,
  updateIntegrationSettings,
  testSmtp,
  IntegrationSettings,
  UpdateIntegrationSettings,
} from '@/services/settings/settings.service';
import { mcToast } from '@/lib/utils/minecraft-toast';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { getCurrentUser } from '@/services/users/users.service';

function SourceBadge({ label, tone }: { label: string; tone: 'unset' | 'db' | 'env' }) {
  const color = tone === 'unset' ? 'bg-gray-700 text-gray-300' : tone === 'db' ? 'bg-emerald-600/20 text-emerald-300' : 'bg-amber-600/20 text-amber-300';
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${color}`}>{label}</span>;
}

export default function IntegrationsSettingsPage() {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [canManageSystemSettings, setCanManageSystemSettings] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // CurseForge + Discord (write-only secrets)
  const [hasCfApiKey, setHasCfApiKey] = useState(false);
  const [hasDiscordWebhook, setHasDiscordWebhook] = useState(false);
  const [cfApiKey, setCfApiKey] = useState('');
  const [discordWebhook, setDiscordWebhook] = useState('');
  const [savingBasic, setSavingBasic] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);

  // SMTP + OIDC
  const [integrations, setIntegrations] = useState<IntegrationSettings | null>(null);
  const [smtp, setSmtp] = useState({ host: '', port: '', secure: false, user: '', password: '', from: '' });
  const [oidc, setOidc] = useState({ issuer: '', clientId: '', clientSecret: '', redirectUri: '', scopes: '', providerName: '', disablePasswordLogin: false });
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [savingOidc, setSavingOidc] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
        const admin = user.role === 'ADMIN';
        setCanManageSystemSettings(admin || user.access.permissions.accessAllServers);
        setIsAdmin(admin);
        setHasCfApiKey(!!settings.hasCfApiKey);
        setHasDiscordWebhook(!!settings.hasDiscordWebhook);

        if (admin) {
          const int = await getIntegrationSettings();
          applyIntegrations(int);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        mcToast.error(t('errorLoadingServerInfo'));
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyIntegrations = (int: IntegrationSettings) => {
    setIntegrations(int);
    setSmtp({ host: int.smtp.host, port: int.smtp.port ? String(int.smtp.port) : '', secure: int.smtp.secure, user: int.smtp.user, password: '', from: int.smtp.from });
    setOidc({
      issuer: int.oidc.issuer,
      clientId: int.oidc.clientId,
      clientSecret: '',
      redirectUri: int.oidc.redirectUri,
      scopes: int.oidc.scopes,
      providerName: int.oidc.providerName,
      disablePasswordLogin: int.oidc.disablePasswordLogin,
    });
  };

  if (!isLoading && !canManageSystemSettings) {
    return (
      <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/20">
              <Key className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-white font-minecraft">{t('integrationsSettingsTitle')}</CardTitle>
              <CardDescription className="text-gray-400">{t('settingsRestrictedDesc')}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const saveBasic = async () => {
    setSavingBasic(true);
    try {
      // Write-only: only send fields the user actually typed.
      const payload: { cfApiKey?: string; discordWebhook?: string } = {};
      if (cfApiKey) payload.cfApiKey = cfApiKey;
      if (discordWebhook) payload.discordWebhook = discordWebhook;
      const res = await updateSettings(payload);
      setHasCfApiKey(!!res.hasCfApiKey);
      setHasDiscordWebhook(!!res.hasDiscordWebhook);
      setCfApiKey('');
      setDiscordWebhook('');
      mcToast.success(t('settingsSaved'));
    } catch (error) {
      console.error('Error saving settings:', error);
      mcToast.error(t('settingsSaveFailed'));
    } finally {
      setSavingBasic(false);
    }
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    try {
      const result = await testDiscordWebhook();
      result.success ? mcToast.success(t('webhookTestSuccess')) : mcToast.error(result.message);
    } catch {
      mcToast.error(t('webhookTestFailed'));
    } finally {
      setTestingWebhook(false);
    }
  };

  const saveSmtp = async () => {
    setSavingSmtp(true);
    try {
      const payload: UpdateIntegrationSettings = {
        smtp: {
          host: smtp.host,
          port: smtp.port ? Number(smtp.port) : undefined,
          secure: smtp.secure,
          user: smtp.user,
          from: smtp.from,
          ...(smtp.password ? { password: smtp.password } : {}),
        },
      };
      applyIntegrations(await updateIntegrationSettings(payload));
      mcToast.success(t('settingsSaved'));
    } catch {
      mcToast.error(t('settingsSaveFailed'));
    } finally {
      setSavingSmtp(false);
    }
  };

  const saveOidc = async () => {
    setSavingOidc(true);
    try {
      const payload: UpdateIntegrationSettings = {
        oidc: {
          issuer: oidc.issuer,
          clientId: oidc.clientId,
          redirectUri: oidc.redirectUri,
          scopes: oidc.scopes,
          providerName: oidc.providerName,
          disablePasswordLogin: oidc.disablePasswordLogin,
          ...(oidc.clientSecret ? { clientSecret: oidc.clientSecret } : {}),
        },
      };
      applyIntegrations(await updateIntegrationSettings(payload));
      mcToast.success(t('settingsSaved'));
    } catch {
      mcToast.error(t('settingsSaveFailed'));
    } finally {
      setSavingOidc(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    try {
      const result = await testSmtp();
      result.success ? mcToast.success(result.message) : mcToast.error(result.message);
    } catch {
      mcToast.error(t('settingsSaveFailed'));
    } finally {
      setTestingSmtp(false);
    }
  };

  const secretPlaceholder = (has: boolean) => (has ? t('secretConfiguredPlaceholder') : '••••••••••••••••');

  const sourceBadge = (source: string, configured: boolean) => {
    const tone = !configured ? 'unset' : source === 'db' ? 'db' : 'env';
    const label = !configured ? t('integrationUnset') : source === 'db' ? t('integrationSourceDb') : t('integrationSourceEnv');
    return <SourceBadge label={label} tone={tone} />;
  };

  return (
    <div className="space-y-6">
      {/* CurseForge + Discord */}
      <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/20">
              <Key className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-white font-minecraft">{t('integrationsSettingsTitle')}</CardTitle>
              <CardDescription className="text-gray-400">{t('integrationsSettingsDesc')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-300">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {t('loading')}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-gray-200">{t('curseforgeApiKey')}</Label>
                <Input value={cfApiKey} onChange={(e) => setCfApiKey(e.target.value)} type="password" placeholder={secretPlaceholder(hasCfApiKey)} className="bg-gray-800 border-gray-700 text-white" />
                <p className="text-xs text-gray-400">{t('curseforgeApiKeyDesc')}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-200">{t('discordWebhook')}</Label>
                <div className="flex gap-2">
                  <Input value={discordWebhook} onChange={(e) => setDiscordWebhook(e.target.value)} type="password" placeholder={secretPlaceholder(hasDiscordWebhook)} className="flex-1 bg-gray-800 border-gray-700 text-white" />
                  <Button type="button" variant="outline" onClick={handleTestWebhook} disabled={testingWebhook || !hasDiscordWebhook} className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">
                    {testingWebhook ? <Loader2 className="h-4 w-4 animate-spin" /> : t('test')}
                  </Button>
                </div>
                <p className="text-xs text-gray-400">{t('discordWebhookDesc')}</p>
              </div>
              <Button onClick={saveBasic} disabled={savingBasic} className="bg-emerald-600 hover:bg-emerald-700 text-white font-minecraft">
                {savingBasic ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {savingBasic ? t('saving') : t('saveChanges')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* SMTP + OIDC (admin only) */}
      {!isLoading && isAdmin && integrations && (
        <>
          <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/20">
                  <Mail className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-white font-minecraft">{t('smtpSettingsTitle')}</CardTitle>
                  <CardDescription className="text-gray-400">{t('smtpSettingsDesc')}</CardDescription>
                </div>
                {sourceBadge(integrations.smtp.source, integrations.smtp.configured)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-gray-200">{t('smtpHost')}</Label>
                  <Input value={smtp.host} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} placeholder="smtp.example.com" className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-200">{t('smtpPort')}</Label>
                  <Input value={smtp.port} onChange={(e) => setSmtp({ ...smtp, port: e.target.value })} type="number" placeholder="587" className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-200">{t('smtpUser')}</Label>
                  <Input value={smtp.user} onChange={(e) => setSmtp({ ...smtp, user: e.target.value })} className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-200">{t('smtpPassword')}</Label>
                  <Input value={smtp.password} onChange={(e) => setSmtp({ ...smtp, password: e.target.value })} type="password" placeholder={secretPlaceholder(integrations.smtp.hasPassword)} className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-gray-200">{t('smtpFrom')}</Label>
                  <Input value={smtp.from} onChange={(e) => setSmtp({ ...smtp, from: e.target.value })} placeholder="Minepanel <no-reply@example.com>" className="bg-gray-800 border-gray-700 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={smtp.secure} onCheckedChange={(v) => setSmtp({ ...smtp, secure: v })} />
                <Label className="text-gray-200">{t('smtpSecure')}</Label>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveSmtp} disabled={savingSmtp} className="bg-emerald-600 hover:bg-emerald-700 text-white font-minecraft">
                  {savingSmtp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {savingSmtp ? t('saving') : t('saveChanges')}
                </Button>
                <Button type="button" variant="outline" onClick={handleTestSmtp} disabled={testingSmtp || !integrations.smtp.configured} className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">
                  {testingSmtp ? <Loader2 className="h-4 w-4 animate-spin" /> : t('smtpTest')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/20">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-white font-minecraft">{t('oidcSettingsTitle')}</CardTitle>
                  <CardDescription className="text-gray-400">{t('oidcSettingsDesc')}</CardDescription>
                </div>
                {sourceBadge(integrations.oidc.source, integrations.oidc.configured)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-gray-200">{t('oidcIssuer')}</Label>
                  <Input value={oidc.issuer} onChange={(e) => setOidc({ ...oidc, issuer: e.target.value })} placeholder="https://auth.example.com/" className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-200">{t('oidcClientId')}</Label>
                  <Input value={oidc.clientId} onChange={(e) => setOidc({ ...oidc, clientId: e.target.value })} className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-200">{t('oidcClientSecret')}</Label>
                  <Input value={oidc.clientSecret} onChange={(e) => setOidc({ ...oidc, clientSecret: e.target.value })} type="password" placeholder={secretPlaceholder(integrations.oidc.hasClientSecret)} className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-gray-200">{t('oidcRedirectUri')}</Label>
                  <Input value={oidc.redirectUri} onChange={(e) => setOidc({ ...oidc, redirectUri: e.target.value })} placeholder="https://api.example.com/auth/oidc/callback" className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-200">{t('oidcScopes')}</Label>
                  <Input value={oidc.scopes} onChange={(e) => setOidc({ ...oidc, scopes: e.target.value })} placeholder="openid email profile" className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-200">{t('oidcProviderName')}</Label>
                  <Input value={oidc.providerName} onChange={(e) => setOidc({ ...oidc, providerName: e.target.value })} placeholder="SSO" className="bg-gray-800 border-gray-700 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={oidc.disablePasswordLogin} onCheckedChange={(v) => setOidc({ ...oidc, disablePasswordLogin: v })} />
                <Label className="text-gray-200">{t('oidcDisablePasswordLogin')}</Label>
              </div>
              <Button onClick={saveOidc} disabled={savingOidc} className="bg-emerald-600 hover:bg-emerald-700 text-white font-minecraft">
                {savingOidc ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {savingOidc ? t('saving') : t('saveChanges')}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
