"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Save, User, Key, Bell, Globe, AlertTriangle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { getSettings, updateSettings, UserSettings } from "@/services/settings/settings.service";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export default function SettingsPage() {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [username, setUsername] = useState("");

  const form = useForm<UserSettings>({
    defaultValues: {
      cfApiKey: "",
      discordWebhook: "",
    },
  });

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
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
      } catch (error) {
        console.error("Error loading settings:", error);
        toast.error(t("errorLoadingServerInfo"));
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [form, t]);

  const onSubmit = async (data: UserSettings) => {
    setIsSaving(true);
    try {
      await updateSettings(data);
      toast.success(t("settingsSaved"));
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(t("settingsSaveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-2">
          <Image src="/images/anvil.webp" alt="Settings" width={40} height={40} />
          <h1 className="text-3xl font-bold text-white font-minecraft">{t("settingsTitle")}</h1>
        </div>
        <p className="text-gray-400">{t("settingsDescription")}</p>
      </motion.div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Account Settings */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white font-minecraft">{t("accountSettings")}</CardTitle>
                    <CardDescription className="text-gray-400">{t("yourUsername")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-200">
                    {t("username")}
                  </Label>
                  <Input id="username" value={username} disabled className="bg-gray-800/60 border-gray-700 text-gray-400" />
                  <p className="text-xs text-gray-500">{t("yourUsername")}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* API Settings */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center">
                    <Key className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white font-minecraft">{t("apiSettings")}</CardTitle>
                    <CardDescription className="text-gray-400">{t("cloudflareApiKey")}</CardDescription>
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
                          <FormLabel className="text-gray-200">{t("cloudflareApiKey")}</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" placeholder="••••••••••••••••" className="bg-gray-800 border-gray-700 text-white" />
                          </FormControl>
                          <FormDescription className="text-gray-400">{t("cloudflareApiKeyDesc")}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="discordWebhook"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">{t("discordWebhook")}</FormLabel>
                          <FormControl>
                            <Input {...field} type="url" placeholder="https://discord.com/api/webhooks/..." className="bg-gray-800 border-gray-700 text-white" />
                          </FormControl>
                          <FormDescription className="text-gray-400">{t("discordWebhookDesc")}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Appearance Settings */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white font-minecraft">{t("appearanceSettings")}</CardTitle>
                    <CardDescription className="text-gray-400">{t("languageDesc")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language" className="text-gray-200">
                    {t("language")}
                  </Label>
                  <LanguageSwitcher />
                  <p className="text-xs text-gray-500">{t("languageDesc")}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notifications Settings */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.4 }}>
            <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-600/20 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white font-minecraft">{t("notificationSettings")}</CardTitle>
                    <CardDescription className="text-gray-400">{t("enableNotificationsDesc")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-200">{t("enableNotifications")}</p>
                    <p className="text-xs text-gray-500">{t("enableNotificationsDesc")}</p>
                  </div>
                  <Button type="button" variant="outline" className="bg-gray-800 border-gray-700 text-gray-400" disabled>
                    {t("comingSoon")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Danger Zone */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}>
            <Card className="border-2 border-red-600/40 bg-red-900/10 backdrop-blur-md shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <CardTitle className="text-red-400 font-minecraft">{t("dangerZone")}</CardTitle>
                    <CardDescription className="text-gray-400">{t("dangerZoneDesc")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <Image src="/images/barrier.webp" alt="Danger" width={48} height={48} className="mx-auto mb-3 opacity-60" />
                  <p className="text-gray-400 text-sm">{t("comingSoon")}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Save Button */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.6 }} className="flex justify-end">
            <Button type="submit" disabled={isSaving || isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-minecraft px-8">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {t("saveChanges")}
                </>
              )}
            </Button>
          </motion.div>
        </form>
      </Form>

      {/* Decorative Elements */}
      <div className="flex justify-center gap-8 pt-4">
        <motion.div animate={{ y: [-5, 5, -5] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}>
          <Image src="/images/redstone.webp" alt="Redstone" width={32} height={32} className="opacity-50 hover:opacity-80 transition-opacity" />
        </motion.div>
        <motion.div animate={{ y: [-5, 5, -5] }} transition={{ repeat: Infinity, duration: 3, delay: 0.5, ease: "easeInOut" }}>
          <Image src="/images/lapis.webp" alt="Lapis" width={32} height={32} className="opacity-50 hover:opacity-80 transition-opacity" />
        </motion.div>
        <motion.div animate={{ y: [-5, 5, -5] }} transition={{ repeat: Infinity, duration: 3, delay: 1, ease: "easeInOut" }}>
          <Image src="/images/anvil.webp" alt="Anvil" width={32} height={32} className="opacity-50 hover:opacity-80 transition-opacity" />
        </motion.div>
      </div>
    </div>
  );
}
