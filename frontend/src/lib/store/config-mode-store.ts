import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ConfigMode = 'simple' | 'advanced';

interface ConfigModeState {
  mode: ConfigMode;
  setMode: (mode: ConfigMode) => void;
}

/**
 * How much of a server's configuration to show. This is a preference of the
 * person using the panel, not of the server, so it is stored once and applies
 * to every server they open.
 */
export const useConfigModeStore = create<ConfigModeState>()(
  persist(
    (set) => ({
      mode: 'simple',
      setMode: (mode) => set({ mode }),
    }),
    { name: 'minepanel-config-mode' },
  ),
);
