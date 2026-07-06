import { useEffect, useState } from 'react';
import { ServerConfig } from '../types/types';
import {
  apiClearServerData,
  apiRestartServer,
  fetchServerConfig,
  updateServerConfig,
} from '@/services/docker/fetchs';
import { mcToast } from '@/lib/utils/minecraft-toast';
import { useLanguage } from '@/lib/hooks/useLanguage';

const defaultConfig: ServerConfig = {
  id: 'Server',
  active: false,
  serverType: 'VANILLA',
  serverName: 'Minecraft Server',
  motd: 'A Minecraft server',
  port: '25565',
  difficulty: 'hard',
  maxPlayers: '10',
  ops: '',
  onlineMode: true,
  pvp: true,
  commandBlock: true,
  allowFlight: true,
  gameMode: 'survival',
  seed: '',
  worldSource: '',
  worldScope: 'local',
  worldLevelName: 'world',
  forceWorldCopy: false,
  levelType: 'minecraft:default',
  hardcore: false,
  spawnAnimals: true,
  spawnMonsters: true,
  spawnNpcs: true,
  generateStructures: true,
  allowNether: true,
  entityBroadcastRange: '100',
  enableAutoStop: false,
  autoStopTimeoutEst: '3600',
  autoStopTimeoutInit: '1800',
  enableAutoPause: false,
  autoPauseTimeoutEst: '3600',
  autoPauseTimeoutInit: '600',
  autoPauseKnockInterface: 'eth0',
  playerIdleTimeout: '0',
  preventProxyConnections: false,
  opPermissionLevel: '4',
  spawnProtection: '16',
  enableRcon: true,
  rconPort: '25575',
  rconPassword: '',
  broadcastRconToOps: false,
  initMemory: '6G',
  maxMemory: '10G',
  cpuLimit: '2',
  cpuReservation: '0.3',
  memoryReservation: '4G',
  viewDistance: '6',
  simulationDistance: '4',
  uid: '1000',
  gid: '1000',
  useAikarFlags: false,
  enableJmx: false,
  jmxHost: '',
  jvmOpts: '',
  jvmXxOpts: '',
  jvmDdOpts: '',
  extraArgs: '',
  tz: 'UTC',
  enableRollingLogs: false,
  logTimestamp: false,
  enableBackup: false,
  backupInterval: '24h',
  backupMethod: 'tar',
  backupInitialDelay: '2m',
  backupPruneDays: '7',
  backupDestDir: '/backups',
  backupHostDir: '',
  backupName: 'world',
  resticRepository: '',
  resticPassword: '',
  resticS3AccessKeyId: '',
  resticS3SecretAccessKey: '',
  resticRetention: '',
  backupOnStartup: false,
  pauseIfNoPlayers: false,
  playersOnlineCheckInterval: '5m',
  rconRetries: '3',
  rconRetryInterval: '5s',
  backupIncludes: '',
  backupExcludes: '',
  tarCompressMethod: 'gzip',
  enableSaveAll: true,
  enableSync: true,
  dockerImage: 'latest',
  minecraftVersion: 'latest',
  restartPolicy: 'unless-stopped',
  stopDelay: '60',
  execDirectly: true,
  envVars: '',
  extraPorts: [],
  gtnhPackVersion: '2.8.1',
  gtnhDeleteBackups: false,
  skipGtnhUpdateCheck: false,
  cfMethod: 'url',
  cfUrl: '',
  cfSlug: '',
  cfFile: '',
  cfApiKey: '',
  cfSync: true,
  cfForceInclude: '',
  cfExclude: '',
  cfFilenameMatcher: '',
  cfParallelDownloads: '4',
  cfOverridesSkipExisting: false,
  cfSetLevelFrom: '',
  cfServerMod: '',
  cfBaseDir: '/data/FeedTheBeast',
  useModpackStartScript: true,
  ftbLegacyJavaFixer: false,
  spigetResources: '',
  paperBuild: '',
  paperChannel: '',
  paperDownloadUrl: '',
  bukkitDownloadUrl: '',
  spigotDownloadUrl: '',
  buildFromSource: false,
  pufferfishBuild: '',
  useFlareFlags: false,
  purpurBuild: '',
  purpurDownloadUrl: '',
  leafBuild: '',
  foliaBuild: '',
  foliaChannel: '',
  foliaDownloadUrl: '',
  skipDownloadDefaults: false,
};

function normalizeAutoStopRestartPolicy(config: ServerConfig): ServerConfig {
  if (!config.enableAutoStop) {
    return config;
  }

  return {
    ...config,
    restartPolicy: 'no',
  };
}

export function useServerConfig(serverId: string) {
  const { t } = useLanguage();
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
          serverConfig.port = serverId === 'daily' ? '25565' : '25566';
        }

        if (!serverConfig.minecraftVersion) {
          if (serverConfig.edition === 'BEDROCK') {
            serverConfig.minecraftVersion = 'LATEST';
          } else if (serverConfig.serverType === 'GTNH') {
            serverConfig.minecraftVersion = '1.7.10';
          } else {
            serverConfig.minecraftVersion = 'latest';
          }
        }

        setConfig(normalizeAutoStopRestartPolicy({
          ...defaultConfig,
          ...serverConfig,
        }));
      } catch (error) {
        console.error('Error loading server config:', error);
        mcToast.error(t('loadConfigError'));
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  const updateConfig = <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => {
    setConfig((prev) => {
      if (field === 'enableAutoStop') {
        const enableAutoStop = Boolean(value);
        return normalizeAutoStopRestartPolicy({
          ...prev,
          enableAutoStop,
          restartPolicy: enableAutoStop ? 'no' : prev.restartPolicy,
        });
      }

      return normalizeAutoStopRestartPolicy({
        ...prev,
        [field]: value,
      });
    });
  };

  const saveConfig = async (configToSave?: ServerConfig): Promise<boolean> => {
    const dataToSave = normalizeAutoStopRestartPolicy(configToSave || config);

    try {
      setIsSaving(true);
      await updateServerConfig(serverId, dataToSave);
      mcToast.success(t('saveConfigurationSuccess'));
      return true;
    } catch (error) {
      console.error('Error saving config:', error);
      mcToast.error(t('saveConfigurationError'));
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
        mcToast.success(t('serverRestartSuccess'));
        return true;
      } else {
        throw new Error(result.message || t('serverRestartError'));
      }
    } catch (error) {
      console.error('Error restarting server:', error);
      mcToast.error(t('serverRestartError'));
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
        mcToast.success(t('clearDataSuccess'));
        return true;
      } else {
        throw new Error(result.message || t('clearDataError'));
      }
    } catch (error) {
      console.error('Error clearing server data:', error);
      mcToast.error(t('clearDataError'));
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
