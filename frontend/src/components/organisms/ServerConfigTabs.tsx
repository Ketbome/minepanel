import { FormEvent, FC, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ServerConfig } from "@/lib/types/types";
import { SaveModeControl } from "../molecules/SaveModeControl";
import { Settings, Server, Cpu, Package, Terminal, ScrollText, Code, Layers, FolderOpen, Smartphone, Activity, Clock, Gamepad2, Shield, Network, Power, Archive, Globe, Eye, Users, History } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { type TabSearchItem } from "./TabSearch";
import { useServerNavStore, type ServerNavItem } from "@/lib/store/server-nav-store";
import { useConfigMode } from "@/lib/hooks/useConfigMode";
import { advancedTabIsInUse, jvmOptionsInUse } from "@/lib/server-config/advanced-tabs";
import { ConfigModeToggle } from "../molecules/ConfigModeToggle";
import { resolveSpawnPoint } from "../molecules/players/player-format";

const LogsTab = dynamic(() => import("../molecules/Tabs/LogsTab").then(mod => mod.LogsTab));
const CommandsTab = dynamic(() => import("../molecules/Tabs/CommandsTab").then(mod => mod.CommandsTab));
const PlayersTab = dynamic(() => import("../molecules/Tabs/PlayersTab").then(mod => mod.PlayersTab));
const ActivityTab = dynamic(() => import("../molecules/Tabs/ActivityTab").then(mod => mod.ActivityTab));
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
const PlayerActivityTab = dynamic(() => import("../molecules/players/player-activity").then(mod => mod.PlayerActivityTab));
const MetricsTab = dynamic(() => import("../molecules/Tabs/MetricsTab").then(mod => mod.MetricsTab));
const ScheduledTasksTab = dynamic(() => import("../molecules/Tabs/ScheduledTasksTab").then(mod => mod.ScheduledTasksTab));

