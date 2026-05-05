'use client';

import { useEffect, useState } from 'react';
import { Key, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { getSettings, testDiscordWebhook, updateSettings, UserSettings } from '@/services/settings/settings.service';
import { mcToast } from '@/lib/utils/minecraft-toast';
import { useLanguage } from '@/lib/hooks/useLanguage';

export default function IntegrationsSettingsPage() {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const form = useForm<UserSettings>({ defaultValues: { cfApiKey: '', discordWebhook: '' } });

  useEffect(() => {
    getSettings()
      .then((settings) => form.reset(settings))
      .catch((error) => {
        console.error('Error loading settings:', error);
        mcToast.error(t('errorLoadingServerInfo'));
      })
      .finally(() => setIsLoading(false));
  }, [form, t]);

  const onSubmit = async (data: UserSettings) => {
    setIsSaving(true);
    try {
      await updateSettings({ cfApiKey: data.cfApiKey, discordWebhook: data.discordWebhook });
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

  return (
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
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-300">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t('loading')}
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
                        <Input {...field} type="password" placeholder="••••••••••••••••" className="bg-gray-800 border-gray-700 text-white" />
                      </FormControl>
                      <FormDescription className="text-gray-400">{t('curseforgeApiKeyDesc')}</FormDescription>
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
                          <Input {...field} type="url" placeholder="https://discord.com/api/webhooks/..." className="flex-1 bg-gray-800 border-gray-700 text-white" />
                        </FormControl>
                        <Button type="button" variant="outline" onClick={handleTestWebhook} disabled={isTesting || !field.value} className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">
                          {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('test')}
                        </Button>
                      </div>
                      <FormDescription className="text-gray-400">{t('discordWebhookDesc')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-minecraft">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isSaving ? t('saving') : t('saveChanges')}
                </Button>
              </>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
