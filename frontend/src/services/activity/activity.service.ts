import api from "../axios.service";
import type { PlayerInventoryData } from "../players/players.service";

export type ActivityType = "join" | "leave" | "chat" | "death" | "advancement" | "command";

export interface ActivitySettings {
  enabled: boolean;
  historyImported: boolean;
}

export interface ActivityEvent {
  id: number;
  type: ActivityType;
  name: string;
  uuid: string | null;
  message: string;
  createdAt: string;
}

export interface ActivityEventsQuery {
  types?: ActivityType[];
  name?: string;
  q?: string;
  before?: number;
  limit?: number;
}

export const getActivitySettings = async (serverId: string): Promise<ActivitySettings> => {
  const response = await api.get(`/activity/${serverId}/settings`);
  return response.data;
};

export const updateActivitySettings = async (serverId: string, enabled: boolean): Promise<ActivitySettings> => {
  const response = await api.put(`/activity/${serverId}/settings`, { enabled });
  return response.data;
};

export const importActivityHistory = async (serverId: string): Promise<{ imported: number; files: number }> => {
  const response = await api.post(`/activity/${serverId}/import-history`);
  return response.data;
};

export const getActivityEvents = async (serverId: string, query: ActivityEventsQuery): Promise<{ events: ActivityEvent[]; nextCursor: number | null }> => {
  const { types, ...rest } = query;
  const response = await api.get(`/activity/${serverId}/events`, { params: { ...rest, types: types?.length ? types.join(",") : undefined } });
  return response.data;
};

export interface SnapshotListItem {
  id: number;
  reason: "join" | "leave" | "autosave";
  createdAt: string;
  items: number;
  deathMessage: string | null;
}

export interface InventorySnapshot {
  id: number;
  reason: SnapshotListItem["reason"];
  createdAt: string;
  data: PlayerInventoryData;
}

export const getInventorySnapshots = async (serverId: string, uuid: string): Promise<SnapshotListItem[]> => {
  const response = await api.get(`/activity/${serverId}/players/${uuid}/snapshots`);
  return response.data;
};

export const getInventorySnapshot = async (serverId: string, id: number): Promise<InventorySnapshot> => {
  const response = await api.get(`/activity/${serverId}/snapshots/${id}`);
  return response.data;
};
