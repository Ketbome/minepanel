import { create } from 'zustand';
import type { TranslationKey } from '@/lib/translations';

export type Act = 'stronghold' | 'end' | 'poem';
export type Stage = 'arrival' | 'crystals' | 'dragon' | 'victory' | 'exit';
export type AdvancementKind = 'task' | 'goal';
export type AdvancementIcon = 'eye' | 'pearl' | 'dragon' | 'egg';

// the black intro card ("you were told not to press it") covers this much of the stronghold act
export const INTRO_S = 2.6;
export const EYE_COUNT = 12;
export const CRYSTAL_COUNT = 10;
export const DRAGON_MAX_HP = 200;
export const EGG_HOPS = 2;

const EGG_KEY = 'minepanel:end-egg';

export interface Caption {
  readonly id: number;
  readonly key: TranslationKey;
  readonly at: number;
}

export interface Advancement {
  readonly id: number;
  readonly kind: AdvancementKind;
  readonly title: TranslationKey;
  readonly icon: AdvancementIcon;
}

export interface Notice {
  readonly id: number;
  readonly key: TranslationKey;
  readonly subtitle?: TranslationKey;
}

interface EndGameState {
  act: Act;
  stage: Stage;
  player: string;
  muted: boolean;
  eyes: number;
  crystals: boolean[];
  dragonHp: number;
  eggHops: number;
  eggCaught: boolean;
  portalOpen: boolean;
  xp: number;
  captions: Caption[];
  toasts: Advancement[];
  chat: Advancement[];
  actionBar: Notice | null;
  title: Notice | null;
  reset: (player: string, muted: boolean) => void;
  setAct: (act: Act) => void;
  setStage: (stage: Stage) => void;
  setPlayer: (player: string) => void;
  placeEye: () => void;
  destroyCrystal: (index: number) => void;
  damageDragon: (amount: number) => void;
  healDragon: () => void;
  openPortal: () => void;
  hopEgg: () => void;
  catchEgg: () => void;
  setXp: (xp: number) => void;
  caption: (key: TranslationKey) => void;
  dropCaption: (id: number) => void;
  advance: (kind: AdvancementKind, title: TranslationKey, icon: AdvancementIcon) => void;
  dropToast: (id: number) => void;
  dropChat: (id: number) => void;
  showActionBar: (key: TranslationKey) => void;
  showTitle: (key: TranslationKey, subtitle?: TranslationKey) => void;
  clearNotice: (slot: 'actionBar' | 'title', id: number) => void;
}

let lastId = 0;
const nextId = () => ++lastId;

const initial = {
  act: 'stronghold' as Act,
  stage: 'arrival' as Stage,
  eyes: 0,
  crystals: Array.from({ length: CRYSTAL_COUNT }, () => true),
  dragonHp: DRAGON_MAX_HP,
  eggHops: 0,
  eggCaught: false,
  portalOpen: false,
  xp: 0,
  captions: [],
  toasts: [],
  chat: [],
  actionBar: null,
  title: null,
};

export const useEndGame = create<EndGameState>((set) => ({
  ...initial,
  player: '',
  muted: false,

  reset: (player, muted) => set({ ...initial, player, muted }),
  setAct: (act) => set({ act }),
  setStage: (stage) => set({ stage }),
  setPlayer: (player) => set({ player }),
  placeEye: () => set((state) => ({ eyes: Math.min(EYE_COUNT, state.eyes + 1) })),

  destroyCrystal: (index) =>
    set((state) => {
      if (!state.crystals[index]) return state;
      const crystals = state.crystals.map((alive, i) => alive && i !== index);
      const cleared = crystals.every((alive) => !alive);
      return { crystals, stage: cleared ? 'dragon' : state.stage, dragonHp: cleared ? DRAGON_MAX_HP : state.dragonHp };
    }),

  // while a crystal stands the dragon cannot drop below half: the beams top it back up
  damageDragon: (amount) =>
    set((state) => {
      if (state.stage !== 'crystals' && state.stage !== 'dragon') return state;
      const floor = state.stage === 'crystals' ? DRAGON_MAX_HP / 2 : 0;
      const dragonHp = Math.max(floor, state.dragonHp - amount);
      return { dragonHp, stage: dragonHp === 0 ? 'victory' : state.stage };
    }),

  healDragon: () => set((state) => (state.stage === 'crystals' ? { dragonHp: DRAGON_MAX_HP } : state)),
  openPortal: () => set({ portalOpen: true }),
  hopEgg: () => set((state) => ({ eggHops: state.eggHops + 1 })),
  catchEgg: () => set({ eggCaught: true }),
  setXp: (xp) => set({ xp }),

  // repeating a sound refreshes its subtitle instead of stacking a copy, like the game does
  caption: (key) =>
    set((state) => {
      const at = performance.now();
      const existing = state.captions.find((item) => item.key === key);
      if (existing) return { captions: state.captions.map((item) => (item === existing ? { ...item, at } : item)) };
      return { captions: [...state.captions, { id: nextId(), key, at }].slice(-5) };
    }),
  dropCaption: (id) => set((state) => ({ captions: state.captions.filter((item) => item.id !== id) })),

  advance: (kind, title, icon) =>
    set((state) => {
      const item = { id: nextId(), kind, title, icon };
      return { toasts: [...state.toasts, item], chat: [...state.chat, item].slice(-4) };
    }),
  dropToast: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
  dropChat: (id) => set((state) => ({ chat: state.chat.filter((item) => item.id !== id) })),

  showActionBar: (key) => set({ actionBar: { id: nextId(), key } }),
  showTitle: (key, subtitle) => set({ title: { id: nextId(), key, subtitle } }),
  clearNotice: (slot, id) => set((state) => (state[slot]?.id === id ? { [slot]: null } : state)),
}));

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
