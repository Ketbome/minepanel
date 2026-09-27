import { FIRST_GHOST } from './admins';
import type { GameSlice, Slice } from './types';

export const EYE_COUNT = 12;
// frames that already hold an eye when you arrive: someone was here before you
export const PRESET_FRAMES = [1, 6, 9];
export const CRYSTAL_COUNT = 10;
export const DRAGON_MAX_HP = 200;
export const EGG_HOPS = 2;
export const BLAZES = ['blaze-1', 'blaze-2', 'blaze-3'];
export const PORTAL_GAPS = 2;

export const initialGame = {
  zone: 'overworld' as const,
  entry: 'camp',
  transition: null,
  paused: false,
  resume: false,
  flags: {},
  killed: [],
  mined: [],
  placed: [],
  obsidian: [],
  frames: Array.from({ length: EYE_COUNT }, (_, index) => PRESET_FRAMES.includes(index)),
  noise: 0,
  checkpoint: null,
  spawnId: 0,
  deaths: 0,
  stage: 'arrival' as const,
  crystals: Array.from({ length: CRYSTAL_COUNT }, () => true),
  dragonHp: DRAGON_MAX_HP,
  eggHops: 0,
  eggCaught: false,
  portalOpen: false,
  exitTo: null,
  xp: 0,
};

export const createGameSlice: Slice<Omit<GameSlice, 'reset'>> = (set) => ({
  ...initialGame,
  player: '',
  ghost: FIRST_GHOST,
  muted: false,

  setPlayer: (player) => set({ player }),
  // the zone only changes once the veil has covered the screen; see arrive()
  travel: (zone, entry = 'arrive', veil = 'black') => set((state) => (state.transition ? state : { transition: { zone, entry, veil }, panel: null })),
  arrive: () =>
    set((state) => {
      if (!state.transition) return state;
      const { zone, entry } = state.transition;
      return { zone, entry, transition: null, checkpoint: null, noise: 0 };
    }),
  setFlag: (flag) => set((state) => (state.flags[flag] ? state : { flags: { ...state.flags, [flag]: true } })),
  kill: (id) => set((state) => (state.killed.includes(id) ? state : { killed: [...state.killed, id] })),
  mine: (cell) => set((state) => ({ mined: [...state.mined, cell], placed: state.placed.filter(([key]) => key !== cell) })),
  placeBlock: (cell, id) => set((state) => ({ placed: [...state.placed.filter(([key]) => key !== cell), [cell, id]], mined: state.mined.filter((key) => key !== cell) })),
  placeObsidian: (gap) => set((state) => (state.obsidian.includes(gap) ? state : { obsidian: [...state.obsidian, gap] })),
  placeEye: (frame) => set((state) => ({ frames: state.frames.map((filled, index) => filled || index === frame) })),
  setNoise: (noise) => set({ noise }),
  setCheckpoint: (x, y, z, yaw) => set({ checkpoint: [x, y, z, yaw] }),
  setPaused: (paused) => set({ paused }),
  setResume: (resume) => set((state) => (state.resume === resume ? state : { resume })),

  setStage: (stage) => set({ stage }),
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
  exit: (to) => set({ stage: 'exit', exitTo: to }),
  hopEgg: () => set((state) => ({ eggHops: state.eggHops + 1 })),
  catchEgg: () => set({ eggCaught: true }),
  setXp: (xp) => set({ xp }),
});
