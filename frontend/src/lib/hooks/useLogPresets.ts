import { useCallback, useEffect, useRef, useState } from "react";
import { deleteLogPreset, listLogPresets, LogPreset, saveLogPreset } from "@/services/log-presets.service";

export type { LogPreset };

// Per user and per server, stored by the API so presets follow the user across devices.
export function useLogPresets(serverId: string) {
  const [presets, setPresets] = useState<LogPreset[]>([]);
  // A request that outlives a server switch must not write into the new server's list.
  const currentServer = useRef(serverId);
  currentServer.current = serverId;

  useEffect(() => {
    let active = true;
    listLogPresets(serverId).then((list) => { if (active) setPresets(list); }).catch(() => { if (active) setPresets([]); });
    return () => { active = false; };
  }, [serverId]);

  const save = useCallback(async (preset: LogPreset) => {
    const saved = await saveLogPreset(serverId, preset);
    if (currentServer.current !== serverId) return;
    setPresets((current) => [...current.filter((p) => p.name !== saved.name), saved].sort((a, b) => a.name.localeCompare(b.name)));
  }, [serverId]);

  const remove = useCallback(async (name: string) => {
    await deleteLogPreset(serverId, name);
    if (currentServer.current !== serverId) return;
    setPresets((current) => current.filter((p) => p.name !== name));
  }, [serverId]);

  return { presets, save, remove };
}
