import { create } from 'zustand';
import { getPublicEnv } from '@/lib/public-env';

export type Season = 'halloween' | 'christmas';

// by the viewer's own clock: the server's timezone is not theirs
const DATES: Record<Season, (month: number, day: number) => boolean> = {
  // October 24 to November 1
  halloween: (month, day) => (month === 9 && day >= 24) || (month === 10 && day === 1),
  // December 1 to January 6
  christmas: (month, day) => month === 11 || (month === 0 && day <= 6),
};

const SEASONS = Object.keys(DATES) as Season[];

export const seasonOf = (now: Date) => SEASONS.find((s) => DATES[s](now.getMonth(), now.getDate())) ?? null;

interface SeasonState {
  season: Season | null;
  enabled: boolean;
  init: () => void;
  toggle: () => void;
}

export const useSeasonStore = create<SeasonState>()((set, get) => ({
  season: null,
  enabled: false,

  init: () => {
    if (getPublicEnv('NEXT_PUBLIC_SEASONAL_THEME') === 'false') return;
    // ?halloween=1 or ?christmas=1 shows that season any day (previews, next year's checks);
    // =0 hides the current one
    const params = new URLSearchParams(window.location.search);
    const forced = SEASONS.find((s) => params.get(s) === '1');
    const today = seasonOf(new Date());
    const season = forced ?? (today && params.get(today) !== '0' ? today : null);
    let off = false;
    try {
      off = !!season && localStorage.getItem(`minepanel-${season}`) === 'off';
    } catch {}
    set({ season, enabled: !!season && (!!forced || !off) });
  },

  toggle: () => {
    const { season, enabled } = get();
    try {
      localStorage.setItem(`minepanel-${season}`, enabled ? 'off' : 'on');
    } catch {}
    set({ enabled: !enabled });
  },
}));
