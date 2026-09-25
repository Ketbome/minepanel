import api from "../axios.service";

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

export interface PlayerSession {
  id: number;
  name: string;
  uuid: string | null;
  startAt: string;
  endAt: string | null;
  deaths: number | null;
  mobKills: number | null;
  playerKills: number | null;
  blocksMined: number | null;
  distanceCm: number | null;
  loggedDeaths: number;
  advancements: number;
  chatCount: number;
}

export interface SessionSummary {
  sessions: number;
  totalMs: number;
  averageMs: number;
  longestMs: number;
  deaths: number;
  playMsByWeekday: number[];
  streakDays: number;
}

export interface PlayerRef {
  uuid?: string;
  name?: string;
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

export const getPlayerSessions = async (serverId: string, player: PlayerRef): Promise<PlayerSession[]> => {
  const response = await api.get(`/activity/${serverId}/sessions`, { params: player });
  return response.data;
};

export const getSessionSummary = async (serverId: string, player: PlayerRef): Promise<SessionSummary> => {
  const response = await api.get(`/activity/${serverId}/sessions/summary`, { params: player });
  return response.data;
};
