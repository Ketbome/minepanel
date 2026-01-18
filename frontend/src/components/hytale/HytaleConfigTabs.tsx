"use client";

import { FC, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HytaleConfig, HytaleServerStatus } from "@/lib/types/hytale";
import { HytaleSettingsTab } from "./HytaleSettingsTab";
import { HytaleLogsTab } from "./HytaleLogsTab";
import { HytaleConsole } from "./HytaleConsole";
import { Button } from "@/components/ui/button";
import { Settings, ScrollText, Terminal, Save, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";

interface HytaleConfigTabsProps {
  serverId: string;
  config: HytaleConfig;
  updateConfig: <K extends keyof HytaleConfig>(field: K, value: HytaleConfig[K]) => void;
  saveConfig: () => Promise<boolean>;
  serverStatus: HytaleServerStatus;
  isSaving: boolean;
}

export const HytaleConfigTabs: FC<HytaleConfigTabsProps> = ({
  serverId,
  config,
  updateConfig,
  saveConfig,
  serverStatus,
  isSaving,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("settings");

  return (
    <div className="bg-gray-900/60 backdrop-blur-md rounded-lg border border-gray-700/40 overflow-hidden">
      <div className="p-4 border-b border-gray-700/40 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{t("serverConfiguration")}</h2>
        <Button
          onClick={saveConfig}
          disabled={isSaving}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {t("saveChanges")}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-gray-700/40">
          <TabsList className="bg-transparent h-auto p-0 flex flex-wrap gap-1 px-4 py-2">
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400 data-[state=active]:border-purple-500 border border-transparent px-4 py-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all"
            >
              <Settings className="h-4 w-4 mr-2" />
              {t("settings")}
            </TabsTrigger>

            <TabsTrigger
              value="logs"
              className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400 data-[state=active]:border-purple-500 border border-transparent px-4 py-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all"
            >
              <ScrollText className="h-4 w-4 mr-2" />
              {t("logs")}
            </TabsTrigger>

            <TabsTrigger
              value="console"
              className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400 data-[state=active]:border-purple-500 border border-transparent px-4 py-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all"
            >
              <Terminal className="h-4 w-4 mr-2" />
              {t("console")}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="p-4 min-h-[400px]">
          <TabsContent value="settings" className="mt-0">
            <HytaleSettingsTab config={config} updateConfig={updateConfig} />
          </TabsContent>

          <TabsContent value="logs" className="mt-0">
            <HytaleLogsTab serverId={serverId} serverStatus={serverStatus} />
          </TabsContent>

          <TabsContent value="console" className="mt-0">
            <HytaleConsole serverId={serverId} serverStatus={serverStatus} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
