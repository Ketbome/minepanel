import { ref } from 'vue';

const KEY = 'minepanel-halloween';

export const inSeason = ref(false);
export const enabled = ref(false);

// October 24 to November 1, by the reader's own clock
const isHalloween = (now) => (now.getMonth() === 9 && now.getDate() >= 24) || (now.getMonth() === 10 && now.getDate() === 1);

export function initSeason() {
  // ?halloween=1 shows it any day (previews, next year's checks); ?halloween=0 hides it
  const forced = new URLSearchParams(window.location.search).get('halloween');
  inSeason.value = forced === '1' || (forced !== '0' && isHalloween(new Date()));
  let off = false;
  try {
    off = localStorage.getItem(KEY) === 'off';
  } catch {}
  enabled.value = inSeason.value && (forced === '1' || !off);
}

export function toggleSeason() {
  enabled.value = !enabled.value;
  try {
    localStorage.setItem(KEY, enabled.value ? 'on' : 'off');
  } catch {}
}
