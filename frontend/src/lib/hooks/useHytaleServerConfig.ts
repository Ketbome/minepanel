import { useState, useEffect, useCallback } from 'react';
import { HytaleConfig, UpdateHytaleConfigDto } from '@/lib/types/hytale';
import {
  fetchHytaleServerConfig,
  updateHytaleServerConfig,
  restartHytaleServer,
} from '@/services/hytale/fetchs';
import { mcToast } from '@/lib/utils/minecraft-toast';

const defaultConfig: HytaleConfig = {
  id: '',
  active: false,
  serverName: '',
  port: '5520',
  javaXms: '4G',
  javaXmx: '8G',
  useG1gc: true,
  dockerImage: 'ketbom/hytale-server:latest',
  restartPolicy: 'unless-stopped',
  tz: 'UTC',
  bindAddr: '0.0.0.0',
  autoDownload: true,
};

export function useHytaleServerConfig(serverId: string) {
  const [config, setConfig] = useState<HytaleConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    if (!serverId) return;
    
    setLoading(true);
    try {
      const serverConfig = await fetchHytaleServerConfig(serverId);
      if (serverConfig) {
        setConfig(serverConfig);
      }
    } catch (error) {
      console.error('Error loading Hytale config:', error);
      mcToast.error('Error loading server configuration');
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const updateConfig = useCallback(
    <K extends keyof HytaleConfig>(field: K, value: HytaleConfig[K]) => {
      setConfig((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const saveConfig = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      const updateDto: UpdateHytaleConfigDto = {
        serverName: config.serverName,
        port: config.port,
        javaXms: config.javaXms,
        javaXmx: config.javaXmx,
        useG1gc: config.useG1gc,
        viewDistance: config.viewDistance,
        maxPlayers: config.maxPlayers,
        serverDescription: config.serverDescription,
        dockerImage: config.dockerImage,
        restartPolicy: config.restartPolicy,
        tz: config.tz,
        envVars: config.envVars,
        bindAddr: config.bindAddr,
        autoDownload: config.autoDownload,
      };

      await updateHytaleServerConfig(serverId, updateDto);
      mcToast.success('Configuration saved');
      return true;
    } catch (error) {
      console.error('Error saving config:', error);
      mcToast.error('Error saving configuration');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [serverId, config]);

  const restartServer = useCallback(async (): Promise<boolean> => {
    try {
      const result = await restartHytaleServer(serverId);
      if (result.success) {
        mcToast.success('Server restarting...');
        return true;
      }
      mcToast.error('Failed to restart server');
      return false;
    } catch (error) {
      console.error('Error restarting server:', error);
      mcToast.error('Error restarting server');
      return false;
    }
  }, [serverId]);

  return {
    config,
    loading,
    isSaving,
    updateConfig,
    saveConfig,
    restartServer,
    reloadConfig: loadConfig,
  };
}
