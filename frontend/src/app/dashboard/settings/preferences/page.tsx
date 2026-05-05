'use client';

import { useState } from 'react';
import { Bell, Globe, Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LanguageSelector } from '@/components/ui/language-selector';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { mcToast } from '@/lib/utils/minecraft-toast';
import { updateSettings } from '@/services/settings/settings.service';

export default function PreferencesSettingsPage() {
  const { t, language } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({ language });
      mcToast.success(t('settingsSaved'));
    } catch (error) {
      console.error('Error saving settings:', error);
      mcToast.error(t('settingsSaveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/20">
              <Globe className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-white font-minecraft">{t('appearanceSettings')}</CardTitle>
              <CardDescription className="text-gray-400">{t('languageDesc')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-200">{t('language')}</Label>
            <LanguageSelector />
          </div>
          <Button type="button" onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white font-minecraft">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isSaving ? t('saving') : t('saveChanges')}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600/20">
              <Bell className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-white font-minecraft">{t('notificationSettings')}</CardTitle>
              <CardDescription className="text-gray-400">{t('enableNotificationsDesc')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-200">{t('enableNotifications')}</p>
              <p className="text-xs text-gray-500">{t('enableNotificationsDesc')}</p>
            </div>
            <Button type="button" variant="outline" disabled className="bg-gray-800 border-gray-700 text-gray-400">
              {t('comingSoon')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
