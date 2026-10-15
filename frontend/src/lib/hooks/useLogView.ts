import { useEffect, useState } from 'react';
import { useLogViewStore } from '@/lib/store/log-view-store';

/**
 * The stored log view options, reported as the defaults until mounted so the first client
 * render matches the server-rendered HTML (same reason as useConfigMode).
 */
export const useLogView = () => {
  const { compact, groupRepeats, hidePanelNoise, set } = useLogViewStore();
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  return ready ? { compact, groupRepeats, hidePanelNoise, setView: set } : { compact: true, groupRepeats: true, hidePanelNoise: true, setView: set };
};
