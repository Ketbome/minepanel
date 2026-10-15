import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LogViewState {
  compact: boolean;
  groupRepeats: boolean;
  hidePanelNoise: boolean;
  set: (changes: Partial<Pick<LogViewState, 'compact' | 'groupRepeats' | 'hidePanelNoise'>>) => void;
}

/**
 * How the person reading logs likes them shown. A viewer preference, so it is
 * stored once in the browser and applies to every server.
 */
export const useLogViewStore = create<LogViewState>()(
  persist(
    (set) => ({
      compact: true,
      groupRepeats: true,
      hidePanelNoise: true,
      set: (changes) => set(changes),
    }),
    { name: 'minepanel-log-view' },
  ),
);
