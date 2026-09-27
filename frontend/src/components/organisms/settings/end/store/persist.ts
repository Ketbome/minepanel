const EGG_KEY = 'minepanel:end-egg';
const DEATHS_KEY = 'minepanel:end-deaths';
const DAY_MS = 86_400_000;

export function daysSince(at: number) {
  return Math.max(0, Math.floor((Date.now() - at) / DAY_MS));
}

export function hasDragonEgg() {
  try {
    return localStorage.getItem(EGG_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveDragonEgg() {
  try {
    localStorage.setItem(EGG_KEY, '1');
  } catch {
    // private mode: the trophy just does not persist
  }
}

// every death in every run, for the guests page of Bfuuny's register
export function storedDeaths() {
  try {
    return Number(localStorage.getItem(DEATHS_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function countDeath() {
  try {
    localStorage.setItem(DEATHS_KEY, String(storedDeaths() + 1));
  } catch {
    // private mode: the count starts over
  }
}

// the game's dated touches: carved pumpkins on mobs around Halloween, gift chests at Christmas
export function season(now = new Date()): 'halloween' | 'christmas' | null {
  const month = now.getMonth();
  const day = now.getDate();
  if ((month === 9 && day >= 25) || (month === 10 && day === 1)) return 'halloween';
  if (month === 11 && day >= 24 && day <= 26) return 'christmas';
  return null;
}