// Fixed list of every possible tab value, used only to validate the URL hash
// regardless of which tabs are currently visible for this edition/type.
const ALL_TAB_VALUES = ["type", "game", "worlds", "access", "network", "resources", "lifecycle", "addons", "mods", "modwatch", "plugins", "backups", "advanced", "logs", "commands", "players", "files", "metrics", "activity", "tasks"];

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
  const requestedField = useServerNavStore((state) => state.field);
  const setRequestedField = useServerNavStore((state) => state.setField);

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
  const showActivityTab = isJava; // tails the Java log file; Bedrock has no latest.log

  const isServerRunning = serverStatus === "running" || serverStatus === "starting";

  // Single source of truth for the tab list. Drives the side nav, the hash
  // validation and the command-palette index, so there is no duplicated list.
  // `advanced` tabs are the ones a server can run its whole life without. Simple
  // mode hides them unless this server already has something set in there.
  const tabsMeta: (ServerNavItem & { show: boolean; advanced?: boolean; keywords?: string })[] = [
    { value: "type", label: t("serverType"), icon: Server, group: "config", show: true, disabled: isServerRunning },
    { value: "game", label: t("game"), icon: Gamepad2, group: "config", show: true, disabled: isServerRunning },
    { value: "worlds", label: t("worlds"), icon: Globe, group: "config", show: showWorldsTab, disabled: isServerRunning },
    { value: "access", label: t("access"), icon: Shield, group: "config", show: true, disabled: isServerRunning },
    { value: "network", label: t("network"), icon: Network, group: "config", show: true, disabled: isServerRunning, advanced: true },
    { value: "resources", label: t("resources"), icon: Cpu, group: "config", show: showResourcesTab, disabled: isServerRunning },
    { value: "lifecycle", label: t("lifecycle"), icon: Power, group: "config", show: true, disabled: isServerRunning, advanced: true },
    { value: "addons", label: t("addons"), icon: Package, group: "config", show: isBedrock, disabled: isServerRunning, keywords: "addons behavior resource packs paquetes mcpack mcaddon" },
    { value: "mods", label: t("mods"), icon: Package, group: "config", show: showModsTab, disabled: isServerRunning, keywords: "mods modpack curseforge modrinth ftb gtnh forge fabric neoforge api key" },
    { value: "modwatch", label: t("modWatch"), icon: Eye, group: "monitoring", show: showModsTab, disabled: false, keywords: "mod watch actualizaciones updates changelog versiones versions notas notes" },
    { value: "plugins", label: t("plugins"), icon: Layers, group: "config", show: showPluginsTab, disabled: isServerRunning, keywords: "plugins spiget modrinth paper purpur spigot bukkit folia" },
    { value: "backups", label: t("backups"), icon: Archive, group: "config", show: showBackupsTab, disabled: isServerRunning },
    { value: "advanced", label: t("advanced"), icon: Code, group: "config", show: true, disabled: isServerRunning, advanced: true },
    { value: "logs", label: t("logs"), icon: ScrollText, group: "operation", show: true, disabled: false, keywords: "logs registros consola console errores errors crash" },
    { value: "commands", label: t("commands"), icon: Terminal, group: "operation", show: showCommandsTab, disabled: !isServerRunning, keywords: "comandos commands consola console rcon terminal tiempo time clima weather" },
    { value: "players", label: t("players"), icon: Users, group: "operation", show: true, disabled: false, keywords: "jugadores players stats estadisticas inventario inventory logros advancements sesiones sessions online kick ban" },
    { value: "files", label: t("files"), icon: FolderOpen, group: "operation", show: true, disabled: isServerRunning, keywords: "archivos files carpetas folders editar edit subir upload descargar download properties" },
    { value: "metrics", label: t("metrics"), icon: Activity, group: "monitoring", show: true, disabled: false, keywords: "metricas metrics tps mspt cpu ram memoria memory spark rendimiento performance lag" },
    { value: "activity", label: t("activity"), icon: History, group: "monitoring", show: showActivityTab, disabled: false, keywords: "actividad activity eventos events muertes deaths chat historial history" },
    { value: "tasks", label: t("tasks"), icon: Clock, group: "monitoring", show: true, disabled: false, keywords: "tareas tasks programadas scheduled cron reinicio restart automatico automatic" },
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
  const tabItems: TabSearchItem[] = applicableTabs.map((tab) => ({ value: tab.value, label: tab.label, icon: tab.icon, target: tab.value, keywords: tab.keywords }));

  // Curated index of individual settings -> the tab and field that hold them, so
  // the palette can answer searches like "ram", "cheats" or "puerto" and land on
  // the field itself. Keywords are bilingual (ES/EN) to match regardless of the
  // active UI language. A field id that is not rendered just leaves you on the tab.
  const settingItems: TabSearchItem[] = [
    { value: "set-type", label: t("serverType"), icon: Server, target: "type", group: t("serverType"), keywords: "tipo type paper forge fabric purpur vanilla neoforge" },
    { value: "set-version", label: t("minecraftVersion"), icon: Server, target: "type", group: t("serverType"), field: "minecraftVersion", keywords: "version minecraft latest snapshot actualizar update" },
    { value: "set-docker-image", label: t("dockerImage"), icon: Server, target: "type", group: t("serverType"), field: "dockerImage", keywords: "imagen image docker java 8 17 21 tag itzg" },
    { value: "set-basic", label: t("basicSettings"), icon: Gamepad2, target: "game", group: t("game"), field: "serverName", keywords: "nombre name servidor server" },
    ...(isJava ? [{ value: "set-motd", label: t("motd"), icon: Gamepad2, target: "game", group: t("game"), field: "motd", keywords: "motd mensaje message descripcion description lista list" }] : []),
    { value: "set-max-players", label: t("maxPlayers"), icon: Gamepad2, target: "game", group: t("game"), field: "maxPlayers", keywords: "jugadores players slots maximo max" },
    { value: "set-world", label: t("worldSettings"), icon: Gamepad2, target: "game", group: t("game"), field: "seed", keywords: "mundo world seed semilla nivel level tipo type flat plano amplified" },
    { value: "set-difficulty", label: t("difficulty"), icon: Gamepad2, target: "game", group: t("game"), field: "difficulty", keywords: "dificultad difficulty peaceful pacifico easy facil normal hard dificil" },
    { value: "set-gamemode", label: t("gameMode"), icon: Gamepad2, target: "game", group: t("game"), field: "gameMode", keywords: "modo de juego gamemode survival supervivencia creative creativo adventure aventura spectator espectador" },
    ...(isJava ? [{ value: "set-hardcore", label: t("hardcore"), icon: Gamepad2, target: "game", group: t("game"), field: "hardcore", keywords: "hardcore muerte death" }] : []),
    { value: "set-spawn", label: t("spawnProtection"), icon: Gamepad2, target: "game", group: t("game"), field: "spawnProtection", keywords: "spawn proteccion protection mobs animales animals monstruos monsters npc aldeanos villagers pvp" },
    { value: "set-performance", label: t("performanceSettings"), icon: Gamepad2, target: "game", group: t("game"), field: "view-distance", keywords: "view distance distancia vision render simulation simulacion chunks" },
    ...(isBedrock
      ? [
          { value: "set-bedrock-perf", label: t("performance"), icon: Gamepad2, target: "game", group: t("game"), field: "maxThreads", keywords: "rendimiento performance threads hilos maxthreads tick distance distancia" },
          { value: "set-texturepack", label: t("texturepackRequired"), icon: Gamepad2, target: "game", group: t("game"), field: "texturepackRequired", keywords: "texture pack textura resource pack paquete recursos" },
        ]
      : []),
    ...(showWorldsTab
      ? [{ value: "set-worlds", label: t("worlds"), icon: Globe, target: "worlds", group: t("worlds"), keywords: "mundo world biblioteca library importar import cambiar switch level name" }]
      : []),
    { value: "set-access", label: t("accessControl"), icon: Shield, target: "access", group: t("access"), field: "onlineMode", keywords: "online mode premium no premium cracked pirata" },
    { value: "set-whitelist", label: t("whiteList"), icon: Shield, target: "access", group: t("access"), field: "whiteList", keywords: "whitelist lista blanca permitidos allowed jugadores players" },
    { value: "set-ops", label: t("serverOperators"), icon: Shield, target: "access", group: t("access"), field: "ops", keywords: "op ops operadores operators admin administrador permisos permissions" },
    { value: "set-idle", label: t("playerIdleTimeout"), icon: Shield, target: "access", group: t("access"), field: "playerIdleTimeout", keywords: "afk idle inactividad inactivity kick expulsar timeout" },
    ...(isJava
      ? [
          { value: "set-permissions", label: t("additionalPermissions"), icon: Shield, target: "access", group: t("access"), field: "commandBlock", keywords: "command block bloque de comandos flight vuelo volar fly" },
          { value: "set-rcon", label: t("enableRcon"), icon: Shield, target: "access", group: t("access"), field: "enableRcon", keywords: "rcon puerto port password contrasena consola console remoto remote" },
        ]
      : []),
    ...(isBedrock
      ? [
          { value: "set-cheats", label: t("allowCheats"), icon: Shield, target: "access", group: t("access"), field: "allowCheats", keywords: "cheats trucos commands comandos" },
          { value: "set-permission", label: t("defaultPermissionLevel"), icon: Shield, target: "access", group: t("access"), field: "defaultPlayerPermissionLevel", keywords: "permisos permission op operador" },
        ]
      : []),
    { value: "set-network", label: t("connectivitySettings"), icon: Network, target: "network", group: t("network"), field: "serverPort", keywords: "red network puerto port ip conexion connection autoscale ipv6" },
    ...(isJava ? [{ value: "set-proxy", label: t("useProxy"), icon: Network, target: "network", group: t("network"), field: "useProxy", keywords: "proxy mc-router hostname dominio domain subdominio subdomain" }] : []),
    { value: "set-extra-ports", label: t("extraPorts"), icon: Network, target: "network", group: t("network"), field: "extraPorts", keywords: "puertos extra ports voice chat voz dynmap bluemap mapa map udp tcp" },
    ...(showResourcesTab
      ? [
          { value: "set-memory", label: t("memoryCpu"), icon: Cpu, target: "resources", group: t("resources"), field: "maxMemory", keywords: "ram memoria memory xms xmx" },
          { value: "set-cpu", label: t("cpuLimit"), icon: Cpu, target: "resources", group: t("resources"), field: "cpuLimit", keywords: "cpu limite limit reserva reservation nucleos cores" },
          { value: "set-uid", label: t("linuxUserUid"), icon: Cpu, target: "resources", group: t("resources"), field: "uid", keywords: "uid gid usuario user grupo group permisos permissions linux" },
          { value: "set-jvm", label: t("jvmOptions"), icon: Cpu, target: "resources", group: t("resources"), field: "useAikarFlags", advanced: !jvmOptionsInUse(config), keywords: "jvm aikar flags java args argumentos garbage gc jmx" },
        ]
      : []),
    ...(isJava
      ? [
          { value: "set-autostop", label: t("enableAutoStop"), icon: Power, target: "lifecycle", group: t("lifecycle"), field: "enableAutoStop", keywords: "autostop auto stop apagar shutdown inactivo idle vacio empty" },
          { value: "set-autopause", label: t("enableAutoPause"), icon: Power, target: "lifecycle", group: t("lifecycle"), field: "enableAutoPause", keywords: "autopause auto pause pausa pausar suspend" },
          { value: "set-event-cmds", label: t("eventCmdsTitle"), icon: Power, target: "lifecycle", group: t("lifecycle"), field: "rconCmdsStartup", keywords: "comandos commands eventos events conectar connect join entrar bienvenida welcome kit inicio starter disconnect salir startup arranque" },
        ]
      : []),
    { value: "set-restart", label: t("restartPolicy"), icon: Power, target: "lifecycle", group: t("lifecycle"), field: "restartPolicy", keywords: "reinicio restart crash caida politica policy stop delay" },
    { value: "set-timezone", label: t("timezone"), icon: Power, target: "lifecycle", group: t("lifecycle"), field: "tz", keywords: "timezone zona horaria hora time tz utc" },
    ...(showBackupsTab
      ? [
          { value: "set-backups", label: t("backups"), icon: Archive, target: "backups", group: t("backups"), field: "enableBackup", keywords: "backup copia respaldo snapshot" },
          { value: "set-backup-interval", label: t("backupInterval"), icon: Archive, target: "backups", group: t("backups"), field: "backupInterval", keywords: "intervalo interval frecuencia frequency horario schedule retencion retention prune dias days" },
          { value: "set-backup-method", label: t("backupMethod"), icon: Archive, target: "backups", group: t("backups"), field: "backupMethod", keywords: "metodo method restic rclone rsync tar s3 repositorio repository" },
        ]
      : []),
    { value: "set-advanced", label: t("environmentVars"), icon: Code, target: "advanced", group: t("advanced"), field: "envVars", keywords: "env vars variables entorno environment" },
    { value: "set-docker-labels", label: t("dockerLabels"), icon: Code, target: "advanced", group: t("advanced"), field: "dockerLabels", keywords: "labels etiquetas traefik docker" },
    { value: "set-volumes", label: t("dockerVolumes"), icon: Code, target: "advanced", group: t("advanced"), field: "dockerVolumes", keywords: "volumes volumenes mounts montajes bind carpetas folders" },
    { value: "set-compose", label: t("composeSnippets"), icon: Code, target: "advanced", group: t("advanced"), field: "composeSnippets", keywords: "compose snippets fragmentos yaml docker override" },
    { value: "set-logs", label: t("enableRollingLogs"), icon: Code, target: "advanced", group: t("advanced"), field: "enableRollingLogs", keywords: "logs rotativos rolling rotacion rotation timestamp" },
    ...(showCommandsTab
      ? [{ value: "set-gamerules", label: t("allGamerules"), icon: Terminal, target: "commands", group: t("commands"), field: "gamerules", keywords: "gamerule gamerules reglas rules keep inventory daylight ciclo cycle" }]
      : []),
  ];

  // A setting is as reachable as the tab it lives in.
  const tabDisabled = new Map(tabsMeta.map((tab) => [tab.value, tab.disabled]));
  const paletteItems: TabSearchItem[] = [...tabItems, ...settingItems].map((item) => ({ ...item, disabled: tabDisabled.get(item.target) }));

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

  // Detect unsaved changes. Mod Watch, spawn point and tick command fields are excluded: they save
  // through their own endpoints and PUT /servers/:id drops them, so they can never be a pending whole-form change.
  useEffect(() => {
    if (!savedConfig) {
      setHasUnsavedChanges(false);
      return;
    }
    const wholeForm = (source: ServerConfig) => {
      const { modNotes, modWatchTargetVersion, spawnX, spawnY, spawnZ, tickCommand, tickTpsPattern, tickMsptPattern, ...rest } = source;
      return rest;
    };
    const configChanged = JSON.stringify(wholeForm(config)) !== JSON.stringify(wholeForm(savedConfig));
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

  // The palette asked for one field. Tabs are lazy chunks, so it can take a moment
  // to exist; one in a section simple mode hides needs advanced mode first.
  useEffect(() => {
    if (!requestedField) return;
    if (paletteItems.some((item) => item.field === requestedField && item.advanced)) {
      setConfigMode("advanced");
    }
    let tries = 0;
    const timer = window.setInterval(() => {
      const element = document.getElementById(requestedField);
      if (!element && ++tries < 30) return;
      window.clearInterval(timer);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      element?.focus({ preventScroll: true });
      setRequestedField(null);
    }, 100);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedField]);

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
          <div className="mc-panel min-w-0 p-2 sm:p-4 text-gray-200 min-h-[400px]">
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
                  <CommandsTab serverId={serverId} serverStatus={serverStatus} rconPort={config.rconPort} rconPassword={config.rconPassword} config={config} updateConfig={updateConfig} />
                </TabsContent>
              )}

              {/* Java reads world player files; Bedrock keeps them in LevelDB, so it gets session history only */}
              <TabsContent value="players" className="space-y-4 mt-0">
                {isJava ? (
                  <PlayersTab serverId={serverId} serverStatus={serverStatus} rconPort={config.rconPort} rconPassword={config.rconPassword} spawnPoint={resolveSpawnPoint(config)} />
                ) : (
                  <PlayerActivityTab key={serverId} serverId={serverId} />
                )}
              </TabsContent>

              <TabsContent value="files" className="space-y-4 mt-0">
                <FilesTab serverId={serverId} minecraftVersion={isJava ? config.minecraftVersion : undefined} />
              </TabsContent>

              <TabsContent value="metrics" className="space-y-4 mt-0">
                <MetricsTab serverId={serverId} config={config} updateConfig={updateConfig} />
              </TabsContent>

              {showActivityTab && (
                <TabsContent value="activity" className="space-y-4 mt-0">
                  <ActivityTab serverId={serverId} />
                </TabsContent>
              )}

              <TabsContent value="tasks" className="space-y-4 mt-0">
                <ScheduledTasksTab serverId={serverId} />
              </TabsContent>
          </div>
        </Tabs>
      </form>
    </div>
  );
};
