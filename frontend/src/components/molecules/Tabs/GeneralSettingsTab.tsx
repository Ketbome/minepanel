import { FC } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ServerConfig } from "@/lib/types/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/hooks/useLanguage";
import Image from "next/image";
import { BasicSettingsTab } from "./SettingsTabs/BasicSettingsTab";
import { WorldSettingsTab } from "./SettingsTabs/WorldSettingsTab";
import { PerformanceSettingsTab } from "./SettingsTabs/PerformanceSettingsTab";
import { ConnectivitySettingsTab } from "./SettingsTabs/ConnectivitySettingsTab";

interface GeneralSettingsTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
  disabled?: boolean;
}

export const GeneralSettingsTab: FC<GeneralSettingsTabProps> = ({ config, updateConfig, disabled = false }) => {
  const { t } = useLanguage();

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
            <TabsList className="grid grid-cols-4 mb-6 w-full bg-gray-800/70 border border-gray-700/50 rounded-md p-1 text-gray-200">
              <TabsTrigger value="basic" className="font-minecraft text-gray-200 text-sm data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500">
                <Image src="/images/book.webp" alt="Básicos" width={16} height={16} className="mr-2" />
                {t("basicSettings")}
              </TabsTrigger>
              <TabsTrigger value="world" className="font-minecraft text-gray-200 text-sm data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500">
                <Image src="/images/grass.webp" alt="Mundo" width={16} height={16} className="mr-2" />
                {t("worldSettings")}
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
            <BasicSettingsTab config={config} updateConfig={updateConfig} disabled={disabled} />
          </TabsContent>

          <TabsContent value="world" className="space-y-6 text-gray-200">
            <WorldSettingsTab config={config} updateConfig={updateConfig} disabled={disabled} />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6 text-gray-200">
            <PerformanceSettingsTab config={config} updateConfig={updateConfig} disabled={disabled} />
          </TabsContent>

          <TabsContent value="connectivity" className="space-y-6 text-gray-200">
            <ConnectivitySettingsTab config={config} updateConfig={updateConfig} disabled={disabled} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
