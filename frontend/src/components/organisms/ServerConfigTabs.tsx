import { FormEvent, FC, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ServerConfig } from "@/lib/types/types";
import { SaveModeControl } from "../molecules/SaveModeControl";
import { Settings, Server, Cpu, Package, Terminal, ScrollText, Code, Layers, FolderOpen, Smartphone, Activity, Clock, Gamepad2, Shield, Network, Power, Archive, Globe, Eye } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { type TabSearchItem } from "./TabSearch";
import { useServerNavStore, type ServerNavItem } from "@/lib/store/server-nav-store";
import { useConfigMode } from "@/lib/hooks/useConfigMode";
import { advancedTabIsInUse } from "@/lib/server-config/advanced-tabs";
import { ConfigModeToggle } from "../molecules/ConfigModeToggle";

const LogsTab = dynamic(() => import("../molecules/Tabs/LogsTab").then(mod => mod.LogsTab));
const CommandsTab = dynamic(() => import("../molecules/Tabs/CommandsTab").then(mod => mod.CommandsTab));
const AdvancedTab = dynamic(() => import("../molecules/Tabs/AdvancedTab").then(mod => mod.AdvancedTab));
const ModsTab = dynamic(() => import("../molecules/Tabs/ModsTab").then(mod => mod.ModsTab));
const ModWatchTab = dynamic(() => import("../molecules/Tabs/ModWatchTab").then(mod => mod.ModWatchTab));
const PluginsTab = dynamic(() => import("../molecules/Tabs/PluginsTab").then(mod => mod.PluginsTab));
const ResourcesTab = dynamic(() => import("../molecules/Tabs/ResourcesTab").then(mod => mod.ResourcesTab));
const GameTab = dynamic(() => import("../molecules/Tabs/GameTab").then(mod => mod.GameTab));
const WorldsTab = dynamic(() => import("../molecules/Tabs/WorldsTab").then(mod => mod.WorldsTab));
const AccessTab = dynamic(() => import("../molecules/Tabs/AccessTab").then(mod => mod.AccessTab));
const NetworkTab = dynamic(() => import("../molecules/Tabs/NetworkTab").then(mod => mod.NetworkTab));
const LifecycleTab = dynamic(() => import("../molecules/Tabs/LifecycleTab").then(mod => mod.LifecycleTab));
const BackupsTab = dynamic(() => import("../molecules/Tabs/BackupsTab").then(mod => mod.BackupsTab));
const ServerTypeTab = dynamic(() => import("../molecules/Tabs/ServerTypeTab").then(mod => mod.ServerTypeTab));
const BedrockAddonsTab = dynamic(() => import("../molecules/Tabs/BedrockAddonsTab").then(mod => mod.BedrockAddonsTab));
const FilesTab = dynamic(() => import("../molecules/Tabs/FilesTab").then(mod => mod.FilesTab));
const MetricsTab = dynamic(() => import("../molecules/Tabs/MetricsTab").then(mod => mod.MetricsTab));
const ScheduledTasksTab = dynamic(() => import("../molecules/Tabs/ScheduledTasksTab").then(mod => mod.ScheduledTasksTab));

// Fixed list of every possible tab value, used only to validate the URL hash
// regardless of which tabs are currently visible for this edition/type.
const ALL_TAB_VALUES = ["type", "game", "worlds", "access", "network", "resources", "lifecycle", "addons", "mods", "modwatch", "plugins", "backups", "advanced", "logs", "commands", "files", "metrics", "tasks"];

// Tabs that were split up or absorbed. People bookmark these hashes and the docs
// link to them, so an old one lands on whichever tab took over its content.
const RENAMED_TABS: Record<string, string> = { general: "game", bedrock: "game" };

