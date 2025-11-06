import { useEffect, useState } from "react";
import { ServerConfig } from "../types/types";
import { apiClearServerData, apiRestartServer, fetchServerConfig, updateServerConfig } from "@/services/docker/fetchs";
import { toast } from "sonner";
import { minecraftVersionsService } from "@/services/minecraft-versions.service";

const defaultConfig: ServerConfig = {
  id: "Server",
  active: false,
  serverType: "VANILLA",
  serverName: "Minecraft Server",
  motd: "A Minecraft server",
  port: "25565",
  difficulty: "hard",
  maxPlayers: "10",
  ops: "",
  onlineMode: true,
  pvp: true,
  commandBlock: true,
  allowFlight: true,
  gameMode: "survival",
  seed: "",
  levelType: "minecraft:default",
  hardcore: false,
  spawnAnimals: true,
  spawnMonsters: true,
  spawnNpcs: true,
  generateStructures: true,
  allowNether: true,
  entityBroadcastRange: "100",
  enableAutoStop: false,
  autoStopTimeoutEst: "3600",
  autoStopTimeoutInit: "1800",
  enableAutoPause: false,
  autoPauseTimeoutEst: "3600",
  autoPauseTimeoutInit: "600",
  autoPauseKnockInterface: "eth0",
  playerIdleTimeout: "0",
  preventProxyConnections: false,
  opPermissionLevel: "4",
  enableRcon: true,
  rconPort: "25575",
  rconPassword: "",
  broadcastRconToOps: false,
  initMemory: "6G",
  maxMemory: "10G",
  cpuLimit: "2",
  cpuReservation: "0.3",
  memoryReservation: "4G",
  viewDistance: "6",
  simulationDistance: "4",
  uid: "1000",
  gid: "1000",
  useAikarFlags: false,
  enableJmx: false,
  jmxHost: "",
  jvmOpts: "",
  jvmXxOpts: "",
  jvmDdOpts: "",
  extraArgs: "",
  tz: "UTC",
  enableRollingLogs: false,
  logTimestamp: false,
  enableBackup: false,
  backupInterval: "24h",
  backupMethod: "tar",
  backupInitialDelay: "2m",
  backupPruneDays: "7",
  backupDestDir: "/backups",
  backupName: "world",
  backupOnStartup: false,
  pauseIfNoPlayers: false,
  playersOnlineCheckInterval: "5m",
  rconRetries: "3",
  rconRetryInterval: "5s",
  backupIncludes: "",
  backupExcludes: "",
  tarCompressMethod: "gzip",
  dockerImage: "latest",
  minecraftVersion: "1.21.10",
  restartPolicy: "unless-stopped",
  stopDelay: "60",
  execDirectly: true,
  envVars: "",
  extraPorts: [],
  cfMethod: "url",
  cfUrl: "",
  cfSlug: "",
  cfFile: "",
  cfApiKey: "",
  cfSync: true,
  cfForceInclude: "",
  cfExclude: "",
  cfFilenameMatcher: "",
  cfParallelDownloads: "4",
  cfOverridesSkipExisting: false,
  cfSetLevelFrom: "",
  cfServerMod: "",
  cfBaseDir: "/data/FeedTheBeast",
  useModpackStartScript: true,
  ftbLegacyJavaFixer: false,
  spigetResources: "",
  paperBuild: "",
  paperChannel: "",
  paperDownloadUrl: "",
  bukkitDownloadUrl: "",
  spigotDownloadUrl: "",
  buildFromSource: false,
  pufferfishBuild: "",
  useFlareFlags: false,
  purpurBuild: "",
  purpurDownloadUrl: "",
  leafBuild: "",
  foliaBuild: "",
  foliaChannel: "",
  foliaDownloadUrl: "",
  skipDownloadDefaults: false,
};

export function useServerConfig(serverId: string) {
  const [config, setConfig] = useState<ServerConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const serverConfig = await fetchServerConfig(serverId);

        if (!serverConfig.port) {
          serverConfig.port = serverId === "daily" ? "25565" : "25566";
        }

        if (!serverConfig.minecraftVersion) {
          const latestRelease = await minecraftVersionsService.getLatestRelease();
          serverConfig.minecraftVersion = latestRelease;
        }

        setConfig({
          ...defaultConfig,
          ...serverConfig,
        });
      } catch (error) {
        console.error("Error loading server config:", error);
        toast.error("Error al cargar la configuración del servidor");
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, [serverId]);

  const updateConfig = <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveConfig = async (configToSave?: ServerConfig): Promise<boolean> => {
    const dataToSave = configToSave || config;

    try {
      setIsSaving(true);
      await updateServerConfig(serverId, dataToSave);
      toast.success("Configuración guardada correctamente");
      return true;
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Error al guardar la configuración");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const restartServer = async () => {
    setIsRestarting(true);
    try {
      const result = await apiRestartServer(serverId);
      if (result.success) {
        toast.success("Servidor reiniciado correctamente");
        return true;
      } else {
        throw new Error(result.message || "Error al reiniciar el servidor");
      }
    } catch (error) {
      console.error("Error restarting server:", error);
      toast.error("Error al reiniciar el servidor");
      return false;
    } finally {
      setIsRestarting(false);
    }
  };

  const clearServerData = async () => {
    setIsClearing(true);
    try {
      const result = await apiClearServerData(serverId);
      if (result.success) {
        toast.success("Datos del servidor borrados correctamente");
        return true;
      } else {
        throw new Error(result.message || "Error al borrar los datos del servidor");
      }
    } catch (error) {
      console.error("Error clearing server data:", error);
      toast.error("Error al borrar los datos del servidor");
      return false;
    } finally {
      setIsClearing(false);
    }
  };

  return {
    config,
    loading,
    isRestarting,
    isClearing,
    isSaving,
    updateConfig,
    saveConfig,
    restartServer,
    clearServerData,
  };
}
