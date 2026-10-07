import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FavoritesState {
  ids: string[];
  toggle: (id: string) => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (id) => set((state) => ({ ids: state.ids.includes(id) ? state.ids.filter((x) => x !== id) : [...state.ids, id] })),
    }),
    { name: "minepanel-favorites" }
  )
);

// Favorites first; everything else keeps its order.
export const favoritesFirst = <T extends { id: string }>(items: T[], favorites: string[]): T[] => [...items.filter((i) => favorites.includes(i.id)), ...items.filter((i) => !favorites.includes(i.id))];
