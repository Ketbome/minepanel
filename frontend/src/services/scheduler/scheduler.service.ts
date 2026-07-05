import api from "../axios.service";

export type ScheduledTaskType = "restart" | "command";
export type ScheduleKind = "interval" | "cron";

export interface ScheduledTask {
  id: number;
  serverId: string;
  name: string;
  type: ScheduledTaskType;
  command: string | null;
  scheduleKind: ScheduleKind;
  intervalMinutes: number | null;
  cronExpression: string | null;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string;
  lastResult: string | null;
  createdAt: string;
}

export interface ScheduledTaskInput {
  name: string;
  type: ScheduledTaskType;
  command?: string;
  scheduleKind?: ScheduleKind;
  intervalMinutes?: number;
  cronExpression?: string;
  enabled?: boolean;
}

export const getScheduledTasks = async (serverId: string): Promise<ScheduledTask[]> => {
  const response = await api.get(`/scheduled-tasks/${serverId}`);
  return response.data;
};

export const createScheduledTask = async (serverId: string, input: ScheduledTaskInput): Promise<ScheduledTask> => {
  const response = await api.post(`/scheduled-tasks/${serverId}`, input);
  return response.data;
};

export const updateScheduledTask = async (serverId: string, taskId: number, input: Partial<ScheduledTaskInput>): Promise<ScheduledTask> => {
  const response = await api.put(`/scheduled-tasks/${serverId}/${taskId}`, input);
  return response.data;
};

export const deleteScheduledTask = async (serverId: string, taskId: number): Promise<void> => {
  await api.delete(`/scheduled-tasks/${serverId}/${taskId}`);
};

export const runScheduledTask = async (serverId: string, taskId: number): Promise<ScheduledTask> => {
  const response = await api.post(`/scheduled-tasks/${serverId}/${taskId}/run`);
  return response.data;
};
