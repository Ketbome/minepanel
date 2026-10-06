import { useCallback, useEffect, useState } from "react";

export interface LogPreset {
  name: string;
  searchTerm: string;
  levelFilter: string;
}

const KEY = "minepanel:log-presets";

const read = (): LogPreset[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// ponytail: per browser, shared by every server. Move to the API if presets must follow the user across devices.
export function useLogPresets() {
  const [presets, setPresets] = useState<LogPreset[]>([]);

  // After mount, so the prerendered markup matches.
  useEffect(() => setPresets(read()), []);

  const persist = useCallback((next: LogPreset[]) => {
    setPresets(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Storage blocked: presets last for this session only.
    }
  }, []);

  const save = useCallback((preset: LogPreset) => persist([...presets.filter((p) => p.name !== preset.name), preset]), [presets, persist]);
  const remove = useCallback((name: string) => persist(presets.filter((p) => p.name !== name)), [presets, persist]);

  return { presets, save, remove };
}
