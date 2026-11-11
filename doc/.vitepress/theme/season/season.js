import { ref } from 'vue';

// by the reader's own clock
const DATES = {
  // October 24 to November 1
  halloween: (month, day) => (month === 9 && day >= 24) || (month === 10 && day === 1),
  // December 1 to January 6
  christmas: (month, day) => month === 11 || (month === 0 && day <= 6),
};

export const season = ref(null);
export const enabled = ref(false);

export function initSeason() {
  // ?halloween=1 or ?christmas=1 shows that season any day (previews, next year's checks);
  // =0 hides the current one
  const params = new URLSearchParams(window.location.search);
  const now = new Date();
  const forced = Object.keys(DATES).find((s) => params.get(s) === '1');
  const today = Object.keys(DATES).find((s) => DATES[s](now.getMonth(), now.getDate()));
  season.value = forced ?? (today && params.get(today) !== '0' ? today : null);
  let off = false;
  try {
    off = !!season.value && localStorage.getItem(`minepanel-${season.value}`) === 'off';
  } catch {}
  enabled.value = !!season.value && (!!forced || !off);
}

export function toggleSeason() {
  enabled.value = !enabled.value;
  try {
    localStorage.setItem(`minepanel-${season.value}`, enabled.value ? 'on' : 'off');
  } catch {}
}
