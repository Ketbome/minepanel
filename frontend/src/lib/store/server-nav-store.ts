import { create } from "zustand";
import type { LucideIcon } from "lucide-react";
import type { TabSearchItem } from "@/components/organisms/TabSearch";

export type ServerNavGroup = "config" | "operation" | "monitoring";

export interface ServerNavItem {
  value: string;
  label: string;
  icon: LucideIcon;
  group: ServerNavGroup;
  disabled: boolean;
}

interface ServerNavState {
  serverId: string | null;
  serverName: string;
  items: ServerNavItem[];
  paletteItems: TabSearchItem[];
  active: string;
  setNav: (nav: { serverId: string; serverName: string; items: ServerNavItem[]; paletteItems: TabSearchItem[] }) => void;
  setActive: (active: string) => void;
  clear: () => void;
}

export const useServerNavStore = create<ServerNavState>((set) => ({
  serverId: null,
  serverName: "",
  items: [],
  paletteItems: [],
  active: "",

  setNav: ({ serverId, serverName, items, paletteItems }) => set({ serverId, serverName, items, paletteItems }),

  setActive: (active) => set({ active }),

  clear: () => set({ serverId: null, serverName: "", items: [], paletteItems: [], active: "" }),
}));
