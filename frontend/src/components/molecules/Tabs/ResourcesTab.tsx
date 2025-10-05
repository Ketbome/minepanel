/* eslint-disable @typescript-eslint/no-explicit-any */
import { FC } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { ServerConfig } from "@/lib/types/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/hooks/useLanguage";
import Image from "next/image";
import { MemoryCpuTab } from "./ResourcesTabs/MemoryCpuTab";
import { JvmOptionsTab } from "./ResourcesTabs/JvmOptionsTab";
import { AdvancedResourcesTab } from "./ResourcesTabs/AdvancedResourcesTab";

interface ResourcesTabProps {
  config: ServerConfig;
  updateConfig: (field: keyof ServerConfig, value: any) => void;
  onSave: () => Promise<boolean>;
}

export const ResourcesTab: FC<ResourcesTabProps> = ({ config, updateConfig, onSave }) => {
  const { t } = useLanguage();

  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
          <Image src="/images/diamond-pickaxe.webp" alt="Recursos" width={24} height={24} className="opacity-90" />
          {t("serverResources")}
        </CardTitle>
        <CardDescription className="text-gray-300">{t("serverResourcesDesc")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="memory" className="w-full">
          <div className="overflow-x-auto custom-scrollbar">
            <TabsList className="grid grid-cols-3 mb-6 w-full bg-gray-800/70 border border-gray-700/50 rounded-md p-1 text-gray-200">
              <TabsTrigger value="memory" className="text-gray-200 font-minecraft text-sm data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500">
                <Image src="/images/emerald.webp" alt="Memoria" width={16} height={16} className="mr-2" />
                {t("memoryCpu")}
              </TabsTrigger>
              <TabsTrigger value="jvm" className="text-gray-200 font-minecraft text-sm data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500">
                <Image src="/images/diamond.webp" alt="JVM" width={16} height={16} className="mr-2" />
                {t("jvmOptions")}
              </TabsTrigger>
              <TabsTrigger value="advanced" className="text-gray-200 font-minecraft text-sm data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500">
                <Image src="/images/observer.webp" alt="Avanzado" width={16} height={16} className="mr-2" />
                {t("advancedResources")}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="memory" className="space-y-6 text-gray-200">
            <MemoryCpuTab config={config} updateConfig={updateConfig} />
          </TabsContent>

          <TabsContent value="jvm" className="space-y-6 text-gray-200">
            <JvmOptionsTab config={config} updateConfig={updateConfig} />
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6 text-gray-200">
            <AdvancedResourcesTab config={config} updateConfig={updateConfig} />
          </TabsContent>
        </Tabs>
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
