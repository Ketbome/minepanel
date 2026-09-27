const EGG_KEY = 'minepanel:end-egg';
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
