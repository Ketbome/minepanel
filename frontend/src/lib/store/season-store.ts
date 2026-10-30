import { create } from 'zustand';
import { getPublicEnv } from '@/lib/public-env';

const KEY = 'minepanel-halloween';

// October 24 to November 1, by the viewer's own clock: the server's timezone is not theirs
export const isHalloween = (now: Date) =>
  (now.getMonth() === 9 && now.getDate() >= 24) || (now.getMonth() === 10 && now.getDate() === 1);

interface SeasonState {
  inSeason: boolean;
  enabled: boolean;
  init: () => void;
  toggle: () => void;
}

export const useSeasonStore = create<SeasonState>()((set, get) => ({
  inSeason: false,
  enabled: false,

  init: () => {
    if (getPublicEnv('NEXT_PUBLIC_SEASONAL_THEME') === 'false') return;
    // ?halloween=1 shows it any day (previews, next year's checks); ?halloween=0 hides it
    const forced = new URLSearchParams(window.location.search).get('halloween');
    const inSeason = forced === '1' || (forced !== '0' && isHalloween(new Date()));
    let off = false;
    try {
      off = localStorage.getItem(KEY) === 'off';
    } catch {}
    set({ inSeason, enabled: inSeason && (forced === '1' || !off) });
  },

  toggle: () => {
    const enabled = !get().enabled;
    try {
      localStorage.setItem(KEY, enabled ? 'on' : 'off');
    } catch {}
    set({ enabled });
  },
}));
