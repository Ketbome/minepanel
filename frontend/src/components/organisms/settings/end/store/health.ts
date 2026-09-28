import { BFUUNY, BLASTER } from './admins';
import { countDeath } from './persist';
import type { HealthSlice, Slice } from './types';

export const MAX_HP = 20;
const INVULNERABLE_MS = 500;
// a golden helmet is two armor points: 8% less damage, as in the game
const HELMET_ARMOR = 0.92;

export const initialHealth = { hp: MAX_HP, dead: null, hurtAt: -1e9, levitateUntil: 0 };

export const createHealthSlice: Slice<HealthSlice> = (set, get) => ({
  ...initialHealth,

  hurt: (amount, cause) => {
    const state = get();
    const now = performance.now();
    if (state.dead || state.transition || now - state.hurtAt < INVULNERABLE_MS) return;
    // Bfuuny mode: everything hurts twice as much, as it always has for him
    const raw = state.mode === 'bfuuny' ? amount * 2 : amount;
    const taken = state.helmet ? Math.max(1, Math.round(raw * HELMET_ARMOR)) : raw;
    const hp = Math.max(0, state.hp - taken);
    if (hp > 0) {
      set({ hp, hurtAt: now });
      return;
    }
    // whatever was on the crafting grid goes back to the inventory before the death screen
    state.closePanel();
    countDeath();
    set({ hp: 0, hurtAt: now, dead: cause, deaths: state.deaths + 1, levitateUntil: 0 });
    // Bfuuny mode: your deaths go on his count, and the others laugh
    if (state.mode === 'bfuuny') {
      window.setTimeout(() => get().say('bfuunyModeDeath', BFUUNY), 900);
      window.setTimeout(() => get().say(state.deaths % 2 ? 'bfuunyModeLaughK' : 'bfuunyModeLaughB', state.deaths % 2 ? undefined : BLASTER), 2200);
    }
    if (state.mode === 'hardcore') window.setTimeout(() => get().say('hardcoreBlaster', BLASTER), 900);
  },
  heal: (amount) => set((state) => (state.dead ? state : { hp: Math.min(20, state.hp + amount) })),
  levitate: (seconds) => set({ levitateUntil: performance.now() + seconds * 1000 }),
  // you come back at the zone's checkpoint with everything you carried: keepInventory is on
  respawn: () => {
    const state = get();
    if (!state.dead) return;
    set({ hp: MAX_HP, dead: null, spawnId: state.spawnId + 1, hurtAt: performance.now() });
    if (state.deaths === 1) state.say('ghostKeepInventory');
    if (state.deaths === 3) {
      state.say('respawnBfuuny', BFUUNY);
      state.say('respawnBlaster', BLASTER);
    }
  },
});
