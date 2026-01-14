import { create } from "zustand";
import { fetchServerList, getAllServersStatus } from "@/services/docker/fetchs";

export type ServerStatus = "running" | "stopped" | "starting" | "not_found" | "loading";

export interface ServerInfo {
  id: string;
  serverName?: string;
  status: ServerStatus;
  port?: string;
}

interface ServersStore {
  servers: ServerInfo[];
  isLoading: boolean;
  lastUpdate: number;

  fetchServers: () => Promise<void>;
  updateStatuses: () => Promise<void>;
  refreshAll: () => Promise<void>;
  setServerStatus: (serverId: string, status: ServerStatus) => void;
  addServer: (server: Omit<ServerInfo, "status">) => void;
  removeServer: (serverId: string) => void;
}

export const useServersStore = create<ServersStore>((set, get) => ({
  servers: [],
  isLoading: false,
  lastUpdate: 0,

  fetchServers: async () => {
    set({ isLoading: true });
    try {
      const serverList = await fetchServerList();
      const servers: ServerInfo[] = serverList.map((server) => ({
        id: server.id,
        serverName: server.serverName,
        port: server.port,
        status: "loading" as const,
      }));
      set({ servers, lastUpdate: Date.now() });

      await get().updateStatuses();
    } catch (error) {
      console.error("Error fetching servers:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateStatuses: async () => {
    try {
      const statusData = await getAllServersStatus();
      set((state) => ({
        servers: state.servers.map((server) => ({
          ...server,
          status: statusData[server.id] || "not_found",
        })),
        lastUpdate: Date.now(),
      }));
    } catch (error) {
      console.error("Error updating server statuses:", error);
    }
  },

  refreshAll: async () => {
    await get().fetchServers();
  },

  setServerStatus: (serverId, status) => {
    set((state) => ({
      servers: state.servers.map((server) => (server.id === serverId ? { ...server, status } : server)),
    }));
  },

  addServer: (server) => {
    set((state) => ({
      servers: [...state.servers, { ...server, status: "stopped" }],
    }));
  },

  removeServer: (serverId) => {
    set((state) => ({
      servers: state.servers.filter((s) => s.id !== serverId),
    }));
  },
}));
