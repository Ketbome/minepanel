'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { mcToast } from '@/lib/utils/minecraft-toast';
import { NotificationSettings, testNotification, updateIntegrationSettings } from '@/services/settings/settings.service';
import type { TranslationKey } from '@/lib/translations/en';

type ToggleKey = 'discordEnabled' | 'emailEnabled' | 'telegramEnabled' | 'lifecycleEnabled' | 'alertsEnabled' | 'diskAlertEnabled' | 'backupFailureEnabled' | 'recoveryEnabled';

export function NotificationSettingsCard({ initial, smtpConfigured, hasDiscordWebhook, onTestDiscord, testingDiscord }: {
  initial: NotificationSettings;
  smtpConfigured: boolean;
  hasDiscordWebhook: boolean;
  onTestDiscord: () => Promise<void>;
  testingDiscord: boolean;
}) {
  const { t } = useLanguage();
  const [saved, setSaved] = useState(initial);
  const [form, setForm] = useState(initial);
  const [token, setToken] = useState('');
  const [clearToken, setClearToken] = useState(false);
  const [busy, setBusy] = useState<'save' | 'email' | 'telegram' | null>(null);
  const [feedback, setFeedback] = useState<{ scope: 'save' | 'email' | 'telegram'; success: boolean; key: TranslationKey } | null>(null);
  const dirty = token !== '' || clearToken || JSON.stringify(form) !== JSON.stringify(saved);
  const disabled = busy !== null || testingDiscord;
  const update = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => setForm((current) => ({ ...current, [key]: value }));
  const rules: Array<[ToggleKey, TranslationKey, TranslationKey]> = [
    ['lifecycleEnabled', 'notificationLifecycle', 'notificationLifecycleHelp'],
    ['alertsEnabled', 'notificationAlerts', 'notificationAlertsHelp'],
    ['diskAlertEnabled', 'notificationDisk', 'notificationDiskHelp'],
    ['backupFailureEnabled', 'notificationBackup', 'notificationBackupHelp'],
    ['recoveryEnabled', 'notificationRecovery', 'notificationRecoveryHelp'],
  ];

  const reset = () => { setForm(saved); setToken(''); setClearToken(false); setFeedback(null); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy('save');
    setFeedback(null);
    try {
      const { hasTelegramToken: _hasToken, ...preferences } = form;
      const result = await updateIntegrationSettings({ notifications: { ...preferences, ...(token || clearToken ? { telegramToken: clearToken ? '' : token } : {}) } });
      setSaved(result.notifications);
      setForm(result.notifications);
      setToken('');
      setClearToken(false);
      mcToast.success(t('settingsSaved'));
    } catch {
      setFeedback({ scope: 'save', success: false, key: 'notificationSaveFailed' });
    } finally { setBusy(null); }
  };

  const test = async (channel: 'email' | 'telegram') => {
    setBusy(channel);
    setFeedback(null);
    try {
      const result = await testNotification(channel);
      setFeedback({ scope: channel, success: result.success, key: result.success ? 'notificationTestSuccess' : 'notificationTestFailed' });
    } catch { setFeedback({ scope: channel, success: false, key: 'notificationTestFailed' }); }
    finally { setBusy(null); }
  };

  const showFeedback = (scope: 'save' | 'email' | 'telegram') => feedback?.scope === scope ? (
    <p role={feedback.success ? 'status' : 'alert'} className={feedback.success ? 'text-sm text-emerald-300' : 'text-sm text-red-300'}>{t(feedback.key)}</p>
  ) : null;

  const channelHeader = (key: ToggleKey, label: TranslationKey, configured: boolean) => (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Label htmlFor={`notification-${key}`} className="text-base font-semibold">{t(label)}</Label>
        <Badge variant="secondary">{t(configured ? 'notificationConfigured' : 'notificationNotConfigured')}</Badge>
      </div>
      <Switch id={`notification-${key}`} checked={form[key]} onCheckedChange={(checked) => update(key, checked)} />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('notificationTitle')}</CardTitle>
        <CardDescription>{t('notificationDescription')}</CardDescription>
      </CardHeader>
      <form onSubmit={save} onReset={reset}>
        <CardContent className="grid gap-8 xl:grid-cols-2">
          <fieldset disabled={disabled} className="min-w-0 flex flex-col gap-5">
            <legend className="mb-3 text-lg font-semibold">{t('notificationChannels')}</legend>
            <div className="flex flex-col gap-3 border-b border-border pb-5">
              {channelHeader('discordEnabled', 'notificationDiscord', hasDiscordWebhook)}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <a href="#integration-discord-webhook" className="text-sm underline underline-offset-4">{t('notificationDiscordConfigure')}</a>
                <Button type="button" variant="outline" onClick={onTestDiscord} disabled={disabled || dirty || !hasDiscordWebhook}>{testingDiscord ? <Loader2 className="animate-spin" /> : null}{t('test')}</Button>
              </div>
            </div>
            <div className="flex flex-col gap-3 border-b border-border pb-5">
              {channelHeader('emailEnabled', 'notificationEmail', smtpConfigured && !!saved.emailTo)}
              <div className="grid min-w-0 gap-3">
                <div className="flex min-w-0 flex-col gap-2">
                  <Label htmlFor="notification-email">{t('notificationEmailTo')}</Label>
                  <Input id="notification-email" type="email" autoComplete="email" value={form.emailTo} onChange={(e) => update('emailTo', e.target.value)} placeholder="admin@example.com" required={form.emailEnabled} aria-describedby="notification-email-help" className="text-base" />
                </div>
                <Button type="button" variant="outline" className="max-w-full justify-self-start h-auto min-h-9 whitespace-normal" onClick={() => test('email')} disabled={disabled || dirty || !saved.emailTo || !smtpConfigured}>{busy === 'email' ? <Loader2 className="animate-spin" /> : null}{t('notificationTestEmail')}</Button>
              </div>
              <p id="notification-email-help" className="text-sm text-muted-foreground">{t(smtpConfigured ? 'notificationEmailHelp' : 'notificationSmtpRequired')}</p>
              {showFeedback('email')}
            </div>
            <div className="flex flex-col gap-3">
              {channelHeader('telegramEnabled', 'notificationTelegram', saved.hasTelegramToken && !!saved.telegramChatId)}
              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-2">
                  <Label htmlFor="notification-telegram-token">{t('notificationTelegramToken')}</Label>
                  <Input id="notification-telegram-token" type="password" autoComplete="new-password" value={token} onChange={(e) => { setToken(e.target.value); setClearToken(false); }} placeholder={saved.hasTelegramToken && !clearToken ? t('secretConfiguredPlaceholder') : ''} required={form.telegramEnabled && (!saved.hasTelegramToken || clearToken)} className="text-base" />
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                  <Label htmlFor="notification-telegram-chat">{t('notificationTelegramChatId')}</Label>
                  <Input id="notification-telegram-chat" value={form.telegramChatId} onChange={(e) => update('telegramChatId', e.target.value)} placeholder="-1001234567890" required={form.telegramEnabled} aria-describedby="notification-telegram-help" className="text-base" />
                </div>
              </div>
              <p id="notification-telegram-help" className="text-sm text-muted-foreground">{t('notificationTelegramHelp')}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="max-w-full h-auto min-h-9 whitespace-normal" onClick={() => test('telegram')} disabled={disabled || dirty || !saved.hasTelegramToken || !saved.telegramChatId}>{busy === 'telegram' ? <Loader2 className="animate-spin" /> : null}{t('notificationTestTelegram')}</Button>
                {saved.hasTelegramToken ? <Button type="button" variant="ghost" onClick={() => { setClearToken(true); setToken(''); update('telegramEnabled', false); }} disabled={clearToken}>{t('notificationClearToken')}</Button> : null}
              </div>
              {showFeedback('telegram')}
            </div>
          </fieldset>

          <fieldset disabled={disabled} className="min-w-0 flex flex-col gap-4 xl:border-l xl:border-border xl:pl-6">
            <legend className="mb-3 text-lg font-semibold">{t('notificationRules')}</legend>
            {rules.map(([key, label, description]) => (
              <div key={key} className="flex items-start justify-between gap-4 border-b border-border pb-4">
                <div className="min-w-0 flex flex-col gap-1">
                  <Label htmlFor={`notification-${key}`} className="text-base">{t(label)}</Label>
                  <p id={`notification-${key}-help`} className="text-sm text-muted-foreground">{t(description)}</p>
                </div>
                <Switch id={`notification-${key}`} checked={form[key]} onCheckedChange={(checked) => update(key, checked)} aria-describedby={`notification-${key}-help`} />
              </div>
            ))}
            <div className="grid min-w-0 items-end gap-4 md:grid-cols-2">
              <div className="min-w-0 flex flex-col gap-2">
                <Label htmlFor="notification-disk-threshold">{t('notificationDiskThreshold')}</Label>
                <Input id="notification-disk-threshold" type="number" min={1} max={50} value={form.diskFreeThresholdPercent} onChange={(e) => update('diskFreeThresholdPercent', Number(e.target.value))} disabled={!form.diskAlertEnabled || !form.alertsEnabled} className="text-base" />
              </div>
              <div className="min-w-0 flex flex-col gap-2">
                <Label htmlFor="notification-cooldown">{t('notificationCooldown')}</Label>
                <Input id="notification-cooldown" type="number" min={1} max={10080} value={form.alertCooldownMinutes} onChange={(e) => update('alertCooldownMinutes', Number(e.target.value))} className="text-base" />
              </div>
              <div className="min-w-0 flex flex-col gap-2 md:col-span-2">
                <Label htmlFor="notification-severity">{t('notificationSeverity')}</Label>
                <select id="notification-severity" value={form.minimumSeverity} onChange={(e) => update('minimumSeverity', e.target.value as NotificationSettings['minimumSeverity'])} className="mc-input h-10 min-w-0 w-full text-base">
                  <option value="info">{t('notificationSeverityInfo')}</option>
                  <option value="warning">{t('notificationSeverityWarning')}</option>
                  <option value="error">{t('notificationSeverityError')}</option>
                </select>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{t('notificationPolicyHelp')}</p>
          </fieldset>
          {feedback?.scope === 'save' ? <div className="xl:col-span-2">{showFeedback('save')}</div> : null}
        </CardContent>
        <CardFooter className="mt-6 flex flex-wrap justify-between gap-4 border-t border-border pt-5">
          <p role="status" className="text-sm text-muted-foreground">{t(dirty ? 'notificationUnsaved' : 'notificationAllSaved')}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="reset" variant="outline" disabled={disabled || !dirty}>{t('notificationDiscard')}</Button>
            <Button type="submit" variant="minepanel" disabled={disabled || !dirty}>{busy === 'save' ? <Loader2 className="animate-spin" /> : null}{t('saveChanges')}</Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
