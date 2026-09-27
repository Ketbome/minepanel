import type { Ghost } from './types';

const EGG_KEY = 'minepanel:end-egg';
const GHOST_KEY = 'minepanel:end-ghost';
const DAY_MS = 86_400_000;

export const FIRST_GHOST: Ghost = { name: 'Ketbome', at: Date.UTC(2019, 5, 14) };

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

// whoever last stayed behind in the outer End signs the next run's note and diary
export function loadGhost(): Ghost {
  try {
    const saved = JSON.parse(localStorage.getItem(GHOST_KEY) ?? 'null') as Partial<Ghost> | null;
    return typeof saved?.name === 'string' && saved.name && typeof saved.at === 'number' ? { name: saved.name, at: saved.at } : FIRST_GHOST;
  } catch {
    return FIRST_GHOST;
  }
}

export function saveGhost(name: string) {
  try {
    localStorage.setItem(GHOST_KEY, JSON.stringify({ name, at: Date.now() }));
  } catch {
    // private mode: the loop resets with the tab
  }
}
