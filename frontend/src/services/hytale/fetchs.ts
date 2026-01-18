import api from '../axios.service';
import {
  HytaleConfig,
  HytaleServerListItem,
  HytaleServerStatus,
  HytaleServerInfo,
  HytaleLogsResponse,
  CreateHytaleServerDto,
  UpdateHytaleConfigDto,
} from '@/lib/types/hytale';

const BASE_URL = '/hytale-servers';

/**
 * Get all Hytale servers
 */
export const fetchHytaleServerList = async (): Promise<HytaleServerListItem[]> => {
  const response = await api.get(BASE_URL);
  return response.data;
};

/**
 * Get server configuration
 */
export const fetchHytaleServerConfig = async (serverId: string): Promise<HytaleConfig | null> => {
  const response = await api.get(`${BASE_URL}/${serverId}`);
  return response.data;
};

/**
 * Create a new Hytale server
 */
export const createHytaleServer = async (
  data: CreateHytaleServerDto
): Promise<HytaleConfig> => {
  const response = await api.post(BASE_URL, data);
  return response.data;
};

/**
 * Update server configuration
 */
export const updateHytaleServerConfig = async (
  serverId: string,
  config: UpdateHytaleConfigDto
): Promise<HytaleConfig> => {
  const response = await api.put(`${BASE_URL}/${serverId}`, config);
  return response.data;
};

/**
 * Delete a server
 */
export const deleteHytaleServer = async (
  serverId: string
): Promise<{ success: boolean }> => {
  const response = await api.delete(`${BASE_URL}/${serverId}`);
  return response.data;
};

/**
 * Get server status
 */
export const getHytaleServerStatus = async (
  serverId: string
): Promise<{ status: HytaleServerStatus }> => {
  const response = await api.get(`${BASE_URL}/${serverId}/status`);
  return response.data;
};

/**
 * Get all servers status
 */
export const getAllHytaleServersStatus = async (): Promise<
  Record<string, HytaleServerStatus>
> => {
  const response = await api.get(`${BASE_URL}/status`);
  return response.data;
};

/**
 * Get server info
 */
export const getHytaleServerInfo = async (
  serverId: string
): Promise<HytaleServerInfo> => {
  const response = await api.get(`${BASE_URL}/${serverId}/info`);
  return response.data;
};

/**
 * Start server
 */
export const startHytaleServer = async (
  serverId: string
): Promise<{ success: boolean }> => {
  try {
    const response = await api.post(`${BASE_URL}/${serverId}/start`);
    return response.data;
  } catch (error) {
    console.error(`Error starting Hytale server ${serverId}:`, error);
    return { success: false };
  }
};

/**
 * Stop server
 */
export const stopHytaleServer = async (
  serverId: string
): Promise<{ success: boolean }> => {
  try {
    const response = await api.post(`${BASE_URL}/${serverId}/stop`);
    return response.data;
  } catch (error) {
    console.error(`Error stopping Hytale server ${serverId}:`, error);
    return { success: false };
  }
};

/**
 * Restart server
 */
export const restartHytaleServer = async (
  serverId: string
): Promise<{ success: boolean }> => {
  try {
    const response = await api.post(`${BASE_URL}/${serverId}/restart`);
    return response.data;
  } catch (error) {
    console.error(`Error restarting Hytale server ${serverId}:`, error);
    return { success: false };
  }
};

/**
 * Get server logs
 */
export const getHytaleServerLogs = async (
  serverId: string,
  lines: number = 100
): Promise<HytaleLogsResponse> => {
  const response = await api.get(`${BASE_URL}/${serverId}/logs`, {
    params: { lines },
  });
  
  const data = response.data;
  if (data.lastUpdate && typeof data.lastUpdate === 'string') {
    data.lastUpdate = new Date(data.lastUpdate);
  }
  
  return data;
};
