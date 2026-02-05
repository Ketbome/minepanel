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
import { BedrockSettingsTab } from "../molecules/Tabs/BedrockSettingsTab";
import { FilesTab } from "../molecules/Tabs/FilesTab";
import { SaveModeControl } from "../molecules/SaveModeControl";
import { Settings, Server, Cpu, Package, Terminal, ScrollText, Code, Layers, FolderOpen, Smartphone } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";

interface ServerConfigTabsProps {
  readonly serverId: string;
  readonly config: ServerConfig;
  readonly updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
  readonly saveConfig: () => Promise<boolean>;
  readonly serverStatus: string;
  readonly isSaving: boolean;
}

export const ServerConfigTabs: FC<ServerConfigTabsProps> = ({ serverId, config, updateConfig, saveConfig, serverStatus, isSaving }) => {
  const { t } = useLanguage();

  const isJava = config.edition !== "BEDROCK";
  const isBedrock = config.edition === "BEDROCK";

  // Java-only tabs
  const showModsTab = isJava && (config.serverType === "FORGE" || config.serverType === "FABRIC" || config.serverType === "AUTO_CURSEFORGE" || config.serverType === "CURSEFORGE");
  const showPluginsTab = isJava && (config.serverType === "SPIGOT" || config.serverType === "PAPER" || config.serverType === "BUKKIT" || config.serverType === "PUFFERFISH" || config.serverType === "PURPUR" || config.serverType === "LEAF" || config.serverType === "FOLIA");
  const showResourcesTab = isJava; // JVM settings only apply to Java
  const showCommandsTab = isJava; // RCON only works with Java

  const getInitialTab = () => {
    if (typeof window === "undefined") return "type";
    const hash = window.location.hash.slice(1);
    const validTabs = ["type", "general", "resources", "bedrock", "mods", "plugins", "advanced", "logs", "commands", "files"];
    return validTabs.includes(hash) ? hash : "type";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [savedConfig, setSavedConfig] = useState<ServerConfig | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize savedConfig when config loads from server
  useEffect(() => {
    if (config.id && !savedConfig) {
      setSavedConfig(config);
    }
  }, [config, savedConfig]);

  // Detect unsaved changes
  useEffect(() => {
    if (!savedConfig) {
      setHasUnsavedChanges(false);
      return;
    }
    const configChanged = JSON.stringify(config) !== JSON.stringify(savedConfig);
    setHasUnsavedChanges(configChanged);
  }, [config, savedConfig]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.hash = activeTab;
    }
  }, [activeTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const validTabs = ["type", "general", "resources", "bedrock", "mods", "plugins", "advanced", "logs", "commands", "files"];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const success = await saveConfig();
    if (success) {
      setSavedConfig(config);
    }
  };

  const handleSaveConfig = async () => {
    const success = await saveConfig();
    if (success) {
      setSavedConfig(config);
    }
    return success;
  };

  const isServerRunning = serverStatus === "running" || serverStatus === "starting";

  useEffect(() => {
    if (isServerRunning) {
      const disabledTabs = ["type", "general", "resources", "mods", "plugins", "advanced", "files"];
      if (disabledTabs.includes(activeTab)) {
        setActiveTab("logs");
      }
    }
  }, [isServerRunning, activeTab]);

  return (
    <div className="space-y-4 animate-fade-in">
      {!isServerRunning && <SaveModeControl onManualSave={handleSaveConfig} isSaving={isSaving} hasUnsavedChanges={hasUnsavedChanges} />}

      {isServerRunning && (
        <div className="p-4 bg-amber-900/30 backdrop-blur-md rounded-lg border border-amber-700/40 flex items-start gap-3 animate-fade-in-up">
          <div className="shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-amber-300 font-minecraft font-semibold text-sm mb-1">{t("serverRunningWarning")}</h4>
            <p className="text-amber-200/80 text-xs">{t("serverRunningWarningDesc")}</p>
          </div>
        </div>
      )}

      <div className="bg-gray-900/80 backdrop-blur-md rounded-lg border border-gray-700/60 overflow-hidden text-gray-200">
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="relative overflow-hidden">
              <div className="overflow-x-auto overflow-y-hidden custom-scrollbar text-gray-200 scroll-smooth">
                <TabsList className="flex w-max min-w-full h-auto p-1 bg-gray-800/70 border-b border-gray-700/60">
                  <TabsTrigger value="type" disabled={isServerRunning} className="flex text-gray-200 items-center gap-1 py-2 px-2 md:px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-xs md:text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                    <Server className="h-4 w-4 shrink-0" />
                    <span className="hidden md:inline">{t("serverType")}</span>
                  </TabsTrigger>

                  <TabsTrigger value="general" disabled={isServerRunning} className="flex text-gray-200 items-center gap-1 py-2 px-2 md:px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-xs md:text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                    <Settings className="h-4 w-4 shrink-0" />
                    <span className="hidden md:inline">{t("general")}</span>
                  </TabsTrigger>

                  {showResourcesTab && (
                    <TabsTrigger value="resources" disabled={isServerRunning} className="flex text-gray-200 items-center gap-1 py-2 px-2 md:px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-xs md:text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                      <Cpu className="h-4 w-4 shrink-0" />
                      <span className="hidden md:inline">{t("resources")}</span>
                    </TabsTrigger>
                  )}

                  {isBedrock && (
                    <TabsTrigger value="bedrock" disabled={isServerRunning} className="flex text-gray-200 items-center gap-1 py-2 px-2 md:px-3 data-[state=active]:bg-green-600/20 data-[state=active]:text-green-400 data-[state=active]:border-b-2 data-[state=active]:border-green-500 font-minecraft text-xs md:text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                      <Smartphone className="h-4 w-4 shrink-0" />
                      <span className="hidden md:inline">{t("bedrock")}</span>
                    </TabsTrigger>
                  )}

                  {showModsTab && (
                    <TabsTrigger value="mods" disabled={isServerRunning} className="flex text-gray-200 items-center gap-1 py-2 px-2 md:px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-xs md:text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                      <Package className="h-4 w-4 shrink-0" />
                      <span className="hidden md:inline">{t("mods")}</span>
                    </TabsTrigger>
                  )}

                  {showPluginsTab && (
                    <TabsTrigger value="plugins" disabled={isServerRunning} className="flex text-gray-200 items-center gap-1 py-2 px-2 md:px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-xs md:text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                      <Layers className="h-4 w-4 shrink-0" />
                      <span className="hidden md:inline">{t("plugins")}</span>
                    </TabsTrigger>
                  )}

                  <TabsTrigger value="advanced" disabled={isServerRunning} className="flex text-gray-200 items-center gap-1 py-2 px-2 md:px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-xs md:text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                    <Code className="h-4 w-4 shrink-0" />
                    <span className="hidden md:inline">{t("advanced")}</span>
                  </TabsTrigger>

                  <TabsTrigger value="logs" className="flex text-gray-200 items-center gap-1 py-2 px-2 md:px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-xs md:text-sm whitespace-nowrap">
                    <ScrollText className="h-4 w-4 shrink-0" />
                    <span className="hidden md:inline">{t("logs")}</span>
                  </TabsTrigger>

                  {showCommandsTab && (
                    <TabsTrigger value="commands" disabled={!isServerRunning} className="flex text-gray-200 items-center gap-1 py-2 px-2 md:px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-xs md:text-sm whitespace-nowrap">
                      <Terminal className="h-4 w-4 shrink-0" />
                      <span className="hidden md:inline">{t("commands")}</span>
                    </TabsTrigger>
                  )}

                  <TabsTrigger value="files" disabled={isServerRunning} className="flex text-gray-200 items-center gap-1 py-2 px-2 md:px-3 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 font-minecraft text-xs md:text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                    <FolderOpen className="h-4 w-4 shrink-0" />
                    <span className="hidden md:inline">{t("files")}</span>
                  </TabsTrigger>
                </TabsList>
              </div>
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

              {showResourcesTab && (
                <TabsContent value="resources" className="space-y-4 mt-0">
                  <ResourcesTab config={config} updateConfig={updateConfig} />
                </TabsContent>
              )}

              {isBedrock && (
                <TabsContent value="bedrock" className="space-y-4 mt-0">
                  <BedrockSettingsTab config={config} updateConfig={updateConfig} />
                </TabsContent>
              )}

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

              {showCommandsTab && (
                <TabsContent value="commands" className="space-y-4 mt-0">
                  <CommandsTab serverId={serverId} serverStatus={serverStatus} rconPort={config.rconPort} rconPassword={config.rconPassword} />
                </TabsContent>
              )}

              <TabsContent value="files" className="space-y-4 mt-0">
                <FilesTab serverId={serverId} />
              </TabsContent>
            </div>
          </Tabs>
        </form>
      </div>
    </div>
  );
};
