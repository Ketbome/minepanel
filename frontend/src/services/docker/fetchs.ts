import { ServerConfig, ServerListItem } from "@/lib/types/types";
import api from "../axios.service";

export const fetchServerConfig = async (serverId: string): Promise<ServerConfig> => {
  const response = await api.get(`/servers/${serverId}`);
  return response.data;
};

export const fetchServerList = async (): Promise<ServerListItem[]> => {
  const response = await api.get(`/servers`);
  return response.data;
};

export const createServer = async (data: Partial<ServerConfig>): Promise<{ success: boolean; message: string; server: ServerConfig }> => {
  const response = await api.post(`/servers`, data);
  return response.data;
};

export const updateServerConfig = async (serverId: string, config: Partial<ServerConfig>): Promise<ServerConfig> => {
  const response = await api.put(`/servers/${serverId}`, config);
  return response.data;
};

export const apiRestartServer = async (serverId: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.post(`/servers/${serverId}/restart`, {});
  return response.data;
};

export const apiClearServerData = async (serverId: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.post(`/servers/${serverId}/clear-data`, {});
  return response.data;
};

export const getServerStatus = async (serverId: string): Promise<{ status: "running" | "stopped" | "not_found" }> => {
  const response = await api.get(`/servers/${serverId}/status`);
  return response.data;
};

export const getAllServersStatus = async (): Promise<{ [serverId: string]: "running" | "stopped" | "starting" | "not_found" }> => {
  const response = await api.get(`/servers/all-status`);
  return response.data;
};

export const getServerLogs = async (
  serverId: string,
  limit: number = 100,
  since?: string,
  stream?: boolean
): Promise<{
  logs: string;
  hasErrors: boolean;
  lastUpdate: Date;
  status: "running" | "stopped" | "starting" | "not_found";
  metadata?: {
    totalLines: number;
    errorCount: number;
    warningCount: number;
  };
}> => {
  const params: Record<string, string | number> = { lines: limit };

  if (since) {
    params.since = since;
  }

  if (stream) {
    params.stream = "true";
  }

  const response = await api.get(`/servers/${serverId}/logs`, {
    params,
  });

  const data = response.data;
  if (data.lastUpdate && typeof data.lastUpdate === "string") {
    data.lastUpdate = new Date(data.lastUpdate);
  }

  return data;
};

export const getServerLogsStream = async (
  serverId: string,
  lines: number = 500,
  since?: string
): Promise<{
  logs: string;
  hasErrors: boolean;
  lastUpdate: Date;
  lastTimestamp?: string;
  status: "running" | "stopped" | "starting" | "not_found";
  metadata?: {
    totalLines: number;
    errorCount: number;
    warningCount: number;
  };
}> => {
  const params: Record<string, string | number> = { lines };

  if (since) {
    params.since = since;
  }

  const response = await api.get(`/servers/${serverId}/logs/stream`, {
    params,
  });

  const data = response.data;
  if (data.lastUpdate && typeof data.lastUpdate === "string") {
    data.lastUpdate = new Date(data.lastUpdate);
  }

  return data;
};

export const getServerLogsSince = async (
  serverId: string,
  timestamp: string,
  lines: number = 1000
): Promise<{
  logs: string;
  hasErrors: boolean;
  lastUpdate: Date;
  status: "running" | "stopped" | "starting" | "not_found";
  hasNewContent: boolean;
}> => {
  const params: Record<string, string | number> = { lines };

  const response = await api.get(`/servers/${serverId}/logs/since/${timestamp}`, {
    params,
  });

  const data = response.data;
  if (data.lastUpdate && typeof data.lastUpdate === "string") {
    data.lastUpdate = new Date(data.lastUpdate);
  }

  return data;
};

export const deleteServer = async (serverId: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/servers/${serverId}`);
  return response.data;
};

export const getResources = async (serverId: string): Promise<{ cpuUsage: string; memoryUsage: string; memoryLimit: string }> => {
  const response = await api.get(`/servers/${serverId}/resources`);
  return response.data;
};

export type ServerResourceInfo = {
  status: "running" | "stopped" | "starting" | "not_found";
  cpuUsage: string;
  memoryUsage: string;
  memoryLimit: string;
  cpuLimit: string;
  memoryConfigLimit: string;
};

export const getAllServersResources = async (): Promise<Record<string, ServerResourceInfo>> => {
  const response = await api.get(`/servers/all-resources`);
  return response.data;
};

export const executeServerCommand = async (serverId: string, body: { command: string; rconPort: string; rconPassword: string }): Promise<{ success: boolean; output: string }> => {
  const response = await api.post(`/servers/${serverId}/command`, body);
  return response.data;
};

export const startServer = async (
  serverId: string
): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const response = await api.post(`/servers/${serverId}/start`);
    return response.data;
  } catch (error) {
    console.error(`Error starting server ${serverId}:`, error);
    return {
      success: false,
      message: "SERVER_START_ERROR",
    };
  }
};

export const stopServer = async (
  serverId: string
): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const response = await api.post(`/servers/${serverId}/stop`);
    return response.data;
  } catch (error) {
    console.error(`Error stopping server ${serverId}:`, error);
    return {
      success: false,
      message: "SERVER_STOP_ERROR",
    };
  }
};

// ==================== PLAYER MANAGEMENT ====================

export interface OnlinePlayersResponse {
  online: number;
  max: number;
  players: string[];
}

export interface WhitelistPlayer {
  uuid: string;
  name: string;
}

export interface OpPlayer {
  uuid: string;
  name: string;
  level: number;
  bypassesPlayerLimit: boolean;
}

export interface BannedPlayer {
  uuid: string;
  name: string;
  created: string;
  source: string;
  reason: string;
}

export const getOnlinePlayers = async (serverId: string, rconPort: string, rconPassword?: string): Promise<OnlinePlayersResponse> => {
  const response = await api.post(`/servers/${serverId}/players/online`, { rconPort, rconPassword });
  return response.data;
};

export const getWhitelist = async (serverId: string): Promise<WhitelistPlayer[]> => {
  const response = await api.get(`/servers/${serverId}/players/whitelist`);
  return response.data;
};

export const getOps = async (serverId: string): Promise<OpPlayer[]> => {
  const response = await api.get(`/servers/${serverId}/players/ops`);
  return response.data;
};

export const getBannedPlayers = async (serverId: string): Promise<BannedPlayer[]> => {
  const response = await api.get(`/servers/${serverId}/players/banned`);
  return response.data;
};
