import { FormEvent, FC, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServerConfig } from "@/lib/types/types";
import { LogsTab } from "../molecules/Tabs/LogsTab";
import { CommandsTab } from "../molecules/Tabs/CommandsTab";
import { AdvancedTab } from "../molecules/Tabs/AdvancedTab";
import { ModsTab } from "../molecules/Tabs/ModsTab";
import { PluginsTab } from "../molecules/Tabs/PluginsTab";
import { ResourcesTab } from "../molecules/Tabs/ResourcesTab";
import { GeneralSettingsTab } from "../molecules/Tabs/GeneralSettingsTab";
import { ServerTypeTab } from "../molecules/Tabs/ServerTypeTab";
import { FilesTab } from "../molecules/Tabs/FilesTab";
import { SaveModeControl } from "../molecules/SaveModeControl";
import { Settings, Server, Cpu, Package, Terminal, ScrollText, Code, Layers, FolderOpen } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/hooks/useLanguage";

interface ServerConfigTabsProps {
  readonly serverId: string;
  readonly config: ServerConfig;
  readonly updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
  readonly saveConfig: () => Promise<boolean>;
  readonly serverStatus: string;
  readonly autoSaveEnabled: boolean;
  readonly setAutoSaveEnabled: (enabled: boolean) => void;
  readonly isSaving: boolean;
}

