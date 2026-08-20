import { useEffect, useState } from 'react';
import { useConfigModeStore, type ConfigMode } from '@/lib/store/config-mode-store';

/**
 * The stored mode, but only after mount.
 *
 * The store rehydrates from localStorage as soon as it is imported on the
 * client, so a saved 'advanced' would make the first client render disagree
 * with the server-rendered HTML. Reporting the default until mounted keeps the
 * two in step and then switches.
 */
export const useConfigMode = (): {
  mode: ConfigMode;
  setMode: (mode: ConfigMode) => void;
  ready: boolean;
} => {
  const mode = useConfigModeStore((state) => state.mode);
  const setMode = useConfigModeStore((state) => state.setMode);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  return { mode: ready ? mode : 'simple', setMode, ready };
};
