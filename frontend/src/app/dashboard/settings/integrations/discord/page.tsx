'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Loader2, Radio, Webhook } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { NotificationSettingsCard } from '@/components/organisms/settings/notification-settings';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { mcToast } from '@/lib/utils/minecraft-toast';
import { getCurrentUser } from '@/services/users/users.service';
import {
  IntegrationSettings,
  getIntegrationSettings,
  getSettings,
  testDiscordWebhook,
  updateIntegrationSettings,
  updateSettings,
} from '@/services/settings/settings.service';

type ChannelMode = 'per-server' | 'shared';

/**
 * Settings > Integrations > Discord: the delivery mode, the Minepanel-wide
 * webhook, the delivery policies and the per-channel switches. Per-server feeds
 * live in each server's Integrations tab instead.
 */
export default function DiscordSettingsPage() {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canManageSystemSettings, setCanManageSystemSettings] = useState(false);
  const [hasDiscordWebhook, setHasDiscordWebhook] = useState(false);
  const [discordWebhook, setDiscordWebhook] = useState('');
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [saving, setSaving] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationSettings | null>(null);
  const [mode, setMode] = useState<ChannelMode>('per-server');
  const [savedMode, setSavedMode] = useState<ChannelMode>('per-server');
  const [savingMode, setSavingMode] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
        const admin = user.role === 'ADMIN';
        setIsAdmin(admin);
        setCanManageSystemSettings(admin || user.access.permissions.accessAllServers);
        setHasDiscordWebhook(!!settings.hasDiscordWebhook);
        if (admin) {
          const loaded = await getIntegrationSettings();
          setIntegrations(loaded);
          const loadedMode = loaded.notifications.discordChannelMode ?? 'per-server';
          setMode(loadedMode);
          setSavedMode(loadedMode);
        }
      } catch (error) {
        console.error('Error loading Discord settings:', error);
        mcToast.error(t('errorLoadingServerInfo'));
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveMode = async () => {
    setSavingMode(true);
    try {
      const result = await updateIntegrationSettings({ notifications: { discordChannelMode: mode } });
      setIntegrations(result);
      const stored = result.notifications.discordChannelMode ?? mode;
      setMode(stored);
      setSavedMode(stored);
      mcToast.success(t('settingsSaved'));
    } catch {
      mcToast.error(t('settingsSaveFailed'));
    } finally {
      setSavingMode(false);
    }
  };

  const saveWebhook = async () => {
    setSaving(true);
    try {
      // Write-only: a blank field keeps the stored webhook.
      const value = discordWebhook.trim();
      const res = value ? await updateSettings({ discordWebhook: value }) : await getSettings();
      setHasDiscordWebhook(!!res.hasDiscordWebhook);
      setDiscordWebhook('');
      if (isAdmin) {
        const { systemDiscordConfigured } = await getIntegrationSettings();
        setIntegrations((current) => (current ? { ...current, systemDiscordConfigured } : current));
      }
      mcToast.success(t('settingsSaved'));
    } catch {
      mcToast.error(t('settingsSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const testWebhook = async () => {
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

  const discordWebhookInvalid = discordWebhook.trim() !== '' && !/^https:\/\/(?:discord|discordapp)\.com\/api\/webhooks\/\d{17,20}\/[A-Za-z0-9_-]+$/.test(discordWebhook.trim());
  // Descriptions below the picker must describe the mode that is actually in
  // effect, not the one the admin has selected but not saved yet.
  const sharedMode = savedMode === 'shared';

  if (!isLoading && !canManageSystemSettings) {
    return (
      <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-white font-minecraft">{t('settingsNavDiscord')}</CardTitle>
          <CardDescription className="text-gray-400">{t('settingsRestrictedDesc')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/settings/integrations" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" />
        {t('integrationsSettingsTitle')}
      </Link>

      {!isLoading && isAdmin && integrations ? (
        <Card id="discord-channel-mode-card" className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-600/20">
                <Radio className="h-5 w-5 text-sky-400" />
              </div>
              <div>
                <CardTitle className="text-white font-minecraft">{t('discordChannelModeTitle')}</CardTitle>
                <CardDescription className="text-gray-400">{t('discordChannelModeDesc')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={mode}
              onValueChange={(value) => setMode(value as ChannelMode)}
              className="grid gap-3 md:grid-cols-2"
              aria-label={t('discordChannelModeTitle')}
            >
              <div className={`flex gap-3 rounded-md border p-3 ${!sharedMode ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-gray-700'}`}>
                <RadioGroupItem value="per-server" id="discord-channel-mode-per-server" className="mt-1" />
                <div className="min-w-0 space-y-1">
                  <Label htmlFor="discord-channel-mode-per-server" className="text-gray-100">{t('discordChannelModePerServer')}</Label>
                  <p className="text-xs text-gray-400">{t('discordChannelModePerServerHelp')}</p>
                </div>
              </div>
              <div className={`flex gap-3 rounded-md border p-3 ${sharedMode ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-gray-700'}`}>
                <RadioGroupItem value="shared" id="discord-channel-mode-shared" className="mt-1" />
                <div className="min-w-0 space-y-1">
                  <Label htmlFor="discord-channel-mode-shared" className="text-gray-100">{t('discordChannelModeShared')}</Label>
                  <p className="text-xs text-gray-400">{t('discordChannelModeSharedHelp')}</p>
                </div>
              </div>
            </RadioGroup>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                id="discord-channel-mode-save"
                onClick={saveMode}
                disabled={savingMode || mode === savedMode}
                className="bg-emerald-400 hover:bg-emerald-300 text-gray-950 font-minecraft"
              >
                {savingMode ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {savingMode ? t('saving') : t('saveChanges')}
              </Button>
              <span role="status" className="text-xs text-gray-400">
                {mode === savedMode ? t('allChangesSaved') : t('unsavedChanges')}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/20">
              <Webhook className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-white font-minecraft">
                {sharedMode ? t('discordSharedChannelTitle') : t('discordFallbackChannelTitle')}
              </CardTitle>
              <CardDescription className="text-gray-400">
                {sharedMode ? t('discordSharedChannelDesc') : t('discordFallbackChannelDesc')}
              </CardDescription>
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
                <Label className="text-gray-200">{t('discordWebhook')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="integration-discord-webhook"
                    value={discordWebhook}
                    onChange={(e) => setDiscordWebhook(e.target.value)}
                    type="password"
                    placeholder={hasDiscordWebhook ? t('secretConfiguredPlaceholder') : '••••••••••••••••'}
                    aria-invalid={discordWebhookInvalid}
                    aria-describedby="integration-discord-webhook-help"
                    className={`flex-1 bg-gray-800 text-white ${discordWebhookInvalid ? 'border-red-500' : 'border-gray-700'}`}
                  />
                  <Button type="button" variant="outline" onClick={testWebhook} disabled={testingWebhook || !hasDiscordWebhook} className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">
                    {testingWebhook ? <Loader2 className="h-4 w-4 animate-spin" /> : t('test')}
                  </Button>
                </div>
                {discordWebhookInvalid ? (
                  <p id="integration-discord-webhook-help" role="alert" className="flex items-start gap-1.5 text-xs text-red-400">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {t('discordWebhookInvalid')}
                  </p>
                ) : (
                  <p id="integration-discord-webhook-help" className="text-xs text-gray-400">
                    {sharedMode ? t('discordSharedChannelNote') : t('discordFallbackChannelDesc')}
                  </p>
                )}
              </div>
              <Button onClick={saveWebhook} disabled={saving || discordWebhookInvalid} className="bg-emerald-400 hover:bg-emerald-300 text-gray-950 font-minecraft">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {saving ? t('saving') : t('saveChanges')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {!sharedMode ? (
        <Card id="discord-per-server-channels" className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-white font-minecraft">{t('discordPerServerChannelsTitle')}</CardTitle>
            <CardDescription className="text-gray-400">{t('discordPerServerChannelsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/servers" className="inline-flex items-center gap-2 text-sm text-emerald-300 underline underline-offset-4 hover:text-emerald-200">
              {t('discordPerServerChannelsLink')}
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && isAdmin && integrations ? (
        <NotificationSettingsCard
          initial={integrations.notifications}
          smtpConfigured={integrations.smtp.configured}
          hasDiscordWebhook={integrations.systemDiscordConfigured ?? hasDiscordWebhook}
          delivery={integrations.notificationDelivery}
        />
      ) : null}
    </div>
  );
}
