import api from "../axios.service";

export interface MetricPoint {
  cpuPercent: number;
  memoryMb: number;
  memoryLimitMb: number | null;
  timestamp: string;
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
