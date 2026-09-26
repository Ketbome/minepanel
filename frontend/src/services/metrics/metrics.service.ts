import api from "../axios.service";

export interface MetricPoint {
  cpuPercent: number;
  memoryMb: number;
  memoryLimitMb: number | null;
  tps: number | null;
  tickSource: 'neoforge' | 'spark' | null;
  msptMean: number | null;
  msptMedian: number | null;
  msptP95: number | null;
  playersOnline: number | null;
  timestamp: string;
}

export type TickStatus = "available" | "offline" | "unsupported" | "rcon_disabled" | "spark_missing" | "unavailable";

export interface MonitoringSnapshot {
  timestamp: string;
  status: "running" | "stopped" | "starting" | "not_found";
  cpuPercent: number | null;
  memoryMb: number | null;
  memoryLimitMb: number | null;
  playersOnline: number | null;
  playersMax: number | null;
  uptimeSeconds: number | null;
  tickStatus: TickStatus;
  tickSource: 'neoforge' | 'spark' | null;
  tps: number | null;
  msptMean: number | null;
  msptMedian: number | null;
  msptP95: number | null;
}

export async function getServerMonitoring(serverId: string): Promise<MonitoringSnapshot> {
  const response = await api.get(`/metrics/${serverId}/live`);
  return response.data;
}

export interface MetricHistory {
  serverId: string;
  hours: number;
  points: MetricPoint[];
}

export const getServerMetrics = async (serverId: string, hours = 24): Promise<MetricHistory> => {
  try {
    const response = await api.get(`/metrics/${serverId}/history`, { params: { hours } });
    return response.data;
  } catch (error) {
    console.error("Error fetching server metrics:", error);
    throw error;
  }
};
