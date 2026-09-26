import api from "../axios.service";

export interface PlayerProfile {
  key: string;
  name: string;
  firstSeen: string;
  lastSeen: string;
  sessionCount: number;
  totalSeconds: number;
  online: boolean | null;
}

export interface PlayerActivity {
  status: "collecting" | "offline" | "unavailable";
  sampledAt: string | null;
  page: number;
  hasMore: boolean;
  players: PlayerProfile[];
}

export interface PlayerDetail extends Omit<PlayerActivity, "players"> {
  profile: PlayerProfile;
  stats: {
    uuid: string;
    world: string;
    savedAt: string;
    playSeconds: number | null;
    deaths: number | null;
    mobKills: number | null;
    playerKills: number | null;
    blocksMined: number | null;
  } | null;
  summary: {
    averageSeconds: number;
    longestSeconds: number;
    deaths: number | null;
    playSecondsByWeekday: number[];
    streakDays: number;
  };
  // Stat deltas and event counts are null unless the activity log was on for that session
  sessions: {
    id: number;
    joinedAt: string;
    lastSeenAt: string;
    leftAt: string | null;
    endReason: "left" | "interrupted" | null;
    durationSeconds: number;
    deaths: number | null;
    mobKills: number | null;
    playerKills: number | null;
    blocksMined: number | null;
    distanceCm: number | null;
    events: { chat: number; advancements: number; deaths: number } | null;
  }[];
}

export async function getPlayerActivity(serverId: string, page: number, signal: AbortSignal): Promise<PlayerActivity> {
  return (await api.get(`/servers/${encodeURIComponent(serverId)}/player-activity`, { params: { page }, signal })).data;
}

export async function getPlayerDetail(serverId: string, key: string, page: number, signal: AbortSignal): Promise<PlayerDetail> {
  return (await api.get(`/servers/${encodeURIComponent(serverId)}/player-activity/${encodeURIComponent(key)}`, { params: { page }, signal })).data;
}
