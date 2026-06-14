import { FormEvent, FC, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ServerConfig } from "@/lib/types/types";
import { SaveModeControl } from "../molecules/SaveModeControl";
import { Settings, Server, Cpu, Package, Terminal, ScrollText, Code, Layers, FolderOpen, Smartphone, Activity, Clock } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { type TabSearchItem } from "./TabSearch";
import { useServerNavStore, type ServerNavItem } from "@/lib/store/server-nav-store";

const LogsTab = dynamic(() => import("../molecules/Tabs/LogsTab").then(mod => mod.LogsTab));
const CommandsTab = dynamic(() => import("../molecules/Tabs/CommandsTab").then(mod => mod.CommandsTab));
const AdvancedTab = dynamic(() => import("../molecules/Tabs/AdvancedTab").then(mod => mod.AdvancedTab));
const ModsTab = dynamic(() => import("../molecules/Tabs/ModsTab").then(mod => mod.ModsTab));
const PluginsTab = dynamic(() => import("../molecules/Tabs/PluginsTab").then(mod => mod.PluginsTab));
const ResourcesTab = dynamic(() => import("../molecules/Tabs/ResourcesTab").then(mod => mod.ResourcesTab));
const GeneralSettingsTab = dynamic(() => import("../molecules/Tabs/GeneralSettingsTab").then(mod => mod.GeneralSettingsTab));
const ServerTypeTab = dynamic(() => import("../molecules/Tabs/ServerTypeTab").then(mod => mod.ServerTypeTab));
const BedrockSettingsTab = dynamic(() => import("../molecules/Tabs/BedrockSettingsTab").then(mod => mod.BedrockSettingsTab));
const BedrockAddonsTab = dynamic(() => import("../molecules/Tabs/BedrockAddonsTab").then(mod => mod.BedrockAddonsTab));
const FilesTab = dynamic(() => import("../molecules/Tabs/FilesTab").then(mod => mod.FilesTab));
const MetricsTab = dynamic(() => import("../molecules/Tabs/MetricsTab").then(mod => mod.MetricsTab));
const ScheduledTasksTab = dynamic(() => import("../molecules/Tabs/ScheduledTasksTab").then(mod => mod.ScheduledTasksTab));

// Fixed list of every possible tab value, used only to validate the URL hash
// regardless of which tabs are currently visible for this edition/type.
const ALL_TAB_VALUES = ["type", "general", "resources", "bedrock", "addons", "mods", "plugins", "advanced", "logs", "commands", "files", "metrics", "tasks"];

interface ServerConfigTabsProps {
  readonly serverId: string;
  readonly config: ServerConfig;
  readonly updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
  readonly saveConfig: () => Promise<boolean>;
  readonly serverStatus: string;
  readonly isSaving: boolean;
  readonly refreshToken?: number;
}

