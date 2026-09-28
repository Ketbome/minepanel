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
  // Field the command palette asked for; the server view scrolls to it and clears it.
  field: string | null;
  setNav: (nav: { serverId: string; serverName: string; items: ServerNavItem[]; paletteItems: TabSearchItem[] }) => void;
  setActive: (active: string) => void;
  setField: (field: string | null) => void;
  clear: () => void;
}

export const useServerNavStore = create<ServerNavState>((set) => ({
  serverId: null,
  serverName: "",
  items: [],
  paletteItems: [],
  active: "",
  field: null,

  setNav: ({ serverId, serverName, items, paletteItems }) => set({ serverId, serverName, items, paletteItems }),

  setActive: (active) => set({ active }),

  setField: (field) => set({ field }),

  clear: () => set({ serverId: null, serverName: "", items: [], paletteItems: [], active: "", field: null }),
}));
