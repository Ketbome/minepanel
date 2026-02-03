'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import {
  Save,
  User,
  Key,
  Bell,
  Globe,
  AlertTriangle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Network,
  Info,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/lib/hooks/useLanguage';
import {
  getSettings,
  updateSettings,
  testDiscordWebhook,
  UserSettings,
  ProxySettings,
} from '@/services/settings/settings.service';
import { changePassword } from '@/services/users/users.service';
import { mcToast } from '@/lib/utils/minecraft-toast';
import { LanguageSelector } from '@/components/ui/language-selector';

export default function SettingsPage() {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [proxySettings, setProxySettings] = useState<ProxySettings>({
    enabled: false,
    baseDomain: null,
    available: false,
  });
  const [proxyBaseDomain, setProxyBaseDomain] = useState('');

  const form = useForm<UserSettings>({
    defaultValues: {
      cfApiKey: '',
      discordWebhook: '',
    },
  });

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const settings = await getSettings();
        form.reset(settings);
        if (settings.proxy) {
          setProxySettings(settings.proxy);
          setProxyBaseDomain(settings.proxy.baseDomain || '');
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        mcToast.error(t('errorLoadingServerInfo'));
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [form, t]);

  const onSubmit = async (data: UserSettings) => {
    setIsSaving(true);
    try {
      const updateData = {
        ...data,
        language: localStorage.getItem('language') as 'en' | 'es',
        proxy: {
          proxyEnabled: proxySettings.enabled,
          proxyBaseDomain: proxyBaseDomain || undefined,
        },
      };
      await updateSettings(updateData);
      mcToast.success(t('settingsSaved'));
    } catch (error) {
      console.error('Error saving settings:', error);
      mcToast.error(t('settingsSaveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    setIsTesting(true);
    try {
      const result = await testDiscordWebhook();
      if (result.success) {
        mcToast.success(t('webhookTestSuccess'));
      } else {
        mcToast.error(result.message);
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      mcToast.error(t('webhookTestFailed'));
    } finally {
      setIsTesting(false);
    }
  };

  const handleChangePassword = async () => {
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      mcToast.error(t('allPasswordFieldsRequired'));
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      mcToast.error(t('passwordsMustMatch'));
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      mcToast.success(t('passwordChangedSuccessfully'));

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: unknown) {
      console.error('Error changing password:', error);

      // Handle specific error messages
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 401) {
        mcToast.error(t('incorrectCurrentPassword'));
      } else {
        mcToast.error(t('passwordChangeFailed'));
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <Image src="/images/anvil.webp" alt="Settings" width={40} height={40} />
          <h1 className="text-3xl font-bold text-white font-minecraft">{t('settingsTitle')}</h1>
        </div>
        <p className="text-gray-400">{t('settingsDescription')}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="animate-fade-in-up stagger-1">
            <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white font-minecraft">
                      {t('accountSettings')}
                    </CardTitle>
                    <CardDescription className="text-gray-400">{t('yourUsername')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-200">
                    {t('username')}
                  </Label>
                  <Input
                    id="username"
                    value={username}
                    disabled
                    className="bg-gray-800/60 border-gray-700 text-gray-400"
                  />
                  <p className="text-xs text-gray-500">{t('yourUsername')}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="animate-fade-in-up stagger-2">
            <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white font-minecraft">
                      {t('securitySettings')}
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      {t('securitySettingsDesc')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-gray-200">
                    {t('currentPassword')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                      className="bg-gray-800 border-gray-700 text-white pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-gray-200">
                    {t('newPassword')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      className="bg-gray-800 border-gray-700 text-white pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-200">
                    {t('confirmPassword')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                      className="bg-gray-800 border-gray-700 text-white pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-minecraft mt-4"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('updatingPassword')}
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      {t('updatePassword')}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="animate-fade-in-up stagger-3">
            <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center">
                    <Key className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white font-minecraft">{t('apiSettings')}</CardTitle>
                    <CardDescription className="text-gray-400">
                      {t('apiSettingsDesc')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                  </div>
                ) : (
                  <>
                    <FormField
                      control={form.control}
                      name="cfApiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">{t('curseforgeApiKey')}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="••••••••••••••••"
                              className="bg-gray-800 border-gray-700 text-white"
                            />
                          </FormControl>
                          <FormDescription className="text-gray-400">
                            {t('curseforgeApiKeyDesc')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="discordWebhook"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">{t('discordWebhook')}</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input
                                {...field}
                                type="url"
                                placeholder="https://discord.com/api/webhooks/..."
                                className="bg-gray-800 border-gray-700 text-white flex-1"
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleTestWebhook}
                              disabled={isTesting || !field.value}
                              className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                            >
                              {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('test')}
                            </Button>
                          </div>
                          <FormDescription className="text-gray-400">
                            {t('discordWebhookDesc')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="animate-fade-in-up stagger-4">
            <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white font-minecraft">
                      {t('appearanceSettings')}
                    </CardTitle>
                    <CardDescription className="text-gray-400">{t('languageDesc')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language" className="text-gray-200">
                    {t('language')}
                  </Label>
                  <LanguageSelector />
                  <p className="text-xs text-gray-500">{t('languageDesc')}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="animate-fade-in-up stagger-5">
            <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-600/20 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white font-minecraft">
                      {t('notificationSettings')}
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      {t('enableNotificationsDesc')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-200">{t('enableNotifications')}</p>
                    <p className="text-xs text-gray-500">{t('enableNotificationsDesc')}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-gray-800 border-gray-700 text-gray-400"
                    disabled
                  >
                    {t('comingSoon')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="animate-fade-in-up stagger-6">
            <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-600/20 flex items-center justify-center">
                    <Network className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white font-minecraft">
                      {t('proxySettings')}
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      {t('proxySettingsDesc')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="proxyBaseDomain" className="text-gray-200">
                    {t('proxyBaseDomain')}
                  </Label>
                  <Input
                    id="proxyBaseDomain"
                    value={proxyBaseDomain}
                    onChange={(e) => setProxyBaseDomain(e.target.value)}
                    placeholder="mc.example.com"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                  <p className="text-xs text-gray-500">{t('proxyBaseDomainDesc')}</p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="text-sm font-medium text-gray-200">{t('enableProxy')}</p>
                    <p className="text-xs text-gray-500">{t('enableProxyDesc')}</p>
                  </div>
                  <Switch
                    checked={proxySettings.enabled}
                    onCheckedChange={(checked) =>
                      setProxySettings({ ...proxySettings, enabled: checked })
                    }
                    disabled={!proxyBaseDomain}
                  />
                </div>

                {!proxyBaseDomain && (
                  <div className="flex items-start gap-2 p-3 bg-amber-900/20 border border-amber-600/30 rounded-lg">
                    <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-300">{t('proxyRequiresDomain')}</p>
                  </div>
                )}

                {proxyBaseDomain && proxySettings.enabled && (
                  <div className="flex items-start gap-2 p-3 bg-cyan-900/20 border border-cyan-600/30 rounded-lg">
                    <Info className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-cyan-300">
                      <p className="font-medium mb-1">{t('proxyDnsInfo')}</p>
                      <code className="bg-gray-800 px-1 py-0.5 rounded">*.{proxyBaseDomain}</code>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="animate-fade-in-up stagger-7">
            <Card className="border-2 border-red-600/40 bg-red-900/10 backdrop-blur-md shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <CardTitle className="text-red-400 font-minecraft">{t('dangerZone')}</CardTitle>
                    <CardDescription className="text-gray-400">
                      {t('dangerZoneDesc')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <Image
                    src="/images/barrier.webp"
                    alt="Danger"
                    width={48}
                    height={48}
                    className="mx-auto mb-3 opacity-60"
                  />
                  <p className="text-gray-400 text-sm">{t('comingSoon')}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end animate-fade-in">
            <Button
              type="submit"
              disabled={isSaving || isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-minecraft px-8"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {t('saveChanges')}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      <div className="flex justify-center gap-8 pt-4">
        <div className="animate-float">
          <Image
            src="/images/redstone.webp"
            alt="Redstone"
            width={32}
            height={32}
            className="opacity-50 hover:opacity-80 transition-opacity"
          />
        </div>
        <div className="animate-float-delay-1">
          <Image
            src="/images/lapis.webp"
            alt="Lapis"
            width={32}
            height={32}
            className="opacity-50 hover:opacity-80 transition-opacity"
          />
        </div>
        <div className="animate-float-delay-2">
          <Image
            src="/images/anvil.webp"
            alt="Anvil"
            width={32}
            height={32}
            className="opacity-50 hover:opacity-80 transition-opacity"
          />
        </div>
      </div>
    </div>
  );
}