export const ServerConfigTabs: FC<ServerConfigTabsProps> = ({ serverId, config, updateConfig, saveConfig, serverStatus, isSaving, refreshToken = 0 }) => {
  const { t } = useLanguage();
  const setNav = useServerNavStore((state) => state.setNav);
  const setActiveNav = useServerNavStore((state) => state.setActive);
  const clearNav = useServerNavStore((state) => state.clear);

  const serverName = config.serverName || serverId;
  const isJava = config.edition !== "BEDROCK";
  const isBedrock = config.edition === "BEDROCK";

  // Java-only tabs
  const showModsTab = isJava && (config.serverType === "FORGE" || config.serverType === "NEOFORGE" || config.serverType === "FABRIC" || config.serverType === "AUTO_CURSEFORGE" || config.serverType === "CURSEFORGE" || config.serverType === 'MODRINTH' || config.serverType === 'GTNH');
  const showPluginsTab = isJava && (config.serverType === "SPIGOT" || config.serverType === "PAPER" || config.serverType === "BUKKIT" || config.serverType === "PUFFERFISH" || config.serverType === "PURPUR" || config.serverType === "LEAF" || config.serverType === "FOLIA");
  const showResourcesTab = isJava; // JVM settings only apply to Java
  const showCommandsTab = isJava; // RCON only works with Java

  const isServerRunning = serverStatus === "running" || serverStatus === "starting";

  // Single source of truth for the tab list. Drives the side nav, the hash
  // validation and the command-palette index, so there is no duplicated list.
  const tabsMeta: (ServerNavItem & { show: boolean })[] = [
    { value: "type", label: t("serverType"), icon: Server, group: "config", show: true, disabled: isServerRunning },
    { value: "general", label: t("general"), icon: Settings, group: "config", show: true, disabled: isServerRunning },
    { value: "resources", label: t("resources"), icon: Cpu, group: "config", show: showResourcesTab, disabled: isServerRunning },
    { value: "bedrock", label: t("bedrock"), icon: Smartphone, group: "config", show: isBedrock, disabled: isServerRunning },
    { value: "addons", label: t("addons"), icon: Package, group: "config", show: isBedrock, disabled: isServerRunning },
    { value: "mods", label: t("mods"), icon: Package, group: "config", show: showModsTab, disabled: isServerRunning },
    { value: "plugins", label: t("plugins"), icon: Layers, group: "config", show: showPluginsTab, disabled: isServerRunning },
    { value: "advanced", label: t("advanced"), icon: Code, group: "config", show: true, disabled: isServerRunning },
    { value: "logs", label: t("logs"), icon: ScrollText, group: "operation", show: true, disabled: false },
    { value: "commands", label: t("commands"), icon: Terminal, group: "operation", show: showCommandsTab, disabled: !isServerRunning },
    { value: "files", label: t("files"), icon: FolderOpen, group: "operation", show: true, disabled: isServerRunning },
    { value: "metrics", label: t("metrics"), icon: Activity, group: "monitoring", show: true, disabled: false },
    { value: "tasks", label: t("tasks"), icon: Clock, group: "monitoring", show: true, disabled: false },
  ];

  const navItems: ServerNavItem[] = tabsMeta.filter((tab) => tab.show).map((tab) => ({ value: tab.value, label: tab.label, icon: tab.icon, group: tab.group, disabled: tab.disabled }));
  const navSignature = navItems.map((item) => `${item.value}:${item.disabled ? 1 : 0}:${item.label}`).join(",");
  const tabItems: TabSearchItem[] = navItems.map((item) => ({ value: item.value, label: item.label, icon: item.icon, target: item.value }));

  // Curated index of individual settings -> the tab that holds them, so the
  // palette can answer searches like "ram", "cheats" or "puerto". Keywords are
  // bilingual (ES/EN) to match regardless of the active UI language.
  const settingItems: TabSearchItem[] = [
    ...(showResourcesTab
      ? [
          { value: "set-memory", label: t("memoryCpu"), icon: Cpu, target: "resources", group: t("resources"), keywords: "ram memoria memory cpu nucleos cores xms xmx" },
          { value: "set-jvm", label: t("jvmOptions"), icon: Cpu, target: "resources", group: t("resources"), keywords: "jvm aikar flags java args argumentos garbage gc" },
          { value: "set-runtime", label: t("advancedResources"), icon: Cpu, target: "resources", group: t("resources"), keywords: "autostop autopause auto stop pause pausa timezone zona horaria rolling logs" },
        ]
      : []),
    { value: "set-basic", label: t("basicSettings"), icon: Settings, target: "general", group: t("general"), keywords: "motd nombre name dificultad difficulty gamemode modo de juego" },
    { value: "set-world", label: t("worldSettings"), icon: Settings, target: "general", group: t("general"), keywords: "mundo world seed semilla pvp nivel level hardcore" },
    { value: "set-connectivity", label: t("connectivitySettings"), icon: Settings, target: "general", group: t("general"), keywords: "puerto port online mode modo conexion ip" },
    { value: "set-performance", label: t("performanceSettings"), icon: Settings, target: "general", group: t("general"), keywords: "jugadores players max view distance distancia render simulation simulacion" },
    ...(isBedrock
      ? [
          { value: "set-bedrock-perf", label: t("performance"), icon: Cpu, target: "bedrock", group: t("bedrock"), keywords: "rendimiento performance threads hilos maxthreads ram memoria memory cpu" },
          { value: "set-cheats", label: t("allowCheats"), icon: Smartphone, target: "bedrock", group: t("bedrock"), keywords: "cheats trucos commands comandos" },
          { value: "set-tick", label: t("tickDistance"), icon: Smartphone, target: "bedrock", group: t("bedrock"), keywords: "tick distance distancia simulacion" },
          { value: "set-permission", label: t("defaultPermissionLevel"), icon: Smartphone, target: "bedrock", group: t("bedrock"), keywords: "permisos permission op operador" },
          { value: "set-whitelist", label: t("whiteList"), icon: Smartphone, target: "bedrock", group: t("bedrock"), keywords: "whitelist lista blanca allow allowlist" },
        ]
      : []),
    { value: "set-type", label: t("serverType"), icon: Server, target: "type", group: t("serverType"), keywords: "tipo type paper forge fabric purpur vanilla neoforge version" },
  ];

  const paletteItems: TabSearchItem[] = [...tabItems, ...settingItems];

  const getInitialTab = () => {
    if (typeof window === "undefined") return "type";
    const hash = window.location.hash.slice(1);
    return ALL_TAB_VALUES.includes(hash) ? hash : "type";
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
      if (ALL_TAB_VALUES.includes(hash)) {
        setActiveTab(hash);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Publish the tab list to the global sidebar (drill-in nav). navSignature is a
  // stable proxy for navItems/paletteItems, which are rebuilt on every render.
  useEffect(() => {
    setNav({ serverId, serverName, items: navItems, paletteItems });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navSignature, serverId, serverName, setNav]);

  useEffect(() => {
    setActiveNav(activeTab);
  }, [activeTab, setActiveNav]);

  useEffect(() => () => clearNav(), [clearNav]);

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

  useEffect(() => {
    if (isServerRunning) {
      const disabledTabs = ["type", "general", "resources", "bedrock", "addons", "mods", "plugins", "advanced", "files"];
      if (disabledTabs.includes(activeTab)) {
        setActiveTab("logs");
      }
    }
  }, [isServerRunning, activeTab]);

  return (
    <div className="space-y-4 pb-24 animate-fade-in">
      {!isServerRunning && <SaveModeControl onManualSave={handleSaveConfig} isSaving={isSaving} hasUnsavedChanges={hasUnsavedChanges} />}

      {isServerRunning && (
        <div className="mc-slot p-4 flex items-start gap-3 animate-fade-in-up" style={{ borderColor: "#f5c542" }}>
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

      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="mc-panel min-w-0 p-4 text-gray-200 min-h-[400px]">
              <TabsContent value="type" className="space-y-4 mt-0">
                <ServerTypeTab config={config} updateConfig={updateConfig} />
              </TabsContent>

              <TabsContent value="general" className="space-y-4 mt-0">
                <GeneralSettingsTab serverId={serverId} serverStatus={serverStatus} config={config} updateConfig={updateConfig} />
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

              {isBedrock && (
                <TabsContent value="addons" className="space-y-4 mt-0">
                  <BedrockAddonsTab serverId={serverId} refreshToken={refreshToken} />
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

              <TabsContent value="metrics" className="space-y-4 mt-0">
                <MetricsTab serverId={serverId} />
              </TabsContent>

              <TabsContent value="tasks" className="space-y-4 mt-0">
                <ScheduledTasksTab serverId={serverId} />
              </TabsContent>
          </div>
        </Tabs>
      </form>
    </div>
  );
};
