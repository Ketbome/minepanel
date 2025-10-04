/* eslint-disable @typescript-eslint/no-explicit-any */
import { FormEvent, FC } from "react";
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
import { Settings, Server, Cpu, Package, Terminal, ScrollText, Code, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/hooks/useLanguage";

interface ServerConfigTabsProps {
  readonly serverId: string;
  readonly config: ServerConfig;
  readonly updateConfig: (field: keyof ServerConfig, value: any) => void;
  readonly saveConfig: () => Promise<boolean>;
  readonly serverStatus: string;
  readonly onClearData: () => Promise<boolean>;
}

export const ServerConfigTabs: FC<ServerConfigTabsProps> = ({ serverId, config, updateConfig, saveConfig, serverStatus, onClearData }) => {
  const { t } = useLanguage();

  // Determinar qué tabs mostrar según el tipo de servidor
  const showModsTab = config.serverType === "FORGE" || config.serverType === "AUTO_CURSEFORGE" || config.serverType === "CURSEFORGE";
  const showPluginsTab = config.serverType === "SPIGOT" || config.serverType === "PAPER" || config.serverType === "BUKKIT";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await saveConfig();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="bg-gray-900/80 backdrop-blur-md rounded-lg border border-gray-700/60 overflow-hidden text-gray-200">
      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="type" className="w-full">
          {/* Contenedor con scroll horizontal para los tabs */}
          <div className="overflow-x-auto custom-scrollbar text-gray-200">
            <TabsList className="flex w-max min-w-full h-auto p-1 bg-gray-800/70 border-b border-gray-700/60">
              <TabsTrigger value="type" className="flex text-gray-200 items-center gap-1.5 py-2.5 px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-sm whitespace-nowrap">
                <Server className="h-4 w-4" />
                <span className="hidden sm:inline">{t("serverType")}</span>
                <span className="sm:hidden">Tipo</span>
              </TabsTrigger>

              <TabsTrigger value="general" className="flex text-gray-200 items-center gap-1.5 py-2.5 px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-sm whitespace-nowrap">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">General</span>
                <span className="sm:hidden">General</span>
              </TabsTrigger>

              <TabsTrigger value="resources" className="flex text-gray-200 items-center gap-1.5 py-2.5 px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-sm whitespace-nowrap">
                <Cpu className="h-4 w-4" />
                <span className="hidden sm:inline">Recursos</span>
                <span className="sm:hidden">Recursos</span>
              </TabsTrigger>

              {showModsTab && (
                <TabsTrigger value="mods" className="flex text-gray-200 items-center gap-1.5 py-2.5 px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-sm whitespace-nowrap">
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">Mods</span>
                  <span className="sm:hidden">Mods</span>
                </TabsTrigger>
              )}

              {showPluginsTab && (
                <TabsTrigger value="plugins" className="flex text-gray-200 items-center gap-1.5 py-2.5 px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-sm whitespace-nowrap">
                  <Layers className="h-4 w-4" />
                  <span className="hidden sm:inline">Plugins</span>
                  <span className="sm:hidden">Plugins</span>
                </TabsTrigger>
              )}

              <TabsTrigger value="advanced" className="flex text-gray-200 items-center gap-1.5 py-2.5 px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-sm whitespace-nowrap">
                <Code className="h-4 w-4" />
                <span className="hidden sm:inline">Avanzado</span>
                <span className="sm:hidden">Avanzado</span>
              </TabsTrigger>

              <TabsTrigger value="logs" className="flex text-gray-200 items-center gap-1.5 py-2.5 px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-sm whitespace-nowrap">
                <ScrollText className="h-4 w-4" />
                <span className="hidden sm:inline">Logs</span>
                <span className="sm:hidden">Logs</span>
              </TabsTrigger>

              <TabsTrigger value="commands" className="flex text-gray-200 items-center gap-1.5 py-2.5 px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-sm whitespace-nowrap">
                <Terminal className="h-4 w-4" />
                <span className="hidden sm:inline">Comandos</span>
                <span className="sm:hidden">CMD</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-4 bg-gray-900/60 min-h-[400px]">
            <TabsContent value="type" className="space-y-4 mt-0">
              <ServerTypeTab config={config} updateConfig={updateConfig} onSave={saveConfig} />
            </TabsContent>

            <TabsContent value="general" className="space-y-4 mt-0">
              <GeneralSettingsTab config={config} updateConfig={updateConfig} onSave={saveConfig} onClearData={onClearData} />
            </TabsContent>

            <TabsContent value="resources" className="space-y-4 mt-0">
              <ResourcesTab config={config} updateConfig={updateConfig} onSave={saveConfig} />
            </TabsContent>

            {showModsTab && (
              <TabsContent value="mods" className="space-y-4 mt-0">
                <ModsTab config={config} updateConfig={updateConfig} onSave={saveConfig} />
              </TabsContent>
            )}

            {showPluginsTab && (
              <TabsContent value="plugins" className="space-y-4 mt-0">
                <PluginsTab config={config} updateConfig={updateConfig} onSave={saveConfig} />
              </TabsContent>
            )}

            <TabsContent value="advanced" className="space-y-4 mt-0">
              <AdvancedTab config={config} updateConfig={updateConfig} onSave={saveConfig} />
            </TabsContent>

            <TabsContent value="logs" className="space-y-4 mt-0">
              <LogsTab serverId={serverId} />
            </TabsContent>

            <TabsContent value="commands" className="space-y-4 mt-0">
              <CommandsTab serverId={serverId} serverStatus={serverStatus} rconPort={config.rconPort} rconPassword={config.rconPassword} />
            </TabsContent>
          </div>
        </Tabs>
      </form>
    </motion.div>
  );
};
