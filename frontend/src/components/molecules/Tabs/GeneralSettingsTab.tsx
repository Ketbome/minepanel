/* eslint-disable @typescript-eslint/no-explicit-any */
import { FC, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ServerConfig } from "@/lib/types/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/hooks/useLanguage";
import Image from "next/image";
import { BasicSettingsTab } from "./SettingsTabs/BasicSettingsTab";
import { PerformanceSettingsTab } from "./SettingsTabs/PerformanceSettingsTab";
import { ConnectivitySettingsTab } from "./SettingsTabs/ConnectivitySettingsTab";

interface GeneralSettingsTabProps {
  config: ServerConfig;
  updateConfig: (field: keyof ServerConfig, value: any) => void;
  onSave: () => Promise<boolean>;
  onClearData: () => Promise<boolean>;
}

export const GeneralSettingsTab: FC<GeneralSettingsTabProps> = ({ config, updateConfig, onSave, onClearData }) => {
  const { t } = useLanguage();
  const [isClearing, setIsClearing] = useState(false);

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      await onClearData();
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
          <Image src="/images/server-icon.png" alt="Configuración" width={24} height={24} className="opacity-90" />
          {t("generalSettings")}
        </CardTitle>
        <CardDescription className="text-gray-300">{t("generalSettingsDesc")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <div className="overflow-x-auto custom-scrollbar">
            <TabsList className="grid grid-cols-3 mb-6 w-full bg-gray-800/70 border border-gray-700/50 rounded-md p-1 text-gray-200">
              <TabsTrigger value="basic" className="font-minecraft text-gray-200 text-sm data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500">
                <Image src="/images/book.webp" alt="Básicos" width={16} height={16} className="mr-2" />
                {t("basicSettings")}
              </TabsTrigger>
              <TabsTrigger value="performance" className="font-minecraft text-gray-200 text-sm data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500">
                <Image src="/images/redstone.webp" alt="Rendimiento" width={16} height={16} className="mr-2" />
                {t("performanceSettings")}
              </TabsTrigger>
              <TabsTrigger value="connectivity" className="font-minecraft text-gray-200 text-sm data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500">
                <Image src="/images/ender-pearl.webp" alt="Conectividad" width={16} height={16} className="mr-2" />
                {t("connectivitySettings")}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="basic" className="space-y-6 text-gray-200">
            <BasicSettingsTab config={config} updateConfig={updateConfig} />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6 text-gray-200">
            <PerformanceSettingsTab config={config} updateConfig={updateConfig} />
          </TabsContent>

          <TabsContent value="connectivity" className="space-y-6 text-gray-200">
            <ConnectivitySettingsTab config={config} updateConfig={updateConfig} />
          </TabsContent>
        </Tabs>

        <div className="pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" className="w-full font-minecraft bg-red-700 hover:bg-red-800 border border-red-900/50">
                <Trash2 className="mr-2 h-4 w-4" />
                {t("deleteServerData")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-gray-900 border-gray-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-red-400 font-minecraft">{t("deleteConfirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-300">{t("deleteConfirmDesc")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600">{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearData} disabled={isClearing} className="bg-red-700 hover:bg-red-800 text-white border-red-900/50 font-minecraft">
                  {isClearing ? t("deleting") : t("yesDeleteAll")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>

      <CardFooter className="flex justify-end pt-4 border-t border-gray-700/40">
        <Button type="button" onClick={onSave} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-minecraft">
          <Save className="h-4 w-4" />
          {t("saveConfiguration")}
        </Button>
      </CardFooter>
    </Card>
  );
};
