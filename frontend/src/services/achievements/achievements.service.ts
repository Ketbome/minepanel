import api from '../axios.service';

export interface Achievement {
  key: string;
  unlockedAt: string;
}

export async function getAchievements(): Promise<Achievement[]> {
  const response = await api.get<Achievement[]>('/achievements');
  return response.data;
}

export async function unlockAchievement(key: string): Promise<Achievement> {
  const response = await api.post<Achievement>('/achievements', { key });
  return response.data;
}
