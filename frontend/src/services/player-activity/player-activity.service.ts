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
  sessions: {
    id: number;
    joinedAt: string;
    lastSeenAt: string;
    leftAt: string | null;
    endReason: "left" | "interrupted" | null;
    durationSeconds: number;
  }[];
}

export async function getPlayerActivity(serverId: string, page: number, signal: AbortSignal): Promise<PlayerActivity> {
  return (await api.get(`/servers/${encodeURIComponent(serverId)}/player-activity`, { params: { page }, signal })).data;
}

export async function getPlayerDetail(serverId: string, key: string, page: number, signal: AbortSignal): Promise<PlayerDetail> {
  return (await api.get(`/servers/${encodeURIComponent(serverId)}/player-activity/${encodeURIComponent(key)}`, { params: { page }, signal })).data;
}
