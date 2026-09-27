import { create } from 'zustand';
import { emptySlots, INVENTORY_SIZE } from '../items';
import { createGameSlice, initialGame } from './game';
import { createHealthSlice, initialHealth } from './health';
import { createHudSlice, initialHud } from './hud';
import { createInventorySlice, initialChests } from './inventory';
import type { EndGameState } from './types';

export const useEndGame = create<EndGameState>()((...args) => {
  const [set] = args;
  return {
    ...createGameSlice(...args),
    ...createInventorySlice(...args),
    ...createHealthSlice(...args),
    ...createHudSlice(...args),
    // a fresh run resets every slice at once
    reset: (player, muted) =>
      set({
        ...initialGame,
        ...initialHealth,
        ...initialHud,
        player,
        muted,
        inventory: emptySlots(INVENTORY_SIZE),
        selected: 0,
        chests: initialChests(),
        grid: emptySlots(9),
        cursor: null,
        helmet: false,
        panel: null,
      }),
  };
});

export * from './admins';
export * from './game';
export * from './persist';
export type * from './types';
export { MAX_HP } from './health';
export { nextId } from './hud';
