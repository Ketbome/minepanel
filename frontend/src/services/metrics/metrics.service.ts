import api from "../axios.service";

export type TickSource = 'neoforge' | 'spark' | 'tabtps' | 'custom';

export interface MetricPoint {
  cpuPercent: number;
  memoryMb: number;
  memoryLimitMb: number | null;
  tps: number | null;
  tickSource: TickSource | null;
  msptMean: number | null;
  msptMedian: number | null;
  msptP95: number | null;
  playersOnline: number | null;
  timestamp: string;
}

export type TickStatus = "available" | "offline" | "unsupported" | "rcon_disabled" | "spark_missing" | "custom_paused" | "unavailable";

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
  tickSource: TickSource | null;
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

export interface TickTestResult {
  success: boolean;
  output: string;
  parsed: { source: TickSource; tps: number; msptMean: number | null } | null;
}

export async function testTickCommand(
  serverId: string,
  body: { tickCommand: string; tickTpsPattern?: string; tickMsptPattern?: string },
): Promise<TickTestResult> {
  const response = await api.post(`/metrics/${serverId}/tick-test`, body);
  return response.data;
}
