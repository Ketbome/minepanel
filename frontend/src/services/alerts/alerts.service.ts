import api from "../axios.service";

export interface AlertConfig {
  id?: number;
  serverId: string;
  downAlertEnabled: boolean;
  resourceAlertEnabled: boolean;
  cpuThresholdPercent: number;
  memoryThresholdPercent: number;
  sustainedMinutes: number;
  cooldownMinutes: number;
}

export type AlertConfigInput = Partial<Omit<AlertConfig, "id" | "serverId">>;

export const getAlertConfig = async (serverId: string): Promise<AlertConfig> => {
  const response = await api.get(`/alerts/${serverId}`);
  return response.data;
};

export const updateAlertConfig = async (serverId: string, input: AlertConfigInput): Promise<AlertConfig> => {
  const response = await api.put(`/alerts/${serverId}`, input);
  return response.data;
};