export const ServerConfigTabs: FC<ServerConfigTabsProps> = ({ serverId, config, updateConfig, saveConfig, serverStatus, autoSaveEnabled, setAutoSaveEnabled, isSaving }) => {
  const { t } = useLanguage();

  const showModsTab = config.serverType === "FORGE" || config.serverType === "AUTO_CURSEFORGE" || config.serverType === "CURSEFORGE";
  const showPluginsTab = config.serverType === "SPIGOT" || config.serverType === "PAPER" || config.serverType === "BUKKIT" || config.serverType === "PUFFERFISH" || config.serverType === "PURPUR" || config.serverType === "LEAF" || config.serverType === "FOLIA";

  const getInitialTab = () => {
    if (typeof window === "undefined") return "type";
    const hash = window.location.hash.slice(1);
    const validTabs = ["type", "general", "resources", "mods", "plugins", "advanced", "logs", "commands", "files"];
    return validTabs.includes(hash) ? hash : "type";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.hash = activeTab;
    }
  }, [activeTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const validTabs = ["type", "general", "resources", "mods", "plugins", "advanced", "logs", "commands", "files"];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await saveConfig();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <SaveModeControl autoSaveEnabled={autoSaveEnabled} setAutoSaveEnabled={setAutoSaveEnabled} onManualSave={saveConfig} isSaving={isSaving} />
      <div className="bg-gray-900/80 backdrop-blur-md rounded-lg border border-gray-700/60 overflow-hidden text-gray-200">
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="relative overflow-hidden">
              <div className="overflow-x-auto overflow-y-hidden custom-scrollbar text-gray-200 scroll-smooth">
                <TabsList className="flex w-max min-w-full h-auto p-1 bg-gray-800/70 border-b border-gray-700/60">
                  <TabsTrigger value="type" className="flex text-gray-200 items-center gap-1 py-2 px-2 md:px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-xs md:text-sm whitespace-nowrap">
                    <Server className="h-4 w-4 shrink-0" />
                    <span className="hidden md:inline">{t("serverType")}</span>
                  </TabsTrigger>

                  <TabsTrigger value="general" className="flex text-gray-200 items-center gap-1 py-2 px-2 md:px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-xs md:text-sm whitespace-nowrap">
                    <Settings className="h-4 w-4 shrink-0" />
                    <span className="hidden md:inline">{t("general")}</span>
                  </TabsTrigger>

                  <TabsTrigger value="resources" className="flex text-gray-200 items-center gap-1 py-2 px-2 md:px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-xs md:text-sm whitespace-nowrap">
                    <Cpu className="h-4 w-4 shrink-0" />
                    <span className="hidden md:inline">{t("resources")}</span>
                  </TabsTrigger>

                  {showModsTab && (
                    <TabsTrigger value="mods" className="flex text-gray-200 items-center gap-1 py-2 px-2 md:px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-xs md:text-sm whitespace-nowrap">
                      <Package className="h-4 w-4 shrink-0" />
                      <span className="hidden md:inline">{t("mods")}</span>
                    </TabsTrigger>
                  )}

                  {showPluginsTab && (
                    <TabsTrigger value="plugins" className="flex text-gray-200 items-center gap-1 py-2 px-2 md:px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-xs md:text-sm whitespace-nowrap">
                      <Layers className="h-4 w-4 shrink-0" />
                      <span className="hidden md:inline">{t("plugins")}</span>
                    </TabsTrigger>
                  )}

                  <TabsTrigger value="advanced" className="flex text-gray-200 items-center gap-1 py-2 px-2 md:px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-xs md:text-sm whitespace-nowrap">
                    <Code className="h-4 w-4 shrink-0" />
                    <span className="hidden md:inline">{t("advanced")}</span>
                  </TabsTrigger>

                  <TabsTrigger value="logs" className="flex text-gray-200 items-center gap-1 py-2 px-2 md:px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-xs md:text-sm whitespace-nowrap">
                    <ScrollText className="h-4 w-4 shrink-0" />
                    <span className="hidden md:inline">{t("logs")}</span>
                  </TabsTrigger>

                  <TabsTrigger value="commands" className="flex text-gray-200 items-center gap-1 py-2 px-2 md:px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-xs md:text-sm whitespace-nowrap">
                    <Terminal className="h-4 w-4 shrink-0" />
                    <span className="hidden md:inline">{t("commands")}</span>
                  </TabsTrigger>

                  <TabsTrigger value="files" className="flex text-gray-200 items-center gap-1 py-2 px-2 md:px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-xs md:text-sm whitespace-nowrap">
                    <FolderOpen className="h-4 w-4 shrink-0" />
                    <span className="hidden md:inline">{t("files")}</span>
                  </TabsTrigger>
                </TabsList>
              </div>
              {/* Gradient indicators for scroll */}
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-linear-to-r from-gray-800/70 to-transparent"></div>
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-gray-800/70 to-transparent"></div>
            </div>

            <div className="p-4 bg-gray-900/60 min-h-[400px]">
              <TabsContent value="type" className="space-y-4 mt-0">
                <ServerTypeTab config={config} updateConfig={updateConfig} />
              </TabsContent>

              <TabsContent value="general" className="space-y-4 mt-0">
                <GeneralSettingsTab config={config} updateConfig={updateConfig} />
              </TabsContent>

              <TabsContent value="resources" className="space-y-4 mt-0">
                <ResourcesTab config={config} updateConfig={updateConfig} />
              </TabsContent>

              {showModsTab && (
                <TabsContent value="mods" className="space-y-4 mt-0">
                  <ModsTab config={config} updateConfig={updateConfig} />
                </TabsContent>
              )}

              {showPluginsTab && (
                <TabsContent value="plugins" className="space-y-4 mt-0">
                  <PluginsTab config={config} updateConfig={updateConfig} />
                </TabsContent>
              )}

              <TabsContent value="advanced" className="space-y-4 mt-0">
                <AdvancedTab config={config} updateConfig={updateConfig} />
              </TabsContent>

              <TabsContent value="logs" className="space-y-4 mt-0">
                <LogsTab serverId={serverId} rconPort={config.rconPort} rconPassword={config.rconPassword} serverStatus={serverStatus} />
              </TabsContent>

              <TabsContent value="commands" className="space-y-4 mt-0">
                <CommandsTab serverId={serverId} serverStatus={serverStatus} rconPort={config.rconPort} rconPassword={config.rconPassword} />
              </TabsContent>

              <TabsContent value="files" className="space-y-4 mt-0">
                <FilesTab serverId={serverId} />
              </TabsContent>
            </div>
          </Tabs>
        </form>
      </div>
    </motion.div>
  );
};
