import api from "../axios.service";

export interface PlayerStatsSummary {
  playTimeTicks: number;
  deaths: number;
  mobKills: number;
  playerKills: number;
  distanceCm: number;
  blocksMined: number;
}

export interface PlayerSummary {
  uuid: string;
  name: string | null;
  whitelisted: boolean;
  op: boolean;
  opLevel: number | null;
  banned: boolean;
  lastSeen: string | null;
  stats: PlayerStatsSummary;
  advancements: number;
}

export interface PlayerItem {
  slot: number;
  id: string;
  count: number;
  name?: string;
  contents?: PlayerItem[];
}

export interface PlayerInventoryData {
  inventory: PlayerItem[];
  armor: PlayerItem[];
  offhand: PlayerItem | null;
  enderChest: PlayerItem[];
}

export interface ItemMatch {
  uuid: string;
  name: string | null;
  where: "inventory" | "enderChest" | "container";
  containerId?: string;
  slot: number;
  id: string;
  itemName?: string;
  count: number;
  savedAt: string | null;
}

export interface PlayerLocation {
  dimension: string;
  x: number;
  y: number;
  z: number;
}

export interface PlayerAdvancement {
  id: string;
  done: boolean;
  doneAt: string | null;
}

export interface PlayerProfile extends PlayerSummary {
  statsByCategory: Record<string, Record<string, number>>;
  advancementList: PlayerAdvancement[];
  inventory: PlayerItem[];
  armor: PlayerItem[];
  offhand: PlayerItem | null;
  enderChest: PlayerItem[];
  position: PlayerLocation | null;
  spawn: PlayerLocation | null;
}

export const getPlayers = async (serverId: string): Promise<PlayerSummary[]> => {
  const response = await api.get(`/players/${serverId}`);
  return response.data;
};

export const searchItems = async (serverId: string, q: string): Promise<ItemMatch[]> => {
  const response = await api.get(`/players/${serverId}/items/search`, { params: { q } });
  return response.data;
};

export const getPlayerProfile = async (serverId: string, uuid: string): Promise<PlayerProfile> => {
  const response = await api.get(`/players/${serverId}/${uuid}`);
  return response.data;
};
