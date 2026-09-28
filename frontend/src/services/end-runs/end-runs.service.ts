import api from '../axios.service';

export type RunMode = 'speedrun' | 'hardcore';

export interface LeaderboardRow {
  username: string;
  timeMs: number;
  finishedAt: string;
}

export interface Leaderboard {
  top: LeaderboardRow[];
  mine: { timeMs: number; rank: number } | null;
}

export async function submitRun(mode: RunMode, timeMs: number, splits: Record<string, number>) {
  const response = await api.post('/end-runs', { mode, timeMs, splits });
  return response.data;
}

export async function getLeaderboard(mode: RunMode): Promise<Leaderboard> {
  const response = await api.get<Leaderboard>('/end-runs/leaderboard', { params: { mode } });
  return response.data;
}