const resolveTab = (hash: string): string | null => {
  const target = RENAMED_TABS[hash] ?? hash;
  return ALL_TAB_VALUES.includes(target) ? target : null;
};

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
  const { mode: configMode, setMode: setConfigMode } = useConfigMode();
  const setNav = useServerNavStore((state) => state.setNav);
  const setActiveNav = useServerNavStore((state) => state.setActive);
  const clearNav = useServerNavStore((state) => state.clear);

  const serverName = config.serverName || serverId;
  const isJava = config.edition !== "BEDROCK";
  const isBedrock = config.edition === "BEDROCK";

  // Java-only tabs
  const showModsTab = isJava && (config.serverType === "FORGE" || config.serverType === "NEOFORGE" || config.serverType === "FABRIC" || config.serverType === "AUTO_CURSEFORGE" || config.serverType === "CURSEFORGE" || config.serverType === 'MODRINTH' || config.serverType === 'GTNH' || config.serverType === 'FTBA');
  const showPluginsTab = isJava && (config.serverType === "SPIGOT" || config.serverType === "PAPER" || config.serverType === "BUKKIT" || config.serverType === "PUFFERFISH" || config.serverType === "PURPUR" || config.serverType === "LEAF" || config.serverType === "FOLIA");
  const showResourcesTab = isJava; // JVM settings only apply to Java
  const showCommandsTab = isJava; // RCON only works with Java
  const showBackupsTab = isJava; // mc-backup drives the world save over RCON
  const showWorldsTab = isJava; // world switching is Java-only server side

  const isServerRunning = serverStatus === "running" || serverStatus === "starting";

  // Single source of truth for the tab list. Drives the side nav, the hash
  // validation and the command-palette index, so there is no duplicated list.
  // `advanced` tabs are the ones a server can run its whole life without. Simple
  // mode hides them unless this server already has something set in there.
  const tabsMeta: (ServerNavItem & { show: boolean; advanced?: boolean })[] = [
    { value: "type", label: t("serverType"), icon: Server, group: "config", show: true, disabled: isServerRunning },
    { value: "game", label: t("game"), icon: Gamepad2, group: "config", show: true, disabled: isServerRunning },
    { value: "worlds", label: t("worlds"), icon: Globe, group: "config", show: showWorldsTab, disabled: isServerRunning },
    { value: "access", label: t("access"), icon: Shield, group: "config", show: true, disabled: isServerRunning },
    { value: "network", label: t("network"), icon: Network, group: "config", show: true, disabled: isServerRunning, advanced: true },
    { value: "resources", label: t("resources"), icon: Cpu, group: "config", show: showResourcesTab, disabled: isServerRunning },
    { value: "lifecycle", label: t("lifecycle"), icon: Power, group: "config", show: true, disabled: isServerRunning, advanced: true },
    { value: "addons", label: t("addons"), icon: Package, group: "config", show: isBedrock, disabled: isServerRunning },
    { value: "mods", label: t("mods"), icon: Package, group: "config", show: showModsTab, disabled: isServerRunning },
    { value: "modwatch", label: t("modWatch"), icon: Eye, group: "monitoring", show: showModsTab, disabled: false },
    { value: "plugins", label: t("plugins"), icon: Layers, group: "config", show: showPluginsTab, disabled: isServerRunning },
    { value: "backups", label: t("backups"), icon: Archive, group: "config", show: showBackupsTab, disabled: isServerRunning },
    { value: "advanced", label: t("advanced"), icon: Code, group: "config", show: true, disabled: isServerRunning, advanced: true },
    { value: "logs", label: t("logs"), icon: ScrollText, group: "operation", show: true, disabled: false },
    { value: "commands", label: t("commands"), icon: Terminal, group: "operation", show: showCommandsTab, disabled: !isServerRunning },
    { value: "files", label: t("files"), icon: FolderOpen, group: "operation", show: true, disabled: isServerRunning },
    { value: "metrics", label: t("metrics"), icon: Activity, group: "monitoring", show: true, disabled: false },
    { value: "tasks", label: t("tasks"), icon: Clock, group: "monitoring", show: true, disabled: false },
  ];

  // Two different reasons a tab can be missing: it does not apply to this server
  // at all (Bedrock has no plugins), or simple mode is hiding it.
  const applicableTabs = tabsMeta.filter((tab) => tab.show);
  const visibleTabs = applicableTabs.filter(
    (tab) => configMode === "advanced" || !tab.advanced || advancedTabIsInUse(tab.value, config),
  );
  const hiddenTabCount = applicableTabs.length - visibleTabs.length;

  const navItems: ServerNavItem[] = visibleTabs.map((tab) => ({ value: tab.value, label: tab.label, icon: tab.icon, group: tab.group, disabled: tab.disabled }));
  const navSignature = navItems.map((item) => `${item.value}:${item.disabled ? 1 : 0}:${item.label}`).join(",");
  // Built from every applicable tab, not just the visible ones: a tab simple mode
  // is hiding must still be reachable by name, and jumping to it reveals it.
  const tabItems: TabSearchItem[] = applicableTabs.map((tab) => ({ value: tab.value, label: tab.label, icon: tab.icon, target: tab.value }));

  // Curated index of individual settings -> the tab that holds them, so the
  // palette can answer searches like "ram", "cheats" or "puerto". Keywords are
  // bilingual (ES/EN) to match regardless of the active UI language.
  const settingItems: TabSearchItem[] = [
    ...(showResourcesTab
      ? [
          { value: "set-memory", label: t("memoryCpu"), icon: Cpu, target: "resources", group: t("resources"), keywords: "ram memoria memory cpu nucleos cores xms xmx" },
          { value: "set-jvm", label: t("jvmOptions"), icon: Cpu, target: "resources", group: t("resources"), keywords: "jvm aikar flags java args argumentos garbage gc" },
        ]
      : []),
    { value: "set-basic", label: t("basicSettings"), icon: Gamepad2, target: "game", group: t("game"), keywords: "motd nombre name dificultad difficulty gamemode modo de juego jugadores players" },
    { value: "set-world", label: t("worldSettings"), icon: Gamepad2, target: "game", group: t("game"), keywords: "mundo world seed semilla pvp nivel level hardcore spawn mobs" },
    ...(showWorldsTab
      ? [{ value: "set-worlds", label: t("worlds"), icon: Globe, target: "worlds", group: t("worlds"), keywords: "mundo world biblioteca library importar import cambiar switch level name" }]
      : []),
    { value: "set-performance", label: t("performanceSettings"), icon: Gamepad2, target: "game", group: t("game"), keywords: "view distance distancia render simulation simulacion chunks" },
    { value: "set-access", label: t("accessControl"), icon: Shield, target: "access", group: t("access"), keywords: "online mode ops operadores rcon permisos permissions whitelist lista blanca flight vuelo command block" },
    { value: "set-network", label: t("connectivitySettings"), icon: Network, target: "network", group: t("network"), keywords: "red network puerto port proxy hostname ip conexion connection autoscale ipv6" },
    { value: "set-lifecycle", label: t("lifecycle"), icon: Power, target: "lifecycle", group: t("lifecycle"), keywords: "autostop autopause auto stop pause pausa apagar reinicio restart timezone zona horaria" },
    ...(showBackupsTab
      ? [{ value: "set-backups", label: t("backups"), icon: Archive, target: "backups", group: t("backups"), keywords: "backup copia respaldo restic rclone rsync tar snapshot" }]
      : []),
    ...(isBedrock
      ? [
          { value: "set-bedrock-perf", label: t("performance"), icon: Gamepad2, target: "game", group: t("game"), keywords: "rendimiento performance threads hilos maxthreads tick distance distancia" },
          { value: "set-cheats", label: t("allowCheats"), icon: Shield, target: "access", group: t("access"), keywords: "cheats trucos commands comandos" },
          { value: "set-permission", label: t("defaultPermissionLevel"), icon: Shield, target: "access", group: t("access"), keywords: "permisos permission op operador" },
        ]
      : []),
    { value: "set-advanced", label: t("advanced"), icon: Code, target: "advanced", group: t("advanced"), keywords: "env vars variables entorno labels volumes volumenes docker logs" },
    { value: "set-type", label: t("serverType"), icon: Server, target: "type", group: t("serverType"), keywords: "tipo type paper forge fabric purpur vanilla neoforge version" },
  ];

  const paletteItems: TabSearchItem[] = [...tabItems, ...settingItems];

  // The tab from the URL hash is applied after mount, not during render: the
  // server always renders "type", so reading window here would hydrate a
  // different subtree and crash React.
  const [activeTab, setActiveTab] = useState("type");
  const [hashApplied, setHashApplied] = useState(false);
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
    const target = resolveTab(window.location.hash.slice(1));
    if (target) {
      setActiveTab(target);
    }
    setHashApplied(true);
  }, []);

  useEffect(() => {
    if (!hashApplied) return;
    window.location.hash = activeTab;
  }, [activeTab, hashApplied]);

  useEffect(() => {
    const handleHashChange = () => {
      const target = resolveTab(window.location.hash.slice(1));
      if (target) {
        setActiveTab(target);
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

  const applicableSignature = applicableTabs.map((tab) => tab.value).join(",");
  const visibleSignature = visibleTabs.map((tab) => tab.value).join(",");
  useEffect(() => {
    if (!activeTab) return;

    if (!applicableSignature.split(",").includes(activeTab)) {
      setActiveTab("type");
      return;
    }

    // The tab exists but simple mode is hiding it, which happens when the
    // command palette or a link points straight at it. Asking for it counts as
    // asking for advanced mode: bouncing back to another tab would look broken.
    if (!visibleSignature.split(",").includes(activeTab)) {
      setConfigMode("advanced");
    }
  }, [applicableSignature, visibleSignature, activeTab, setConfigMode]);

  useEffect(() => {
    if (isServerRunning) {
      const disabledTabs = ["type", "game", "worlds", "access", "network", "resources", "lifecycle", "addons", "mods", "plugins", "backups", "advanced", "files"];
      if (disabledTabs.includes(activeTab)) {
        setActiveTab("logs");
      }
    }
  }, [isServerRunning, activeTab]);

  return (
    <div className="space-y-4 pb-24 animate-fade-in">
      {!isServerRunning && <SaveModeControl onManualSave={handleSaveConfig} isSaving={isSaving} hasUnsavedChanges={hasUnsavedChanges} />}

      <ConfigModeToggle mode={configMode} onChange={setConfigMode} hiddenCount={hiddenTabCount} />

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

              <TabsContent value="game" className="space-y-4 mt-0">
                <GameTab config={config} updateConfig={updateConfig} />
              </TabsContent>

              {showWorldsTab && (
                <TabsContent value="worlds" className="space-y-4 mt-0">
                  <WorldsTab serverId={serverId} config={config} updateConfig={updateConfig} />
                </TabsContent>
              )}

              <TabsContent value="access" className="space-y-4 mt-0">
                <AccessTab config={config} updateConfig={updateConfig} />
              </TabsContent>

              <TabsContent value="network" className="space-y-4 mt-0">
                <NetworkTab config={config} updateConfig={updateConfig} />
              </TabsContent>

              {showResourcesTab && (
                <TabsContent value="resources" className="space-y-4 mt-0">
                  <ResourcesTab config={config} updateConfig={updateConfig} />
                </TabsContent>
              )}

              <TabsContent value="lifecycle" className="space-y-4 mt-0">
                <LifecycleTab config={config} updateConfig={updateConfig} />
              </TabsContent>

              {isBedrock && (
                <TabsContent value="addons" className="space-y-4 mt-0">
                  <BedrockAddonsTab serverId={serverId} refreshToken={refreshToken} />
                </TabsContent>
              )}

              {showModsTab && (
                <TabsContent value="mods" className="space-y-4 mt-0">
                  <ModsTab serverId={serverId} config={config} updateConfig={updateConfig} />
                </TabsContent>
              )}

              {showModsTab && (
                <TabsContent value="modwatch" className="space-y-4 mt-0">
                  <ModWatchTab serverId={serverId} config={config} updateConfig={updateConfig} />
                </TabsContent>
              )}

              {showPluginsTab && (
                <TabsContent value="plugins" className="space-y-4 mt-0">
                  <PluginsTab config={config} updateConfig={updateConfig} />
                </TabsContent>
              )}

              {showBackupsTab && (
                <TabsContent value="backups" className="space-y-4 mt-0">
                  <BackupsTab config={config} updateConfig={updateConfig} />
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
