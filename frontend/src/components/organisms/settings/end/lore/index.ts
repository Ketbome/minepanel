import { create } from 'zustand';
import type { Language } from '@/lib/translations';
import { daysSince, useEndGame, type Ghost } from '../store';
import type { LoreKey } from './en';

// The story ships in its own per-language chunk, fetched when the button is pressed,
// so none of it weighs on the rest of the panel.

type Dictionary = Record<LoreKey, string>;

const LOADERS: Record<Language, () => Promise<{ default: Dictionary }>> = {
  en: () => import('./en'),
  es: () => import('./es'),
  nl: () => import('./nl'),
  de: () => import('./de'),
  fr: () => import('./fr'),
  pl: () => import('./pl'),
  ru: () => import('./ru'),
  pt: () => import('./pt'),
  tr: () => import('./tr'),
};

export const useLoreDictionary = create<{ language: Language | null; dict: Dictionary | null }>(() => ({ language: null, dict: null }));

export async function loadLore(language: Language) {
  if (useLoreDictionary.getState().language === language) return;
  const { default: dict } = await LOADERS[language]();
  useLoreDictionary.setState({ language, dict });
}

export function fillLore(text: string, player: string, ghost: Ghost) {
  const values: Record<string, string> = { player, ghost: ghost.name, days: String(daysSince(ghost.at)) };
  return text.replace(/\{(player|ghost|days)\}/g, (_, name: string) => values[name]);
}

// the same lookup outside React, for canvases and sprites painted once
export function loreText(key: LoreKey) {
  const dict = useLoreDictionary.getState().dict;
  const { player, ghost } = useEndGame.getState();
  return dict ? fillLore(dict[key], player, ghost) : '';
}

export function useLore() {
  const dict = useLoreDictionary((state) => state.dict);
  const player = useEndGame((state) => state.player);
  const ghost = useEndGame((state) => state.ghost);
  return (key: LoreKey) => (dict ? fillLore(dict[key], player, ghost) : '');
}

export function lastSeenKey(ghost: Ghost): LoreKey {
  return daysSince(ghost.at) === 0 ? 'lastSeenToday' : 'lastSeen';
}

export type { LoreKey };
