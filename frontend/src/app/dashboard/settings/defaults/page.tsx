'use client';

import { useEffect, useState } from 'react';
import { Info, Loader2, Save, SlidersHorizontal } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { getSettings, JavaServerDefaults, updateSettings } from '@/services/settings/settings.service';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { mcToast } from '@/lib/utils/minecraft-toast';

const emptyDefaults: JavaServerDefaults = {
  onlineMode: true,
  maxPlayers: '',
  initMemory: '',
  maxMemory: '',
  cpuLimit: '',
  cpuReservation: '',
  memoryReservation: '',
  viewDistance: '',
  simulationDistance: '',
  enableBackup: false,
};

export default function DefaultsSettingsPage() {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [javaDefaults, setJavaDefaults] = useState<JavaServerDefaults>(emptyDefaults);

  useEffect(() => {
    getSettings()
      .then((settings) => setJavaDefaults(settings.javaServerDefaults || emptyDefaults))
      .catch((error) => {
        console.error('Error loading settings:', error);
        mcToast.error(t('errorLoadingServerInfo'));
      })
      .finally(() => setIsLoading(false));
  }, [t]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({ javaServerDefaults: javaDefaults });
      mcToast.success(t('settingsSaved'));
    } catch (error) {
      console.error('Error saving settings:', error);
      mcToast.error(t('settingsSaveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/20">
            <SlidersHorizontal className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <CardTitle className="text-white font-minecraft">{t('javaServerDefaultsTitle')}</CardTitle>
            <CardDescription className="text-gray-400">{t('javaServerDefaultsDesc')}</CardDescription>
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
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['maxPlayers', t('maxPlayers'), '10'],
                ['initMemory', t('initialMemoryJvm'), '2G'],
                ['maxMemory', t('maxMemoryJvm'), '4G'],
                ['cpuLimit', t('cpuLimit'), '1'],
                ['cpuReservation', t('cpuReservation'), '0.25'],
                ['memoryReservation', t('memoryReservationDocker'), '2G'],
                ['viewDistance', t('viewDistance'), '6'],
                ['simulationDistance', t('simulationDistance'), '4'],
              ].map(([key, label, placeholder]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key} className="text-gray-200">{label}</Label>
                  <Input
                    id={key}
                    value={(javaDefaults as Record<string, string | undefined>)[key] || ''}
                    onChange={(event) => setJavaDefaults((current) => ({ ...current, [key]: event.target.value }))}
                    placeholder={placeholder}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-sm font-medium text-gray-200">{t('onlineMode')}</p>
                <p className="text-xs text-gray-500">{t('javaServerDefaultsOnlineModeDesc')}</p>
              </div>
              <Switch checked={javaDefaults.onlineMode !== false} onCheckedChange={(checked) => setJavaDefaults((current) => ({ ...current, onlineMode: checked }))} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-200">{t('enableBackup')}</p>
                <p className="text-xs text-gray-500">{t('javaServerDefaultsBackupDesc')}</p>
              </div>
              <Switch checked={javaDefaults.enableBackup === true} onCheckedChange={(checked) => setJavaDefaults((current) => ({ ...current, enableBackup: checked }))} />
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-emerald-600/30 bg-emerald-900/20 p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <p className="text-xs text-emerald-300">{t('javaServerDefaultsApplyOnlyNewServers')}</p>
            </div>
            <Button type="button" onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-minecraft">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isSaving ? t('saving') : t('saveChanges')}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
