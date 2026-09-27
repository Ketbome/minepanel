import { useAchievementsStore } from '@/lib/store';
import type { ChatLine, HudSlice, Slice } from './types';

let lastId = 0;
export const nextId = () => ++lastId;

const pushChat = (chat: ChatLine[], ...lines: ChatLine[]) => [...chat, ...lines].slice(-8);

export const initialHud = { captions: [], toasts: [], chat: [], actionBar: null, title: null, aim: null, swing: 0, charge: 0, scaredAt: 0 };

export const createHudSlice: Slice<HudSlice> = (set) => ({
  ...initialHud,

  // repeating a sound refreshes its subtitle instead of stacking a copy, like the game does
  caption: (key) =>
    set((state) => {
      const at = performance.now();
      const existing = state.captions.find((item) => item.key === key);
      if (existing) return { captions: state.captions.map((item) => (item === existing ? { ...item, at } : item)) };
      return { captions: [...state.captions, { id: nextId(), key, at }].slice(-5) };
    }),
  dropCaption: (id) => set((state) => ({ captions: state.captions.filter((item) => item.id !== id) })),
  advance: (kind, title, icon) => {
    useAchievementsStore.getState().unlock(title);
    set((state) => {
      const item = { id: nextId(), kind, title, icon };
      return { toasts: [...state.toasts, item], chat: pushChat(state.chat, item) };
    });
  },
  say: (key, author) => set((state) => ({ chat: pushChat(state.chat, { id: nextId(), kind: 'say', key, author }) })),
  announce: (key) => set((state) => ({ chat: pushChat(state.chat, { id: nextId(), kind: 'system', key }) })),
  presence: (kind, name) => set((state) => ({ chat: pushChat(state.chat, { id: nextId(), kind, name }) })),
  // named mobs get a line in the chat when they die, like the game reports them
  obituary: (name, key) => set((state) => ({ chat: pushChat(state.chat, { id: nextId(), kind: 'named', name, key }) })),
  dropToast: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
  dropChat: (id) => set((state) => ({ chat: state.chat.filter((item) => item.id !== id) })),
  showActionBar: (key) => set({ actionBar: { id: nextId(), key } }),
  showTitle: (key, subtitle) => set({ title: { id: nextId(), key, subtitle } }),
  clearNotice: (slot, id) => set((state) => (state[slot]?.id === id ? { [slot]: null } : state)),
  setAim: (aim) => set((state) => (state.aim === aim ? state : { aim })),
  bump: () => set((state) => ({ swing: state.swing + 1 })),
  // coarse steps only, so drawing a bow does not re-render the HUD every frame
  setCharge: (charge) => set((state) => (Math.abs(state.charge - charge) < 0.2 && charge !== 0 ? state : { charge })),
  scare: () => set({ scaredAt: nextId() }),
});
