import { useEffect, useState } from "react";
import { getServerRuntimeStats, ServerRuntimeStats } from "@/services/docker/fetchs";

const POLL_INTERVAL_MS = 10000;

export function useServerRuntimeStats(serverId: string, serverStatus: string) {
  const [stats, setStats] = useState<ServerRuntimeStats | null>(null);

  useEffect(() => {
    if (serverStatus !== "running") {
      setStats(null);
      return;
    }

    let active = true;

    const loadStats = async () => {
      try {
        const nextStats = await getServerRuntimeStats(serverId);
        if (active) setStats(nextStats);
      } catch (error) {
        console.error(`Error fetching runtime stats for ${serverId}:`, error);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [serverId, serverStatus]);

  return stats;
}
