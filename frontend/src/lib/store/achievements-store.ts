import { create } from "zustand";
import { getAchievements, unlockAchievement, type Achievement } from "@/services/achievements/achievements.service";

interface AchievementsState {
  earned: Achievement[] | null;
  load: () => Promise<void>;
  unlock: (key: string) => void;
}

export const useAchievementsStore = create<AchievementsState>((set, get) => ({
  earned: null,

  load: async () => {
    if (get().earned) return;
    try {
      set({ earned: await getAchievements() });
    } catch (error) {
      console.error("Error loading achievements:", error);
    }
  },

  // shown right away; the server keeps the first date if the key was already earned
  unlock: (key) => {
    const earned = get().earned ?? [];
    if (earned.some((item) => item.key === key)) return;
    set({ earned: [...earned, { key, unlockedAt: new Date().toISOString() }] });
    unlockAchievement(key).catch((error) => console.error("Error saving achievement:", error));
  },
}));
